// Checks the Stock page's "buy first" order and buy list (product.service.ts getStockList / getStockToBuy,
// custom-orders.html). Needs a built api/dist: node scripts/check-stock-buy-first.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { ProductService } = require(path.join(root, 'api/dist/pages/product/product.service'));
const service = Object.create(ProductService.prototype);

// Copies to buy now: untracked books need every waiting copy; tracked books (stock already lowered
// by the waiting orders) only the shortfall, never more than the waiting copies.
assert.equal(service.toBuyNow(null, 3), 3);
assert.equal(service.toBuyNow(undefined, 2), 2);
assert.equal(service.toBuyNow(5, 2), 0, 'shelf covers the order');
assert.equal(service.toBuyNow(0, 2), 0, 'stock already lowered to 0: the copies were on the shelf');
assert.equal(service.toBuyNow(-2, 3), 2, 'two copies missing');
assert.equal(service.toBuyNow(-11, 2), 2, 'old negative stock never asks for more than the waiting copies');
assert.equal(service.toBuyNow(-4, 0), 0, 'nothing waiting, nothing to buy');

const src = fs.readFileSync(path.join(root, 'api/src/pages/product/product.service.ts'), 'utf8');
// Waiting = not cancelled, not booked with the courier, open status, last 60 days.
assert.match(src, /OrderStatus\.NONE, OrderStatus\.PENDING, OrderStatus\.CONFIRM, OrderStatus\.PROCESSING, OrderStatus\.HOLD/);
assert.match(src, /customerCancelledAt: \{ \$exists: false \}/);
assert.match(src, /'courierData\.consignmentId': \{ \$exists: false \}/);
assert.match(src, /WAITING_ORDER_DAYS = 60/);
// buy (default): copies to buy, then the longest wait, waiting copies, 30-day sales.
assert.match(src, /\['buy', 'sold30', 'total', 'name'\]\.includes\(String\(query\?\.sort\)\) \? String\(query\.sort\) : 'buy'/);
assert.match(src, /chain\(by\('toBuy'\), oldest, by\('waitingQty'\), by\('soldLast30Days'\)/);

const ctl = fs.readFileSync(path.join(root, 'api/src/pages/product/product.controller.ts'), 'utf8');
assert.match(ctl, /@Get\('\/stock-to-buy'\)\s*\r?\n\s*@UseGuards\(AdminJwtAuthGuard\)/, 'buy list needs an admin login');

const page = fs.readFileSync(path.join(root, 'api/upload/static/custom-orders.html'), 'utf8');
assert.match(page, /id="stockSort"[^>]*onchange="setStockSort\(this\.value\)"/);
assert.match(page, /<option value="buy">Buy first \(waiting orders\)<\/option>/);
assert.match(page, /'&sort=' \+ encodeURIComponent\(stockState\.sort \|\| 'buy'\)/);
assert.match(page, /\+ stockWaitStrip\(p\)/);
assert.match(page, /id="buyListModal"/);
assert.match(page, /\/api\/product\/stock-to-buy/);
// Names reach the page through esc(); the copied text is plain.
assert.match(page, /esc\(item\.name \|\| '—'\)/);
console.log('stock buy-first: ok');
