const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/product-startup-fallback.html'), 'utf8');
  assert.ok(fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8').includes("'product-startup-fallback.html'"));
  const article = '<main><article><h1>Product</h1><img width="468" height="710" alt="Cover"><p>Price</p></article></main>';
  const fixture = '<!doctype html><html><head>' + snippet + '</head><body><app-root>' + article + '</app-root></body></html>';
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
      await page.evaluate(() => {
        const root = document.querySelector('app-root');
        root.setAttribute('ng-version', '14.2.0');
        root.innerHTML = '<main><article>Normal storefront</article></main>';
      });
      assert.equal(await page.locator('article').isVisible(), true, 'Bootstrapped storefront stays visible');
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
