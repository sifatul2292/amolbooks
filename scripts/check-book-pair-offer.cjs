// Three-book free-delivery set: server rule, checkout rule parity, order totals, and the
// popup snippet (two of the three in the cart offers the third) inside a simulated
// storefront (jsdom, no network, no database).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = req('jsdom');
const root = path.resolve(__dirname, '..');
const util = require('../api/dist/shared/utils/package-free-delivery.util');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');

const [PRODUCTIVE, MINDMAP, BARAKAH] = util.FREE_DELIVERY_BOOK_SET_IDS;
const OTHER = '000000000000000000000001';
const PM_NAME = 'প্রোডাক্টিভ মুসলিম';
const MINDMAP_NAME = 'ইসলামি অর্থনীতি ও সফল উদ্যোক্তার মাইন্ডম্যাপ';
const scriptOf = (file) => fs.readFileSync(path.join(root, 'gtm-snippets', file), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const packageScript = scriptOf('package-free-delivery.html');
const offerScript = scriptOf('book-pair-offer.html');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const line = (id, qty = 1) => ({ product: id, selectedQty: qty, cartType: 0 });

function checkRules() {
  const freeDeliveryOffer = new Function('PACKAGE_ID', packageScript.slice(packageScript.indexOf('var BOOK_SET_IDS'), packageScript.indexOf('function notice')) + ';return freeDeliveryOffer;')(util.FREE_DELIVERY_PACKAGE_ID);
  const item = (id, qty = 1, cartType = 0) => ({ cartType, selectedQty: qty, product: { _id: id } });
  const cases = [
    [[item(PRODUCTIVE), item(MINDMAP), item(BARAKAH)], 'set'],
    [[item(MINDMAP), item(BARAKAH, 2), item(OTHER), item(PRODUCTIVE)], 'set'],
    [[item(PRODUCTIVE.toUpperCase()), item(MINDMAP), item(BARAKAH)], 'set'],
    [[item(PRODUCTIVE), item(BARAKAH)], ''],
    [[item(PRODUCTIVE), item(MINDMAP)], ''],
    [[item(MINDMAP), item(BARAKAH), item(OTHER)], ''],
    [[item(BARAKAH)], ''],
    [[item(PRODUCTIVE), item(MINDMAP), item(BARAKAH, 0.5)], ''],
    [[item(PRODUCTIVE), item(MINDMAP), item(BARAKAH, 0)], ''],
    [[item(PRODUCTIVE, 'NaN'), item(MINDMAP), item(BARAKAH)], ''],
    [[item(PRODUCTIVE), item(MINDMAP), item(BARAKAH, 1, 1)], ''],
    [[item(util.FREE_DELIVERY_PACKAGE_ID, 1, 1), item(PRODUCTIVE)], 'package'],
    [[item(util.FREE_DELIVERY_PACKAGE_ID, 1, 1), item(PRODUCTIVE), item(MINDMAP), item(BARAKAH)], 'package'],
  ];
  for (const [items, offer] of cases) {
    assert.equal(util.hasFreeDelivery(items), !!offer, JSON.stringify(items));
    if (offer !== 'package') assert.equal(util.hasFreeDeliveryBookSet(items), offer === 'set', JSON.stringify(items));
    assert.equal(freeDeliveryOffer(items), offer, 'checkout rule matches the server: ' + JSON.stringify(items));
  }
  // The popup and the checkout use the server's ids.
  for (const id of util.FREE_DELIVERY_BOOK_SET_IDS) {
    assert.ok(offerScript.includes("'" + id + "'"), 'popup knows ' + id);
    assert.ok(packageScript.includes("'" + id + "'"), 'checkout knows ' + id);
  }
  const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
  assert.ok(main.indexOf("'book-pair-offer.html'") > main.indexOf("'package-free-delivery.html'"), 'popup snippet is injected after the checkout snippet');
}

async function checkOrderTotals() {
  const service = Object.create(OrderService.prototype);
  const books = {
    [PRODUCTIVE]: { _id: PRODUCTIVE, salePrice: 500 },
    [MINDMAP]: { _id: MINDMAP, salePrice: 470 },
    [BARAKAH]: { _id: BARAKAH, salePrice: 600 },
    [OTHER]: { _id: OTHER, salePrice: 200 },
  };
  service.productModel = { find: async (query) => query._id.$in.map((id) => books[String(id)]).filter(Boolean) };
  service.specialPackageModel = { find: () => ({ populate: async () => [] }) };
  service.utilsService = { transform: (p, field, qty = 1) => (field === 'discountAmount' ? 0 : Number(p.salePrice) * qty), getDateString: () => '2026-11-01' };
  service.getProductUnitCostSnapshot = () => 0;
  service.evaluateGiftLine = async () => null;
  service.calculateCouponDiscount = async () => 0;
  service.calculateOrderDiscount = async () => 0;
  service.calculateWeightBasedDeliveryCharge = () => 0;
  service.normalizeAttribution = () => undefined;
  const order = (lines) => service.newOrderMake({ carts: lines.map((l) => l[0]), cartData: lines.map(([product, selectedQty = 1]) => ({ cartType: 0, product, selectedQty })), deliveryCharge: 75 });
  let result = await order([[PRODUCTIVE], [MINDMAP], [BARAKAH]]);
  assert.equal(result.deliveryCharge, 0, 'all three books ship free');
  assert.equal(result.grandTotal, 1570);
  result = await order([[PRODUCTIVE], [MINDMAP], [BARAKAH], [OTHER, 2]]);
  assert.equal(result.deliveryCharge, 0, 'other books ride along free');
  assert.equal(result.grandTotal, 1970);
  result = await order([[PRODUCTIVE], [BARAKAH]]);
  assert.equal(result.deliveryCharge, 75, 'two of the three still pay delivery');
  result = await order([[PRODUCTIVE], [MINDMAP], [OTHER]]);
  assert.equal(result.deliveryCharge, 75, 'two of the three plus another book still pay delivery');
  result = await order([[PRODUCTIVE], [MINDMAP], [BARAKAH, 0.01]]);
  assert.equal(result.deliveryCharge, 75, 'a fraction of a book does not unlock it');
  const saved = [PRODUCTIVE, MINDMAP, BARAKAH].map((id) => ({ cartType: 0, product: books[id], selectedQty: 1 }));
  const chain = { populate() { return this; }, then(resolve) { return Promise.resolve(saved).then(resolve); } };
  service.cartModel = { find: () => chain };
  result = await service.newOrderMake({ user: '000000000000000000000002', carts: [], cartData: [], deliveryCharge: 75 });
  assert.equal(result.deliveryCharge, 0, 'signed-in saved cart qualifies too');
}

const PRODUCTS = {
  'the-barakah-effect': {
    _id: BARAKAH, name: 'দ্য বারাকাহ ইফেক্ট', slug: 'the-barakah-effect', totalPages: 288, edition: '1st Edition 2026', language: ['Bangla'],
    author: [{ name: 'মোহাম্মাদ ফারিস' }], publisher: { name: 'আমল বুকস' }, salePrice: 600, discountType: 2, discountAmount: 280,
    quantity: 1000, status: 'publish', images: ['https://apisub.amolbooks.com/api/upload/images/barakah.webp'],
    shortDescription: '<p>বরকতের <strong>বই</strong><img src=x onerror="window.__xss=1"><script>window.__xss=1</script></p>',
  },
  'islami-orthonity-o-uddokta-47': {
    _id: MINDMAP, name: MINDMAP_NAME, slug: 'islami-orthonity-o-uddokta-47', totalPages: 160, author: [{ name: 'লেখক' }],
    salePrice: 470, discountType: 1, discountAmount: 37, quantity: 40, status: 'publish', images: ['/api/upload/images/mindmap.webp'],
    description: '<p>উদ্যোক্তাদের জন্য মাইন্ডম্যাপ</p>',
  },
  'productive muslim': {
    _id: PRODUCTIVE, name: PM_NAME, slug: 'productive muslim', totalPages: 256, salePrice: 500, discountType: 1, discountAmount: 37,
    quantity: 9985, status: 'publish', images: ['https://apisub.amolbooks.com/api/upload/images/productive-muslim-7ca6.webp'],
  },
};

// A storefront page with both snippets, the app's chunk loading and its two services.
// listCatchesUp: whether a signed-in add shows in cartList before the popup looks.
function storefront(url, { signedIn = false, cart: initialCart = [], body = '', products = PRODUCTS, listCatchesUp = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + body + '</body></html>', { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(signedIn ? [] : initialCart));
  const fetches = [];
  window.fetch = async (input) => {
    fetches.push(String(input));
    const product = products[decodeURIComponent(String(input).split('/get-by-slug/')[1] || '')];
    return product ? { ok: true, json: async () => ({ success: true, data: product }) } : { ok: false, json: async () => ({}) };
  };
  window.eval(packageScript);
  window.eval(offerScript);

  const calls = { refresh: [], subscriptions: 0, serverAdds: [] };
  class Observable {
    constructor(subscribe) { this._subscribe = subscribe; }
    subscribe(observer) {
      const next = typeof observer === 'function' ? observer : observer && observer.next;
      const target = { next: next || (() => {}), error: (observer && observer.error) || (() => {}), complete: (observer && observer.complete) || (() => {}) };
      return this._subscribe(target);
    }
  }
  const reloadService = { needRefreshCart$: (value) => calls.refresh.push(value) };
  class CartService {
    constructor() {
      this.reloadService = reloadService;
      this.cartList = signedIn ? initialCart.map((entry) => ({ ...entry, product: { _id: entry.product } })) : [];
    }
    addToCart(item) {
      return new Observable((subscriber) => {
        calls.subscriptions += 1;
        calls.serverAdds.push(item.product);
        if (listCatchesUp) this.cartList.push({ product: { _id: item.product }, selectedQty: 1, cartType: 0 });
        subscriber.next({ success: true });
        subscriber.complete();
      });
    }
    addToCartMultiple(items) { return this.addToCart(items[0]); }
    getCartByUser() {}
    getCartItemFromLocalStorage() { return JSON.parse(window.localStorage.getItem('Amolbooks_USER_CART_1') || '[]'); }
    addCartItemToLocalStorage(item) {
      const items = this.getCartItemFromLocalStorage();
      const id = typeof item.product === 'object' ? item.product._id : item.product;
      const found = items.find((entry) => entry.product === id && entry.cartType === (item.cartType || 0));
      if (found) found.selectedQty += 1; else items.push({ ...item, product: id, cartType: item.cartType || 0 });
      window.localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(items));
    }
    addComboCartItemToLocalStorage(item) { this.addCartItemToLocalStorage(item); }
    updateCartList(list) { this.cartList = list; }
  }
  class UserService {
    constructor(cartService) { this.cartService = cartService; this.reloadService = reloadService; this.isUser = false; }
    autoUserLoggedIn() { this.isUser = signedIn; }
    getUserStatus() { return this.isUser; }
    getUserToken() { return null; }
  }
  class Checkout { constructor(carts) { this.carts = carts; } calculateDeliveryCharge() { return 75; } }
  function CheckoutModule() {}
  CheckoutModule.ɵinj = { imports: [{ providers: [{ useValue: [{ component: Checkout }] }] }] };
  // Webpack's runtime replaces push during bootstrap, keeping the prior push as its parent.
  const chunks = window.webpackChunkangular_ui;
  const parentPush = chunks.push.bind(chunks);
  chunks.push = function (chunk) { return parentPush(chunk); };
  chunks.push([[179], {
    3484(module) { module.exports = { N: CartService }; },
    3850(module) { module.exports = { W: UserService }; },
    583(module) { module.exports = { CheckoutModule }; },
  }]);
  const factories = chunks[chunks.length - 1][1];
  for (const id of Object.keys(factories)) factories[id]({ exports: {} });
  const cart = new CartService();
  const user = new UserService(cart);
  user.autoUserLoggedIn();
  const popup = () => window.document.getElementById('ab-pair-offer');
  const button = (pattern) => [...window.document.querySelectorAll('#ab-pair-offer button')].find((b) => pattern.test(b.textContent));
  const guestCart = () => JSON.parse(window.localStorage.getItem('Amolbooks_USER_CART_1'));
  // What the product-page script does: store the book itself, then announce it.
  const productPageAdd = (id) => {
    const items = guestCart();
    items.push(line(id));
    window.localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(items));
    window.dispatchEvent(new window.CustomEvent('amol-cart-added', { detail: { product: id } }));
  };
  return { dom, window, cart, user, calls, fetches, popup, button, guestCart, productPageAdd, Checkout };
}

