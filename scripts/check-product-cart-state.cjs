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
assert.match(source, /generatedArea && nativeRows && nativeRows\.length[\s\S]*?generatedArea\.remove\(\)/, 'A populated native checkout list replaces the temporary fallback');
assert.match(source, /data-ab-checkout-generated/, 'Temporary checkout list is identifiable');
assert.doesNotMatch(source, /function renderCheckoutCartMirror\(\) \{\s*if \(!isLocalPreviewHost\(\)/, 'Checkout fallback also repairs the live storefront');
assert.match(source, /var CATALOG_API_BASE = isLocalPreviewHost\(\)[\s\S]*?: API_BASE;/, 'Production catalogue reads use the CORS-enabled API');
assert.match(source, /fetchJson\(path,[\s\S]*?baseUrl\)\.catch\(function \(\) \{ return null; \}\)/, 'One failed product source cannot discard a successful checkout fallback');
assert.match(source, /'\/special-package\/get-products-by-ids'[\s\S]*?CATALOG_API_BASE/, 'Special-package cart hydration uses the same-origin catalogue proxy');
assert.match(source, /window\.addEventListener\('pageshow',[\s\S]*?event\.persisted[\s\S]*?location\.pathname\.indexOf\('\/checkout'\)[\s\S]*?window\.location\.reload\(\)/, 'A history-restored checkout must reinitialize its Angular cart and shipping state');
assert.match(source, /function loadCheckoutShippingConfig\(\)[\s\S]*?'\/shipping-charge\/get'[\s\S]*?repairCheckoutDeliveryCharge\(\)/, 'Checkout must independently recover its delivery configuration');
assert.match(source, /function configuredCheckoutDeliveryCharge\([\s\S]*?outsideDhakaRules[\s\S]*?insideDhakaRules[\s\S]*?checkoutCartWeight[\s\S]*?rule && rule\.cost/, 'Checkout delivery must use the configured weight band');
assert.match(source, /function repairCheckoutDeliveryCharge\(\)[\s\S]*?configuredCheckoutDeliveryCharge\(input\.value === '2'\)[\s\S]*?updateCheckoutSummary/, 'Recovered delivery configuration must repair labels and totals with weight-based charges');
assert.match(source, /function selectedCheckoutDeliveryOption\(\)[\s\S]*?checkoutDeliveryBox\(\)[\s\S]*?deliveryBox\.querySelector\('input\[type="radio"\]:checked'\)/, 'Delivery totals must read the checked radio from the delivery group only');
assert.doesNotMatch(source, /document\.querySelector\('app-checkout input\[type="radio"\]\[name\^="mat-radio-group-"\]:checked'\)/, 'Unrelated checked checkout radios must not choose the delivery rate');
assert.match(source, /\/Total\/i\.test\(text\) && !\/Subtotal\/i\.test\(text\)/, 'Shipping repair must not overwrite the actual-order subtotal as a grand total');
const orderService = fs.readFileSync(require.resolve('../api/src/pages/sales/order/order.service.ts'), 'utf8');
assert.match(orderService, /shippingChargeModel\.findOne\([\s\S]*?calculateConfiguredDeliveryCharge\([\s\S]*?configuredDelivery\.deliveryCharge/, 'Order creation must enforce the configured weight-band charge instead of trusting the browser');
assert.match(orderService, /calculateConfiguredDeliveryCharge\([\s\S]*?outsideDhakaRules[\s\S]*?insideDhakaRules[\s\S]*?entry\.fromGram[\s\S]*?entry\.toGram[\s\S]*?rule\?\.cost/, 'Server delivery calculation must use the same configured weight bands');
const shippingHelperStart = source.indexOf('  function configuredCheckoutDeliveryCharge(');
const shippingHelper = source.slice(shippingHelperStart, source.indexOf('\n  function ', shippingHelperStart + 1));
const shippingContext = {
  Array,
  Number,
  checkoutCartWeight: 1500,
  checkoutShippingConfig: {
    deliveryInDhaka: 60,
    deliveryOutsideDhaka: 75,
    insideDhakaRules: [{ fromGram: 0, toGram: 1000, cost: 60 }, { fromGram: 1001, toGram: 2000, cost: 80 }],
    outsideDhakaRules: [{ fromGram: 0, toGram: 1000, cost: 75 }, { fromGram: 1001, toGram: 2000, cost: 95 }],
  },
  selectedCheckoutDeliveryOption: () => '1',
};
vm.createContext(shippingContext);
vm.runInContext(shippingHelper, shippingContext);
assert.equal(shippingContext.configuredCheckoutDeliveryCharge(false), 80, 'A 1.5kg inside-Dhaka cart uses its configured band');
assert.equal(shippingContext.configuredCheckoutDeliveryCharge(true), 95, 'A 1.5kg outside-Dhaka cart uses its configured band');
assert.match(source, /var total = calculatedTotal \|\| cartDisplayedTotal\(\)/, 'Gift progress trusts hydrated cart prices before DOM text');
assert.match(source, /body\.ab-home-redesign #amol-cart-toast,[\s\S]*?body\.ab-cart-auth-syncing #amol-cart-toast \{ display: none !important; \}/, 'Homepage and login cart sync hide the legacy cart toast');
assert.match(source, /document\.body\.classList\.add\('ab-cart-auth-syncing'\)/, 'Authorization starts silent cart synchronization');
assert.doesNotMatch(source.slice(source.indexOf("window.addEventListener('ab-cart-authorization'")), /mergeGuestCartIntoAuthenticatedCart\(\)/, 'Native login sync is not duplicated');
assert.match(source, /function reconcileAuthenticatedCartFromLocal\([\s\S]*?\/cart\/delete\/[\s\S]*?\/cart\/update\//, 'Local authenticated cart is reconciled to the visible guest cart');
assert.match(source, /searchParams\.set\('ab-auth-cart-ready', '1'\)/, 'Checkout reloads once after authenticated cart reconciliation');
assert.match(source, /if \(isLocalPreviewHost\(\)\) updateNativeCartCount\(storedGuestCartItems\(\)\)/, 'Local account pages keep the native cart badge aligned');
assert.match(source, /if \(!isProductPage\(\) && location\.pathname !== '\/'\) return;/, 'Homepage uses the shared added-to-cart modal');
assert.match(source, /target\.closest\('#ab-added-cart-modal, #ab-pdf-dialog'\)/, 'Global header navigation leaves PDF dialog controls alone');
assert.match(source, /data-ab-popular-price[\s\S]*?productPriceHtml\(product\)/, 'Cart popular cards use the shared discounted-price renderer');
assert.match(source, /li\.ab-summary-hidden,[\s\S]*?li\.ab-hide-discount-row\s*\{\s*display: none !important;/, 'Mobile checkout keeps both discount-row classes hidden');
assert.match(source, /@media \(min-width: 768px\) \{[\s\S]*?app-header \.ab-header-search-results \{[\s\S]*?position: absolute;[\s\S]*?app-header \.ab-sticky-search-item img \{[\s\S]*?width: 2\.7rem;[\s\S]*?height: 3\.45rem;/, 'Desktop header search results keep compact product rows');
assert.match(source, /function repairCheckoutDeliveryPlacement\(\)[\s\S]*?section\.insertBefore\(card, summary\)/, 'Mobile checkout places delivery options before its summary');
assert.match(source, /window\.innerWidth >= 768[\s\S]*?paymentArea\.insertBefore\(heading, restoreBefore\)/, 'Desktop checkout restores delivery options to the payment card');
assert.match(main, /obj\.event==='add_to_cart'&&!window\.__amolCartUiEventHandled/, 'Tracking mirror avoids duplicating injected cart UI feedback');
assert.match(main, /event:'view_cart',ecommerce:\{currency:'BDT',value:val,items:items\}/, 'Legacy cart tracking emits the standard event for mirroring');
assert.match(main, /\/api\/special-package\/get-products-by-ids[\s\S]*?Published storefront special-package proxy failed/, 'Local package hydration uses the published catalogue');
assert.match(source, /function fetchSpecialPackagesByIds\([\s\S]*?'\/special-package\/get-products-by-ids'[\s\S]*?specialPackageCartProduct/, 'Package cart rows hydrate through the special-package endpoint');
assert.match(source, /function repairCartPage\([\s\S]*?filter\(cartItemIsSpecialPackage\)[\s\S]*?fetchSpecialPackagesByIds\(packageIds\)/, 'The recurring cart repair keeps package IDs out of ordinary product hydration');
assert.doesNotMatch(source, /if \(isLocalPreviewHost\(\)\) \{\s*if \(hasSpecialPackageItems\)/, 'Local package carts use the owned row renderer instead of leaving an empty Angular list');
const footerStart = source.indexOf('  function ensureCartBottom(');
const footerHelper = source.slice(footerStart, source.indexOf('\n  function ', footerStart + 1));
const fallbackFooter = { removed: false, hasAttribute: name => name === 'data-ab-cart-bottom-fallback', remove() { this.removed = true; } };
const nativeFooter = { removed: false, hasAttribute: () => false, remove() { this.removed = true; } };
const footerArea = { querySelectorAll: () => [fallbackFooter, nativeFooter] };
const footerContext = { Array, document: { querySelector: () => footerArea } };
vm.createContext(footerContext);
vm.runInContext(footerHelper, footerContext);
assert.equal(footerContext.ensureCartBottom(), nativeFooter, 'Nested native footer is preferred over the temporary fallback');
assert.equal(fallbackFooter.removed, true, 'Temporary footer is removed when Angular renders its nested native footer');
const packageHelperNames = ['cartItemIsSpecialPackage', 'cartPageProductId', 'syncNativeCartPage', 'enhanceSpecialPackageCartRows'];
const packageHelpers = packageHelperNames.map(name => {
  const start = source.indexOf('  function ' + name + '(');
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}).join('\n');
const nativePackageRow = {
  attributes: {},
  classList: {
    stale: true,
    add(name) { this[name] = true; },
    remove(name) { if (name === 'ab-cart-native-stale') this.stale = false; },
    toggle() { throw new Error('Special-package rows must not be stale-checked against the product catalogue'); },
  },
  setAttribute(name, value) { this.attributes[name] = value; },
  querySelector(selector) {
    if (selector === '.cart-text-info h3') return { textContent: 'Package' };
    if (selector === '.cart-text-info ul button, .cart-text-info ul span') return null;
    return { textContent: 'Package' };
  },
  querySelectorAll: () => [],
};
const packageArea = {
  querySelectorAll(selector) {
    if (selector === '.cart-card:not(.ab-live-cart-page-item)' || selector === '.ab-cart-native-stale') return [nativePackageRow];
    return [];
  },
  querySelector: () => null,
};
const packageContext = {
  Boolean, Number, String,
  cartPageOpen: () => true,
  pushCartViewTracking() {},
  document: { querySelector: selector => selector === 'app-cart-information .cart-area-main' ? packageArea : null },
  isLocalPreviewHost: () => false,
  placeCartSummaryInsideItems() {},
  updateNodeText() { throw new Error('Partial product totals must not overwrite a package cart summary'); },
  updateCartCheckoutCtas() { throw new Error('Partial product totals must not overwrite a package checkout CTA'); },
  cartTotalFromProducts() { throw new Error('A package total cannot be calculated from regular products'); },
  escapeHtml: String,
};
vm.createContext(packageContext);
vm.runInContext(packageHelpers, packageContext);
const packageItem = { specialPackage: 'package-1', selectedQty: 1, cartType: 1 };
assert.equal(packageContext.cartItemIsSpecialPackage(packageItem), true);
assert.equal(packageContext.cartPageProductId(packageItem), 'package-1');
packageContext.syncNativeCartPage([packageItem], []);
assert.equal(nativePackageRow.classList.stale, false, 'Special-package rows remain visible on the cart page');
assert.equal(nativePackageRow.attributes['data-product-id'], 'package-1', 'Special-package rows receive a stable cart identifier');
assert.equal(nativePackageRow.attributes['data-ab-special-package-row'], 'true', 'Special-package rows are explicitly owned by the cart bridge');
assert.equal(nativePackageRow.classList['ab-cart-active-row'], true, 'Active package rows receive the compact mobile layout hook');
let emptyStateRemoved = false;
let insertedCartArea;
const recoveredCartArea = { querySelectorAll: () => [], querySelector: () => null };
const emptyCartShell = {
  querySelector(selector) {
    if (selector === '.empty-cart-card') return { remove() { emptyStateRemoved = true; } };
    if (selector === '.cart-area-bottom') return 'footer';
    return null;
  },
  insertBefore(node, before) { insertedCartArea = { node, before }; },
};
packageContext.document = {
  querySelector: selector => selector === 'app-cart-information .cart-area' ? emptyCartShell : null,
  createElement: () => recoveredCartArea,
};
packageContext.syncNativeCartPage([packageItem], []);
assert.equal(emptyStateRemoved, true, 'A persisted production cart removes Angular\'s stale empty-state shell');
assert.equal(insertedCartArea.node.className, 'cart-area-main', 'A persisted production cart recreates its missing item list');
assert.equal(insertedCartArea.before, 'footer', 'Recovered cart items stay above the checkout footer');
assert.match(source, /function goToCheckout\(\)[\s\S]*?checkoutItems\.some\(cartItemIsSpecialPackage\)[\s\S]*?searchParams\.set\('ab-package-cart', cartItemsSignature\(checkoutItems\)\)/, 'Package checkout navigation carries the persisted cart signature');
assert.match(source, /function renderCheckoutCartMirror\(\)[\s\S]*?packageItems = items\.filter\(cartItemIsSpecialPackage\)[\s\S]*?window\.location\.replace\(freshUrl\.toString\(\)\)/, 'A stale package checkout is re-entered once from its persisted cart snapshot');
assert.match(source, /function renderCheckoutCartMirror\(\)[\s\S]*?fetchProductsByIds\(productIds\)[\s\S]*?fetchSpecialPackagesByIds\(packageIds\)[\s\S]*?concat\(results\[1\]/, 'Checkout fallback hydrates regular products and special packages together');
assert.match(source, /return fetchJson\('\/cart\/get-carts-by-user'[\s\S]*?return cartPageProductId\(entry\) === String\(productId\)/, 'Authenticated deletes can resolve package cart entries');
assert.match(source, /function updateGuestCartItem\([\s\S]*?var items = storedGuestCartItems\(\)/, 'Guest deletion mutates the persisted snapshot that owns the visible row');
assert.match(source, /function cartStorageKey\([\s\S]*?localSnapshot !== null && Array\.isArray\(localItems\)[\s\S]*?localStorage\.setItem\(storefrontKey, JSON\.stringify\(localItems\)\)/, 'An explicit empty local cart cannot be repopulated from stale Angular storage');
assert.match(source, /function updateAuthenticatedCartItem\([\s\S]*?guestOwnsItem[\s\S]*?if \(!cart \|\| !cart\._id\) return updateGuestCopy\(\)\.then\(finishMutation\)/, 'A stale login token still removes a guest-owned cart row');
assert.match(source, /fetchJson\(path, options, RECOMMENDATION_API_BASE\)\.then\(function \(result\) \{[\s\S]*?if \(!result \|\| result\.success === false\) return false;[\s\S]*?updateGuestCopy\(\)\.then\(finishMutation\)/, 'A failed account mutation cannot discard its guest mirror');
assert.match(source, /function ensureCartBottom\([\s\S]*?querySelectorAll\('\.cart-area-bottom'\)[\s\S]*?candidate !== existing\) candidate\.remove\(\)/, 'The native cart footer replaces the temporary fallback instead of duplicating actions');
assert.match(source, /function mountCartStickyCheckout\(\)[\s\S]*?if \(!cartPageOpen\(\)\) \{[\s\S]*?bar\.remove\(\)[\s\S]*?data-ab-cart-sticky-checkout/, 'The mobile cart mounts its sticky checkout action only on the cart route');
assert.match(source, /claimCartControl\(cartOperation, 10000\)[\s\S]*?releaseCartControl\(cartOperation\)/, 'Cart controls stay locked until their request settles');
assert.match(source, /function enhanceNativeCartRows\([\s\S]*?row\.setAttribute\('data-product-id',[\s\S]*?remove\.setAttribute\('data-ab-cart-op', 'remove'\)/, 'Ordinary rows retain one-click cart controls beside a package');
assert.match(source, /repairCartPopularProducts\(\)[\s\S]*?action\.classList\.add\('ab-add-cart-button'\)[\s\S]*?action\.setAttribute\('data-product-id', String\(product\._id\)\)/, 'Popular-cart recommendations retain their resolved product ID');
assert.match(source, /function handleSpecialPackageTap\([\s\S]*?addSpecialPackageToCart\(packageId\)\.then\(function \(added\)[\s\S]*?if \(buyNow\) \{[\s\S]*?goToCheckout\(\)/, 'Package Buy Now waits for cart persistence before checkout');
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
const displayedTotalStart = source.indexOf('  function cartDisplayedTotal(');
const displayedTotalHelper = source.slice(displayedTotalStart, source.indexOf('\n  function ', displayedTotalStart + 1));
const totalNodes = [
  { textContent: 'সর্বমোট টাকা : ৳310' },
  { textContent: 'কার্টের বই ৫০০ শব্দে কুরআনের ৭৫%' },
];
const displayedTotalContext = {
  Number,
  document: { querySelectorAll: () => totalNodes },
  banglaNumber(value) {
    const digits = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    return String(value || '').replace(/[০-৯]/g, digit => digits[digit]);
  },
};
vm.createContext(displayedTotalContext);
vm.runInContext(displayedTotalHelper, displayedTotalContext);
assert.equal(displayedTotalContext.cartDisplayedTotal(), 310, 'A following “৫০০” product title cannot inflate a ৳310 cart to 310500');
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
  const guestMutationStart = source.indexOf('  function updateGuestCartItem(');
  const guestMutationSource = source.slice(guestMutationStart, source.indexOf('\n  function ', guestMutationStart + 1));
  let guestItems = [{ product: 'last-product', selectedQty: 1 }];
  let storedGuestItems = null;
  let reloads = 0;
  const unloadListeners = {};
  const queuedTimers = [];
  const localCartStorage = new Map([
    ['Amolbooks_USER_CART_1', JSON.stringify(guestItems)],
    ['Amolbooks_LOCAL_USER_CART_1', JSON.stringify(guestItems)],
    ['ALAMBOOKS_USER_CART_1', JSON.stringify(guestItems)],
  ]);
  let tabItems = guestItems.slice();
  const guestMutationContext = {
    Promise,
    String,
    cartPageProductId: item => String(item && item.product || ''),
    isLocalPreviewHost: () => true,
    storedGuestCartItems: () => guestItems.slice(),
    guestCartItems: () => guestItems.slice(),
    setGuestCartItems: next => { storedGuestItems = next.slice(); guestItems = next.slice(); },
    syncGuestCartUi: async () => {},
    cartPageOpen: () => true,
    isLocalPreviewHost: () => true,
    setTabCartItems: next => { tabItems = next.slice(); },
    localStorage: {
      setItem: (key, value) => localCartStorage.set(key, value),
      removeItem: key => localCartStorage.delete(key),
    },
    window: {
      addEventListener: (name, callback) => { unloadListeners[name] = callback; },
      setTimeout: callback => queuedTimers.push(callback),
      location: { reload: () => reloads++ },
    },
  };
  vm.createContext(guestMutationContext);
  vm.runInContext(guestMutationSource, guestMutationContext);
  assert.equal(await guestMutationContext.updateGuestCartItem('last-product', 'remove'), true);
  assert.deepEqual(storedGuestItems, [], 'Removing the last guest item persists an empty cart');
  localCartStorage.set('Amolbooks_USER_CART_1', JSON.stringify([{ product: 'stale-angular-item' }]));
  localCartStorage.set('Amolbooks_LOCAL_USER_CART_1', JSON.stringify([{ product: 'stale-angular-item' }]));
  tabItems = [{ product: 'stale-angular-item' }];
  unloadListeners.beforeunload();
  assert.equal(localCartStorage.get('Amolbooks_USER_CART_1'), '[]', 'Final-item removal wins over Angular beforeunload persistence');
  assert.equal(localCartStorage.get('Amolbooks_LOCAL_USER_CART_1'), '[]', 'Local preview storage remains empty during reload');
  assert.equal(localCartStorage.has('ALAMBOOKS_USER_CART_1'), false, 'Legacy cart cannot restore the final item');
  assert.equal(tabItems.length, 0, 'Per-tab fallback cannot restore the final item');
  queuedTimers.shift()();
  assert.equal(reloads, 1, 'Removing the last injected item reloads Angular into its empty-cart template');
  guestItems = [
    { product: 'first-product', selectedQty: 1 },
    { product: 'second-product', selectedQty: 1 },
  ];
  await guestMutationContext.updateGuestCartItem('first-product', 'remove');
  assert.equal(reloads, 1, 'Removing from a multi-item cart does not reload the route');
  assert.deepEqual(storedGuestItems, [{ product: 'second-product', selectedQty: 1 }]);
  assert.match(source, /authenticatedCartItemsOverride = null;[\s\S]*?setGuestCartItems\(items\);/, 'A local mutation clears stale authenticated cart state before rendering');
  assert.match(source, /function enhanceNativeCartRows\([\s\S]*?row\.classList\.toggle\('ab-cart-active-row', Boolean\(item\)\)/, 'Native product rows receive the compact mobile layout hook');
  assert.match(source, /function enhanceNativeCartRows\([\s\S]*?row\.hasAttribute\('data-ab-special-package-row'\)\) return;/, 'Ordinary row enhancement preserves the package compact-layout hook');
  assert.match(source, /function checkoutDeliveryBox\([\s\S]*?deliveryHeading[\s\S]*?deliveryHeading && deliveryHeading\.nextElementSibling/, 'Desktop checkout delivery labels are repaired outside the mobile wrapper');
  assert.match(source, /var updateCartItem = isLocalPreviewHost\(\) \? updateGuestCartItem : updateAuthenticatedCartItem;[\s\S]*?Promise\.resolve\(updateCartItem\(/, 'Local cart controls mutate the persisted local snapshot without waiting on a retained login token');
  assert.match(source, /function handleCartOperationTap\(event\)[\s\S]*?event\.type !== 'click' && !isStationaryTap\(event\)[\s\S]*?markFastCartTap\(cartOperation\)/, 'Cart controls claim a stationary pointer release before compiled handlers can suppress the click');
  assert.match(source, /window\.addEventListener\('click',[\s\S]*?if \(cartPageOpen\(\)\) handleCartOperationTap\(event\);[\s\S]*?\}, true\);/, 'Injected cart controls are claimed before compiled document capture handlers');
  const packageAddStart = source.indexOf('  function addGuestSpecialPackageToCart(');
  const packageAddSource = source.slice(packageAddStart, source.indexOf('\n  function ', packageAddStart + 1));
  let packageCartItems = [{ product: 'ordinary-product', selectedQty: 1 }];
  let packageSyncs = 0;
  const packageAddContext = {
    Promise,
    String,
    authenticatedCartItemsOverride: [{ product: 'stale-account-item' }],
    storedGuestCartItems: () => packageCartItems.slice(),
    cartItemIsSpecialPackage: item => Boolean(item && item.specialPackage),
    cartPageProductId: item => String(item && (item.specialPackage || item.product) || ''),
    setGuestCartItems: next => { packageCartItems = JSON.parse(JSON.stringify(next)); },
    syncGuestCartUi: async () => { packageSyncs++; },
  };
  vm.createContext(packageAddContext);
  vm.runInContext(packageAddSource, packageAddContext);
  assert.equal(await packageAddContext.addGuestSpecialPackageToCart('package-1'), true);
  assert.equal(packageCartItems.length, 2, 'Package add preserves ordinary cart products');
  assert.deepEqual(packageCartItems[1], {
    specialPackage: 'package-1', selectedQty: 1, selectedVariation: null, cartType: 1,
  }, 'Package add uses Angular-compatible cart data');
  await packageAddContext.addGuestSpecialPackageToCart('package-1');
  assert.equal(packageCartItems.length, 2, 'Repeated package taps do not duplicate the package');
  assert.equal(packageSyncs, 2, 'Package add synchronizes the visible cart on every completed tap');
  assert.equal(packageAddContext.authenticatedCartItemsOverride, null, 'Package add clears stale authenticated cart state');
  const nativeClick = source.slice(source.indexOf('    var nativeCartButton = event.target'), source.indexOf('    var bottomCart = event.target'));
  assert.ok(!nativeClick.includes('setTimeout'), 'Native cart click has no unconditional success timer');
  console.log('Product cart state checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
