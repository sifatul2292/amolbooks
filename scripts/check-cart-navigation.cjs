const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const base = 'http://localhost:3000';
    for (const keyboard of [false, true]) {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      const cart = page.locator('app-header .menu-cart a');
      await cart.waitFor();
      assert.equal(await cart.getAttribute('href'), '/cart');
      if (keyboard) {
        await cart.focus();
        await page.keyboard.press('Enter');
      } else {
        await cart.click();
      }
      await page.waitForURL(base + '/cart', { waitUntil: 'domcontentloaded' });
      await page.locator('app-cart-slide').waitFor({ state: 'attached' });
      assert.equal(await page.locator('app-cart-slide').isVisible(), false);
    }
    await page.close();
    let mobile;
    for (const route of ['/', '/cart']) {
      if (mobile) await mobile.close();
      mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const catalogue = mobile.locator('app-header .bottom-nav li').filter({ has: mobile.locator('.fa-bars') });
      console.log('Checking catalogue from ' + route);
      await mobile.goto(base + route, { waitUntil: 'domcontentloaded' });
      await mobile.locator('app-category-slide .category-menu li').first().waitFor({ state: 'attached' });
      await catalogue.tap();
      await mobile.waitForURL(base + '/category-list', { waitUntil: 'domcontentloaded' });
      const category = mobile.locator('app-category-list .category-card').first();
      await category.waitFor();
      assert.ok((await category.innerText()).trim());
      await category.tap();
      await mobile.waitForURL('**/product-list?**', { waitUntil: 'domcontentloaded' });
    }
    await mobile.locator('app-header .bottom-nav li').filter({ has: mobile.locator('.fa-shopping-bag') }).tap();
    await mobile.waitForURL(base + '/cart', { waitUntil: 'domcontentloaded' });

    // Isolate the snippet to prove redraws, duplicate GTM firing and non-cart clicks.
    const fixture = await browser.newPage();
    const snippet = readFileSync(join(__dirname, '../gtm-snippets/cart-page-navigation.html'), 'utf8');
    await fixture.setContent('<app-header></app-header><app-cart-slide><div class="cart-slide-active">Drawer</div><div class="overlay">Backdrop</div></app-cart-slide><button id="add">Add to Cart</button>' + snippet + snippet);
    await fixture.locator('app-header').evaluate(el => { el.innerHTML = '<div class="menu-cart"><a>Cart</a></div>'; });
    assert.equal(await fixture.locator('.menu-cart a').getAttribute('href'), '/cart');
    assert.equal(await fixture.locator('.overlay').isVisible(), false);
    await fixture.locator('#add').click();
    assert.equal(fixture.url(), 'about:blank');
    console.log('PASS: catalogue navigation from home/cart and category selection, desktop cart click/Enter, mobile cart tap, drawer/backdrop hidden, redraws, duplicate install, Add to Cart unaffected.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