async function checkGuestProductPage() {
  const page = storefront('https://www.amolbooks.com/product-details/productive%20muslim');
  const { window, popup, button, calls, guestCart, productPageAdd } = page;
  assert.ok(Object.getPrototypeOf(page.cart).addCartItemToLocalStorage.__abPairOffer, 'cart service hooked through chunk loading');

  productPageAdd(PRODUCTIVE);
  await wait(700);
  assert.equal(popup(), null, 'one book of the set does not open it');

  productPageAdd(MINDMAP);
  const siteModal = window.document.createElement('div');
  siteModal.id = 'ab-added-cart-modal';
  window.document.body.appendChild(siteModal);
  await wait(700);
  assert.ok(popup(), 'popup opens once two of the three are in the cart');
  await wait(0);
  assert.equal(window.document.getElementById('ab-added-cart-modal'), null, "site's own added-to-cart modal is replaced");
  const text = popup().textContent;
  for (const part of ['“' + MINDMAP_NAME + '” কার্টে যুক্ত হয়েছে', 'আপনার কার্টে “' + PM_NAME + '” ও “' + MINDMAP_NAME + '” আছে', 'দ্য বারাকাহ ইফেক্ট', 'মোহাম্মাদ ফারিস', '288', 'আমল বুকস', '1st Edition 2026', 'বাংলা', 'Tk 320', 'Tk 600', 'সাশ্রয় Tk 280', 'বরকতের বই', 'তিনটি বই একসাথে অর্ডার করলে ডেলিভারি চার্জ Tk 0']) {
    assert.ok(text.includes(part), 'popup shows ' + part);
  }
  assert.equal(popup().querySelector('.ab-po-desc script, .ab-po-desc img'), null, 'description is plain text');
  assert.equal(window.__xss, undefined);
  assert.equal(popup().querySelector('a.ab-po-more').getAttribute('href'), '/product-details/the-barakah-effect');
  assert.equal(window.document.activeElement, button(/কার্টে যোগ করুন/), 'focus starts on the add button');
  assert.ok(window.document.documentElement.classList.contains('ab-pair-offer-open'), 'page scroll locked');

  button(/কার্টে যোগ করুন/).click();
  await wait(0);
  assert.deepEqual(guestCart().map((entry) => entry.product), [PRODUCTIVE, MINDMAP, BARAKAH], 'Barakah added to the guest cart');
  assert.deepEqual(calls.refresh, [false], "app's cart refreshed in place");
  const tracked = window.dataLayer.filter((entry) => entry && entry.event === 'add_to_cart');
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0].ecommerce.items[0].item_id, BARAKAH);
  assert.equal(tracked[0].ecommerce.value, 320);
  assert.ok(popup().textContent.includes('এই অর্ডারে আপনার ডেলিভারি এখন ফ্রি'), 'success message');
  assert.ok(button(/অর্ডার করুন/), 'offers checkout next');
  button(/আরও বই দেখুন/).click();
  assert.equal(popup(), null);
  assert.equal(window.document.documentElement.classList.contains('ab-pair-offer-open'), false);

  // All three in the cart: later adds never open it.
  productPageAdd(OTHER);
  await wait(700);
  assert.equal(popup(), null, 'no popup once all three are in the cart');

  // The checkout patch from package-free-delivery.html still works alongside the popup's hooks.
  const checkout = new page.Checkout([PRODUCTIVE, MINDMAP, BARAKAH].map((id) => ({ cartType: 0, selectedQty: 1, product: { _id: id } })));
  assert.equal(checkout.calculateDeliveryCharge(), 0, 'checkout delivery is free with all three');
  checkout.carts = checkout.carts.slice(0, 2);
  assert.equal(checkout.calculateDeliveryCharge(), 75, 'and charged again with two of them');
}

