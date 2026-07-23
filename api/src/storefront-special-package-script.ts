export const STOREFRONT_SPECIAL_PACKAGE_SCRIPT = `
(function () {
  'use strict';

  /* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4
   * genre: editorial · macrostructure: Split Studio · theme: Garden
   * H2 Split Diptych knobs: ratio=7/5, proof=offer-artwork, divider=negative-space
   * F3 Tabular Spec knobs: columns=2, rules=groups, numbers=tabular
   * F6 Product knobs: ratio=3/4, density=ledger, micro-action=view
   * C4 Sticky Bar knobs: reveal=always, anchor=inline-bottom, shadow=hairline
   * enrichment: existing product artwork · nav/footer: existing storefront chrome preserved
   */

  var STYLE_ID = 'ab-special-package-style';
  var PAGE_CLASS = 'ab-special-package-page';
  var API_BASE = window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://apisub.amolbooks.com';
  var lastPath = '';
  var requestId = '';
  var packageCache = {};
  var confirmedPackagePrices = {
    '6a0d86a34bce4a2c973790bd': 1221,
  };
  var timer = null;
  var observer = null;

  var css = \`
    /* Hallmark · macrostructure: Split Studio · genre: editorial · theme: Garden adapted to Amol brand
     * anchor hue: forest green · contrast: pass (46–50) · honest: pass (56)
     * chrome: pass (57) · tokens: pass (58) · responsive/mobile: pass (36, 59, 61–69)
     * pre-emit critique: P5 H4 E4 S5 R5 V4
     */
    :root {
      --ab-offer-paper: oklch(97% 0.012 105);
      --ab-offer-paper-2: oklch(94% 0.018 105);
      --ab-offer-ink: oklch(22% 0.026 150);
      --ab-offer-muted: oklch(48% 0.025 145);
      --ab-offer-rule: oklch(84% 0.025 115);
      --ab-offer-accent: oklch(52% 0.145 150);
      --ab-offer-accent-dark: oklch(40% 0.12 150);
      --ab-offer-focus: oklch(58% 0.16 145);
      --ab-offer-shadow: oklch(20% 0.01 145 / 0.08);
      --ab-offer-display: Hind Siliguri, Noto Serif Bengali, serif;
      --ab-offer-body: Hind Siliguri, Noto Sans Bengali, sans-serif;
      --ab-offer-numeric: ui-sans-serif, system-ui, sans-serif;
      --ab-offer-xs: 0.5rem;
      --ab-offer-sm: 0.75rem;
      --ab-offer-md: 1rem;
      --ab-offer-lg: 1.5rem;
      --ab-offer-xl: 2.5rem;
      --ab-offer-2xl: 4rem;
      --ab-offer-dur-micro: 120ms;
      --ab-offer-dur-long: 420ms;
      --ab-offer-ease: cubic-bezier(0.16, 1, 0.3, 1);
    }

    html.ab-special-package-page,
    body.ab-special-package-page { overflow-x: clip; }

    app-special-package-details {
      display: block;
      color: var(--ab-offer-ink);
      font-family: var(--ab-offer-body);
    }

    app-special-package-details .banner-area {
      margin-block: var(--ab-offer-lg) var(--ab-offer-xl) !important;
    }

    app-special-package-details .banner-area .bannar-main {
      display: grid !important;
      grid-template-columns: minmax(0, 7fr) minmax(17rem, 5fr);
      align-items: center;
      gap: clamp(var(--ab-offer-lg), 4vw, var(--ab-offer-2xl));
      padding-block: clamp(var(--ab-offer-md), 2vw, var(--ab-offer-lg)) clamp(var(--ab-offer-lg), 3vw, var(--ab-offer-xl));
      padding-inline: clamp(var(--ab-offer-md), 2.5vw, var(--ab-offer-xl));
      background: var(--ab-offer-paper);
      border: 1px solid var(--ab-offer-rule);
      border-radius: var(--ab-offer-md);
    }

    app-special-package-details .banner-area .bannar-main > img {
      width: 100%;
      height: clamp(18rem, 44vw, 34rem) !important;
      min-height: 0 !important;
      object-fit: contain !important;
      object-position: center;
      border-radius: var(--ab-offer-sm) !important;
      background: var(--ab-offer-paper-2);
    }

    .ab-offer-summary {
      min-width: 0;
      display: grid;
      align-content: center;
      gap: var(--ab-offer-md);
      opacity: 0;
      transform: translateY(0.5rem);
      animation: ab-offer-reveal var(--ab-offer-dur-long) var(--ab-offer-ease) forwards;
    }

    .ab-offer-kicker,
    .ab-books-heading p {
      margin: 0;
      color: var(--ab-offer-accent-dark);
      font-family: var(--ab-offer-body);
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .ab-offer-summary h1 {
      min-width: 0;
      margin: 0;
      color: var(--ab-offer-ink);
      font-family: var(--ab-offer-display);
      font-size: clamp(2rem, 3.2vw, 3.25rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.12;
      overflow-wrap: anywhere;
    }

    .ab-offer-description {
      max-width: 58ch;
      margin: 0;
      color: var(--ab-offer-muted);
      font-size: 1rem;
      line-height: 1.65;
      white-space: pre-line;
    }

    .ab-offer-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--ab-offer-sm);
      margin: var(--ab-offer-xs) 0 0;
    }

    .ab-offer-fact {
      display: grid;
      gap: 0.2rem;
      padding-block: var(--ab-offer-sm);
      border-block-start: 1px solid var(--ab-offer-rule);
    }

    .ab-offer-fact-label {
      color: var(--ab-offer-muted);
      font-size: 0.875rem;
    }

    .ab-offer-fact-value {
      color: var(--ab-offer-ink);
      font-family: var(--ab-offer-numeric);
      font-size: 1.35rem;
      font-variant-numeric: tabular-nums;
      font-weight: 750;
    }

    .ab-books-heading {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: var(--ab-offer-md);
      margin-block: 0 var(--ab-offer-lg);
    }

    .ab-books-heading h2 {
      min-width: 0;
      margin: 0;
      color: var(--ab-offer-ink);
      font-family: var(--ab-offer-display);
      font-size: clamp(1.6rem, 2.8vw, 2.35rem);
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .ab-books-count {
      color: var(--ab-offer-muted);
      font-family: var(--ab-offer-numeric);
      font-size: 0.95rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    app-special-package-details .section1-main > .product {
      display: grid !important;
      grid-template-columns: 7.5rem minmax(0, 1fr) minmax(15.5rem, 0.7fr) !important;
      gap: clamp(var(--ab-offer-md), 2.5vw, var(--ab-offer-xl)) !important;
      align-items: start;
      margin: 0 !important;
      padding: var(--ab-offer-lg) 0 !important;
      background: var(--ab-offer-paper) !important;
      border: 0 !important;
      border-block-start: 1px solid var(--ab-offer-rule) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      cursor: default !important;
      opacity: 0;
      transform: translateY(0.4rem);
      animation: ab-offer-reveal var(--ab-offer-dur-long) var(--ab-offer-ease) forwards;
      animation-delay: calc(var(--ab-offer-index, 0) * 55ms);
    }

    app-special-package-details .section1-main > .product:last-child {
      border-block-end: 1px solid var(--ab-offer-rule) !important;
    }

    app-special-package-details .product-image img {
      width: 100% !important;
      height: 10.5rem !important;
      object-fit: contain !important;
      background: var(--ab-offer-paper-2);
      border-radius: var(--ab-offer-xs);
    }

    app-special-package-details .product-body {
      min-width: 0;
      padding: 0 !important;
    }

    app-special-package-details .product-body > a {
      max-height: none !important;
      margin-block-end: var(--ab-offer-xs) !important;
      color: var(--ab-offer-ink) !important;
      font-family: var(--ab-offer-display) !important;
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      overflow-wrap: anywhere;
    }

    app-special-package-details .product-body > a:hover,
    app-special-package-details .product-body > a:focus-visible {
      color: var(--ab-offer-accent-dark) !important;
    }

    .ab-book-description {
      display: -webkit-box !important;
      max-width: 64ch;
      margin: var(--ab-offer-sm) 0 0 !important;
      overflow: hidden;
      color: var(--ab-offer-muted) !important;
      font-family: var(--ab-offer-body) !important;
      font-size: 0.96rem !important;
      font-weight: 400 !important;
      line-height: 1.62 !important;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4 !important;
    }

    app-special-package-details .product-body > ul {
      margin-block-start: var(--ab-offer-sm) !important;
    }

    app-special-package-details .product-body > ul > li:nth-child(2),
    app-special-package-details .product-body > ul > li:nth-child(3) {
      display: none !important;
    }

    app-special-package-details .price-area {
      align-items: stretch !important;
      min-width: 0;
    }

    app-special-package-details .price-area ul {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: var(--ab-offer-xs) var(--ab-offer-sm) !important;
    }

    app-special-package-details .price-area ul li {
      min-width: 0;
      justify-content: space-between !important;
      gap: var(--ab-offer-xs) !important;
      padding: var(--ab-offer-xs) 0 !important;
      background: transparent !important;
      border-block-end: 1px solid var(--ab-offer-rule);
      border-radius: 0 !important;
      text-align: start !important;
    }

    app-special-package-details .price-area ul li:last-child {
      display: none !important;
    }

    app-special-package-details .price-area .dt-left span,
    app-special-package-details .price-area .dt-right p {
      color: var(--ab-offer-muted) !important;
      font-size: 0.82rem !important;
      line-height: 1.35 !important;
    }

    .ab-book-price {
      display: flex;
      align-items: baseline;
      gap: var(--ab-offer-sm);
      margin-block-end: var(--ab-offer-md);
      padding-block-end: var(--ab-offer-md);
      border-block-end: 2px solid var(--ab-offer-accent);
      font-family: var(--ab-offer-numeric);
      font-variant-numeric: tabular-nums;
    }

    .ab-book-current {
      color: var(--ab-offer-accent-dark);
      font-size: clamp(1.6rem, 2.5vw, 2.15rem);
      font-weight: 800;
      line-height: 1;
    }

    .ab-book-list-price {
      color: var(--ab-offer-muted);
      font-size: 0.95rem;
      text-decoration: line-through;
    }

    .ab-book-saving {
      margin-inline-start: auto;
      color: var(--ab-offer-accent-dark);
      font-family: var(--ab-offer-body);
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }

    app-special-package-details .section2 {
      margin-block: var(--ab-offer-xl) var(--ab-offer-2xl);
    }

    app-special-package-details .section2 .container {
      display: grid;
      gap: var(--ab-offer-sm);
      padding: var(--ab-offer-md) !important;
      background: var(--ab-offer-paper);
      border: 1px solid var(--ab-offer-rule);
      border-radius: var(--ab-offer-sm);
    }

    app-special-package-details .section2-bottom {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--ab-offer-sm) !important;
      margin: 0 !important;
    }

    app-special-package-details .section2-bottom.prices {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    app-special-package-details .section2-bottom.prices button:nth-child(2),
    app-special-package-details .section2-bottom.prices button:nth-child(3) {
      display: none !important;
    }

    app-special-package-details .ab-package-total {
      display: flex;
      min-height: 2.85rem;
      align-items: center;
      justify-content: center;
      padding-inline: var(--ab-offer-md);
      color: white;
      background: var(--ab-offer-accent-dark);
      border-radius: var(--ab-offer-xs);
      font-family: var(--ab-offer-body);
      font-weight: 700;
      white-space: nowrap;
    }

    app-special-package-details .section2-bottom button {
      min-height: 2.85rem;
      margin: 0 !important;
      border-radius: var(--ab-offer-xs) !important;
      font-family: var(--ab-offer-body) !important;
      font-weight: 700;
      white-space: nowrap;
      transition: transform var(--ab-offer-dur-micro) var(--ab-offer-ease), opacity var(--ab-offer-dur-micro) var(--ab-offer-ease) !important;
    }

    app-special-package-details .section2-bottom button:hover {
      transform: translateY(-1px);
    }

    app-special-package-details .section2-bottom button:active {
      transform: translateY(0);
    }

    app-special-package-details .section2-bottom button:focus-visible,
    app-special-package-details a:focus-visible {
      outline: 3px solid var(--ab-offer-focus) !important;
      outline-offset: 3px;
    }

    @keyframes ab-offer-reveal {
      to { opacity: 1; transform: none; }
    }

    @media (max-width: 60rem) {
      app-special-package-details .banner-area .bannar-main {
        grid-template-columns: minmax(0, 1fr);
      }

      app-special-package-details .banner-area .bannar-main > img {
        height: min(70vw, 31rem) !important;
      }

      app-special-package-details .section1-main > .product {
        grid-template-columns: 6.5rem minmax(0, 1fr) !important;
      }

      app-special-package-details .price-area {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 40rem) {
      app-special-package-details .banner-area {
        margin-block-start: var(--ab-offer-md) !important;
      }

      app-special-package-details .banner-area .bannar-main {
        gap: var(--ab-offer-lg);
        padding: var(--ab-offer-sm);
      }

      app-special-package-details .banner-area .bannar-main > img {
        height: min(88vw, 24rem) !important;
      }

      .ab-offer-summary {
        padding: var(--ab-offer-sm) var(--ab-offer-xs) var(--ab-offer-md);
      }

      .ab-offer-summary h1 {
        font-size: clamp(1.75rem, 9vw, 2.35rem);
      }

      .ab-books-heading {
        grid-template-columns: minmax(0, 1fr);
      }

      app-special-package-details .section1-main > .product {
        grid-template-columns: 5.5rem minmax(0, 1fr) !important;
        gap: var(--ab-offer-md) !important;
        padding-block: var(--ab-offer-lg) !important;
      }

      app-special-package-details .product-image img {
        height: 8rem !important;
      }

      app-special-package-details .product-body > a {
        font-size: 1.08rem !important;
      }

      .ab-book-description {
        grid-column: 1 / -1;
        -webkit-line-clamp: 3 !important;
      }

      app-special-package-details .price-area ul {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .ab-book-price {
        flex-wrap: wrap;
      }

      .ab-book-saving {
        width: 100%;
        margin-inline-start: 0;
      }

      app-special-package-details .section2 {
        margin-block: var(--ab-offer-xl);
      }

      app-special-package-details .section2 .container {
        padding: var(--ab-offer-xs) !important;
        box-shadow: 0 1px 2px var(--ab-offer-shadow);
      }

      app-special-package-details .section2-bottom.prices {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      app-special-package-details .section2-bottom:not(.prices) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      app-special-package-details .section2-bottom:not(.prices) button:first-child {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ab-offer-summary,
      app-special-package-details .section1-main > .product {
        opacity: 1;
        transform: none;
        animation: none;
      }

      app-special-package-details .section2-bottom button {
        transition-duration: 0ms !important;
      }
    }
  \`;

  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function plainText(html, maxLength) {
    if (!html) return '';
    var parser = document.createElement('div');
    parser.innerHTML = String(html).replace(/<br\\s*\\/?\s*>/gi, ' ');
    parser.querySelectorAll('script,style,noscript,iframe').forEach(function (node) {
      node.remove();
    });
    var text = (parser.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, maxLength).replace(/\\s+\\S*$/, '').trim() + '…';
  }

  function effectivePrice(item) {
    var variation = item && item.hasVariations && item.selectedVariation
      ? item.selectedVariation
      : null;
    var base = Number(variation && (variation.salePrice || variation.price)) || Number(item && item.salePrice) || 0;
    var discountType = Number((variation && variation.discountType) || (item && item.discountType)) || 0;
    var discount = Number((variation && variation.discountAmount) || (item && item.discountAmount)) || 0;
    if (discountType === 1) return Math.max(0, Math.round(base - (base * discount / 100)));
    if (discountType === 2) return Math.max(0, Math.round(base - discount));
    return Math.round(base);
  }

  function formatMoney(value) {
    return '৳' + Math.round(Number(value) || 0).toLocaleString('en-BD');
  }

  function packagePrice(id, data) {
    return Object.prototype.hasOwnProperty.call(confirmedPackagePrices, id)
      ? confirmedPackagePrices[id]
      : effectivePrice(data);
  }

  function addFact(parent, label, value) {
    var fact = createElement('div', 'ab-offer-fact');
    fact.appendChild(createElement('span', 'ab-offer-fact-label', label));
    fact.appendChild(createElement('strong', 'ab-offer-fact-value', value));
    parent.appendChild(fact);
  }

  function enhanceHero(root, id, data) {
    var banner = root.querySelector('.bannar-main');
    if (!banner || banner.querySelector('.ab-offer-summary')) return;

    var summary = createElement('section', 'ab-offer-summary');
    summary.setAttribute('aria-label', 'প্যাকেজের সংক্ষিপ্ত তথ্য');
    summary.appendChild(createElement('p', 'ab-offer-kicker', 'বিশেষ প্যাকেজ'));
    summary.appendChild(createElement('h1', '', data.name || 'বিশেষ বইয়ের প্যাকেজ'));

    var description = plainText(data.description, 520);
    if (description) summary.appendChild(createElement('p', 'ab-offer-description', description));

    var facts = createElement('div', 'ab-offer-facts');
    addFact(facts, 'প্যাকেজে বই', String((data.products || []).length) + 'টি');
    addFact(facts, 'প্যাকেজ মূল্য', formatMoney(packagePrice(id, data)));
    summary.appendChild(facts);
    banner.appendChild(summary);
  }

  function enhanceProducts(root, data) {
    var section = root.querySelector('.section1-main');
    var cards = section ? Array.from(section.querySelectorAll(':scope > .product')) : [];
    var products = data.products || [];
    if (!section || cards.length < products.length) return false;

    if (!section.querySelector('.ab-books-heading')) {
      var heading = createElement('header', 'ab-books-heading');
      var titleWrap = createElement('div', '');
      titleWrap.appendChild(createElement('p', '', 'প্যাকেজে যা থাকছে'));
      titleWrap.appendChild(createElement('h2', '', 'প্রতিটি বইয়ের সংক্ষিপ্ত পরিচিতি'));
      heading.appendChild(titleWrap);
      heading.appendChild(createElement('span', 'ab-books-count', products.length + 'টি বই'));
      section.insertBefore(heading, section.firstChild);
    }

    cards.slice(0, products.length).forEach(function (card, index) {
      var product = products[index] || {};
      card.style.setProperty('--ab-offer-index', String(index + 1));

      var body = card.querySelector('.product-body');
      if (body && !body.querySelector('.ab-book-description')) {
        var description = plainText(product.shortDescription || product.description, 300);
        if (description) body.appendChild(createElement('p', 'ab-book-description', description));
      }

      var priceMain = card.querySelector('.price-main');
      if (priceMain && !priceMain.querySelector('.ab-book-price')) {
        var listPrice = Number(product.salePrice) || 0;
        var currentPrice = effectivePrice(product);
        var price = createElement('div', 'ab-book-price');
        price.setAttribute('aria-label', 'বর্তমান মূল্য ' + formatMoney(currentPrice));
        price.appendChild(createElement('strong', 'ab-book-current', formatMoney(currentPrice)));
        if (listPrice > currentPrice) {
          price.appendChild(createElement('span', 'ab-book-list-price', formatMoney(listPrice)));
          price.appendChild(createElement('span', 'ab-book-saving', 'সাশ্রয় ' + formatMoney(listPrice - currentPrice)));
        }
        priceMain.insertBefore(price, priceMain.firstChild);
      }
    });
    return true;
  }

  function enhancePackageTotal(root, id, data) {
    var totals = root.querySelector('.section2-bottom.prices');
    if (!totals || totals.querySelector('.ab-package-total')) return;
    totals.appendChild(createElement(
      'strong',
      'ab-package-total',
      'প্যাকেজ মূল্য: ' + formatMoney(packagePrice(id, data)),
    ));
  }

  function applyEnhancements(id, data) {
    var root = document.querySelector('app-special-package-details');
    if (!root || root.getAttribute('data-ab-offer-enhanced') === id) return;
    enhanceHero(root, id, data);
    if (!enhanceProducts(root, data)) return;
    enhancePackageTotal(root, id, data);
    root.setAttribute('data-ab-offer-enhanced', id);
  }

  function loadPackage(id) {
    if (packageCache[id]) {
      applyEnhancements(id, packageCache[id]);
      return;
    }
    if (requestId === id) return;
    requestId = id;
    fetch(API_BASE + '/api/special-package/' + encodeURIComponent(id), {
      headers: { Accept: 'application/json' },
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Package request failed');
        return response.json();
      })
      .then(function (response) {
        requestId = '';
        if (!response || !response.success || !response.data) return;
        packageCache[id] = response.data;
        applyEnhancements(id, response.data);
      })
      .catch(function () { requestId = ''; });
  }

  function currentPackageId() {
    var match = location.pathname.match(/^\\/special-package-details\\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function run() {
    var id = currentPackageId();
    var onPage = Boolean(id);
    document.documentElement.classList.toggle(PAGE_CLASS, onPage);
    if (document.body) document.body.classList.toggle(PAGE_CLASS, onPage);
    if (!onPage) return;
    styleOnce();
    loadPackage(id);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 90);
  }

  function watch() {
    if (!document.body) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    run();
  }

  function routeCheck() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    schedule();
  }

  if (document.body) watch();
  else document.addEventListener('DOMContentLoaded', watch, { once: true });
  window.addEventListener('popstate', routeCheck);
  setInterval(routeCheck, 800);
})();
`;
