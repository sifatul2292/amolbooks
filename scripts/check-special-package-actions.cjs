const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const packageId = '6a0d86a34bce4a2c973790bd';
    await page.goto('http://localhost:3000/special-package-details/' + packageId, { waitUntil: 'domcontentloaded' });
    const lowerActions = page.locator('app-special-package-details .section2-bottom:not(.prices)');
    const add = lowerActions.getByRole('button', { name: 'Add to Cart', exact: true });
    const buy = page.getByRole('button', { name: 'Buy Now', exact: true }).first();
    await add.waitFor();
    assert.equal(await buy.isEnabled(), true);
    const [actionsBox, addBox] = await Promise.all([lowerActions.boundingBox(), add.boundingBox()]);
    assert.ok(actionsBox && addBox && Math.abs(actionsBox.width - addBox.width) < 2, 'Mobile Add to Cart must fill the action row');

    await add.click();
    await page.waitForFunction(id => {
      return ['Amolbooks_LOCAL_USER_CART_1', 'Amolbooks_USER_CART_1'].some(key => {
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        return items.some(item => item.specialPackage === id && item.cartType === 1 && item.selectedQty === 1);
      });
    }, packageId);

    const modal = page.locator('#ab-added-cart-modal');
    await modal.waitFor({ state: 'visible' });
    assert.match(await modal.innerText(), /ইসলামী জীবনের প্রয়োজনীয় ৩টি বই/);
    await Promise.all([
      page.waitForURL('**/cart'),
      modal.locator('[data-ab-added-cart-go]').click(),
    ]);
    await page.locator('app-cart-information').waitFor();
    const packageRow = page.locator('app-cart-information .ab-live-cart-page-item').filter({ hasText: 'ইসলামী জীবনের প্রয়োজনীয় ৩টি বই' });
    await packageRow.waitFor({ state: 'visible' });
    assert.equal(
      await packageRow.count(),
      1,
      'The saved package must render as one cart row',
    );
    assert.match(await packageRow.innerText(), /৳1,208/);
    assert.match(await page.locator('#ab-cart-summary-inline').innerText(), /সর্বমোট টাকা\s*:\s*৳1,208/);

    await page.goto('http://localhost:3000/special-package-details/' + packageId, { waitUntil: 'domcontentloaded' });
    await buy.waitFor();
    await buy.click();
    await page.waitForURL('**/checkout**');
    const persisted = await page.evaluate(id => {
      const items = JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]');
      return items.find(item => item.specialPackage === id);
    }, packageId);
    assert.equal(persisted.cartType, 1);
    assert.equal(persisted.selectedQty, 2);
    console.log('Special-package popup, cart, and Buy Now checks passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
