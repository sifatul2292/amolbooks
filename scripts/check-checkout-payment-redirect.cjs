// Exercise the real tracking handler and server HTML patch without orders or gateway calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'ui/dist/angular-ui/browser/index.html'), 'utf8');
const assignment = main.match(/let patchedTrackingHtml = trackingHtml\.replace\([\s\S]*?\n    \);/);
assert.ok(assignment, 'The served HTML applies the COD-only fallback patch');
const patch = new Function('trackingHtml', assignment[0] + '\nreturn patchedTrackingHtml;');

function placement(source, paymentType) {
  const start = source.indexOf('/* Order placement: POST');
  const end = source.indexOf('\n      }catch(e){}', start);
  assert.ok(start > 0 && end > start, 'Use the real order-placement tracking block');
  const timers = [];
  const storage = new Map();
  const location = { pathname: '/checkout', href: '/checkout' };
  const scope = {
    u: '/api/order/add-order-by-anonymous',
    d: { data: { orderId: 'FIXTURE', _id: '507f1f77bcf86cd799439011' } },
    self: { _gbody: JSON.stringify({ paymentType, grandTotal: 108 }) },
    _purchaseFired: false, _localCart: [{ item_id: 'book', price: 48, quantity: 1 }],
    readLocalStorageCart: () => [], cartVal: () => 48,
    _getCookie: () => '', _xid: () => 'fixture-only',
    window: { location }, sessionStorage: { setItem: (key, value) => storage.set(key, value) },
    setTimeout: (callback, delay) => timers.push({ callback, delay }), encodeURIComponent,
  };
  vm.runInNewContext(source.slice(start, end), scope);
  // EPS initialization can legitimately take longer than the legacy 1.2-second redirect.
  timers.filter((timer) => timer.delay <= 1800).forEach((timer) => timer.callback());
  return { location, timers, storage };
}

assert.match(placement(html, 'online_payment').location.href, /order-success/, 'Reproduce the old premature thank-you redirect');
const fixed = patch(html);
assert.notEqual(fixed, html, 'The actual tracking fallback was found');
assert.equal(patch(fixed), fixed, 'Repeated server startup is safe');
const online = placement(fixed, 'online_payment');
assert.equal(online.location.href, '/checkout', 'Online checkout waits for its gateway, even beyond 1.2 seconds');
assert.equal(online.timers.length, 0, 'No competing success-page redirect is scheduled for online payment');
assert.equal(JSON.parse(online.storage.get('_pendingPurchase')).ecommerce.value, 108, 'Keep purchase data for the verified return');
assert.match(placement(fixed, 'cash_on_delivery').location.href, /order-success/, 'COD keeps its existing success fallback');
assert.equal(placement(fixed, undefined).location.href, '/checkout', 'Unknown payment type does not assume success');
console.log('Checkout redirect checks passed: reproduced online interruption; online waits, COD unchanged.');
