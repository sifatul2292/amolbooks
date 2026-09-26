const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { STOREFRONT_PRODUCT_SECTIONS_SCRIPT: source } = require(path.join(root, 'api/dist/storefront-product-sections-script'));
new vm.Script(source);
function emittedFunction(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  let depth = 0;
  let opened = false;
  for (let index = source.indexOf('{', start); index < source.length; index += 1) {
    if (source[index] === '{') { depth += 1; opened = true; }
    if (source[index] === '}') depth -= 1;
    if (opened && depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`Unclosed ${name}`);
}
const localHostSource = emittedFunction('isLocalPreviewHost');
const catalogueBaseFor = new Function('window', `${localHostSource}; var API_BASE = 'https://apisub.amolbooks.com/api'; return isLocalPreviewHost() ? window.location.origin + '/storefront-catalog' : API_BASE;`);
assert.equal(catalogueBaseFor({ location: { hostname: 'localhost', origin: 'http://localhost:3000' } }), 'http://localhost:3000/storefront-catalog');
assert.equal(catalogueBaseFor({ location: { hostname: 'demo.trycloudflare.com', origin: 'https://demo.trycloudflare.com' } }), 'https://demo.trycloudflare.com/storefront-catalog');
assert.equal(catalogueBaseFor({ location: { hostname: 'amolbooks.com', origin: 'https://amolbooks.com' } }), 'https://apisub.amolbooks.com/api');

const mountLibrarySource = emittedFunction('mountCategoryLibrary');
const publisherProductsSource = emittedFunction('publisherProducts');
let publisherRequest;
const publisherProducts = new Function('fetchJson', `${publisherProductsSource}; var CATALOG_API_BASE = '/catalogue'; return publisherProducts;`)(
  async (path, options, base) => {
    publisherRequest = { path, body: JSON.parse(options.body), base };
    return { data: [
      { _id: 'current', slug: 'current-book' },
      { _id: 'duplicate-slug', slug: 'current-book' },
      { _id: 'other', slug: 'other-book' },
    ] };
  },
);
publisherProducts({ _id: 'current', slug: 'current-book', publisher: { _id: 'publisher-1' } }).then(products => {
  assert.equal(publisherRequest.path, '/product/get-all');
  assert.equal(publisherRequest.base, '/catalogue');
  assert.equal(publisherRequest.body.filter['publisher._id'], 'publisher-1');
  assert.deepEqual(products.map(product => product._id), ['other']);
});
function mountLibrary(existingSlug, productSlug) {
  const calls = { fetch: 0, insert: 0, mark: 0, remove: 0 };
  const nativeSection = {
    classList: { add: value => { assert.equal(value, 'ab-category-library-source'); calls.mark += 1; } },
    parentNode: { insertBefore: () => { calls.insert += 1; } },
  };
  const existing = {
    getAttribute: name => name === 'data-product-slug' ? existingSlug : '',
    querySelector: () => null,
    remove: () => { calls.remove += 1; },
  };
  const library = {
    setAttribute(name, value) { this[name] = value; },
    getAttribute(name) { return this[name]; },
  };
  const document = {
    querySelector: () => nativeSection,
    getElementById: () => existing,
    createElement: () => library,
  };
  const run = new Function('document', 'calls', 'library', 'product', `${mountLibrarySource};
    var CATEGORY_LIBRARY_ID = 'ab-category-library';
    var currentSlug = product.slug;
    var currentProduct = null;
    var categoryLibrarySeen = {};
    var categoryLibraryVersion = 0;
    var CATALOG_API_BASE = '/storefront-catalog';
    function removeCategoryLibrary() { calls.remove += 1; }
    function fetchJson() { calls.fetch += 1; return { then: function () {} }; }
    function publisherProducts() { return Promise.resolve([]); }
    function publisherShelfHtml() { return ''; }
    mountCategoryLibrary(product);
  `);
  run(document, calls, library, { slug: productSlug });
  return calls;
}
assert.deepEqual(mountLibrary('same-book', 'same-book'), { fetch: 0, insert: 0, mark: 1, remove: 0 });
assert.deepEqual(mountLibrary('old-book', 'new-book'), { fetch: 1, insert: 1, mark: 1, remove: 1 });
const menuSource = source.slice(source.indexOf('  function handleMenuTap(event) {'), source.indexOf("  document.addEventListener('pointerdown', rememberFastNavStart"));
const handleMenuTap = new Function(menuSource + '; return handleMenuTap;')();
for (const type of ['click', 'pointerup', 'touchend']) {
  // Popup headers must never enter the global header-button fast-tap handler.
  assert.equal(handleMenuTap({ type, target: { closest: selector => selector === '#ab-added-cart-modal' ? {} : null } }), false);
}
const html = fs.readFileSync(path.join(root, 'gtm-snippets/product-detail-polish.html'), 'utf8');
assert.doesNotMatch(html, /app-all-reviews \.review-rate-type \{ display: none/);
assert.doesNotMatch(html, /\.product-title > p \+ p::before/);
assert.match(html, /app-product-details \.delivery-area p/);
assert.match(html, /Tk\. 60 Inside Dhaka City/);
assert.match(html, /Tk\. 75 Outside Dhaka City/);
assert.match(html, /data-ab-summary-collapsed/);
assert.match(html, /আরও দেখুন/);
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
let interval, counts, noRatings;
let product = { ratingCount: 40, ratingTotal: 8, reviewTotal: 6 };
let deliveryWrites = 0;
function deliveryLabel(text) {
  return { get textContent() { return text; }, set textContent(value) { deliveryWrites += 1; text = value; } };
}
const deliveryLabels = [deliveryLabel('Tk. 60 Inside Dhaka City'), deliveryLabel('Tk. Outside Dhaka City')];
const rating = { querySelector: () => counts, appendChild: node => { counts = node; } };
const context = {
  window: { setInterval: fn => { interval = fn; } },
  location: { hostname: 'localhost', origin: 'http://localhost:3000', pathname: '/product-details/book' },
  document: { documentElement: {}, querySelectorAll: selector => selector === 'app-product-details .delivery-area p' ? deliveryLabels : [], querySelector: selector => selector === 'app-product-details' ? { classList: { toggle: (name, value) => { noRatings = value; } } } : rating, createElement: () => ({}) },
  MutationObserver: class { observe() {} },
  fetch: async url => {
    assert.equal(url, 'http://localhost:3000/storefront-catalog/product/get-by-slug/book');
    return { ok: true, json: async () => ({ data: product }) };
  },
};
vm.runInNewContext(script, context);
setImmediate(() => {
  assert.deepEqual(deliveryLabels.map(label => label.textContent), ['Tk. 60 Inside Dhaka City', 'Tk. 75 Outside Dhaka City']);
  assert.equal(deliveryWrites, 1);
  interval();
  assert.equal(deliveryWrites, 1, 'Delivery labels must not retrigger the document observer');
  assert.equal(counts.textContent, '8 Ratings | 6 Reviews');
  const first = counts;
  interval();
  assert.equal(counts, first, 'Repeated updates must not duplicate counts');
  product.ratingTotal = 0;
  product.reviewTotal = 0;
  counts = null;
  interval();
  assert.equal(noRatings, true);
  assert.equal(counts, null, 'Unrated products must not get zero counts');
  console.log('Product detail polish checks passed');
});
