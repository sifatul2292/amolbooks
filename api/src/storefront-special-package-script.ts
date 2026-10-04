export const STOREFRONT_SPECIAL_PACKAGE_SCRIPT = `
(function () {
  'use strict';

  /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
   * genre: editorial commerce · macrostructure: Stat-Led · theme: Newsprint adapted to Amol green
   * audience: Bangla-speaking Islamic-book shoppers · use: understand the saving, inspect the books, purchase confidently
   * tone: calm, premium, persuasive · enrichment: real offer and book artwork
   * nav/footer: existing storefront chrome preserved
   */

  var STYLE_ID = 'ab-special-package-style';
  var PAGE_CLASS = 'ab-special-package-page';
  var PUBLISHED_API_BASE = 'https://apisub.amolbooks.com';
  var API_BASE = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)
    ? location.origin
    : PUBLISHED_API_BASE;
  var NOTEBOOK_IMAGE = PUBLISHED_API_BASE + '/api/upload/images/amolbooks-notebook-8ddd.webp';
  var lastPath = '';
  var requestId = '';
  var packageCache = {};
  var productCache = {};
  var relatedRequest = null;
  var pdfEnginePromise = null;
  var timer = null;
  var observer = null;

  var css = \`
    /* Hallmark · macrostructure: Long Document · genre: editorial · theme: Linen adapted to Amol green
     * compatibility layer: active mobile-first refinements follow below
     * pre-emit critique: P5 H5 E5 S5 R5 V5
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

    app-special-package-details .section2-bottom.prices button:nth-child(2) {
      display: none !important;
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

  var redesignCss = \`
    /* Hallmark · genre: editorial commerce · macrostructure: Stat-Led · theme: Newsprint adapted to Amol green
     * enrichment: real book artwork + CMS PDF samples · nav/footer: existing storefront chrome
     * responsive: 320/375/414/768 · pre-emit critique: P5 H5 E5 S5 R5 V5
     */
    :root {
      --ab-read-paper: oklch(97% 0.012 105);
      --ab-read-paper-deep: oklch(94% 0.018 105);
      --ab-read-ink: oklch(22% 0.026 150);
      --ab-read-muted: oklch(46% 0.026 145);
      --ab-read-rule: oklch(82% 0.027 115);
      --ab-read-accent: oklch(49% 0.14 150);
      --ab-read-accent-dark: oklch(37% 0.105 150);
      --ab-read-accent-ink: oklch(98% 0.008 105);
      --ab-read-focus: oklch(56% 0.16 145);
      --ab-read-danger: oklch(51% 0.17 28);
      --ab-read-shadow: oklch(20% 0.01 145 / 0.07);
      --ab-read-overlay: oklch(15% 0.02 145 / 0.72);
      --ab-read-page: oklch(100% 0.005 105);
      --ab-read-display: Hind Siliguri, Noto Serif Bengali, serif;
      --ab-read-body: Hind Siliguri, Noto Sans Bengali, sans-serif;
      --ab-read-numeric: ui-sans-serif, system-ui, sans-serif;
      --ab-read-2xs: 0.25rem;
      --ab-read-xs: 0.5rem;
      --ab-read-sm: 0.75rem;
      --ab-read-md: 1rem;
      --ab-read-lg: 1.5rem;
      --ab-read-xl: 2.5rem;
      --ab-read-2xl: 4rem;
      --ab-read-3xl: 6rem;
      --ab-read-radius-sm: 0.375rem;
      --ab-read-radius-md: 0.75rem;
      --ab-read-dur: 120ms;
      --ab-read-ease: cubic-bezier(0.16, 1, 0.3, 1);
    }
    html.ab-special-package-page, body.ab-special-package-page { overflow-x: clip; }
    body.ab-special-package-page { background: var(--ab-read-paper); }
    app-special-package-details { color: var(--ab-read-ink); font-family: var(--ab-read-body); }
    app-special-package-details .banner-area { margin-block: var(--ab-read-lg) var(--ab-read-2xl) !important; }
    app-special-package-details .banner-area .bannar-main { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: var(--ab-read-lg) !important; align-items: center; padding: var(--ab-read-sm) !important; background: var(--ab-read-paper-deep) !important; border: 1px solid var(--ab-read-rule) !important; border-radius: var(--ab-read-radius-md) !important; box-shadow: 0 1px 2px var(--ab-read-shadow) !important; }
    app-special-package-details .banner-area .bannar-main > img { width: 100% !important; height: min(88vw, 24rem) !important; min-height: 0 !important; object-fit: contain !important; background: var(--ab-read-paper) !important; border-radius: var(--ab-read-radius-sm) !important; }
    .ab-offer-summary { gap: var(--ab-read-md) !important; padding: var(--ab-read-sm) var(--ab-read-xs) var(--ab-read-md); opacity: 1 !important; transform: none !important; animation: none !important; }
    .ab-offer-kicker { width: fit-content; margin: 0; padding-block-end: var(--ab-read-2xs); color: var(--ab-read-accent-dark); border-block-end: 2px solid var(--ab-read-accent); font-size: 0.875rem; font-weight: 700; letter-spacing: 0; }
    .ab-offer-summary h1, .ab-books-heading h2, app-special-package-details .product-body > a { min-width: 0; overflow-wrap: anywhere; font-family: var(--ab-read-display) !important; }
    .ab-offer-summary h1 { max-width: 15ch; margin: 0; color: var(--ab-read-ink); font-size: clamp(1.85rem, 8vw, 3rem); font-weight: 700; letter-spacing: -0.025em; line-height: 1.12; }
    .ab-offer-description { max-width: 62ch; margin: 0; color: var(--ab-read-muted); font-size: 1rem; font-weight: 400; line-height: 1.72; white-space: pre-line; }
    .ab-offer-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ab-read-sm); margin-block-start: var(--ab-read-xs); }
    .ab-offer-fact { gap: var(--ab-read-2xs); padding-block: var(--ab-read-sm); border-block-start: 1px solid var(--ab-read-rule); }
    .ab-offer-fact-label { color: var(--ab-read-muted); font-size: 0.875rem; }
    .ab-offer-fact-value { color: var(--ab-read-ink); font-family: var(--ab-read-numeric); font-size: 1.25rem; font-variant-numeric: tabular-nums; font-weight: 800; }
    app-special-package-details .section1 { background: var(--ab-read-paper) !important; }
    app-special-package-details .section1-main { display: block !important; }
    .ab-books-heading { grid-template-columns: minmax(0, 1fr) !important; gap: var(--ab-read-xs); margin-block: 0 var(--ab-read-lg); padding-block-end: var(--ab-read-lg); border-block-end: 1px solid var(--ab-read-rule); }
    .ab-books-heading h2 { max-width: 22ch; margin: 0; color: var(--ab-read-ink); font-size: clamp(1.65rem, 6vw, 2.35rem); font-weight: 700; letter-spacing: -0.018em; line-height: 1.2; }
    .ab-books-heading p { max-width: 62ch; margin: var(--ab-read-sm) 0 0; color: var(--ab-read-muted); font-size: 1rem; font-weight: 400; line-height: 1.65; letter-spacing: 0; }
    .ab-books-count { color: var(--ab-read-accent-dark); font-family: var(--ab-read-numeric); font-size: 0.9rem; font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
    app-special-package-details .section1-main > .product { position: relative; display: grid !important; grid-template-columns: 6.25rem minmax(0, 1fr) !important; gap: var(--ab-read-md) !important; align-items: start; margin: 0 !important; padding: var(--ab-read-xl) 0 !important; background: transparent !important; border: 0 !important; border-block-end: 1px solid var(--ab-read-rule) !important; border-radius: 0 !important; box-shadow: none !important; cursor: default !important; opacity: 1 !important; transform: none !important; animation: none !important; }
    .ab-book-number { position: absolute; inset-block-start: var(--ab-read-lg); inset-inline-end: 0; color: var(--ab-read-rule); font-family: var(--ab-read-numeric); font-size: 2.5rem; font-variant-numeric: tabular-nums; font-weight: 800; line-height: 1; pointer-events: none; }
    app-special-package-details .product-image { min-width: 0; }
    app-special-package-details .product-image img { width: 100% !important; height: 9rem !important; object-fit: contain !important; background: var(--ab-read-paper-deep) !important; border-radius: var(--ab-read-radius-sm) !important; }
    app-special-package-details .product-body { min-width: 0; padding: 0 var(--ab-read-xl) 0 0 !important; }
    app-special-package-details .product-body > a { display: inline !important; max-height: none !important; margin: 0 !important; color: var(--ab-read-ink) !important; font-size: 1.2rem !important; font-weight: 700 !important; line-height: 1.35 !important; text-decoration: none; }
    app-special-package-details .product-body > a:hover { color: var(--ab-read-accent-dark) !important; text-decoration: underline; text-underline-offset: 0.2em; }
    app-special-package-details .product-body > p:not(.ab-book-description), app-special-package-details .product-body > ul { display: none !important; }
    .ab-book-meta { display: flex; flex-wrap: wrap; gap: var(--ab-read-2xs) var(--ab-read-md); margin-block-start: var(--ab-read-sm); color: var(--ab-read-muted); font-size: 0.875rem; line-height: 1.45; }
    .ab-book-meta span + span::before { content: '·'; margin-inline-end: var(--ab-read-md); color: var(--ab-read-rule); }
    app-special-package-details .product-body > p.ab-book-description { display: -webkit-box !important; max-width: 65ch; margin: var(--ab-read-md) 0 0 !important; overflow: hidden !important; color: var(--ab-read-muted) !important; font-family: var(--ab-read-body) !important; font-size: 1rem !important; font-synthesis: none; font-weight: 400 !important; line-height: 1.72 !important; -webkit-box-orient: vertical; -webkit-line-clamp: 4 !important; }
    app-special-package-details .product-body > p.ab-book-description.is-expanded { display: block !important; overflow: visible !important; -webkit-line-clamp: unset !important; }
    .ab-book-description-toggle { position: relative; z-index: 2; min-height: 2.25rem; margin-block-start: var(--ab-read-xs); padding: 0; color: var(--ab-read-accent-dark); background: transparent; border: 0; border-block-end: 1px solid currentColor; border-radius: 0; font-family: var(--ab-read-body); font-size: 0.9rem; font-weight: 700; cursor: pointer; }
    app-special-package-details .price-area { grid-column: 1 / -1; display: block !important; min-width: 0; padding: 0 !important; }
    app-special-package-details .price-area .price-main > ul { display: none !important; }
    .ab-book-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--ab-read-xs) var(--ab-read-sm); margin: 0; padding: 0; border: 0; font-family: var(--ab-read-numeric); font-variant-numeric: tabular-nums; }
    .ab-book-current { color: var(--ab-read-accent-dark); font-size: 1.45rem; font-weight: 800; line-height: 1; }
    .ab-book-list-price { color: var(--ab-read-muted); font-size: 0.95rem; text-decoration: line-through; }
    .ab-book-saving { width: auto; margin: 0; color: var(--ab-read-danger); font-family: var(--ab-read-body); font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
    .ab-book-actions { display: flex; flex-wrap: wrap; gap: var(--ab-read-sm); margin-block-start: var(--ab-read-md); }
    .ab-book-action { position: relative; z-index: 2; display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; padding: var(--ab-read-sm) var(--ab-read-md); color: var(--ab-read-accent-dark) !important; background: transparent; border: 1px solid var(--ab-read-accent); border-radius: var(--ab-read-radius-sm); font-family: var(--ab-read-body) !important; font-size: 0.92rem; font-weight: 700; line-height: 1; text-decoration: none !important; white-space: nowrap; transition: transform var(--ab-read-dur) var(--ab-read-ease), opacity var(--ab-read-dur) var(--ab-read-ease); }
    .ab-book-action--preview { color: var(--ab-read-accent-ink) !important; background: var(--ab-read-accent-dark); border-color: var(--ab-read-accent-dark); }
    .ab-book-action[aria-disabled='true'] { opacity: 0.58; cursor: not-allowed; pointer-events: none; }
    .ab-offer-gift { display: grid; grid-template-columns: 4.75rem minmax(0, 1fr); gap: var(--ab-read-md); align-items: center; padding: var(--ab-read-sm); background: var(--ab-read-paper); border: 1px solid var(--ab-read-rule); border-radius: var(--ab-read-radius-sm); }
    .ab-offer-gift-visual { height: 4.75rem; overflow: hidden; background: var(--ab-read-paper-deep); border-radius: var(--ab-read-radius-sm); }
    .ab-offer-gift-visual img { width: 100%; height: 100%; object-fit: contain; }
    .ab-offer-gift-copy { min-width: 0; }
    .ab-offer-gift-copy span { display: block; color: var(--ab-read-accent-dark); font-size: 0.78rem; font-weight: 700; }
    .ab-offer-gift-copy strong { display: block; color: var(--ab-read-ink); font-size: 1rem; line-height: 1.3; }
    .ab-offer-gift-copy p { margin: var(--ab-read-2xs) 0 0; color: var(--ab-read-muted); font-size: 0.82rem; font-weight: 400; line-height: 1.45; }
    .ab-pdf-dialog { position: fixed; z-index: 10000; inset: 0; display: none; align-items: center; justify-content: center; padding: var(--ab-read-xs); color: var(--ab-read-ink); background: var(--ab-read-overlay); }
    .ab-pdf-dialog.is-open { display: flex; }
    .ab-pdf-dialog-panel { width: min(58rem, 100%); height: min(52rem, calc(100dvh - 1rem)); overflow: hidden; background: var(--ab-read-paper); border: 1px solid var(--ab-read-rule); border-radius: var(--ab-read-radius-md); box-shadow: 0 1rem 3rem var(--ab-read-shadow); }
    .ab-pdf-dialog-header { display: flex; min-height: 3.5rem; align-items: center; justify-content: space-between; gap: var(--ab-read-sm); padding: var(--ab-read-sm) var(--ab-read-md); border-block-end: 1px solid var(--ab-read-rule); }
    .ab-pdf-dialog-title { min-width: 0; margin: 0; overflow: hidden; font-family: var(--ab-read-display); font-size: 1rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .ab-pdf-dialog-close { flex: 0 0 auto; min-width: 2.75rem; min-height: 2.75rem; color: var(--ab-read-ink); background: transparent; border: 1px solid var(--ab-read-rule); border-radius: var(--ab-read-radius-sm); font-family: var(--ab-read-body); font-size: 1.35rem; cursor: pointer; }
    .ab-pdf-dialog-pages { width: 100%; height: calc(100% - 3.5rem); padding: var(--ab-read-sm); overflow-y: auto; overscroll-behavior: contain; background: var(--ab-read-paper-deep); }
    .ab-pdf-dialog-state { display: grid; min-height: 8rem; place-items: center; margin: 0; color: var(--ab-read-muted); font-size: 0.95rem; text-align: center; }
    .ab-pdf-page { display: grid; min-height: 8rem; place-items: center; margin: 0 auto var(--ab-read-sm); }
    .ab-pdf-page canvas { display: block; max-width: 100%; height: auto; background: var(--ab-read-page); box-shadow: 0 1px 3px var(--ab-read-shadow); }
    app-special-package-details .section2 { margin-block: var(--ab-read-2xl) var(--ab-read-3xl); }
    app-special-package-details .section2 .container { display: grid; gap: var(--ab-read-sm); padding: var(--ab-read-sm) !important; background: var(--ab-read-paper-deep); border: 1px solid var(--ab-read-rule); border-radius: var(--ab-read-radius-md); box-shadow: 0 1px 2px var(--ab-read-shadow); }
    app-special-package-details .section2-bottom { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: var(--ab-read-sm) !important; margin: 0 !important; }
    app-special-package-details .section2-bottom.prices { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    app-special-package-details .section2-bottom:not(.prices) { grid-template-columns: minmax(0, 1fr) !important; }
    app-special-package-details .section2-bottom.prices button:nth-child(2), app-special-package-details .section2-bottom:not(.prices) button:first-child { display: none !important; }
    app-special-package-details .section2-bottom button { min-height: 3rem; margin: 0 !important; border-radius: var(--ab-read-radius-sm) !important; font-family: var(--ab-read-body) !important; font-weight: 700; white-space: nowrap; transition: transform var(--ab-read-dur) var(--ab-read-ease), opacity var(--ab-read-dur) var(--ab-read-ease) !important; }
    app-special-package-details .section2-bottom button:disabled, app-special-package-details .section2-bottom button[data-ab-cart-busy='true'] { opacity: 0.62; }
    app-special-package-details .section2-bottom button:focus-visible, app-special-package-details a:focus-visible { outline: 3px solid var(--ab-read-focus) !important; outline-offset: 3px; }
    @media (min-width: 40rem) {
      app-special-package-details .banner-area .bannar-main { padding: var(--ab-read-lg) !important; }
      .ab-offer-facts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ab-books-heading { grid-template-columns: minmax(0, 1fr) auto !important; align-items: end; }
      app-special-package-details .section1-main > .product { grid-template-columns: 7.5rem minmax(0, 1fr) !important; gap: var(--ab-read-lg) !important; }
      app-special-package-details .product-image img { height: 11rem !important; }
      app-special-package-details .product-body { padding-inline-end: var(--ab-read-2xl) !important; }
      app-special-package-details .section2 .container { padding: var(--ab-read-md) !important; }
      app-special-package-details .section2-bottom:not(.prices) { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      app-special-package-details .section2-bottom:not(.prices) button:first-child { display: block !important; }
    }
    @media (min-width: 60rem) {
      app-special-package-details .banner-area .bannar-main { grid-template-columns: minmax(0, 5fr) minmax(20rem, 4fr) !important; gap: clamp(var(--ab-read-xl), 4vw, var(--ab-read-3xl)) !important; padding: clamp(var(--ab-read-lg), 3vw, var(--ab-read-2xl)) !important; }
      app-special-package-details .banner-area .bannar-main > img { height: clamp(24rem, 38vw, 34rem) !important; }
      app-special-package-details .section1-main > .product { grid-template-columns: 8.5rem minmax(0, 1fr) minmax(13rem, 0.36fr) !important; gap: clamp(var(--ab-read-lg), 3vw, var(--ab-read-xl)) !important; }
      app-special-package-details .product-image img { height: 12.5rem !important; }
      app-special-package-details .price-area { grid-column: auto; }
      .ab-book-price { padding-block-end: var(--ab-read-md); border-block-end: 2px solid var(--ab-read-accent); }
      .ab-book-actions { display: grid; }
      .ab-book-action { width: 100%; }
    }
    @media (hover: hover) and (pointer: fine) { .ab-book-action:hover, app-special-package-details .section2-bottom button:hover { transform: translateY(-1px); } }
    @media (pointer: coarse) { .ab-book-action, app-special-package-details .section2-bottom button { min-height: 3rem; } }
    @media (prefers-reduced-motion: reduce) { .ab-book-action, app-special-package-details .section2-bottom button { transition-duration: 0ms !important; } }
  \`;

  var conversionCss = \`
    /* Hallmark · Stat-Led conversion pass · catalogue continuation · static Newsprint motion */
    body.ab-special-package-page #ab-sticky-product-actions { display: none !important; }
    app-special-package-details .banner-area { margin-block: var(--ab-read-lg) var(--ab-read-3xl) !important; }
    app-special-package-details .banner-area .bannar-main {
      grid-template-areas: 'art' 'summary';
      gap: 0 !important;
      padding: 0 !important;
      overflow: hidden;
      background: var(--ab-read-ink) !important;
      color: var(--ab-read-paper) !important;
      border: 0 !important;
      border-radius: var(--ab-read-radius-md) !important;
      box-shadow: none !important;
    }
    app-special-package-details .banner-area .bannar-main > img {
      grid-area: art;
      height: min(72vw, 22rem) !important;
      padding: var(--ab-read-md);
      background: var(--ab-read-paper-deep) !important;
      border-radius: 0 !important;
    }
    .ab-offer-summary {
      grid-area: summary;
      display: grid;
      gap: var(--ab-read-md) !important;
      align-content: center;
      padding: var(--ab-read-lg) !important;
      color: var(--ab-read-paper);
    }
    .ab-offer-kicker { color: var(--ab-read-paper-deep); border-color: var(--ab-read-accent); }
    .ab-offer-saving { display: grid; gap: 0; margin-block: var(--ab-read-xs); }
    .ab-offer-saving strong {
      color: var(--ab-read-paper);
      font-family: var(--ab-read-numeric);
      font-size: clamp(3.25rem, 16vw, 5rem);
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      letter-spacing: -0.07em;
      line-height: 0.88;
    }
    .ab-offer-saving span { color: var(--ab-read-paper-deep); font-size: 0.95rem; line-height: 1.5; }
    .ab-offer-summary h1 { max-width: 18ch; color: var(--ab-read-paper); font-size: clamp(1.75rem, 7vw, 2.75rem); }
    .ab-offer-description { display: -webkit-box; overflow: hidden; color: var(--ab-read-paper-deep); -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .ab-offer-facts { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; }
    .ab-offer-fact { border-color: var(--ab-read-muted); }
    .ab-offer-fact-label { color: var(--ab-read-paper-deep); }
    .ab-offer-fact-value { color: var(--ab-read-paper); }
    .ab-offer-fact:nth-child(2) .ab-offer-fact-value { text-decoration: line-through; text-decoration-thickness: 1px; }
    .ab-offer-hero-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ab-read-sm); }
    .ab-offer-hero-action {
      min-height: 3.25rem;
      padding-inline: var(--ab-read-md);
      color: var(--ab-read-ink);
      background: var(--ab-read-paper);
      border: 1px solid var(--ab-read-paper);
      border-radius: var(--ab-read-radius-sm);
      font-family: var(--ab-read-body);
      font-size: 0.95rem;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
    }
    .ab-offer-hero-action--secondary { color: var(--ab-read-paper); background: transparent; }
    .ab-offer-hero-action:focus-visible, .ab-related-offer-link:focus-visible { outline: 3px solid var(--ab-read-focus); outline-offset: 3px; }
    .ab-offer-hero-action:disabled { opacity: 0.55; cursor: not-allowed; }
    .ab-offer-hero-action:active, .ab-related-offer-link:active, .ab-book-action:active { opacity: 0.82; }
    .ab-offer-hero-action[aria-busy='true'] { opacity: 0.68; cursor: progress; }
    .ab-offer-hero-action[data-state='error'] { border-color: var(--ab-read-danger); }
    .ab-offer-hero-action[data-state='success'] { border-color: var(--ab-read-accent); }
    .ab-offer-gift { grid-template-columns: 4rem minmax(0, 1fr); color: var(--ab-read-ink); background: var(--ab-read-paper); }
    .ab-offer-gift-visual { height: 4rem; }

    app-special-package-details .section1-main { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: var(--ab-read-lg); }
    .ab-books-heading { margin: 0; }
    app-special-package-details .section1-main > .product {
      display: grid !important;
      grid-template-columns: 7rem minmax(0, 1fr) !important;
      gap: var(--ab-read-md) !important;
      padding: var(--ab-read-lg) !important;
      background: var(--ab-read-paper-deep) !important;
      border: 1px solid var(--ab-read-rule) !important;
      border-radius: var(--ab-read-radius-sm) !important;
    }
    app-special-package-details .section1-main > .product:last-child { border-block-end: 1px solid var(--ab-read-rule) !important; }
    app-special-package-details .product-body { padding-inline-end: var(--ab-read-xl) !important; }
    app-special-package-details .price-area { margin-block-start: var(--ab-read-sm); }
    .ab-book-number { inset-block-start: var(--ab-read-md); inset-inline-end: var(--ab-read-md); }
    .ab-book-action, .ab-book-description-toggle, app-special-package-details .section2-bottom button { transition: none !important; }

    app-special-package-details .section2 { position: static; margin-block: var(--ab-read-2xl) 0; }
    app-special-package-details .section2 .container { border-radius: var(--ab-read-radius-md) var(--ab-read-radius-md) 0 0; box-shadow: 0 -1px 0 var(--ab-read-rule); }

    .ab-related-offers { margin-block: var(--ab-read-3xl); padding-block-start: var(--ab-read-xl); border-block-start: 2px solid var(--ab-read-ink); }
    .ab-related-offers-header { display: grid; gap: var(--ab-read-xs); margin-block-end: var(--ab-read-lg); }
    .ab-related-offers-header p { margin: 0; color: var(--ab-read-accent-dark); font-size: 0.875rem; font-weight: 700; }
    .ab-related-offers-header h2 { margin: 0; color: var(--ab-read-ink); font-family: var(--ab-read-display); font-size: clamp(1.7rem, 6vw, 2.5rem); line-height: 1.2; overflow-wrap: anywhere; }
    .ab-related-offers-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--ab-read-md); }
    .ab-related-offer { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: var(--ab-read-lg); align-items: center; min-width: 0; padding: var(--ab-read-lg); background: var(--ab-read-paper-deep); border: 1px solid var(--ab-read-rule); }
    .ab-related-offer-art { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ab-read-2xs); min-width: 0; }
    .ab-related-offer-art img { width: 100%; height: 7rem; object-fit: contain; background: var(--ab-read-paper); }
    .ab-related-offer-body { display: grid; gap: var(--ab-read-sm); min-width: 0; }
    .ab-related-offer-body h3 { margin: 0; color: var(--ab-read-ink); font-family: var(--ab-read-display); font-size: 1.3rem; line-height: 1.3; overflow-wrap: anywhere; }
    .ab-related-offer-meta { margin: 0; color: var(--ab-read-muted); font-size: 0.9rem; }
    .ab-related-offer-price { display: flex; flex-wrap: wrap; gap: var(--ab-read-xs); align-items: baseline; font-family: var(--ab-read-numeric); font-variant-numeric: tabular-nums; }
    .ab-related-offer-price strong { color: var(--ab-read-accent-dark); font-size: 1.35rem; }
    .ab-related-offer-price s { color: var(--ab-read-muted); font-size: 0.9rem; }
    .ab-related-offer-link { width: fit-content; min-height: 2.75rem; display: inline-flex; align-items: center; padding-inline: var(--ab-read-md); color: var(--ab-read-accent-ink) !important; background: var(--ab-read-accent-dark); border: 1px solid var(--ab-read-accent-dark); border-radius: var(--ab-read-radius-sm); font-weight: 700; text-decoration: none !important; white-space: nowrap; }

    @media (max-width: 23.5rem) {
      .ab-offer-hero-actions { grid-template-columns: minmax(0, 1fr); }
      .ab-related-offer { grid-template-columns: minmax(0, 1fr); }
      .ab-related-offer-art { max-width: 12rem; }
    }
    @media (min-width: 40rem) {
      app-special-package-details .section1-main { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .ab-books-heading { grid-column: 1 / -1; }
      app-special-package-details .section1-main > .product { grid-template-columns: 8rem minmax(0, 1fr) !important; }
      app-special-package-details .section1-main > .product:last-child:nth-child(even) { grid-column: 1 / -1; }
      .ab-related-offer { grid-template-columns: 11rem minmax(0, 1fr); }
      .ab-related-offer-art img { height: 9rem; }
    }
    @media (min-width: 60rem) {
      app-special-package-details .banner-area .bannar-main { grid-template-areas: 'art summary'; grid-template-columns: minmax(0, 1.08fr) minmax(22rem, 0.92fr) !important; }
      app-special-package-details .banner-area .bannar-main > img { height: 100% !important; min-height: 38rem !important; padding: var(--ab-read-2xl); }
      .ab-offer-summary { padding: clamp(var(--ab-read-xl), 4vw, var(--ab-read-3xl)) !important; }
      .ab-offer-saving strong { font-size: clamp(5.5rem, 7vw, 7rem); }
      app-special-package-details .section1-main { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; align-items: stretch; }
      app-special-package-details .section1-main > .product,
      app-special-package-details .section1-main > .product:last-child:nth-child(even) { grid-column: auto; grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: auto auto 1fr auto; }
      app-special-package-details .product-image img { height: 15rem !important; }
      app-special-package-details .product-body { padding: 0 !important; }
      app-special-package-details .price-area { align-self: end; }
      .ab-related-offers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (prefers-reduced-motion: reduce) { .ab-offer-hero-action, .ab-related-offer-link { transition: none !important; } }
  \`;

  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css + redesignCss + conversionCss;
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
    var discountType = Number(variation && variation.discountType != null
      ? variation.discountType
      : item && item.discountType) || 0;
    var discount = Number(variation && variation.discountAmount != null
      ? variation.discountAmount
      : item && item.discountAmount) || 0;
    if (discountType === 1) return Math.max(0, Math.floor(base - (base * discount / 100)));
    if (discountType === 2) return Math.max(0, Math.floor(base - discount));
    return Math.floor(base);
  }

  function formatMoney(value) {
    return '৳' + Math.round(Number(value) || 0).toLocaleString('en-BD');
  }

  function packageListPrice(data) {
    return (data.products || []).reduce(function (total, product) {
      var quantity = product.quantity == null
        ? 1
        : Math.max(0, Math.floor(Number(product.quantity) || 0));
      return total + (Number(product.salePrice) || 0) * quantity;
    }, 0);
  }

  function packagePrice(data) {
    var productsTotal = (data.products || []).reduce(function (total, product) {
      var quantity = product.quantity == null
        ? 1
        : Math.max(0, Math.floor(Number(product.quantity) || 0));
      return total + effectivePrice(product) * quantity;
    }, 0);
    var pricedPackage = Object.assign({}, data, { salePrice: productsTotal });
    return effectivePrice(pricedPackage);
  }

  function addFact(parent, label, value) {
    var fact = createElement('div', 'ab-offer-fact');
    fact.appendChild(createElement('span', 'ab-offer-fact-label', label));
    fact.appendChild(createElement('strong', 'ab-offer-fact-value', value));
    parent.appendChild(fact);
  }

  function authorNames(product) {
    return (product && product.author || []).map(function (author) {
      return String(author && author.name || '').trim();
    }).filter(Boolean).join(', ');
  }

  function productPath(product) {
    return product && product.slug
      ? '/product-details/' + encodeURIComponent(product.slug)
      : '';
  }

  function appendBookMeta(body, product) {
    if (!body || body.querySelector('.ab-book-meta')) return;
    var values = [
      authorNames(product),
      product && product.totalPages ? String(product.totalPages) + ' পৃষ্ঠা' : '',
      String(product && (product.currentVersion || product.edition) || '').trim(),
    ].filter(Boolean);
    if (!values.length) return;
    var meta = createElement('div', 'ab-book-meta');
    values.forEach(function (value) { meta.appendChild(createElement('span', '', value)); });
    body.appendChild(meta);
  }

  function bindCardControl(control, onClick) {
    ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup'].forEach(function (eventName) {
      control.addEventListener(eventName, function (event) {
        event.stopPropagation();
      });
    });
    control.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClick();
    });
  }

  function appendBookActions(priceMain, product) {
    if (!priceMain || priceMain.querySelector('.ab-book-actions')) return;
    var actions = createElement('div', 'ab-book-actions');
    if (product && product.pdfFile) {
      var preview = createElement('button', 'ab-book-action ab-book-action--preview', 'একটু পড়ে দেখুন');
      preview.type = 'button';
      preview.setAttribute('aria-label', (product.name || 'বই') + ' — একটু পড়ে দেখুন');
      preview.setAttribute('data-ab-pdf-file', product.pdfFile);
      preview.setAttribute('data-ab-pdf-title', product.name || 'বইয়ের নমুনা');
      bindCardControl(preview, function () {
        openPdfDialog(product.pdfFile, product.name || 'বইয়ের নমুনা');
      });
      actions.appendChild(preview);
    }
    var path = productPath(product);
    if (path) {
      var details = createElement('a', 'ab-book-action', 'বইটি দেখুন');
      details.href = path;
      details.setAttribute('aria-label', (product.name || 'বই') + ' — বিস্তারিত দেখুন');
      actions.appendChild(details);
    }
    if (actions.children.length) priceMain.appendChild(actions);
  }

  function openPdfDialog(pdfFile, title) {
    var dialog = document.getElementById('ab-pdf-dialog');
    if (!dialog) {
      dialog = createElement('div', 'ab-pdf-dialog');
      dialog.id = 'ab-pdf-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'ab-pdf-dialog-title');
      var panel = createElement('section', 'ab-pdf-dialog-panel');
      var header = createElement('header', 'ab-pdf-dialog-header');
      var heading = createElement('h2', 'ab-pdf-dialog-title');
      heading.id = 'ab-pdf-dialog-title';
      var close = createElement('button', 'ab-pdf-dialog-close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'পিডিএফ বন্ধ করুন');
      close.addEventListener('click', closePdfDialog);
      header.appendChild(heading);
      header.appendChild(close);
      var pages = createElement('div', 'ab-pdf-dialog-pages');
      panel.appendChild(header);
      panel.appendChild(pages);
      dialog.appendChild(panel);
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) closePdfDialog();
      });
      document.body.appendChild(dialog);
    }
    dialog.querySelector('.ab-pdf-dialog-title').textContent = title + ' — নমুনা পৃষ্ঠা';
    var pages = dialog.querySelector('.ab-pdf-dialog-pages');
    pages.innerHTML = '<p class="ab-pdf-dialog-state">নমুনা পৃষ্ঠা লোড হচ্ছে…</p>';
    dialog.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.ab-pdf-dialog-close').focus();
    loadProductPdfEngine().then(function (pdfjs) {
      var task = pdfjs.getDocument(pdfFile);
      dialog._abPdfTask = task;
      return task.promise;
    }).then(function (pdf) {
      if (!dialog.classList.contains('is-open')) return;
      dialog._abPdf = pdf;
      renderPdfPages(pdf, pages, dialog);
    }).catch(function () {
      pages.innerHTML = '<p class="ab-pdf-dialog-state">দুঃখিত, নমুনা পৃষ্ঠা এখন দেখানো যাচ্ছে না।</p>';
    });
  }

  function loadProductPdfEngine() {
    if (pdfEnginePromise) return pdfEnginePromise;
    pdfEnginePromise = new Promise(function (resolve, reject) {
      var chunks = window.webpackChunkangular_ui;
      if (!chunks || !chunks.push) {
        reject(new Error('Storefront PDF engine unavailable'));
        return;
      }
      chunks.push([[987654], {}, function (webpackRequire) {
        webpackRequire.e(158).then(function () {
          var pdfjs = webpackRequire(5908);
          pdfjs.GlobalWorkerOptions.workerSrc = webpackRequire(1091);
          resolve(pdfjs);
        }).catch(reject);
      }]);
    });
    return pdfEnginePromise;
  }

  function renderPdfPages(pdf, container, dialog) {
    container.innerHTML = '';
    var rendered = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var pageNumber = Number(entry.target.getAttribute('data-page-number'));
        if (!pageNumber || rendered[pageNumber]) return;
        rendered[pageNumber] = true;
        observer.unobserve(entry.target);
        pdf.getPage(pageNumber).then(function (page) {
          if (!dialog.classList.contains('is-open')) return;
          var base = page.getViewport({ scale: 1 });
          var scale = Math.max(0.5, (container.clientWidth - 24) / base.width * 0.95);
          var viewport = page.getViewport({ scale: scale });
          var ratio = Math.min(window.devicePixelRatio || 1, 2);
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width * ratio);
          canvas.height = Math.floor(viewport.height * ratio);
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          return page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
            entry.target.replaceChildren(canvas);
          });
        }).catch(function () {
          entry.target.textContent = 'পৃষ্ঠা লোড করা যায়নি';
        });
      });
    }, { root: container, threshold: 0.05 });
    dialog._abPdfObserver = observer;
    for (var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      var placeholder = createElement('div', 'ab-pdf-page');
      placeholder.setAttribute('data-page-number', String(pageNumber));
      container.appendChild(placeholder);
      observer.observe(placeholder);
    }
  }

  function closePdfDialog() {
    var dialog = document.getElementById('ab-pdf-dialog');
    if (!dialog) return;
    dialog.classList.remove('is-open');
    document.body.style.overflow = '';
    if (dialog._abPdfObserver) dialog._abPdfObserver.disconnect();
    if (dialog._abPdfTask && dialog._abPdfTask.destroy) dialog._abPdfTask.destroy();
    dialog._abPdfObserver = null;
    dialog._abPdfTask = null;
    dialog._abPdf = null;
    dialog.querySelector('.ab-pdf-dialog-pages').innerHTML = '';
  }

  function installInteractionHandlers() {
    if (document.documentElement.getAttribute('data-ab-offer-handlers') === 'true') return;
    document.documentElement.setAttribute('data-ab-offer-handlers', 'true');
    document.addEventListener('click', function (event) {
      var closeTarget = event.target && event.target.closest
        ? event.target.closest('.ab-pdf-dialog-close')
        : null;
      if (!closeTarget) return;
      event.preventDefault();
      event.stopPropagation();
      closePdfDialog();
    }, true);
    function handlePreviewInteraction(event) {
      var target = event.target && event.target.closest
        ? event.target.closest('.ab-book-action--preview')
        : null;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.type === 'click') {
        openPdfDialog(
          target.getAttribute('data-ab-pdf-file'),
          target.getAttribute('data-ab-pdf-title') || 'বইয়ের নমুনা'
        );
      }
    }
    ['pointerdown', 'mousedown', 'click'].forEach(function (eventName) {
      document.addEventListener(eventName, handlePreviewInteraction, true);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closePdfDialog();
    });
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('app-special-package-details .section2-bottom:not(.prices) button')
        : null;
      if (!target) return;
      var kind = target.matches('button.buy') ? 'buy' : target.matches('button.cart:nth-of-type(2)') ? 'cart' : '';
      if (!kind) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      runPackagePurchase(currentPackageId(), kind, target);
    }, true);
  }

  function appendDescriptionToggle(body, description, index) {
    if (!body || !description || body.querySelector('.ab-book-description-toggle')) return;
    var toggle = createElement('button', 'ab-book-description-toggle', 'আরও দেখুন');
    var descriptionId = 'ab-book-description-' + index;
    description.id = descriptionId;
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', descriptionId);
    toggle.setAttribute('aria-expanded', 'false');
    bindCardControl(toggle, function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      description.classList.toggle('is-expanded', !expanded);
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? 'আরও দেখুন' : 'কম দেখুন';
    });
    body.appendChild(toggle);
  }

  function appendGift(summary, data) {
    var gift = createElement('aside', 'ab-offer-gift');
    gift.setAttribute('aria-label', 'প্যাকেজের ফ্রি উপহার');
    var visual = createElement('div', 'ab-offer-gift-visual');
    var image = document.createElement('img');
    image.src = data.notebookImage || NOTEBOOK_IMAGE;
    image.alt = 'প্যাকেজের সাথে ফ্রি নোটবুক';
    image.loading = 'lazy';
    visual.appendChild(image);
    var copy = createElement('div', 'ab-offer-gift-copy');
    copy.appendChild(createElement('span', '', 'প্যাকেজ বোনাস'));
    copy.appendChild(createElement('strong', '', 'সাথে ফ্রি নোটবুক'));
    copy.appendChild(createElement('p', '', 'এই প্যাকেজ অর্ডার করলে নোটবুকটি বিনামূল্যে পাবেন।'));
    gift.appendChild(visual);
    gift.appendChild(copy);
    summary.appendChild(gift);
  }

  function runPackagePurchase(id, kind, source) {
    var bridge = window.__abCommerceBridge;
    if (!id || !bridge || typeof bridge.addSpecialPackageToCart !== 'function' || source.disabled) return;
    if (kind === 'buy') {
      source.textContent = 'Processing…';
      source.disabled = true;
      source.setAttribute('aria-busy', 'true');
      Promise.resolve(bridge.addSpecialPackageToCart(id, null)).then(function () {
        if (typeof bridge.goToCheckout === 'function') bridge.goToCheckout();
        else window.location.assign('/checkout');
      }).catch(function () {
        source.textContent = 'Buy Now';
        source.disabled = false;
        source.removeAttribute('aria-busy');
      });
      return;
    }
    bridge.addSpecialPackageToCart(id, source);
  }

  function appendHeroActions(summary, id) {
    var actions = createElement('div', 'ab-offer-hero-actions');
    var cart = createElement('button', 'ab-offer-hero-action ab-offer-hero-action--secondary', 'Add to Cart');
    var buy = createElement('button', 'ab-offer-hero-action', 'Buy Now');
    cart.type = 'button';
    buy.type = 'button';
    cart.addEventListener('click', function () { runPackagePurchase(id, 'cart', cart); });
    buy.addEventListener('click', function () { runPackagePurchase(id, 'buy', buy); });
    actions.appendChild(cart);
    actions.appendChild(buy);
    summary.appendChild(actions);
  }

  function enhanceHero(root, id, data) {
    var banner = root.querySelector('.bannar-main');
    if (!banner || banner.querySelector('.ab-offer-summary')) return;

    var summary = createElement('section', 'ab-offer-summary');
    summary.setAttribute('aria-label', 'প্যাকেজের সংক্ষিপ্ত তথ্য');
    summary.appendChild(createElement('p', 'ab-offer-kicker', 'বিশেষ প্যাকেজ'));
    var saving = Math.max(0, packageListPrice(data) - packagePrice(data));
    if (saving) {
      var savingBlock = createElement('div', 'ab-offer-saving');
      savingBlock.appendChild(createElement('strong', '', formatMoney(saving)));
      savingBlock.appendChild(createElement('span', '', 'এই প্যাকেজে মোট সাশ্রয়'));
      summary.appendChild(savingBlock);
    }
    summary.appendChild(createElement('h1', '', data.name || 'বিশেষ বইয়ের প্যাকেজ'));
    var description = plainText(data.shortDescription || data.description, 420);
    if (description) summary.appendChild(createElement('p', 'ab-offer-description', description));

    var facts = createElement('div', 'ab-offer-facts');
    addFact(facts, 'প্যাকেজে বই', String((data.products || []).length) + 'টি');
    addFact(facts, 'বইগুলোর মোট মূল্য', formatMoney(packageListPrice(data)));
    addFact(facts, 'অফার মূল্য', formatMoney(packagePrice(data)));
    summary.appendChild(facts);
    appendGift(summary, data);
    appendHeroActions(summary, id);
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
      titleWrap.appendChild(createElement('h2', '', products.length + 'টি বই, একটি সম্পূর্ণ সংগ্রহ'));
      titleWrap.appendChild(createElement('p', '', 'প্রতিটি বইয়ের পরিচিতি পড়ুন, নমুনা পৃষ্ঠা দেখুন, তারপর সিদ্ধান্ত নিন।'));
      heading.appendChild(titleWrap);
      heading.appendChild(createElement('span', 'ab-books-count', products.length + 'টি বই'));
      section.insertBefore(heading, section.firstChild);
    }

    cards.slice(0, products.length).forEach(function (card, index) {
      var product = products[index] || {};
      card.style.setProperty('--ab-offer-index', String(index + 1));
      if (!card.querySelector('.ab-book-number')) {
        card.appendChild(createElement('span', 'ab-book-number', String(index + 1).padStart(2, '0')));
      }

      var body = card.querySelector('.product-body');
      var title = body && body.querySelector(':scope > a');
      var path = productPath(product);
      if (title && path) title.href = path;
      appendBookMeta(body, product);
      if (body && !body.querySelector('.ab-book-description')) {
        var description = plainText(product.shortDescription || product.description, 760);
        if (description) {
          var descriptionElement = createElement('p', 'ab-book-description', description);
          body.appendChild(descriptionElement);
          appendDescriptionToggle(body, descriptionElement, index + 1);
        }
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
      appendBookActions(priceMain, product);
    });
    return true;
  }

  function relatedOfferImages(data) {
    var images = [];
    (data.products || []).forEach(function (product) {
      var image = Array.isArray(product.images) ? product.images[0] : '';
      if (image && images.indexOf(image) === -1) images.push(image);
    });
    if (!images.length && data.image) images.push(data.image);
    return images.slice(0, 2);
  }

  function renderRelatedOffers(root, id, packages) {
    if (root.querySelector('.ab-related-offers')) return;
    var related = (packages || []).filter(function (item) {
      return item && String(item._id) !== String(id);
    }).slice(0, 4);
    if (!related.length) return;

    var section = createElement('section', 'ab-related-offers');
    section.setAttribute('aria-labelledby', 'ab-related-offers-title');
    var header = createElement('header', 'ab-related-offers-header');
    header.appendChild(createElement('p', '', 'আরও বিশেষ সংগ্রহ'));
    var heading = createElement('h2', '', 'আপনার জন্য আরও অফার');
    heading.id = 'ab-related-offers-title';
    header.appendChild(heading);
    section.appendChild(header);
    var grid = createElement('div', 'ab-related-offers-grid');

    related.forEach(function (item) {
      var card = createElement('article', 'ab-related-offer');
      var artwork = createElement('div', 'ab-related-offer-art');
      var images = relatedOfferImages(item);
      if (images.length === 1) artwork.style.gridTemplateColumns = 'minmax(0, 1fr)';
      images.forEach(function (src, index) {
        var image = document.createElement('img');
        image.src = src;
        image.alt = index === 0 ? (item.name || 'বিশেষ অফার') : '';
        image.loading = 'lazy';
        artwork.appendChild(image);
      });
      var body = createElement('div', 'ab-related-offer-body');
      body.appendChild(createElement('h3', '', item.name || 'বিশেষ বইয়ের প্যাকেজ'));
      body.appendChild(createElement('p', 'ab-related-offer-meta', String((item.products || []).length) + 'টি বইয়ের সংগ্রহ'));
      var price = createElement('div', 'ab-related-offer-price');
      var currentPrice = packagePrice(item);
      var listPrice = packageListPrice(item);
      price.appendChild(createElement('strong', '', formatMoney(currentPrice)));
      if (listPrice > currentPrice) price.appendChild(createElement('s', '', formatMoney(listPrice)));
      body.appendChild(price);
      var link = createElement('a', 'ab-related-offer-link', 'অফারটি দেখুন');
      link.href = '/special-package-details/' + encodeURIComponent(item._id);
      link.setAttribute('aria-label', (item.name || 'বিশেষ অফার') + ' দেখুন');
      body.appendChild(link);
      card.appendChild(artwork);
      card.appendChild(body);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    root.appendChild(section);
  }

  function loadRelatedOffers(root, id) {
    if (!relatedRequest) {
      relatedRequest = fetch(API_BASE + '/api/special-package/get-all', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagination: { currentPage: 0, pageSize: 8 },
          sort: { createdAt: -1 },
          select: { name: 1, slug: 1, image: 1, salePrice: 1, discountType: 1, discountAmount: 1, products: 1 },
        }),
      }).then(function (response) {
        if (!response.ok) throw new Error('Related offers request failed');
        return response.json();
      }).then(function (response) {
        var items = response && Array.isArray(response.data) ? response.data : [];
        return Promise.all(items.map(function (item) {
          if (packageCache[item._id]) return packageCache[item._id];
          return fetch(API_BASE + '/api/special-package/' + encodeURIComponent(item._id), {
            headers: { Accept: 'application/json' },
          }).then(function (detailResponse) {
            if (!detailResponse.ok) throw new Error('Related offer detail failed');
            return detailResponse.json();
          }).then(function (detail) {
            return detail && detail.success && detail.data ? detail.data : item;
          }).catch(function () { return item; });
        }));
      }).catch(function () { return []; });
    }
    relatedRequest.then(function (packages) { renderRelatedOffers(root, id, packages); });
  }

  function hydrateProducts(data) {
    var products = data && Array.isArray(data.products) ? data.products : [];
    return Promise.all(products.map(function (product) {
      var slug = product && product.slug;
      if (!slug) return Promise.resolve(product);
      if (productCache[slug]) return Promise.resolve(Object.assign({}, product, productCache[slug]));
      return fetch(API_BASE + '/api/product/get-by-slug/' + encodeURIComponent(slug), {
        headers: { Accept: 'application/json' },
      }).then(function (response) {
        if (!response.ok) throw new Error('Product request failed');
        return response.json();
      }).then(function (response) {
        var detail = response && response.success && response.data ? response.data : {};
        productCache[slug] = detail;
        return Object.assign({}, detail, product, {
          pdfFile: detail.pdfFile,
          description: detail.description,
          shortDescription: detail.shortDescription,
        });
      }).catch(function () { return product; });
    })).then(function (details) {
      return Object.assign({}, data, { products: details });
    });
  }

  function applyEnhancements(id, data) {
    var root = document.querySelector('app-special-package-details');
    if (!root || root.getAttribute('data-ab-offer-enhanced') === id) return;
    var nativeCart = root.querySelector('.section2-bottom:not(.prices) button.cart:nth-of-type(2)');
    var nativeBuy = root.querySelector('.section2-bottom:not(.prices) button.buy');
    if (nativeCart) nativeCart.textContent = 'Add to Cart';
    if (nativeBuy) nativeBuy.textContent = 'Buy Now';
    enhanceHero(root, id, data);
    if (!enhanceProducts(root, data)) return;
    loadRelatedOffers(root, id);
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
        return hydrateProducts(response.data);
      })
      .then(function (data) {
        if (!data) return;
        packageCache[id] = data;
        applyEnhancements(id, data);
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
    installInteractionHandlers();
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
