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
  var productPagesSlug = '';
  var productPagesValue = 0;
  var productPagesLoading = false;
  var PRODUCT_PAGES_MARKER = 'data-ab-product-pages';
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

  function isProductPage() {
    return location.pathname.indexOf('/product-details/') !== -1 ||
      location.pathname.indexOf('/product-detail/') !== -1;
  }

  function productSlug() {
    var parts = location.pathname.split('/').filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
  }

  function positivePages(value) {
    var text = toEnglishDigits(String(value || '')).replace(/[^0-9]/g, '');
    var pages = Number(text);
    return isFinite(pages) && pages > 0 ? Math.round(pages) : 0;
  }

  function pagesFromDescription(html) {
    if (!html) return 0;
    var box = document.createElement('div');
    box.innerHTML = String(html);
    var text = (box.textContent || box.innerText || '').replace(/\\s+/g, ' ');
    var match = text.match(/(?:number\\s+of\\s+pages?|total\\s+pages?|pages?)\\s*[:：–—-]?\\s*([0-9০-৯]+)/i) ||
      text.match(/([0-9০-৯]+)\\s*(?:পৃষ্ঠা|pages?)/i);
    return match ? positivePages(match[1]) : 0;
  }

  function findWeightHeading() {
    var headings = document.querySelectorAll('.product-title h4');
    for (var i = 0; i < headings.length; i++) {
      var text = (headings[i].textContent || '').trim();
      if (/^\\d+(?:\\.\\d+)?\\s*(?:grams?|gram|gm|g|kg)$/i.test(text)) return headings[i];
    }
    return null;
  }

  function restoreProductWeight() {
    var heading = document.querySelector('[' + PRODUCT_PAGES_MARKER + ']');
    if (!heading) return;
    var original = heading.getAttribute(PRODUCT_PAGES_MARKER);
    if (original !== null) heading.textContent = original;
    heading.removeAttribute(PRODUCT_PAGES_MARKER);
  }

  function replaceProductWeight() {
    if (!productPagesValue || !isProductPage()) return;
    var heading = document.querySelector('.product-title h4[' + PRODUCT_PAGES_MARKER + ']') ||
      findWeightHeading();
    if (!heading) return;
    if (!heading.hasAttribute(PRODUCT_PAGES_MARKER)) {
      heading.setAttribute(PRODUCT_PAGES_MARKER, heading.textContent || '');
    }
    var label = 'Number of Pages: ' + productPagesValue;
    if (heading.textContent !== label) heading.textContent = label;
  }

  function loadProductPages() {
    if (!isProductPage()) return;
    var slug = productSlug();
    if (!slug || productPagesLoading || productPagesSlug === slug) {
      replaceProductWeight();
      return;
    }
    productPagesSlug = slug;
    productPagesValue = 0;
    productPagesLoading = true;
    fetch('/api/product/get-by-slug/' + encodeURIComponent(slug), {
      credentials: 'same-origin',
    })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (result) {
        if (productPagesSlug !== slug || !result || !result.data) return;
        productPagesValue = positivePages(result.data.totalPages) ||
          pagesFromDescription(result.data.description);
        replaceProductWeight();
      })
      .catch(function () {})
      .then(function () {
        if (productPagesSlug === slug) productPagesLoading = false;
      });
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
      loadProductPages();
      replaceProductWeight();
    }, 80);
  }

  function restartObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleConvert);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    if (!document.body) return;
    lastPath = location.pathname;
    convertPrices();
    simplifyCheckoutSummary();
    acceptHiddenCheckoutTerms();
    loadProductPages();
    restartObserver();
  }

  function maybeRouteChanged() {
    if (location.pathname === lastPath) return;
    restoreProductWeight();
    productPagesSlug = '';
    productPagesValue = 0;
    productPagesLoading = false;
    lastPath = location.pathname;
    scheduleConvert();
  }

  boot();
  window.addEventListener('popstate', maybeRouteChanged);
  setInterval(maybeRouteChanged, POLL_MS);
})();
`;
