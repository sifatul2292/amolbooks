export const STOREFRONT_PRICE_SCRIPT = `
(function () {
  'use strict';

  var STYLE_ID = 'ab-price-english-digits-style';
  var SUMMARY_LABEL_CLASS = 'ab-actual-order-label';
  var SUMMARY_VALUE_CLASS = 'ab-actual-order-value';
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
      '}' +
      'app-checkout .summery-list li.ab-summary-hidden{' +
        'display:none!important;' +
      '}' +
      'app-checkout .summery-list li.ab-actual-order-row>.ab-summary-original{' +
        'display:none!important;' +
      '}' +
      'app-checkout .summery-list li.ab-actual-order-row>.' + SUMMARY_LABEL_CLASS + '{' +
        'color:#666;font-family:hind-siliguri,SolaimanLipi,sans-serif!important;font-style:normal;' +
        'font-weight:600;max-width:none;overflow-wrap:normal;word-break:normal;white-space:normal;display:inline-block;' +
      '}' +
      'app-checkout .summery-list li.ab-actual-order-row>.' + SUMMARY_VALUE_CLASS + '{' +
        'font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;' +
        'font-size:18px;font-weight:500;color:#666;white-space:nowrap;display:inline-block;' +
        'font-variant-numeric:tabular-nums;letter-spacing:0;' +
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

  function moneyFrom(element) {
    if (!element) return NaN;
    var matches = toEnglishDigits(element.textContent || '')
      .replace(/,/g, '')
      .match(/-?\\d+(?:\\.\\d+)?/g);
    return matches && matches.length ? Number(matches[matches.length - 1]) : NaN;
  }

  function formatMoney(amount) {
    var rounded = Math.round(amount * 100) / 100;
    return '৳' + rounded.toLocaleString('en-US', {
      minimumFractionDigits: rounded % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  function simplifyCheckoutSummary() {
    var lists = document.querySelectorAll('app-checkout .summery-area .summery-list');
    lists.forEach(function (list) {
      var ul = list.querySelector('ul');
      if (!ul || ul.children.length < 4) return;

      var subtotalRow = ul.children[0];
      var discountRow = ul.children[1];
      var shippingRow = ul.children[2];
      var totalRow = ul.children[3];
      var subtotal = moneyFrom(subtotalRow.lastElementChild);
      var discount = moneyFrom(discountRow.lastElementChild);
      var shipping = moneyFrom(shippingRow.lastElementChild);
      var grandTotal = moneyFrom(totalRow.lastElementChild);
      var actual = grandTotal - shipping;

      if (!isFinite(actual)) actual = subtotal - discount;
      if (!isFinite(actual)) return;
      actual = Math.max(0, actual);

      subtotalRow.classList.add('ab-actual-order-row');
      discountRow.classList.add('ab-summary-hidden');
      totalRow.classList.remove('ab-summary-hidden');

      for (var i = 0; i < subtotalRow.children.length; i++) {
        var child = subtotalRow.children[i];
        if (
          !child.classList.contains(SUMMARY_LABEL_CLASS) &&
          !child.classList.contains(SUMMARY_VALUE_CLASS)
        ) {
          child.classList.add('ab-summary-original');
        }
      }

      var label = subtotalRow.querySelector('.' + SUMMARY_LABEL_CLASS);
      if (!label) {
        label = document.createElement('span');
        label.className = SUMMARY_LABEL_CLASS;
        label.textContent = 'প্রকৃত অর্ডার মূল্য';
        subtotalRow.insertBefore(label, subtotalRow.firstChild);
      }

      var value = subtotalRow.querySelector('.' + SUMMARY_VALUE_CLASS);
      if (!value) {
        value = document.createElement('span');
        value.className = SUMMARY_VALUE_CLASS;
        subtotalRow.appendChild(value);
      }
      var nextValue = formatMoney(actual);
      if (value.textContent !== nextValue) value.textContent = nextValue;
    });
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
      simplifyCheckoutSummary();
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
    simplifyCheckoutSummary();
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
