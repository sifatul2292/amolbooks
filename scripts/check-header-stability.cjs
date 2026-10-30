// The store menu is drawn before the browser paints Angular's own menu row.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

const root = join(__dirname, '..');
const snippet = readFileSync(join(root, 'gtm-snippets/header-stability.html'), 'utf8');
const main = readFileSync(join(root, 'api/src/main.ts'), 'utf8');
assert.match(main, /'header-stability\.html',/, 'The API injects the header snippet');
// Space for parts that arrive after the first paint.
assert.match(snippet, /\.menu-cart \.header-action-label:empty::before \{ content: 'ক্রয় তালিকা'; \}/);
assert.match(snippet, /\.header-action-icon img \{ width: 32px !important; \}/);
assert.match(snippet, /\.services \.service-icon img \{ width: 33px !important; aspect-ratio: 143 \/ 150; \}/);
assert.match(snippet, /\.bottom-nav li i\.fa \{ display: inline-grid; width: 1\.55rem; height: 1\.55rem;/);
assert.match(snippet, /\.bottom-nav li > span:empty::before \{ content: '\\200b'; \}/);
assert.match(snippet, /@media \(min-width: 768px\) and \(max-width: 66\.99rem\) \{\s*app-header \.logo img \{ width: 90px !important; height: 115px !important;/);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://www.amolbooks.com/**', (route) => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8">' + snippet + '</head><body><app-header></app-header></body></html>',
    }));
    await page.goto('https://www.amolbooks.com/offers');
    // Angular adds its menu with empty labels (they arrive later from the translate pipe).
    const drawnBeforeFrame = await page.evaluate(() => new Promise((resolve) => {
      document.querySelector('app-header').innerHTML = '<nav class="main-nav"><ul class="nav-list" _ngcontent-ng-c1=""><li class="nav-item"><a class="nav-link" href="/"></a></li><li class="nav-item"><a class="nav-link" href="/product-list"></a></li></ul></nav>';
      // Microtasks (the snippet's MutationObserver) run before the next frame.
      requestAnimationFrame(() => {
        const list = document.querySelector('.nav-list');
        resolve({
          marked: list.getAttribute('data-amol-nav'),
          labels: Array.from(list.children).map((item) => item.textContent),
          active: Array.from(list.querySelectorAll('a.active')).map((link) => link.getAttribute('href')),
          scoped: list.querySelector('li').hasAttribute('_ngcontent-ng-c1') && list.querySelector('a').hasAttribute('_ngcontent-ng-c1'),
          hidden: getComputedStyle(list).visibility,
        });
      });
    }));
    assert.equal(drawnBeforeFrame.marked, '1', 'Menu is marked so the index.html rewrite leaves it alone');
    assert.deepEqual(drawnBeforeFrame.labels, ['হোমপেজ', 'অফার', 'সকল বই', 'কোরআন', 'সিরাত', 'হাদিস', 'ব্লগ']);
    assert.deepEqual(drawnBeforeFrame.active, ['/offers']);
    assert.equal(drawnBeforeFrame.scoped, true, 'Angular style scope is copied so the items keep their look');
    assert.equal(drawnBeforeFrame.hidden, 'visible');

    // A re-created header gets the menu again; a marked menu is left as it is.
    const again = await page.evaluate(() => new Promise((resolve) => {
      document.querySelector('app-header').innerHTML = '<nav class="main-nav"><ul class="nav-list"><li class="nav-item"><a class="nav-link"></a></li></ul></nav>';
      requestAnimationFrame(() => resolve(document.querySelectorAll('.nav-list > li').length));
    }));
    assert.equal(again, 7);
  } finally {
    await browser.close();
  }
  console.log('PASS: header menu is complete before the first frame, marked, scoped and highlights the current page.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
