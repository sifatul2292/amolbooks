const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = join(__dirname, '..');
  const snippet = readFileSync(join(root, 'gtm-snippets/commerce-events.html'), 'utf8');
  const homepage = readFileSync(join(root, 'gtm-snippets/homepage-redesign.html'), 'utf8');
  const main = readFileSync(join(root, 'api/src/main.ts'), 'utf8');
  assert.match(main, /'commerce-events\.html'/, 'Snippet is injected on every storefront page');
  assert.match(main, /window\.__amolTracking=\{[\s\S]*?cartItems:[\s\S]*?priceOf:[\s\S]*?finalPrice:finalTrackingPrice/, 'Tracking script exposes read-only cart data');
  assert.match(main, /patchedTrackingHtml\.replace\(\s*storefrontSharedCartStateMarker,\s*storefrontTrackingApiCode/, 'Tracking API patch is applied');

  // Homepage lists feed the GA4 view_item_list tag (trigger: view_collection_stape).
  const pushSource = homepage.slice(homepage.indexOf('function pushEcommerce'), homepage.indexOf('function categoryUrl'));
  const dataLayer = [];
  const pushEcommerce = new Function('window', 'finalPrice', pushSource + '; return pushEcommerce;')({ dataLayer }, (p) => p.price);
  pushEcommerce('view_item_list', 'ab-home-popular', [{ _id: 'a', name: 'A', price: 100 }, { _id: 'b', name: 'B', price: 50 }]);
  const collection = dataLayer.find((entry) => entry.event === 'view_collection_stape');
  assert.ok(collection, 'view_item_list also pushes view_collection_stape');
  assert.equal(collection.__stape, true);
  assert.equal(collection.ecommerce.collection_id, 'ab-home-popular');
  assert.equal(collection.ecommerce.item_list_name, 'ab-home-popular');
  assert.equal(collection.ecommerce.value, 150);
  assert.equal(collection.ecommerce.items.length, 2);
  pushEcommerce('add_to_cart', 'ab-home-popular', [{ _id: 'a', name: 'A', price: 100 }]);
  assert.equal(dataLayer.filter((entry) => entry.event === 'view_collection_stape').length, 1, 'Other homepage events are not mirrored');

  const tracking = `<script>window.__amolTracking={
    cartItems:function(){return (window.__testItems||[]).map(function(i){return Object.assign({},i);});},
    priceOf:function(id){return ({p1:315,p2:200})[id]||null;},
    finalPrice:function(p){return p.salePrice||0;}
  };</script>`;
  const checkoutForm = '<app-checkout><form>' +
    '<input formcontrolname="name"><input formcontrolname="phoneNo"><textarea formcontrolname="address"></textarea>' +
    '<mat-radio-group formcontrolname="deliveryOptions"><mat-radio-button>Inside Dhaka 60<input type="radio" name="d" value="1" checked></mat-radio-button>' +
    '<mat-radio-button>Outside Dhaka 75<input type="radio" name="d" value="2"></mat-radio-button></mat-radio-group>' +
    '<mat-radio-group formcontrolname="paymentMethod"><mat-radio-button><input type="radio" name="p" value="cash_on_delivery" checked>Cash on Delivery</mat-radio-button></mat-radio-group>' +
    '<button type="button" id="confirm">অর্ডার কনফার্ম করুন</button></form></app-checkout>';
  const pages = {
    '/product-list': '<main></main>',
    '/cart': '<app-cart><div class="quantity"><button type="button" id="minus">−</button></div></app-cart><a id="elsewhere" href="#">Elsewhere</a>',
    '/checkout': checkoutForm,
    '/checkout/order-success/1': '<app-cart><button type="button" id="minus">−</button></app-cart>',
  };
  const events = (page, name) => page.evaluate((event) => (window.dataLayer || []).filter((entry) => entry && entry.event === event), name);
  const setCart = (page, lines) => page.evaluate((value) => localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(value)), lines);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    await context.route('https://amol.test/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/cart/get-carts-by-user') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: JSON.parse(url.searchParams.get('lines')) }) });
      }
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8">' + tracking + snippet + '</head><body>' + (pages[url.pathname] || '') + '</body></html>' });
    });
    const page = await context.newPage();

    // Search: one event per results URL, none on reload.
    await page.goto('https://amol.test/product-list?searchQuery=%E0%A6%95%E0%A7%81%E0%A6%B0%E0%A6%86%E0%A6%A8');
    let search = await events(page, 'search_submitted_stape');
    assert.equal(search.length, 1);
    assert.equal(search[0].ecommerce.search_term, 'কুরআন');
    assert.equal(search[0].__stape, true);
    assert.match(search[0].event_id, /^amol_search_submitted_stape_/);
    await page.reload();
    assert.equal((await events(page, 'search_submitted_stape')).length, 0, 'Reloading results does not count a new search');
    await page.goto('https://amol.test/product-list?categories=quran');
    assert.equal((await events(page, 'search_submitted_stape')).length, 0, 'Plain catalogue pages are not searches');

    // Guest removals: only decreases that follow a cart-control tap.
    await page.goto('https://amol.test/cart');
    await page.evaluate(() => { window.__testItems = [{ item_id: 'p1', item_name: 'Productive Muslim', price: 315, quantity: 2 }]; });
    await setCart(page, [{ product: 'p1', selectedQty: 2 }]);
    await page.waitForTimeout(900);
    await page.click('#minus');
    await setCart(page, [{ product: 'p1', selectedQty: 1 }]);
    await page.waitForTimeout(900);
    let removals = await events(page, 'remove_from_cart_stape');
    assert.equal(removals.length, 1);
    assert.deepEqual(removals[0].ecommerce, {
      currency: 'BDT', value: 315,
      items: [{ item_id: 'p1', item_name: 'Productive Muslim', price: 315, quantity: 1 }],
    });
    await page.evaluate(() => { document.getElementById('elsewhere').click(); });
    await page.evaluate(() => { window.__testItems = []; });
    await page.waitForTimeout(8200);
    await setCart(page, []);
    await page.waitForTimeout(900);
    assert.equal((await events(page, 'remove_from_cart_stape')).length, 1, 'Decreases without a cart tap are ignored');

    await page.goto('https://amol.test/checkout/order-success/1');
    await setCart(page, [{ product: 'p1', selectedQty: 1 }]);
    await page.waitForTimeout(900);
    await page.click('#minus');
    await setCart(page, []);
    await page.waitForTimeout(900);
    assert.equal((await events(page, 'remove_from_cart_stape')).length, 0, 'Order success never reports removals');

    // Signed-in removals come from the cart API, including emptying the cart.
    await page.goto('https://amol.test/cart');
    await page.evaluate(() => localStorage.setItem('Amolbooks_TOKEN_1', 'test'));
    const loadServerCart = (lines) => page.evaluate((value) => new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/cart/get-carts-by-user?lines=' + encodeURIComponent(JSON.stringify(value)));
      xhr.onload = resolve;
      xhr.send();
    }), lines);
    await loadServerCart([{ _id: 'c1', product: { _id: 'p2', name: 'Barakah Effect', salePrice: 200 }, selectedQty: 1 }]);
    await page.waitForTimeout(900);
    await page.click('#minus');
    await loadServerCart([]);
    removals = await events(page, 'remove_from_cart_stape');
    assert.equal(removals.length, 1);
    assert.deepEqual(removals[0].ecommerce.items, [{ item_id: 'p2', item_name: 'Barakah Effect', price: 200, quantity: 1 }]);
    await page.evaluate(() => localStorage.removeItem('Amolbooks_TOKEN_1'));

    // Checkout: shipping once details are complete, payment once on confirmation.
    await page.goto('https://amol.test/checkout');
    await page.evaluate(() => { window.__testItems = [{ item_id: 'p1', item_name: 'Productive Muslim', price: 315, quantity: 1 }]; });
    await page.fill('[formcontrolname="name"]', 'Test Buyer');
    await page.fill('[formcontrolname="phoneNo"]', '0170000000');
    await page.fill('[formcontrolname="address"]', 'House 1, Dhaka');
    await page.click('[formcontrolname="name"]');
    await page.waitForTimeout(500);
    assert.equal((await events(page, 'add_shipping_info_stape')).length, 0, 'Invalid phone does not complete shipping');
    await page.click('#confirm');
    assert.equal((await events(page, 'add_payment_info_stape')).length, 0, 'Incomplete details do not report payment');
    await page.fill('[formcontrolname="phoneNo"]', '০১৭০০০০০০০০');
    await page.click('[formcontrolname="name"]');
    await page.waitForTimeout(500);
    const shipping = await events(page, 'add_shipping_info_stape');
    assert.equal(shipping.length, 1, 'Bengali-digit phone numbers are accepted');
    assert.equal(shipping[0].ecommerce.value, 315);
    assert.equal(shipping[0].ecommerce.shipping_tier, 'Inside Dhaka 60');
    await page.click('#confirm');
    await page.click('#confirm');
    const payment = await events(page, 'add_payment_info_stape');
    assert.equal(payment.length, 1, 'Repeated confirmation taps report payment once');
    assert.equal(payment[0].ecommerce.payment_type, 'Cash on Delivery');
    assert.equal(payment[0].ecommerce.items[0].item_id, 'p1');
    assert.equal((await events(page, 'add_shipping_info_stape')).length, 1);
  } finally {
    await browser.close();
  }
  console.log('PASS: search, list views, cart removals and checkout shipping/payment events feed the existing GTM triggers.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
