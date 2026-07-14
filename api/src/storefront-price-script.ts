export const STOREFRONT_PRICE_SCRIPT = `
(function () {
  'use strict';

  var STYLE_ID = 'ab-price-english-digits-style';
  var POLL_MS = 900;
  var lastPath = '';
  var timer = null;
  var observer = null;
  var bnDigits = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };

  var priceSelectors = [
    '.price-wrapper',
    '.price-section',
    '.price-area',
    '.product-price',
    '.sale-price',
    '.regular-price',
    '.new-price',
    '.discount-amount',
    '.price-cart .price',
    '.product-info .price',
    '.cart-product-price',
    '.cart-product-price *',
    '.current-price',
    '.old-price',
    '.old-price-container',
    '.summery-area .summery-list',
    '.summery-area .summery-list *',
    '.promo-code-area',
    '.promo-code-area *',
    '.cartSubTotal',
    '.cartDiscountAmount',
    '.Subtotal',
    '.pricePipe',
    '.order-total',
    'app-product-card-one .price',
    'app-product-card-one [class*="price"]',
    'app-product-details [class*="price"]',
    'app-cart-slide .cart-product-price',
    'app-cart-slide .current-price',
    'app-cart-slide .old-price',
    'app-checkout .cart-product-price',
    'app-checkout .summery-area .summery-list',
    'app-checkout .promo-code-area',
  ].join(',');

  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.price-wrapper,.price-section,.price-area,.product-price,.sale-price,.regular-price,.new-price,.discount-amount,' +
      '.price-cart .price,.product-info .price,.cart-product-price,.cart-product-price *,.current-price,.old-price,.old-price-container,' +
      '.summery-area .summery-list,.summery-area .summery-list *,.promo-code-area,.promo-code-area *,.cartSubTotal,.cartDiscountAmount,.Subtotal,.pricePipe,.order-total,' +
      'app-product-card-one .price,app-product-card-one [class*="price"],app-product-details [class*="price"],' +
      'app-cart-slide .cart-product-price,app-cart-slide .current-price,app-cart-slide .old-price,app-checkout .cart-product-price,app-checkout .summery-area .summery-list,app-checkout .promo-code-area{' +
        'font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;' +
        'font-variant-numeric:tabular-nums!important;' +
        'letter-spacing:0!important;' +
      '}' +
      'app-checkout .condition-area{' +
        'display:none!important;' +
      '}';
    document.head.appendChild(s);
  }

  function toEnglishDigits(text) {
    return text.replace(/[\u09E6-\u09EF]/g, function (d) { return bnDigits[d] || d; });
  }

  function looksLikePrice(text) {
    return /[\u09F3\u09E6-\u09EF]|Tk|TK|টাকা|You Save|Off/.test(text || '');
  }

  function convertTextNodes(root) {
    if (!root || !looksLikePrice(root.textContent || '')) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!/[\u09E6-\u09EF]/.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      node.nodeValue = toEnglishDigits(node.nodeValue || '');
    });
  }

  function convertPrices() {
    styleOnce();
    document.querySelectorAll(priceSelectors).forEach(convertTextNodes);
  }

  function acceptHiddenCheckoutTerms() {
    var input = document.querySelector('app-checkout input[formcontrolname="isCheckedTerms"]');
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function scheduleConvert() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      convertPrices();
      acceptHiddenCheckoutTerms();
    }, 80);
  }

  function restartObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleConvert);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    if (!document.body) return;
    convertPrices();
    acceptHiddenCheckoutTerms();
    restartObserver();
  }

  function maybeRouteChanged() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    scheduleConvert();
  }

  boot();
  window.addEventListener('popstate', maybeRouteChanged);
  setInterval(maybeRouteChanged, POLL_MS);
})();
`;
