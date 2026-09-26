const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'gtm-snippets/catalogue-local-requests.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const remote = 'https://apisub.amolbooks.com';
for (const hostname of ['localhost', '127.0.0.1', '[::1]', '192.168.1.5', '10.0.0.2', '172.31.2.3', 'amolbooks.com', '172.32.0.1']) {
  const calls = [];
  class XHR { open(...args) { calls.push(args); } }
  const origin = 'http://' + hostname + ':3000';
  const context = { location: { hostname, origin, href: origin + '/' }, URL, XMLHttpRequest: XHR };
  context.window = context;
  vm.runInNewContext(script, context);
  const installed = XHR.prototype.open;
  vm.runInNewContext(script, context);
  assert.equal(XHR.prototype.open, installed, 'Installing twice must not wrap twice');
  const xhr = new XHR();
  xhr.open('POST', remote + '/api/product/get-all?q=book', true);
  xhr.open('GET', remote + '/api/product/get-all-data?status=publish', true);
  const local = !['amolbooks.com', '172.32.0.1'].includes(hostname);
  assert.equal(calls[0][1], local ? origin + '/storefront-catalog/product/get-all?q=book' : remote + '/api/product/get-all?q=book');
  assert.equal(calls[1][1], local ? origin + '/storefront-catalog/product/get-all-data?status=publish' : remote + '/api/product/get-all-data?status=publish');
  for (const [method, url] of [['POST', remote + '/api/cart/add-to-cart'], ['POST', remote + '/api/product/add'], ['GET', remote + '/api/product/get-all'], ['POST', 'https://example.com/api/product/get-all']]) {
    xhr.open(method, url, false, 'user', 'password');
    assert.deepEqual(calls.at(-1), [method, url, false, 'user', 'password']);
  }
}
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
assert.ok(main.includes("'catalogue-local-requests.html'"), 'The API must inject the remap before Angular starts');
const storefront = fs.readFileSync(path.join(root, 'api/src/storefront-product-sections-script.ts'), 'utf8');
const productService = fs.readFileSync(path.join(root, 'api/src/pages/product/product.service.ts'), 'utf8');
assert.match(storefront, /function headerSearchResults\(\)/, 'Native header search needs its own results panel');
assert.match(storefront, /matches\('\.ab-sticky-search, #searchInput'\)/, 'Native and sticky search must share dynamic lookup');
assert.match(storefront, /জনপ্রিয় বই/, 'Empty native search must suggest popular books');
assert.match(storefront, /event\.key === 'ArrowDown'/, 'Search results must support keyboard entry');
assert.match(productService, /\{ nameEn: this\.utilsService\.createRegexFromString1\(searchQuery\) \}/, 'English titles must remain searchable');
assert.match(productService, /\{ name: this\.utilsService\.createRegexFromString1\(searchQuery\) \}/, 'Bangla titles must remain searchable');
console.log('Local catalogue routing checks passed');
