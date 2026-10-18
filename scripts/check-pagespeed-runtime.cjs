const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('../api/node_modules/typescript');
const { chromium } = require('playwright');
const { optimizeStorefrontHtml } = require('../api/dist/storefront-performance');
const candidate = require('../api/dist/storefront-product-sections-script').STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
const baselineSource = cp.execFileSync('git', ['show', 'HEAD:api/src/storefront-product-sections-script.ts'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
const baselineExports = {};
new Function('exports', ts.transpileModule(baselineSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText)(baselineExports);

async function main() {
  const original = fs.readFileSync(path.join(__dirname, '../ui/dist/angular-ui/browser/index.html'), 'utf8');
  const optimized = optimizeStorefrontHtml(original);
  assert.equal(optimizeStorefrontHtml(optimized), optimized, 'Document optimization is idempotent');
  assert.doesNotMatch(optimized, /<link\b[^>]*amolbooks-banner-24ee\.webp/);
  assert.match(optimized, /amol-ads-loader-dedup/);
  assert.match(optimized, /gtag\('config', 'AW-18176858056'\)/, 'Ads configuration remains queued');
  assert.match(optimized, /send_to.*AW-18176858056/, 'Purchase conversion destination is preserved');
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
    await page.route('**/all.min.css', route => route.fulfill({ contentType: 'text/css', body: '@font-face{font-family:"Font Awesome 6 Free";font-weight:900;src:url(data:font/woff2;base64,AA==);font-display:auto}' }));
    const runtime = fs.readFileSync(path.join(__dirname, '../gtm-snippets/pagespeed-runtime.html'), 'utf8');
    await page.setContent('<head><style>app-footer a{transition:color 1s,border-color 1s}</style>' + runtime + '</head><body><app-footer><div class="footer-link"><a>Footer</a></div></app-footer></body>');
    await page.evaluate(() => new Promise(resolve => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css'; link.onload = resolve; document.head.appendChild(link); }));
    assert.equal(await page.locator('head').evaluate(head => head.lastElementChild.id), 'ab-pagespeed-runtime');
    assert.equal(await page.locator('app-footer a').evaluate(link => getComputedStyle(link).transitionProperty), 'transform, opacity');
    const faces = await page.locator('#ab-pagespeed-runtime').evaluate(style => [...style.sheet.cssRules].filter(rule => rule.type === CSSRule.FONT_FACE_RULE).map(rule => rule.style.fontDisplay));
    assert.deepEqual(faces, ['swap', 'swap']);
    console.log('Runtime performance checks passed:', JSON.stringify(results), 'late font stylesheet, compositor transitions, Ads fallback, brand updates and script-data preservation.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
