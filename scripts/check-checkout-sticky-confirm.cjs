// Checkout sticky "অর্ডার কনফার্ম করুন" bar (gtm-snippets/checkout-sticky-confirm.html): wiring and the
// rules that keep it safe. The behaviour itself is checked in the browser at phone width.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const snippet = read('gtm-snippets/checkout-sticky-confirm.html');
const main = read('api/src/main.ts');
const script = snippet.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script.replace(/^\(function \(\) \{/, 'return (function () { return;')); // parses

const list = main.slice(main.indexOf('const storefrontSnippetFiles = ['), main.indexOf('];', main.indexOf('const storefrontSnippetFiles = [')));
assert.match(list, /'checkout-sticky-confirm\.html'/, 'The snippet is injected into storefront pages');
assert.ok(list.indexOf("'checkout-sticky-confirm.html'") > list.indexOf("'checkout-location-loader.html'"), 'After the district picker');

assert.match(script, /var LABEL = 'অর্ডার কনফার্ম করুন';/);
assert.match(script, /location\.pathname === '\/checkout'/, 'Only on the checkout page (not order-success)');
assert.match(script, /app-checkout form button\[type="submit"\]/, "It presses the page's own order button");
assert.match(script, /submit\.click\(\);/, 'So every check on that button still runs');
assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|add-order/, 'It never sends an order itself');
assert.match(script, /wanted = y > lastY && y > 80;/, 'Shown while scrolling down, hidden while scrolling up');
assert.match(script, /var show = wanted && !typing\(\);/, 'Not over the keyboard; stays up at the end of the page');
assert.match(script, /getComputedStyle\(nav\)\.display !== 'none'/, 'Only where the bottom navigation is shown (phones)');
assert.match(script, /stop\.scrollIntoView\(/, 'A field that stops the order is brought into view');
assert.match(snippet, /body:has\(#ab-checkout-confirm-bar\.is-visible\) app-header \.bottom-nav \{ visibility: hidden !important;/, 'The navigation steps aside while the bar is up');
console.log('Checkout sticky confirm bar: wiring and safety rules pass');
