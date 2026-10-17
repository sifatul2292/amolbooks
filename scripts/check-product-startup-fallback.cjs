const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const { STOREFRONT_SEO_FALLBACK_HEAD: snippet } = require('../api/dist/pages/sitemap/storefront-document.service');
  const article = '<main><article><h1>Product</h1><img width="468" height="710" alt="Cover"><p>Price</p></article></main>';
  const fixture = '<!doctype html><html><head>' + snippet + '</head><body><app-root>' + '<div id="amol-seo-fallback">' + article + '</div></app-root></body></html>';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      // Reproduce the unpatched initial response before Angular replaces app-root.
      await page.setContent('<app-root>' + article + '</app-root>');
      assert.equal(await page.locator('article').isVisible(), true);
      await page.setContent(fixture);
      assert.equal(await page.locator('article').isVisible(), false);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('article').isVisible(), false, 'No flash while bundles load');
      await page.evaluate(() => document.querySelector('app-root').setAttribute('ng-version', '16.0.1'));
      assert.equal(await page.locator('article').isVisible(), false, 'An early ng-version attribute must not expose fallback');
      await page.evaluate(() => {
        const root = document.querySelector('app-root');
        root.innerHTML = '<main><article>Normal storefront</article></main>';
      });
      assert.equal(await page.locator('article').isVisible(), true, 'Bootstrapped storefront stays visible');
      await page.setContent(fixture.replace(article, '<main><h1>Core page</h1></main>'));
      assert.equal(await page.locator('h1').isVisible(), false);
      await page.setContent(fixture.replace(article, '<h1>Package page</h1>'));
      assert.equal(await page.locator('h1').isVisible(), false);
      await page.close();
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const page = await noJs.newPage();
    await page.setContent(fixture);
    assert.equal(await page.locator('article').isVisible(), true, 'No-JavaScript fallback remains readable');
    await noJs.close();
    console.log('Product startup checks passed: original flash reproduced, fixed at desktop/mobile sizes, no-JS content preserved.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
