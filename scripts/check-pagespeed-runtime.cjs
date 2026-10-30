const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('../api/node_modules/typescript');
const { chromium } = require('playwright');
const { optimizeStorefrontHtml } = require('../api/dist/storefront-performance');
const candidate = require('../api/dist/storefront-product-sections-script').STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
const baselineSource = cp.execFileSync('git', ['show', 'a9a4b748:api/src/storefront-product-sections-script.ts'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
const baselineExports = {};
new Function('exports', ts.transpileModule(baselineSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText)(baselineExports);

async function main() {
  const original = fs.readFileSync(path.join(__dirname, '../ui/dist/angular-ui/browser/index.html'), 'utf8');
  const optimized = optimizeStorefrontHtml(original);
  assert.equal(optimizeStorefrontHtml(optimized), optimized, 'Document optimization is idempotent');
  assert.doesNotMatch(optimized, /<link\b[^>]*amolbooks-banner-24ee\.webp/);
  assert.match(optimized, /amol-ads-loader-dedup/);
  assert.equal(optimizeStorefrontHtml('<link rel="stylesheet" href="styles.1a2b.css" media="print" onload="this.media=\'all\'">'), '<link rel="stylesheet" href="styles.1a2b.css">');
  assert.doesNotMatch(optimized, /<link rel="stylesheet" href="styles\.[a-f0-9]+\.css" media="print"/, 'Global stylesheet loads before first paint, so the page does not jump');
  assert.match(optimized, /gtag\('config', 'AW-18176858056'\)/, 'Ads configuration remains queued');
  assert.match(optimized, /send_to.*AW-18176858056/, 'Purchase conversion destination is preserved');
  const font = fs.readFileSync(path.join(__dirname, '../gtm-snippets/assets/hind-siliguri-regular.3bbbe5e258da.woff2'));
  assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  assert.ok(font.length < 90000);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const results = {};
    for (const [name, script] of [['baseline', baselineExports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT], ['candidate', candidate]]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.route('**/*', route => route.abort());
      await page.setContent('<app-header><div class="bottom-nav"><ul><li><i class="fa-shopping-bag"></i><small>0</small></li></ul></div></app-header><section id="catalogue">' + '<p>Amol Books catalogue content</p>'.repeat(2000) + '</section>');
      await page.evaluate(() => {
        window.fullBodyScans = 0;
        const walk = document.createTreeWalker.bind(document);
        document.createTreeWalker = function (root, ...args) {
          if (root === document.body) window.fullBodyScans++;
          return walk(root, ...args);
        };
      });
      await page.addScriptTag({ content: script });
      await page.waitForTimeout(1200);
      results[name] = await page.evaluate(() => ({ scans: window.fullBodyScans, badge: document.querySelector('.ab-sticky-cart-count').textContent }));
      if (name === 'candidate') {
        await page.evaluate(() => {
          const text = document.createElement('p'); text.id = 'legacy-copy'; text.textContent = 'Alam Book catalogue'; document.body.appendChild(text);
          const code = document.createElement('script'); code.type = 'application/json'; code.id = 'stored-code'; code.textContent = '{"title":"Alam Book"}'; document.body.appendChild(code);
        });
        await page.waitForFunction(() => document.getElementById('legacy-copy').textContent === 'Amol Books catalogue');
        assert.equal(await page.locator('#stored-code').textContent(), '{"title":"Alam Book"}', 'Executable/data text must not be rewritten');
        assert.equal(await page.evaluate(() => window.fullBodyScans), 1, 'New subtrees must not trigger a full-document brand scan');
      }
      await page.close();
    }
    assert.ok(results.baseline.scans >= 3, JSON.stringify(results));
    assert.equal(results.candidate.scans, 1);
    assert.equal(results.candidate.badge, '0');

    const page = await browser.newPage();
    const fontRequests = [];
    page.on('request', request => { if (/\.woff2/.test(request.url())) fontRequests.push(request.url()); });
    await page.route('**/api/storefront-assets/*.woff2', route => route.fulfill({contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(path.join(__dirname,'../gtm-snippets/assets',new URL(route.request().url()).pathname.split('/').pop()))}));
    await page.route('**/original.woff2', route => route.fulfill({contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'},body:font}));
    await page.route('**/all.min.css', route => route.fulfill({ contentType: 'text/css', body: '@font-face{font-family:"Font Awesome 6 Free";font-weight:900;src:url(https://cdnjs.cloudflare.com/original.woff2) format("woff2");font-display:auto}.fas{font-family:"Font Awesome 6 Free";font-weight:900}.fas::before{content:"\\f002"}' }));
    const runtime = fs.readFileSync(path.join(__dirname, '../gtm-snippets/pagespeed-runtime.html'), 'utf8');
    await page.setContent('<head><style>app-footer a{transition:color 1s,border-color 1s}</style>' + runtime + '</head><body><i class="fas" id="test-glyph"></i><app-footer><div class="footer-link"><a>Footer</a></div></app-footer></body>');
    await page.evaluate(() => new Promise(resolve => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css'; link.onload = resolve; document.head.appendChild(link); }));
    assert.equal(await page.locator('head').evaluate(head => head.lastElementChild.id), 'ab-pagespeed-runtime');
    assert.equal(await page.locator('app-footer a').evaluate(link => getComputedStyle(link).transitionProperty), 'transform, opacity');
    const faces = await page.locator('#ab-pagespeed-runtime').evaluate(style => [...style.sheet.cssRules].filter(rule => rule.type === CSSRule.FONT_FACE_RULE).map(rule => rule.style.fontDisplay));
    assert.deepEqual(faces, ['swap', 'swap', 'swap']);
    await page.evaluate(() => document.fonts.ready);
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'../gtm-snippets/assets/icon-fonts.json'),'utf8'));
    assert.ok(fontRequests.some(url => url.includes(manifest.solid.file)), 'Known icons use the small local font');
    assert.equal(fontRequests.some(url => url.endsWith('/original.woff2')), false, 'Late vendor CSS must not load the full font for known glyphs');
    await page.locator('#test-glyph').evaluate(icon => {icon.textContent='A';});
    await page.evaluate(() => document.fonts.ready);
    assert.ok(fontRequests.some(url => url.endsWith('/original.woff2')), 'Unlisted codepoints retain the original font fallback');
    for (const item of Object.values(manifest)) {
      const bytes=fs.readFileSync(path.join(__dirname,'../gtm-snippets/assets',item.file));
      assert.equal(bytes.toString('ascii',0,4),'wOF2');
      assert.equal(bytes.length,item.bytes);
    }

    console.log('Runtime performance checks passed:', JSON.stringify(results), 'late font stylesheet, compositor transitions, Ads fallback, brand updates and script-data preservation.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
