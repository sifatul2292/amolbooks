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
    'app-product-card-one .price',
    'app-product-card-one [class*="price"]',
    'app-product-details [class*="price"]',
  ].join(',');

  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.price-wrapper,.price-section,.price-area,.product-price,.sale-price,.regular-price,.new-price,.discount-amount,' +
      '.price-cart .price,.product-info .price,app-product-card-one .price,app-product-card-one [class*="price"],app-product-details [class*="price"]{' +
        'font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;' +
        'font-variant-numeric:tabular-nums!important;' +
        'letter-spacing:0!important;' +
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

  function scheduleConvert() {
    clearTimeout(timer);
    timer = setTimeout(convertPrices, 80);
  }

  function restartObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleConvert);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    if (!document.body) return;
    convertPrices();
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
