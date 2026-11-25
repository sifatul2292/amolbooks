// Thank-you page order summary (gtm-snippets/order-success-summary.html): the numbers it shows and the
// rules that keep it clear of the older thank-you script. The look is checked in the browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/order-success-summary.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const script = snippet.match(/<script>([\s\S]*?)<\/script>/)[1];

assert.match(main, /^\s*'order-success-summary\.html',/m, 'The snippet is injected into storefront pages');
assert.match(script, /\/\^\\\/checkout\\\/order-success\\\/\(\[a-f0-9\]\{24\}\)/, 'Only on the thank-you page of one order');
assert.doesNotMatch(script, /innerHTML/, 'Order text is never written as HTML');
assert.doesNotMatch(script, /el\('(div|span|p|h5|h6)'/, 'No p / div / span: the older thank-you script rewrites those');

const window = { addEventListener() {} };
const context = {
  window, location: { hostname: 'amolbooks.com', pathname: '/' },
  document: { querySelector: () => null, documentElement: {}, createElement: () => ({}) },
  MutationObserver: class { observe() {} }, setTimeout, fetch: async () => ({ ok: false }),
};
vm.runInNewContext(script, context);
const totals = window.__abOrderSuccessTotals;

let t = totals({
  orderedItems: [{ name: 'বই ক', quantity: 2, unitPrice: 150 }, { name: 'Amol Notebook', quantity: 1, unitPrice: 0 }],
  deliveryCharge: 75, grandTotal: 375, paymentType: 'cash_on_delivery',
  deliveryLocation: { zone: 'outside', districtName: 'ফেনী', clientCharge: 60, charge: 75 },
});
assert.equal(t.books, 300);
assert.equal(t.delivery, 75);
assert.equal(t.total, 375);
assert.equal(t.discount, 0);
assert.equal(t.zone, 'ঢাকা সিটির বাইরে');
assert.equal(t.changedFor, 'ফেনী', 'The charge differs from the one picked: the page says so');
assert.equal(t.items[1].gift, true, 'A ৳0 line is a free gift');
assert.equal(t.cash, true);

t = totals({ orderedItems: [{ name: 'বই', quantity: 1, salePrice: 500 }], deliveryCharge: 60, grandTotal: 510, deliveryLocation: { zone: 'inside', areaName: 'মিরপুর', clientCharge: 60, charge: 60 } });
assert.equal(t.discount, 50, 'A coupon shows as the difference from the stored total');
assert.equal(t.changedFor, '', 'Same charge as picked: no note');

t = totals({ orderedItems: [{ name: 'বই', quantity: 1, unitPrice: 900 }], deliveryCharge: 0, grandTotal: 900 });
assert.equal(t.delivery, 0);
assert.equal(t.zone, '');
assert.equal(t.changedFor, '');

t = totals({ orderedItems: [{ name: 'বই', quantity: 1, unitPrice: 300 }], deliveryCharge: 75, grandTotal: 375, paymentType: 'online_payment', paymentStatus: 'paid' });
assert.equal(t.cash, false, 'A paid online order is not asked to pay on delivery');
console.log('Thank-you order summary: totals, charge note and wiring pass');

const wrappedGift = totals({ orderedItems:[{ name:'বই', quantity:1, unitPrice:200 }], deliveryCharge:60, giftWrapCharge:30, grandTotal:270 });
assert.equal(wrappedGift.wrapping, 30);
assert.equal(wrappedGift.discount, 20, 'Wrapping does not swallow the coupon discount');
assert.equal(wrappedGift.books + wrappedGift.delivery + wrappedGift.wrapping - wrappedGift.discount, wrappedGift.total);