async function checkEveryAddAndOtherOffers() {
  // Barakah + the app's own add path for প্রোডাক্টিভ মুসলিম: the mind map is offered.
  const page = storefront('https://www.amolbooks.com/product-list', { cart: [line(BARAKAH)] });
  const { window, popup, button, cart } = page;
  cart.addCartItemToLocalStorage({ product: PRODUCTIVE, selectedQty: 1 });
  await wait(700);
  assert.ok(popup(), "popup opens for the app's own add-to-cart path");
  assert.ok(popup().textContent.includes('আপনার কার্টে “' + PM_NAME + '” ও “দ্য বারাকাহ ইফেক্ট” আছে'));
  assert.equal(popup().querySelector('.ab-po-name').textContent, MINDMAP_NAME, 'offers the missing book');
  assert.ok(popup().textContent.includes('Tk 296'), 'mind map price (37% off 470)');
  assert.equal(popup().querySelector('a.ab-po-more').getAttribute('href'), '/product-details/islami-orthonity-o-uddokta-47');
  assert.equal(popup().querySelector('.ab-po-cover img').getAttribute('src'), 'https://apisub.amolbooks.com/api/upload/images/mindmap.webp');
  button(/না, ধন্যবাদ/).click();
  assert.equal(popup(), null);

  // After "না, ধন্যবাদ", any further add brings it back while two of the three are in.
  cart.addCartItemToLocalStorage({ product: OTHER, selectedQty: 1 });
  await wait(700);
  assert.ok(popup(), 'another book brings the offer back');
  assert.ok(popup().textContent.includes('বইটি কার্টে যুক্ত হয়েছে'), 'unknown book name falls back to "বইটি"');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(popup(), null, 'Escape closes it');
  cart.addCartItemToLocalStorage({ product: { _id: OTHER, name: 'অন্য বই' }, selectedQty: 1 });
  await wait(700);
  assert.ok(popup().textContent.includes('“অন্য বই” কার্টে যুক্ত হয়েছে'), 'and again, with the added book named');
  popup().click();
  assert.equal(popup(), null, 'clicking outside closes it');
  cart.addComboCartItemToLocalStorage({ product: util.FREE_DELIVERY_PACKAGE_ID, selectedQty: 1, cartType: 1 });
  await wait(700);
  assert.ok(popup(), 'adding a package brings it back too');
  button(/×/).click();

  // Nothing for fewer than two books of the set.
  const other = storefront('https://www.amolbooks.com/');
  other.cart.addCartItemToLocalStorage({ product: OTHER, selectedQty: 1 });
  other.cart.addCartItemToLocalStorage({ product: PRODUCTIVE, selectedQty: 1 });
  await wait(700);
  assert.equal(other.popup(), null, 'one book of the set plus others does not open it');

  // The missing book out of stock: no offer. Its record unreadable: offered without a price.
  const soldOut = storefront('https://www.amolbooks.com/', { cart: [line(PRODUCTIVE)], products: { ...PRODUCTS, 'the-barakah-effect': { ...PRODUCTS['the-barakah-effect'], quantity: 0 } } });
  soldOut.cart.addCartItemToLocalStorage({ product: MINDMAP, selectedQty: 1 });
  await wait(700);
  assert.equal(soldOut.popup(), null, 'sold-out book is not offered');
  const offline = storefront('https://www.amolbooks.com/', { cart: [line(MINDMAP)], products: {} });
  offline.cart.addCartItemToLocalStorage({ product: BARAKAH, selectedQty: 1 });
  await wait(700);
  assert.ok(offline.popup(), 'offered from the built-in details when the record cannot be read');
  assert.equal(offline.popup().querySelector('.ab-po-name').textContent, PM_NAME);
  assert.equal(offline.popup().querySelector('.ab-po-price'), null, 'no price without the live record');
}

