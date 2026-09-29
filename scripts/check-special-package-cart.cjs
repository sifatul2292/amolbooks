const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = 'http://localhost:3000';
const packageId = '6a0d86a34bce4a2c973790bd';
const packageName = 'ইসলামী জীবনের প্রয়োজনীয় ৩টি বই';

async function clearCart(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
  });
}

async function addPackage(page) {
  await page.goto(`${base}/special-package-details/${packageId}`, { waitUntil: 'domcontentloaded' });
  const add = page.locator('app-special-package-details .section2-bottom:not(.prices) button').filter({ hasText: /ক্রয় তালিকায় রাখুন|ক্রয় তালিকায় রাখুন/ });
  await add.waitFor();
  await add.click();
  await page.waitForFunction(() => {
    const items = JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]');
    return items.some(item => item.specialPackage === '6a0d86a34bce4a2c973790bd' && item.cartType === 1);
  });
}

async function savedCart(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]'));
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const packageTraffic = [];
    page.on('request', request => {
      if (request.url().includes('special-package')) packageTraffic.push({ method: request.method(), url: request.url(), body: request.postData() });
    });
    page.on('response', response => {
      if (response.url().includes('special-package')) packageTraffic.push({ status: response.status(), url: response.url() });
    });

    await clearCart(page);
    await addPackage(page);
    await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });
    const packageRow = page.locator('app-cart-information .cart-card').filter({ hasText: packageName });
    try {
      await packageRow.waitFor();
    } catch (error) {
      console.error(JSON.stringify({ packageTraffic, cartText: await page.locator('app-cart').innerText().catch(() => '') }, null, 2));
      throw error;
    }
    const packageRemove = packageRow.locator('[data-ab-cart-op="remove"]');
    await packageRemove.waitFor();
    assert.equal(await packageRemove.count(), 1, 'Package row has one owned remove control');
    await packageRemove.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]').length === 0);
    assert.equal(await packageRow.count(), 0, 'One click removes the package row');

    await clearCart(page);
    await addPackage(page);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const productAdd = page.locator('#ab-homepage-redesign .ab-add-cart-button').first();
    await productAdd.waitFor();
    await productAdd.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]').length === 2);
    await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });

    const ordinaryRow = page.locator('app-cart-information .cart-card[data-product-id]:not([data-ab-special-package-row])').first();
    await ordinaryRow.waitFor();
    const ordinaryId = await ordinaryRow.getAttribute('data-product-id');
    assert.ok(ordinaryId && ordinaryId !== packageId, 'Ordinary row retains its product ID beside a package');
    const ordinaryRemove = ordinaryRow.locator('[data-ab-cart-op="remove"]');
    assert.equal(await ordinaryRemove.count(), 1, 'Ordinary row has one owned remove control');
    await ordinaryRemove.click();
    await page.waitForFunction(id => {
      const items = JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]');
      return items.length === 1 && items[0].specialPackage === id;
    }, packageId);
    assert.equal((await savedCart(page))[0].specialPackage, packageId, 'One click removes only the ordinary product');

    const remainingPackageRow = page.locator('app-cart-information .cart-card').filter({ hasText: packageName });
    await remainingPackageRow.locator('[data-ab-cart-op="remove"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]').length === 0);
    assert.deepEqual(await savedCart(page), [], 'One click then removes the remaining package');
    await page.waitForTimeout(1000);

    await page.evaluate(productId => {
      const items = [{ product: productId, selectedQty: 1, cartType: 0 }];
      localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(items));
      localStorage.setItem('Amolbooks_TOKEN_1', 'expired-preview-token');
      window.name = JSON.stringify({ abCartItems: items });
    }, ordinaryId);
    await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });
    const finalOrdinaryRow = page.locator(`.cart-card[data-product-id="${ordinaryId}"]`);
    await finalOrdinaryRow.waitFor();
    await finalOrdinaryRow.locator('[data-ab-cart-op="remove"]').tap();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1') || '[]').length === 0);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.cart-area-main .cart-card').count(), 0, 'The final ordinary item stays deleted with stale authentication state');
    console.log('Special-package cart browser checks passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
