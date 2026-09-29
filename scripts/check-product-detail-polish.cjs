const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { JSDOM } = require('../api/node_modules/jsdom');
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
assert.equal(catalogueBaseFor({ location: { hostname: 'www.amolbooks.com', origin: 'https://www.amolbooks.com' } }), 'https://apisub.amolbooks.com/api');

const fallbackDom = new JSDOM(`<app-product-details-area>
  <div class="product-image-box"><img src="" alt=""></div>
  <div class="product-title"><h3></h3><p>লেখক:</p></div>
  <div class="product-rating"></div>
  <div class="product-price"><h3>Tk 0</h3></div>
  <div class="stock-out"><h5>Out of Stock</h5></div>
</app-product-details-area>`);
const fallbackFunctionNames = [
  'escapeHtml',
  'plainText',
  'imageUrl',
  'finalPrice',
  'discountPercent',
  'firstName',
  'firstCategoryName',
  'hydrateNativeProductOverview',
];
const hydrateFor = document => new Function(
  'document',
  `${fallbackFunctionNames.map(emittedFunction).join('\n')}; return hydrateNativeProductOverview;`,
)(document);
const hydrateNativeProductOverview = hydrateFor(fallbackDom.window.document);
assert.equal(hydrateNativeProductOverview({
  _id: 'product-1',
  slug: 'visible-book',
  name: 'Visible Book',
  currentVersion: 'Paperback',
  images: ['https://example.com/book.webp'],
  author: [{ name: 'Visible Author', slug: 'visible-author' }],
  category: [{ name: 'Visible Category', slug: 'visible-category' }],
  publisher: { name: 'Visible Publisher', slug: 'visible-publisher' },
  salePrice: 470,
  afterDiscountPrice: 310,
  quantity: 5,
  ratingCount: 40,
  ratingTotal: 8,
  reviewTotal: 8,
  shortDescription: '<p>Visible summary</p>',
}), true);
assert.match(fallbackDom.window.document.querySelector('.product-title h3').textContent, /Visible Book/);
assert.equal(fallbackDom.window.document.querySelector('.product-image-box img').src, 'https://example.com/book.webp');
assert.match(fallbackDom.window.document.querySelector('.product-price h3').textContent, /310/);
assert.match(fallbackDom.window.document.querySelector('.stock h5').textContent, /In Stock/);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-empty-native-meta]').hidden, true);
assert.match(fallbackDom.window.document.querySelector('[data-ab-native-product-meta]').textContent, /Visible Author/);
assert.deepEqual(Array.from(fallbackDom.window.document.querySelectorAll('[data-ab-native-product-meta] a'), link => link.getAttribute('href')), [
  '/author-list/author-details/visible-author',
  '/product-list?categories=visible-category',
  '/product-list?publisher=visible-publisher',
]);
assert.equal(fallbackDom.window.document.querySelectorAll('[data-ab-native-product-meta] p').length, 3);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-rating] li').textContent, '5.0');
assert.equal(fallbackDom.window.document.querySelectorAll('[data-ab-fallback-rating] .fa-star').length, 5);
assert.equal(fallbackDom.window.document.querySelector('.ab-rating-counts').textContent, '8 Ratings | 8 Reviews');
assert.match(fallbackDom.window.document.querySelector('.ab-fallback-price-current').textContent, /310/);
assert.match(fallbackDom.window.document.querySelector('.ab-fallback-price-old').textContent, /470/);
assert.match(fallbackDom.window.document.querySelector('.ab-fallback-price-saving').textContent, /160/);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-description] p').textContent, 'Visible summary');
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-description-more]').getAttribute('href'), '#product-description');
assert.equal(fallbackDom.window.document.querySelectorAll('[data-ab-fallback-action]').length, 2);
const whatsApp = fallbackDom.window.document.querySelector('[data-ab-fallback-actions] #__wa-order-btn');
assert.match(whatsApp.getAttribute('href'), /^https:\/\/wa\.me\/8801893058682\?text=/);
assert.match(decodeURIComponent(whatsApp.getAttribute('href').split('?text=')[1]), /Visible Book[\s\S]*\/product-details\/visible-book/);
assert.ok(whatsApp.querySelector('.fa-whatsapp'));
hydrateNativeProductOverview({
  _id: 'product-2', slug: 'next-book', name: 'Next Book', salePrice: 200, quantity: 1,
  shortDescription: 'Next summary',
});
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-description] p').textContent, 'Next summary');
assert.match(decodeURIComponent(whatsApp.getAttribute('href').split('?text=')[1]), /Next Book[\s\S]*\/product-details\/next-book/);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-rating]'), null);
hydrateNativeProductOverview({ _id: 'product-3', slug: 'empty-book', name: 'Empty Book', salePrice: 200, quantity: 0 });
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-description]'), null);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-actions]'), null);
assert.match(source, /\[data-ab-fallback-actions\] button[\s\S]*?background: #3e97e3/);
assert.match(source, /\[data-ab-fallback-actions\] button\.active[\s\S]*?background: #33c24d/);
assert.match(source, /@media \(max-width: 991px\)[\s\S]*?\[data-ab-fallback-actions\][\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
assert.match(source, /\[data-ab-fallback-actions\] #__wa-order-btn[\s\S]*?background: #0d8174/);
assert.match(source, /\[data-ab-fallback-actions\] button,[\s\S]*?display: flex !important;[\s\S]*?align-items: center !important;[\s\S]*?justify-content: center !important;[\s\S]*?box-sizing: border-box !important;/);
assert.match(source, /\[data-ab-native-product-meta\] > p[\s\S]*?margin: 0 0\.85rem 0\.5rem 0 !important;/);

hydrateNativeProductOverview({
  _id: 'product-1', slug: 'visible-book', name: 'Visible Book', images: ['https://example.com/book.webp'],
  author: [{ name: 'Visible Author', slug: 'visible-author' }], salePrice: 470, afterDiscountPrice: 310,
  quantity: 5, ratingCount: 40, ratingTotal: 8, reviewTotal: 8, shortDescription: 'Visible summary',
});
const nativeMeta = fallbackDom.window.document.querySelector('.product-title > p');
nativeMeta.innerHTML = '<a href="/author-list/author-details/native-author">Native Author</a>';
const nativeActions = fallbackDom.window.document.querySelector('.product-action-btn');
nativeActions.appendChild(fallbackDom.window.document.createElement('button'));
assert.equal(hydrateNativeProductOverview({
  _id: 'product-1', name: 'Visible Book', images: ['https://example.com/book.webp'], author: [{ name: 'Native Author' }],
  salePrice: 470, afterDiscountPrice: 310, quantity: 5, ratingCount: 40, ratingTotal: 8, reviewTotal: 8,
  shortDescription: 'Visible summary',
}), false);
assert.ok(fallbackDom.window.document.querySelector('[data-ab-fallback-rating]'));
assert.ok(fallbackDom.window.document.querySelector('[data-ab-fallback-description]'));
const nativeRating = fallbackDom.window.document.createElement('ul');
nativeRating.innerHTML = '<li>5.0</li>';
fallbackDom.window.document.querySelector('.product-rating').appendChild(nativeRating);
const nativeDescription = fallbackDom.window.document.createElement('div');
nativeDescription.className = 'short-description';
nativeDescription.innerHTML = '<p>Native summary</p>';
fallbackDom.window.document.querySelector('app-product-details-area').appendChild(nativeDescription);
hydrateNativeProductOverview({ _id: 'product-1' });
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-rating]'), null);
assert.equal(fallbackDom.window.document.querySelector('[data-ab-fallback-description]'), null);

const emptyDescriptionDom = new JSDOM(`<app-product-details-area>
  <div><div class="product-title"><h3></h3></div><div class="product-price"><h3>Tk 0</h3></div>
  <div class="short-description"><p></p></div></div>
</app-product-details-area>`);
hydrateFor(emptyDescriptionDom.window.document)({
  _id: 'empty-description', name: 'Book', salePrice: 100, quantity: 1, shortDescription: 'Fallback summary',
});
assert.equal(emptyDescriptionDom.window.document.querySelector('.short-description:not([data-ab-fallback-description]) p').textContent, '');
assert.equal(emptyDescriptionDom.window.document.querySelectorAll('[data-ab-fallback-description]').length, 1);
assert.equal(emptyDescriptionDom.window.document.querySelector('.short-see-more').getAttribute('href'), '#product-description');

const nativeDescriptionDom = new JSDOM(`<app-product-details-area>
  <div><div class="product-title"><h3></h3></div><div class="product-price"><h3>Tk 0</h3></div>
  <div class="short-description"><p>Native summary</p></div></div>
</app-product-details-area>`);
hydrateFor(nativeDescriptionDom.window.document)({
  _id: 'native-description', name: 'Book', salePrice: 100, quantity: 1, shortDescription: 'Fallback summary',
});
assert.equal(nativeDescriptionDom.window.document.querySelector('.short-description').hasAttribute('data-ab-fallback-description'), false);
assert.equal(nativeDescriptionDom.window.document.querySelector('.short-description p').textContent, 'Native summary');
assert.match(emittedFunction('renderProductSections'), /productDescriptionSection\.id = 'product-description'/);

const mountLibrarySource = emittedFunction('mountCategoryLibrary');
const categoryLibraryProductsSource = emittedFunction('categoryLibraryProducts');
const publisherProductsSource = emittedFunction('publisherProducts');
let categoryLibraryRequest;
const categoryLibraryProducts = new Function('fetchJson', `${categoryLibraryProductsSource}; var CATALOG_API_BASE = '/catalogue'; return categoryLibraryProducts;`)(
  async (path, options, base) => {
    categoryLibraryRequest = { path, method: options.method, body: JSON.parse(options.body), base };
    return { data: [] };
  },
);
categoryLibraryProducts().then(() => {
  assert.equal(categoryLibraryRequest.path, '/product/get-all');
  assert.equal(categoryLibraryRequest.method, 'POST');
  assert.equal(categoryLibraryRequest.base, '/catalogue');
  assert.deepEqual(categoryLibraryRequest.body.filter, { status: 'publish', quantity: { $gt: 0 } });
  assert.equal(categoryLibraryRequest.body.pagination.pageSize, 180);
  assert.equal(categoryLibraryRequest.body.select.category, 1);
});
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
    function categoryLibraryProducts() { return fetchJson(); }
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