async function checkSignedIn() {
  // The app's cart list is refreshed later than the add response: the added book still counts.
  const page = storefront('https://www.amolbooks.com/product-details/islami-orthonity-o-uddokta-47', { signedIn: true, cart: [line(PRODUCTIVE)], listCatchesUp: false });
  const { window, popup, button, cart, calls } = page;
  let appSaw = 0;
  cart.addToCart({ product: MINDMAP, selectedQty: 1 }).subscribe({ next: () => { appSaw += 1; } });
  assert.equal(appSaw, 1, 'the app still receives its response');
  assert.equal(calls.subscriptions, 1, 'one cart request, not two');
  await wait(700);
  assert.ok(popup(), 'popup opens after a signed-in add');
  assert.equal(popup().querySelector('.ab-po-name').textContent, 'দ্য বারাকাহ ইফেক্ট');
  button(/কার্টে যোগ করুন/).click();
  await wait(0);
  assert.deepEqual(calls.serverAdds, [MINDMAP, BARAKAH], 'Barakah added to the saved cart');
  assert.deepEqual(calls.refresh, [false]);
  assert.equal(window.dataLayer, undefined, 'signed-in adds are tracked by the cart API listener, not twice');
  button(/আরও বই দেখুন/).click();
  // The tracking script reports that add as a bare "added" event; the site's modal must not pop up for it.
  const late = window.document.createElement('div');
  late.id = 'ab-added-cart-modal';
  window.document.body.appendChild(late);
  await wait(0);
  assert.equal(window.document.getElementById('ab-added-cart-modal'), null);
}

