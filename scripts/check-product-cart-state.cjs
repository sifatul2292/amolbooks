const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../api/node_modules/typescript');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../api/src/storefront-product-sections-script.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsContext = { exports: {} };
vm.runInNewContext(compiled, exportsContext);
const source = exportsContext.exports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
const main = fs.readFileSync(require.resolve('../api/src/main.ts'), 'utf8');
new vm.Script(source);
assert.match(source, /@media \(max-width: 1023px\)[\s\S]*?\.section-right \.cart-products-area\.summery-pc[\s\S]*?display: none !important;/, 'Mobile checkout hides the desktop item list');
assert.match(source, /generatedArea && nativeArea[\s\S]*?generatedArea\.remove\(\)/, 'Native checkout list replaces the temporary fallback');
assert.match(source, /data-ab-checkout-generated/, 'Temporary checkout list is identifiable');
assert.match(source, /body\.ab-home-redesign #amol-cart-toast,[\s\S]*?body\.ab-cart-auth-syncing #amol-cart-toast \{ display: none !important; \}/, 'Homepage and login cart sync hide the legacy cart toast');
assert.match(source, /document\.body\.classList\.add\('ab-cart-auth-syncing'\)/, 'Authorization starts silent cart synchronization');
assert.doesNotMatch(source.slice(source.indexOf("window.addEventListener('ab-cart-authorization'")), /mergeGuestCartIntoAuthenticatedCart\(\)/, 'Native login sync is not duplicated');
assert.match(source, /function reconcileAuthenticatedCartFromLocal\([\s\S]*?\/cart\/delete\/[\s\S]*?\/cart\/update\//, 'Local authenticated cart is reconciled to the visible guest cart');
assert.match(source, /searchParams\.set\('ab-auth-cart-ready', '1'\)/, 'Checkout reloads once after authenticated cart reconciliation');
assert.match(source, /if \(isLocalPreviewHost\(\)\) updateNativeCartCount\(storedGuestCartItems\(\)\)/, 'Local account pages keep the native cart badge aligned');
assert.match(source, /if \(!isProductPage\(\) && location\.pathname !== '\/'\) return;/, 'Homepage uses the shared added-to-cart modal');
assert.match(source, /data-ab-popular-price[\s\S]*?productPriceHtml\(product\)/, 'Cart popular cards use the shared discounted-price renderer');
assert.match(source, /li\.ab-summary-hidden,[\s\S]*?li\.ab-hide-discount-row\s*\{\s*display: none !important;/, 'Mobile checkout keeps both discount-row classes hidden');
assert.match(source, /@media \(min-width: 768px\) \{[\s\S]*?app-header \.ab-header-search-results \{[\s\S]*?position: absolute;[\s\S]*?app-header \.ab-sticky-search-item img \{[\s\S]*?width: 2\.7rem;[\s\S]*?height: 3\.45rem;/, 'Desktop header search results keep compact product rows');
assert.match(source, /function repairCheckoutDeliveryPlacement\(\)[\s\S]*?section\.insertBefore\(card, summary\)/, 'Mobile checkout places delivery options before its summary');
assert.match(source, /window\.innerWidth >= 768[\s\S]*?paymentArea\.insertBefore\(heading, restoreBefore\)/, 'Desktop checkout restores delivery options to the payment card');
assert.match(source, /quantityArea\.classList\.add\('ab-native-cart-quantity'\)/, 'Published native cart rows receive the horizontal quantity selector');
assert.match(source, /\.ab-native-cart-quantity \{[\s\S]*?grid-template-columns: 2\.7rem 3rem 2\.7rem[\s\S]*?\.q-icon:first-child \{ order: 3; \}[\s\S]*?\.q-icon:last-child \{ order: 1; \}/, 'Published mobile selector matches the local minus, quantity, plus order');
assert.match(main, /obj\.event==='add_to_cart'&&!window\.__amolCartUiEventHandled/, 'Tracking mirror avoids duplicating injected cart UI feedback');
assert.match(main, /event:'view_cart',ecommerce:\{currency:'BDT',value:val,items:items\}/, 'Legacy cart tracking emits the standard event for mirroring');
const trackingStart = source.indexOf('  function pushProductPageAddToCartTracking(');
const trackingHelper = source.slice(trackingStart, source.indexOf('\n  function ', trackingStart + 1));
const trackingContext = {
  isProductPage: () => true,
  cartProductCache: { p1: { _id: 'p1', name: 'Tracked book', afterDiscountPrice: 310 } },
  currentProduct: null,
  finalPrice: product => product.afterDiscountPrice,
  window: { dataLayer: [] },
};
vm.createContext(trackingContext);
vm.runInContext(trackingHelper, trackingContext);
trackingContext.pushProductPageAddToCartTracking('p1');
assert.equal(trackingContext.window.dataLayer.length, 2);
assert.equal(trackingContext.window.dataLayer[1].event, 'add_to_cart');
assert.equal(trackingContext.window.dataLayer[1].ecommerce.value, 310);
assert.equal(trackingContext.window.dataLayer[1].ecommerce.items[0].item_id, 'p1');
assert.equal(trackingContext.window.__amolCartUiEventHandled, false);
trackingContext.window.dataLayer = [];
trackingContext.isProductPage = () => false;
trackingContext.pushProductPageAddToCartTracking('p1');
assert.equal(trackingContext.window.dataLayer.length, 0, 'Homepage keeps its existing tracker without duplicates');
const cartViewStart = source.indexOf('  function pushCartViewTracking(');
const cartViewHelper = source.slice(cartViewStart, source.indexOf('\n  function ', cartViewStart + 1));
const cartViewContext = {
  cartPageOpen: () => true,
  cartViewTrackingSent: false,
  cartPageProductId: item => item.product,
  finalPrice: product => product.afterDiscountPrice,
  window: { dataLayer: [] },
};
vm.createContext(cartViewContext);
vm.runInContext(cartViewHelper, cartViewContext);
cartViewContext.pushCartViewTracking(
  [{ product: 'p1', selectedQty: 2 }],
  [{ _id: 'p1', name: 'Cart book', afterDiscountPrice: 310 }]
);
assert.equal(cartViewContext.window.dataLayer.length, 2);
assert.equal(cartViewContext.window.dataLayer[1].event, 'view_cart');
assert.equal(cartViewContext.window.dataLayer[1].ecommerce.value, 620);
assert.equal(cartViewContext.window.dataLayer[1].ecommerce.items[0].quantity, 2);
cartViewContext.pushCartViewTracking(
  [{ product: 'p1', selectedQty: 2 }],
  [{ _id: 'p1', name: 'Cart book', afterDiscountPrice: 310 }]
);
assert.equal(cartViewContext.window.dataLayer.length, 2, 'Cart view fires once per page load');
const names = ['productIdIsInCart', 'productIsInCart', 'refreshProductCartState', 'boughtTogetherIsInCart', 'repairBoughtTogetherActionLabels', 'addBoughtTogetherToCart', 'cartPageProductId', 'repairProductActionLabels', 'updateStickyProductActions'];
const helpers = names.map(name => {
  const start = source.indexOf('  function ' + name + '(');
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}).join('\n');
let items = [], selected = ['one', 'two'], opened = 0, adds = 0;
const button = { disabled: false, textContent: 'Add All to Cart' };
const mainButton = { disabled: false, textContent: 'Add to Cart', getAttribute: () => 'cart', setAttribute() {} };
const stickyClasses = {};
const context = {
  currentSlug: 'one', window: { scrollY: 200 }, isProductPage: () => true,
  stickyProductActions: () => ({ classList: { toggle: (key, value) => { stickyClasses[key] = value; } } }),
  currentProduct: { _id: '1', slug: 'one' }, getSlug: () => 'one',
  guestCartItems: () => items, cartAuthorization: () => null, isLocalPreviewHost: () => true,
  productAccountCartItems: [], productCartStateVersion: 0, hydrateCartProductCache() {},
  cartProductCache: { '1': { slug: 'one' }, '2': { slug: 'two' } },
  boughtTogetherSelectedSlugs: () => selected,
  document: { querySelectorAll: () => [button], querySelector: () => ({ querySelectorAll: () => [mainButton], querySelector: () => null }) },
  openCartPage: () => opened++, CATALOG_API_BASE: '/catalog', suppressAddedCartModalUntil: 0,
  fetchJson: async path => ({ data: { _id: path.endsWith('one') ? '1' : '2' } }),
  rememberCartProducts() {}, addProductToCart: async id => { adds++; items.push({ product: id, selectedQty: 1 }); },
  showAddedCartModal() {}, pulseStickyCart() {}, updateStickyProductActions() {}, repairProductActionLabels() {},
  cartPageItems: async () => items,
};
vm.createContext(context);
vm.runInContext(helpers, context);
(async () => {
  assert.equal(context.productIsInCart(), false);
  context.repairProductActionLabels();
  context.updateStickyProductActions();
  assert.equal(mainButton.textContent, 'Add to Cart');
  assert.equal(stickyClasses['is-cart-ready'], false);
  await context.addBoughtTogetherToCart(button);
  assert.equal(button.textContent, 'Go To Cart');
  assert.equal(context.productIsInCart(), true);
  context.repairProductActionLabels();
  context.updateStickyProductActions();
  assert.equal(mainButton.textContent, 'Go to Cart');
  assert.equal(stickyClasses['is-cart-ready'], true);
  await context.addBoughtTogetherToCart(button);
  assert.equal(opened, 1);
  assert.equal(adds, 2, 'Go To Cart must not add quantities again');
  items = [{ product: { _id: '1' }, selectedQty: 1 }];
  assert.equal(context.productIsInCart(), true, 'Persisted populated product IDs work on reload');
  context.repairBoughtTogetherActionLabels();
  assert.equal(button.textContent, 'Add All to Cart', 'Removing a selected book resets bundle action');
  items = [{ product: '1', selectedQty: 0 }];
  assert.equal(context.productIsInCart(), false, 'Zero quantity is not cart presence');
  items = [{ product: '1', selectedQty: 1 }];
  selected = ['one'];
  context.repairBoughtTogetherActionLabels();
  assert.equal(button.textContent, 'Go To Cart', 'Checkbox selection uses current cart state');
  items = [];
  assert.equal(context.productIsInCart(), false, 'Removal clears main and sticky shared readiness');
  context.currentProduct.slug = 'previous';
  items = [{ product: '1', selectedQty: 1 }];
  assert.equal(context.productIsInCart(), false, 'SPA navigation does not reuse previous product readiness');
  context.currentProduct.slug = 'one';
  context.isLocalPreviewHost = () => false;
  context.cartAuthorization = () => 'test-account';
  items = [];
  context.productAccountCartItems = [{ product: { _id: '1' }, selectedQty: 1 }];
  assert.equal(context.productIsInCart(), true, 'Authenticated cart presence uses fetched state');
  await context.refreshProductCartState();
  assert.equal(context.productIsInCart(), false, 'Authenticated removal refresh clears presence');
  context.addProductToCart = async () => {};
  selected = ['one', 'two'];
  await context.addBoughtTogetherToCart(button);
  assert.equal(button.textContent, 'Add All to Cart', 'Unsuccessful adds cannot claim cart readiness');
  context.repairProductActionLabels();
  context.updateStickyProductActions();
  assert.equal(mainButton.textContent, 'Add to Cart', 'Failed add leaves main action ready to retry');
  assert.equal(stickyClasses['is-cart-ready'], false, 'Failed add leaves sticky action ready to retry');
  const nativeClick = source.slice(source.indexOf('    var nativeCartButton = event.target'), source.indexOf('    var bottomCart = event.target'));
  assert.ok(!nativeClick.includes('setTimeout'), 'Native cart click has no unconditional success timer');
  console.log('Product cart state checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
