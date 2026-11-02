// Cart page "জনপ্রিয় কিছু বই দেখুন": best-selling, in-stock books, without the books already in the cart.
// Runs gtm-snippets/cart-best-sellers.html in jsdom with a fake XMLHttpRequest.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = req('jsdom');
const root = path.resolve(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/cart-best-sellers.html'), 'utf8');
const code = snippet.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.match(fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8'), /'publisher-banner\.html',\n\s+'cart-best-sellers\.html',/, 'snippet is injected');

const sectionQuery = { filter: null, sort: { createdAt: -1 }, pagination: null, select: { name: 1, nameEn: 1, images: 1, author: 1, salePrice: 1, costPrice: 1, slug: 1 } };
const answer = { success: true, data: [{ _id: 'a1', name: 'In cart' }, { _id: 'b2', name: 'Best seller' }, { _id: 'c3', name: 'Next' }] };

function run(pathname) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://www.amolbooks.com' + pathname, runScripts: 'outside-only' });
  const { window } = dom;
  let sent = null;
  class FakeXHR {
    open(method, url) { this.url = url; }
    send(body) { sent = body; this.readyState = 4; }
    get responseText() { return JSON.stringify(answer); }
    get response() { return this.responseText; }
  }
  FakeXHR.prototype.responseType = '';
  window.XMLHttpRequest = FakeXHR;
  window.localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify([{ product: 'a1', selectedQty: 1, cartType: 0 }]));
  window.eval(code);
  const xhr = new window.XMLHttpRequest();
  xhr.open('POST', 'https://apisub.amolbooks.com/api/product/get-all');
  xhr.send(JSON.stringify(sectionQuery));
  return { sent: JSON.parse(sent), shown: JSON.parse(xhr.responseText).data.map((p) => p._id), viaResponse: JSON.parse(xhr.response).data.length };
}

const cart = run('/cart');
assert.deepEqual(cart.sent.filter, { status: 'publish', quantity: { $gt: 0 } }, 'only published, in-stock books');
assert.deepEqual(cart.sent.sort, { totalSold: -1, priority: -1 }, 'best sellers first');
assert.equal(cart.sent.pagination.pageSize, 120);
assert.equal(cart.sent.select.discountType, 1, 'discount fields for the shown price');
assert.deepEqual(cart.shown, ['b2', 'c3'], 'books already in the cart are left out');
assert.equal(cart.viaResponse, 2, 'xhr.response is filtered too');

const other = run('/product-details/x');
assert.deepEqual(other.sent, sectionQuery, 'other pages keep the original request');
assert.deepEqual(other.shown, ['a1', 'b2', 'c3']);

console.log('cart best sellers: in-stock books by sales, cart books left out, other pages untouched');