async function checkBuyNowThenCheckout() {
  const product = storefront('https://www.amolbooks.com/product-details/productive%20muslim', { cart: [line(MINDMAP)], body: '<button data-ab-action-label="buy-now">Buy Now</button>' });
  product.window.document.querySelector('[data-ab-action-label="buy-now"]').click();
  product.productPageAdd(PRODUCTIVE);
  await wait(700);
  assert.equal(product.popup(), null, 'Buy Now goes straight to checkout');

  const checkout = storefront('https://www.amolbooks.com/checkout', { cart: [line(PRODUCTIVE), line(MINDMAP)], body: '<app-checkout></app-checkout>' });
  await wait(1300);
  assert.ok(checkout.popup(), 'offered once at checkout');
  const text = checkout.popup().textContent;
  assert.ok(text.includes('আপনার কার্টে “' + PM_NAME + '” ও “' + MINDMAP_NAME + '” আছে'));
  assert.ok(!text.includes('কার্টে যুক্ত হয়েছে'));
  checkout.button(/কার্টে যোগ করুন/).click();
  await wait(0);
  assert.deepEqual(checkout.calls.refresh, [false], "checkout's cart (and delivery charge) refreshes in place");
  assert.ok(checkout.button(/ঠিক আছে/), 'at checkout the next step is just "ঠিক আছে"');
  checkout.button(/ঠিক আছে/).click();
  await wait(1300);
  assert.equal(checkout.popup(), null, 'not offered again');

  const declined = storefront('https://www.amolbooks.com/checkout', { cart: [line(MINDMAP), line(BARAKAH)], body: '<app-checkout></app-checkout>' });
  await wait(1300);
  assert.equal(declined.popup().querySelector('.ab-po-name').textContent, PM_NAME);
  declined.button(/না, ধন্যবাদ/).click();
  await wait(1300);
  assert.equal(declined.popup(), null, 'checkout offers it only once per visit');

  const single = storefront('https://www.amolbooks.com/checkout', { cart: [line(BARAKAH)], body: '<app-checkout></app-checkout>' });
  await wait(1300);
  assert.equal(single.popup(), null, 'one book of the set at checkout: no offer');
}

(async () => {
  checkRules();
  await checkOrderTotals();
  await checkGuestProductPage();
  await checkEveryAddAndOtherOffers();
  await checkSignedIn();
  await checkBuyNowThenCheckout();
  console.log('Book set offer: server/checkout rules agree, order totals, popup (two of three, every add, other offers, signed-in, Buy Now/checkout, site modal) pass');
  // The simulated pages keep their timers running; nothing else is pending.
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
