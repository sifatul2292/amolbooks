// view_cart from the compiled checkout carries list prices (product.salePrice) and no value.
// Runs the storefront tracking script (with the view-cart patch from main.ts) in jsdom and checks
// that view_cart, what GTM sees of it and its view_cart_stape mirror use the final prices.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = req('jsdom');
const root = path.resolve(__dirname, '..');
const { patchViewCartPrices, patchTrackingListPrices, VIEW_CART_FINAL_PRICE_MARKER, TRACKING_LIST_PRICE_MARKER } = require('../api/dist/storefront-view-cart-tracking');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
assert.match(main, /patchedTrackingHtml = patchViewCartPrices\(patchedTrackingHtml\);/, 'main.ts applies the view-cart patch');
const html = patchTrackingListPrices(patchViewCartPrices(fs.readFileSync(path.join(root, 'ui/dist/angular-ui/browser/index.html'), 'utf8')));
assert.match(main, /patchedTrackingHtml = patchTrackingListPrices\(patchedTrackingHtml\);/, 'main.ts applies the list-price guard');
assert.equal(patchTrackingListPrices(html), html, 'guard is applied once');
assert.equal(patchViewCartPrices(html), html, 'patch is applied once');
const tracking = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((code) => code.includes('function pushViewCart'));
assert.ok(tracking && tracking.includes(VIEW_CART_FINAL_PRICE_MARKER), 'tracking script carries the helper');
assert.ok(tracking.includes(TRACKING_LIST_PRICE_MARKER), 'tracking script carries the list-price guard');
assert.equal(tracking.split('try{fixViewCartPrices(obj);}catch(e){}').length - 1, 2, 'both dataLayer wrappers fix view_cart');

// Discounted books: 500 → 315 (37%), 470 → 294 (Tk 176 off), 600 → 320 (Tk 280 off).
const products = [
  { _id: 'a00000000000000000000001', name: 'Book A', salePrice: 500, discountType: 1, discountAmount: 37 },
  { _id: 'a00000000000000000000002', name: 'Book B', salePrice: 470, discountType: 2, discountAmount: 176 },
  { _id: 'a00000000000000000000003', name: 'Book C', salePrice: 600, discountType: 2, discountAmount: 280 },
];
const FINAL = [315, 294, 320];

(async () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body><app-checkout></app-checkout></body></html>', { url: 'https://www.amolbooks.com/checkout', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(products.map((p) => ({ product: p._id, selectedQty: 1, cartType: 0 }))));
  // An XHR that answers locally and fires readystatechange before load, like a browser.
  class FakeXHR {
    constructor() { this.listeners = {}; this.readyState = 0; }
    open(method, url) { this.url = url; }
    setRequestHeader() {}
    addEventListener(type, listener) { (this.listeners[type] = this.listeners[type] || []).push(listener); }
    send() {
      this.readyState = 4;
      this.status = 200;
      this.responseText = JSON.stringify({ success: true, data: window.__nextData || products });
      (this.listeners.readystatechange || []).forEach((listener) => listener());
      (this.listeners.load || []).forEach((listener) => listener());
    }
  }
  window.XMLHttpRequest = FakeXHR;
  window.eval(tracking);
  const dataLayer = window.dataLayer;

  // The compiled checkout: its load listener is added before send, and it then pushes view_cart.
  const angularViewCart = () => ({ event: 'view_cart', ecommerce: { items: products.map((p) => ({ item_id: p._id, item_name: p.name, price: p.salePrice, quantity: 1 })) } });
  const xhr = new window.XMLHttpRequest();
  xhr.open('POST', 'https://apisub.amolbooks.com/api/product/get-products-by-ids');
  xhr.addEventListener('load', () => dataLayer.push(angularViewCart()));
  xhr.send('{}');
  await wait(20);

  const viewCart = dataLayer.filter((e) => e && e.event === 'view_cart');
  assert.equal(viewCart.length, 1);
  assert.deepEqual(viewCart[0].ecommerce.items.map((i) => i.price), FINAL, 'view_cart items use final prices');
  assert.equal(viewCart[0].ecommerce.value, 929, 'view_cart gets the cart value');
  assert.equal(viewCart[0].ecommerce.currency, 'BDT');
  const stape = dataLayer.filter((e) => e && e.event === 'view_cart_stape');
  assert.equal(stape.length, 1);
  assert.equal(stape[0].ecommerce.value, 929, 'view_cart_stape value matches');
  assert.deepEqual(stape[0].ecommerce.items.map((i) => i.price), FINAL);
  const checkout = dataLayer.filter((e) => e && e.event === 'begin_checkout_stape');
  assert.equal(checkout.length, 1);
  assert.equal(checkout[0].ecommerce.value, 929, 'begin_checkout unchanged and equal');

  // The header search preloads every book with salePrice only (no discount fields); that must not
  // replace the final prices already learnt before the next view_cart.
  window.__nextData = products.map((p) => ({ _id: p._id, name: p.name, salePrice: p.salePrice }));
  const preload = new window.XMLHttpRequest();
  preload.open('POST', 'https://apisub.amolbooks.com/api/product/get-all');
  preload.send('{}');
  window.__nextData = null;
  await wait(20);
  const again = angularViewCart();
  dataLayer.push(again);
  assert.deepEqual(again.ecommerce.items.map((i) => i.price), FINAL, 'a list-price-only preload does not undo final prices');

  // GTM replaces push later; even a GTM that reads the event before passing it on sees final prices.
  const seenByGtm = [];
  const previous = dataLayer.push;
  dataLayer.push = function (obj) { seenByGtm.push(JSON.parse(JSON.stringify(obj))); return previous.apply(dataLayer, arguments); };
  await wait(150);
  dataLayer.push(angularViewCart());
  const gtmView = seenByGtm.find((e) => e && e.event === 'view_cart');
  assert.ok(gtmView, 'late wrapper sits in front of GTM');
  assert.deepEqual(gtmView.ecommerce.items.map((i) => i.price), FINAL, 'GTM sees final prices');
  assert.equal(gtmView.ecommerce.value, 929);

  // Products with no known final price keep what they had; other events are not touched.
  const unknown = { event: 'view_cart', ecommerce: { items: [{ item_id: 'b00000000000000000000009', price: 450, quantity: 2 }] } };
  dataLayer.push(unknown);
  assert.equal(unknown.ecommerce.items[0].price, 450);
  assert.equal(unknown.ecommerce.value, 900);
  const addToCart = { event: 'add_to_cart', ecommerce: { currency: 'BDT', value: 500, items: [{ item_id: products[0]._id, price: 500, quantity: 1 }] } };
  dataLayer.push(addToCart);
  assert.equal(addToCart.ecommerce.items[0].price, 500, 'add_to_cart object itself is not rewritten');
  const mirrored = { event: 'view_cart', __stape: true, ecommerce: { items: [{ item_id: products[0]._id, price: 500, quantity: 1 }] } };
  dataLayer.push(mirrored);
  assert.equal(mirrored.ecommerce.items[0].price, 500, '_stape-marked events are left alone');

  console.log('view_cart prices: checkout view_cart, GTM view and view_cart_stape use final prices; other events unchanged');
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
