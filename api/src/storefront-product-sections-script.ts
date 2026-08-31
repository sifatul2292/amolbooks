export const STOREFRONT_PRODUCT_SECTIONS_SCRIPT = `
(function () {
  'use strict';

  /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
   * genre: editorial commerce · macrostructure: Catalogue · studied: yes
   * DNA-source: user-supplied Rokomari mobile reference
   * sections: summary · book details · author · recommendations · reviews · popular-library
   * theme: existing Amolbooks brand preserved · enrichment: existing product artwork
   */

  var STYLE_ID = 'ab-product-sections-style';
  var ROOT_ID = 'ab-product-sections';
  var CATEGORY_LIBRARY_ID = 'ab-category-library';
  var API_BASE = 'https://apisub.amolbooks.com/api';
  /* Use a same-origin proxy in local preview: the compiled storefront uses the
     published catalogue, whereas the local database only has fixture data. */
  var CATALOG_API_BASE = window.location.hostname === 'localhost'
    ? window.location.origin + '/storefront-catalog'
    : API_BASE;
  var RECOMMENDATION_API_BASE = window.location.hostname === 'localhost'
    ? window.location.origin + '/api'
    : API_BASE;
  var currentSlug = '';
  var loadingSlug = '';
  var renderVersion = 0;
  var timer = null;
  var observer = null;
  var boughtTogetherPlaceholder = null;
  var movedBoughtTogetherSection = null;
  var currentProduct = null;
  var categoryLibraryObserver = null;
  var categoryLibraryPage = 0;
  var categoryLibraryVersion = 0;
  var categoryLibraryLoading = false;
  var categoryLibraryDone = false;
  var categoryLibrarySeen = {};
  var mainCartClickedSlug = '';
  var suppressAddedCartModalUntil = 0;
  var authenticatedCartItemsOverride = null;
  var cartPageRenderVersion = 0;
  var cartPageLoading = false;
  var cartPageRefreshQueued = false;
  var cartOfferConfig = null;
  var cartOfferConfigPending = false;
  var cartOfferSuggestionsLoading = false;
  var cartOfferSuggestionsProducts = null;
  var cartOfferNotebook = null;
  var cartOfferNotebookPending = false;
  var cartCatalogProducts = null;
  var cartCatalogProductsPending = false;
  var cartOfferSuggestionSeed = Math.floor(Math.random() * 100000);
  var cartNativeProductSignature = '';
  var cartNativeProducts = [];
  var cartMigrationScheduled = false;
  var authenticatedCartMergePending = false;
  var authenticatedCartMergeFinished = false;
  var recentlyViewedStorageKey = 'ab-recently-viewed-products';
  var cartRecentRequestSignature = '';
  var cartRecentRequestVersion = 0;
  var checkoutGiftRenderKey = '';
  var checkoutGiftPendingKey = '';
  var addedCartModalProducts = null;
  var addedCartModalLoading = false;
  var stickySearchTimer = null;
  var stickySearchRequestVersion = 0;
  var addToCartTrackingLastKey = '';
  var addToCartTrackingLastAt = 0;
  var CART_OFFER_FALLBACK_THRESHOLD = 499;
  var FREE_NOTEBOOK_IMAGE_URL = 'https://apisub.amolbooks.com/api/upload/images/amolbooks-notebook-8ddd.webp';
  var NOTEBOOK_PAGE_COUNT = 72;
  /* Some older product payloads only carry an author id. Keep this published
     profile image as a rendering fallback while the author lookup hydrates. */
  var legacyAuthorImageById = {
    '69a804b3b32e6c3db37322f7': 'https://apisub.amolbooks.com/api/upload/images/dr-khalid-abu-shadi-3744.webp',
  };

  var css = \`
    /* Hallmark · macrostructure: Catalogue · genre: editorial commerce
     * anchor hue: Amol forest green · theme: studied-DNA (source: user Rokomari mobile reference)
     * knobs: author=borderless biography · recommendations=horizontal shelf · cart=ledger list + checkout summary · reviews=flat summary
     * pre-emit critique: P5 H5 E5 S5 R5 V4 · contrast: pass (46–50)
     * nav: existing · footer: existing · honest/chrome/tokens: pass (56–58)
     * slop: pass (51–60) · mobile: pass (36, 59, 61–69)
     */
    :root {
      --ab-product-paper: oklch(99.5% 0.006 145);
      --ab-product-paper-soft: oklch(97.5% 0.008 145);
      --ab-product-ink: oklch(28% 0.018 145);
      --ab-product-muted: oklch(48% 0.018 145);
      --ab-product-rule: oklch(88% 0.012 145);
      --ab-product-accent: oklch(53% 0.145 145);
      --ab-product-accent-dark: oklch(41% 0.11 145);
      --ab-product-focus: oklch(59% 0.17 145);
      --ab-product-discount: oklch(56% 0.22 28);
      --ab-product-discount-ink: oklch(99% 0.006 145);
      --ab-product-surface: oklch(100% 0 0);
      --ab-product-surface-muted: oklch(97.8% 0.006 145);
      --ab-product-shadow: rgb(20 45 28 / 0.1);
      --ab-product-body: inherit;
      --ab-product-heading: hind-siliguri, "Noto Sans Bengali", "Noto Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --ab-product-heading-bold: SolaimanLipi_Bold, var(--ab-product-heading);
      --ab-product-number: Inter, ui-sans-serif, system-ui, sans-serif;
      --ab-product-space-3xs: 0.25rem;
      --ab-product-space-2xs: 0.5rem;
      --ab-product-space-xs: 0.75rem;
      --ab-product-space-sm: 1rem;
      --ab-product-space-md: 1.5rem;
      --ab-product-space-lg: 2rem;
      --ab-product-radius-sm: 0.25rem;
      --ab-product-content-max: 81.25rem;
      --ab-product-dur-short: 140ms;
      --ab-product-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    }

    html,
    body { overflow-x: clip; }

    #\${ROOT_ID},
    app-product-details .ab-review-section {
      min-width: 0;
      color: var(--ab-product-ink);
      font-family: var(--ab-product-body);
      font-weight: 400;
      font-synthesis-weight: none;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    #\${ROOT_ID},
    app-product-details .ab-review-section {
      width: 100%;
      max-width: var(--ab-product-content-max);
      margin-inline: auto;
    }

    #\${ROOT_ID} .ab-product-section,
    app-product-details .ab-review-section {
      min-width: 0;
      margin: 0;
      padding-block: var(--ab-product-space-lg);
      border-block-start: 1px solid var(--ab-product-rule);
    }

    #\${ROOT_ID} .ab-product-section:first-child {
      border-block-start: 0;
      padding-block-start: 0;
    }

    #\${ROOT_ID} > .ab-bought-together-section {
      width: 100%;
      max-width: none;
      margin: 0 0 var(--ab-product-space-lg) !important;
    }

    /* Keep the primary purchase actions in a predictable order. */
    app-product-details .product-action-btn button[data-ab-action-label="buy-now"] {
      font-weight: 800 !important;
    }

    @media (min-width: 992px) {
      app-product-details .product-action-btn > ul {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(8.75rem, 10rem)) minmax(18rem, 1fr) !important;
        gap: 0.85rem !important;
        align-items: center !important;
      }

      app-product-details .product-action-btn > ul > li,
      app-product-details .product-action-btn > ul > div {
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
      }

      app-product-details .product-action-btn > ul > li:has(> button[style*="display: none"]) {
        display: none !important;
      }

      app-product-details .product-action-btn button[data-ab-action-label],
      app-product-details .product-action-btn #__wa-order-btn {
        width: 100% !important;
        min-height: 3.25rem !important;
        padding: 0.75rem 1.1rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
        font-size: 1rem !important;
        line-height: 1.2 !important;
        border-radius: 0.35rem !important;
        box-sizing: border-box !important;
      }
    }

    /* The native component used an animated catch-all transition here, which
       made its button appear to flash while the pointer was over it. */
    app-bought-together .add-all-btn,
    .bought-together-wrapper .add-all-btn {
      transform: none !important;
      transition: background-color var(--ab-product-dur-short) ease,
        border-color var(--ab-product-dur-short) ease,
        color var(--ab-product-dur-short) ease !important;
    }

    app-product-details .ab-review-section { margin-inline: auto; }

    #\${ROOT_ID} .ab-facts-section {
      margin-block: 0 var(--ab-product-space-md);
      padding-block: var(--ab-product-space-sm);
      padding-inline: 0;
      border-block: 1px solid var(--ab-product-rule);
    }

    #\${ROOT_ID} .ab-facts-strip {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      grid-template-columns: none;
      align-items: stretch;
      min-width: 0;
    }

    #\${ROOT_ID} .ab-fact {
      min-width: 0;
      display: grid;
      grid-template-rows: 1rem 1.35rem minmax(2.15rem, auto);
      align-content: start;
      justify-items: center;
      gap: var(--ab-product-space-3xs);
      min-height: 6.15rem;
      padding-block: var(--ab-product-space-2xs);
      padding-inline: var(--ab-product-space-sm);
      text-align: center;
      border-inline-start: 1px solid var(--ab-product-rule);
    }

    #\${ROOT_ID} .ab-fact:first-child { border-inline-start: 0; }

    #\${ROOT_ID} .ab-fact-no-icon {
      grid-template-rows: minmax(2rem, auto) minmax(2.15rem, auto);
      row-gap: var(--ab-product-space-2xs);
    }

    #\${ROOT_ID} .ab-fact-label {
      margin: 0;
      color: var(--ab-product-ink);
      font-family: var(--ab-product-number);
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: 0.035em;
      text-transform: uppercase;
    }

    #\${ROOT_ID} .ab-fact-icon {
      display: grid;
      width: 1.35rem;
      min-height: 1.35rem;
      place-items: center;
      color: var(--ab-product-ink);
      font-family: var(--ab-product-number);
      font-size: 1.08rem;
      font-weight: 400;
      line-height: 1;
    }

    #\${ROOT_ID} .ab-fact-icon svg {
      display: block;
      width: 1.25rem;
      height: 1.25rem;
      stroke: currentColor;
    }

    #\${ROOT_ID} .ab-fact-no-icon .ab-fact-icon { display: none; }

    #\${ROOT_ID} .ab-fact-value {
      margin: 0;
      color: var(--ab-product-ink);
      font-size: 0.96rem;
      font-weight: 400;
      line-height: 1.28;
      overflow-wrap: anywhere;
      align-self: start;
    }

    #\${ROOT_ID} .ab-fact-value-strong {
      display: block;
      color: var(--ab-product-ink);
      font-family: var(--ab-product-number);
      font-size: 1.14rem;
      font-weight: 600;
      line-height: 1.05;
    }

    #\${ROOT_ID} .ab-fact-sub {
      display: block;
      margin-block-start: var(--ab-product-space-3xs);
      color: var(--ab-product-muted);
      font-size: 0.78rem;
      font-weight: 400;
      line-height: 1.25;
    }

    #\${ROOT_ID} .ab-section-heading,
    app-product-details .ab-review-section > .section-title h3 {
      min-width: 0;
      margin: 0 0 var(--ab-product-space-sm) !important;
      color: var(--ab-product-ink) !important;
      font-family: var(--ab-product-heading-bold) !important;
      font-size: clamp(1.24rem, 2.4vw, 1.55rem) !important;
      font-weight: 800 !important;
      line-height: 1.35 !important;
      letter-spacing: 0.01em;
      font-synthesis-weight: none !important;
      overflow-wrap: anywhere;
    }

    app-product-details .cash-on-delivery-area img[data-ab-delivery-icon="true"] {
      width: 1.75rem !important;
      height: 1.75rem !important;
      object-fit: contain !important;
      opacity: 0.82;
    }

    app-product-details #__shudhui-section {
      display: none !important;
    }

    #ab-sticky-commerce,
    #ab-sticky-product-actions,
    #ab-cart-sticky-checkout {
      display: none;
    }

    #ab-cart-page {
      position: fixed;
      z-index: 90;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      overflow: auto;
      background: var(--ab-product-paper);
      color: var(--ab-product-ink);
      font-family: var(--ab-product-body);
    }

    #ab-cart-page .ab-cart-page-shell {
      width: min(100%, var(--ab-product-content-max));
      margin: 0 auto;
      padding: var(--ab-product-space-md) max(var(--ab-product-space-sm), env(safe-area-inset-right)) calc(var(--ab-product-space-lg) + env(safe-area-inset-bottom)) max(var(--ab-product-space-sm), env(safe-area-inset-left));
    }

    #ab-cart-page .ab-cart-page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 0 var(--ab-product-space-sm);
      border-bottom: 1px solid var(--ab-product-rule);
    }

    #ab-cart-page .ab-cart-page-header h1 {
      margin: 0;
      font-family: var(--ab-product-heading-bold);
      font-size: clamp(1.35rem, 3vw, 1.8rem);
      font-weight: 800;
    }

    #ab-cart-page .ab-cart-page-count {
      margin: var(--ab-product-space-3xs) 0 0;
      color: var(--ab-product-muted);
      font-size: 0.86rem;
    }

    #ab-cart-page .ab-cart-page-back {
      display: inline-grid;
      min-height: 2.6rem;
      padding: 0 0.8rem;
      place-items: center;
      border: 1px solid var(--ab-product-rule);
      border-radius: var(--ab-product-radius-sm);
      background: var(--ab-product-surface);
      color: var(--ab-product-ink);
      font: inherit;
      cursor: pointer;
    }

    #ab-cart-page .ab-cart-page-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 23rem);
      gap: var(--ab-product-space-md);
      align-items: start;
      margin-top: var(--ab-product-space-md);
    }

    #ab-cart-page .ab-cart-page-main,
    #ab-cart-page .ab-cart-page-summary-card {
      border: 1px solid var(--ab-product-rule);
      background: var(--ab-product-surface);
    }

    #ab-cart-page .ab-cart-page-selection {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ab-product-space-sm);
      padding: var(--ab-product-space-sm);
      border-bottom: 1px solid var(--ab-product-rule);
      color: var(--ab-product-muted);
      font-size: 0.9rem;
    }

    #ab-cart-page .ab-cart-page-items {
      display: grid;
      gap: 0;
      margin: 0;
    }

    #ab-cart-page .ab-cart-page-item {
      display: grid;
      grid-template-columns: 5rem minmax(0, 1fr) auto;
      gap: var(--ab-product-space-sm);
      align-items: center;
      padding: var(--ab-product-space-sm);
      border-bottom: 1px solid var(--ab-product-rule);
      background: var(--ab-product-surface);
    }

    #ab-cart-page .ab-cart-page-item:last-child { border-bottom: 0; }

    #ab-cart-page .ab-cart-page-image {
      display: block;
      width: 5rem;
      height: 6.25rem;
      object-fit: contain;
      background: var(--ab-product-surface-muted);
    }

    #ab-cart-page .ab-cart-page-title {
      margin: 0 0 0.32rem;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.35;
    }

    #ab-cart-page .ab-cart-page-unit {
      margin: 0;
      color: var(--ab-product-muted);
      font-size: 0.86rem;
    }

    #ab-cart-page .ab-cart-page-quantity {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: var(--ab-product-space-xs);
    }

    #ab-cart-page .ab-cart-page-quantity button {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--ab-product-rule);
      border-radius: var(--ab-product-radius-sm);
      background: var(--ab-product-surface);
      color: var(--ab-product-ink);
      font: inherit;
      cursor: pointer;
    }

    #ab-cart-page .ab-cart-page-quantity button:disabled { opacity: 0.45; cursor: not-allowed; }
    #ab-cart-page .ab-cart-page-quantity output { min-width: 1.4rem; text-align: center; }

    #ab-cart-page .ab-cart-page-price {
      text-align: right;
      color: var(--ab-product-accent-dark);
      font-family: var(--ab-product-number);
      font-size: 1.05rem;
      font-weight: 700;
      white-space: nowrap;
    }

    #ab-cart-page .ab-cart-page-remove {
      display: block;
      margin: var(--ab-product-space-2xs) 0 0 auto;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--ab-product-discount);
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
    }

    #ab-cart-page .ab-cart-page-summary-card {
      position: sticky;
      top: var(--ab-product-space-sm);
      padding: var(--ab-product-space-sm);
    }

    #ab-cart-page .ab-cart-page-summary-card h2 {
      margin: 0 0 var(--ab-product-space-sm);
      font-family: var(--ab-product-heading-bold);
      font-size: 1.12rem;
      font-weight: 800;
    }

    #ab-cart-page .ab-cart-page-summary-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ab-product-space-sm);
      padding: var(--ab-product-space-2xs) 0;
      color: var(--ab-product-muted);
      font-size: 0.92rem;
    }

    #ab-cart-page .ab-cart-page-summary-total {
      margin-top: var(--ab-product-space-sm);
      padding-top: var(--ab-product-space-sm);
      border-top: 1px solid var(--ab-product-rule);
      color: var(--ab-product-ink);
      font-family: var(--ab-product-number);
      font-size: 1.05rem;
      font-weight: 700;
    }

    #ab-cart-page .ab-cart-page-note {
      margin: var(--ab-product-space-sm) 0;
      padding: var(--ab-product-space-xs);
      border-left: 3px solid var(--ab-product-accent);
      background: var(--ab-product-surface-muted);
      color: var(--ab-product-muted);
      font-size: 0.84rem;
      line-height: 1.45;
    }

    #ab-cart-page .ab-cart-page-checkout {
      display: inline-grid;
      width: 100%;
      min-height: 3.1rem;
      padding: 0 var(--ab-product-space-sm);
      place-items: center;
      border: 0;
      border-radius: var(--ab-product-radius-sm);
      background: var(--ab-product-accent);
      color: var(--ab-product-surface);
      font: inherit;
      font-weight: 700;
      text-decoration: none;
    }

    #ab-cart-page .ab-cart-page-empty {
      margin: var(--ab-product-space-lg) 0;
      padding: var(--ab-product-space-lg);
      border: 1px solid var(--ab-product-rule);
      background: var(--ab-product-surface);
      color: var(--ab-product-muted);
      text-align: center;
    }

    app-product-details app-best-selling-book.ab-category-library-source {
      display: none !important;
    }

    #\${CATEGORY_LIBRARY_ID} {
      width: 100%;
      max-width: var(--ab-product-content-max);
      margin: var(--ab-product-space-lg) auto;
      padding: var(--ab-product-space-lg) var(--ab-product-space-sm);
      color: var(--ab-product-ink);
      font-family: var(--ab-product-body);
      border-block-start: 1px solid var(--ab-product-rule);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-heading {
      min-width: 0;
      margin: 0 0 var(--ab-product-space-md) !important;
      color: var(--ab-product-ink);
      font-family: var(--ab-product-heading-bold);
      font-size: clamp(1.2rem, 2.4vw, 1.55rem);
      font-weight: 700;
      line-height: 1.35;
      text-align: center;
      overflow-wrap: anywhere;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--ab-product-space-md) var(--ab-product-space-xs);
      align-items: start;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-shelves {
      display: grid;
      gap: var(--ab-product-space-lg);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-shelf {
      min-width: 0;
      padding-block-start: var(--ab-product-space-md);
      border-block-start: 1px solid var(--ab-product-rule);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-shelf:first-child {
      padding-block-start: 0;
      border-block-start: 0;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-shelf-heading {
      min-width: 0;
      margin: 0 0 var(--ab-product-space-sm) !important;
      color: var(--ab-product-accent-dark);
      font-family: var(--ab-product-heading-bold);
      font-size: clamp(1.05rem, 2vw, 1.28rem);
      font-weight: 700;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-card {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: var(--ab-product-space-2xs);
      min-width: 0;
      color: var(--ab-product-ink);
      text-align: center;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-link {
      display: grid;
      grid-template-rows: 11.5rem minmax(2.5rem, auto) auto auto;
      gap: var(--ab-product-space-3xs);
      min-width: 0;
      color: inherit;
      text-decoration: none;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-link:hover .ab-library-title {
      color: var(--ab-product-accent-dark);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-link:active {
      opacity: 0.72;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-link:focus-visible,
    #\${CATEGORY_LIBRARY_ID} .ab-library-more:focus-visible {
      outline: 3px solid var(--ab-product-focus);
      outline-offset: 3px;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-image-wrap {
      position: relative;
      min-width: 0;
      height: 11.5rem;
      background: var(--ab-product-paper-soft);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-discount {
      position: absolute;
      inset-block-start: var(--ab-product-space-2xs);
      inset-inline-end: var(--ab-product-space-2xs);
      display: grid;
      place-content: center;
      width: 3rem;
      aspect-ratio: 1;
      color: var(--ab-product-discount-ink);
      background: var(--ab-product-discount);
      font-family: var(--ab-product-number);
      font-size: 0.8rem;
      font-weight: 700;
      line-height: 1;
      border: 2px solid var(--ab-product-discount-ink);
      border-radius: 50%;
      box-shadow: 0 1px 3px oklch(20% 0.02 145 / 0.22);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-discount small {
      display: block;
      margin-block-start: 0.12rem;
      font-size: 0.55rem;
      font-weight: 700;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-rank-badge {
      position: absolute;
      inset-block-start: var(--ab-product-space-2xs);
      inset-inline-start: var(--ab-product-space-2xs);
      z-index: 1;
      max-width: calc(100% - 4rem);
      padding: 0.3rem 0.45rem;
      overflow: hidden;
      color: var(--ab-product-paper);
      background: var(--ab-product-accent-dark);
      font-family: var(--ab-product-heading);
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: var(--ab-product-radius-sm);
      box-shadow: 0 1px 3px oklch(20% 0.02 145 / 0.18);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-title {
      display: -webkit-box;
      min-width: 0;
      min-height: 2.5rem;
      margin: 0 !important;
      overflow: hidden;
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.35;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-author {
      min-width: 0;
      margin: 0 !important;
      overflow: hidden;
      color: var(--ab-product-muted);
      font-size: 0.78rem;
      font-weight: 400;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-price {
      margin: 0 !important;
      color: var(--ab-product-accent-dark);
      font-family: var(--ab-product-number);
      font-size: 0.88rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-footer {
      display: grid;
      place-items: center;
      min-height: 4.5rem;
      padding-block-start: var(--ab-product-space-md);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-more {
      min-height: 2.75rem;
      padding-inline: var(--ab-product-space-md);
      color: var(--ab-product-accent-dark);
      background: var(--ab-product-paper);
      font-family: var(--ab-product-heading-bold);
      font-size: 0.95rem;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid var(--ab-product-accent);
      border-radius: var(--ab-product-radius-sm);
      cursor: pointer;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-more:hover {
      color: var(--ab-product-accent);
      border-color: var(--ab-product-accent-dark);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-more:active {
      color: var(--ab-product-paper);
      background: var(--ab-product-accent-dark);
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-more:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    #\${CATEGORY_LIBRARY_ID} .ab-library-status {
      margin: 0 !important;
      color: var(--ab-product-muted);
      font-size: 0.85rem;
      line-height: 1.4;
      text-align: center;
    }

    app-product-details .ab-review-section .review-product-image-area[data-ab-review-image-empty="true"],
    app-product-details .ab-review-section lightgallery[data-ab-review-image-empty="true"],
    app-product-details .ab-review-section .review-product-img-main[data-ab-review-image-empty="true"],
    app-product-details .ab-review-section img[data-ab-review-image-broken="true"] {
      display: none !important;
    }

    #\${ROOT_ID} .ab-rich-text {
      max-width: 72ch;
      color: var(--ab-product-ink);
      font-size: 0.98rem;
      font-weight: 400;
      line-height: 1.78;
      font-synthesis-weight: none;
    }

    #\${ROOT_ID} .ab-rich-text * {
      color: inherit !important;
      font-family: inherit !important;
      font-weight: 400 !important;
      background: transparent !important;
    }

    #\${ROOT_ID} .ab-rich-text p {
      margin: 0 0 var(--ab-product-space-xs) !important;
      font-weight: 400 !important;
    }
    #\${ROOT_ID} .ab-rich-text strong,
    #\${ROOT_ID} .ab-rich-text b { font-weight: 400 !important; }
    #\${ROOT_ID} .ab-rich-text p:last-child { margin-bottom: 0 !important; }

    #\${ROOT_ID} .ab-summary-section .ab-rich-text,
    #\${ROOT_ID} .ab-description-section .ab-rich-text {
      width: 100%;
      max-width: none;
    }

    #\${ROOT_ID} .ab-author-list {
      display: grid;
      gap: var(--ab-product-space-lg);
    }

    #\${ROOT_ID} .ab-author-card {
      min-width: 0;
      display: grid;
      grid-template-columns: 5.5rem minmax(0, 1fr);
      gap: var(--ab-product-space-sm) var(--ab-product-space-md);
      align-items: center;
    }

    #\${ROOT_ID} .ab-author-image {
      width: 5.5rem;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 50%;
      background: var(--ab-product-paper-soft);
      border: 1px solid var(--ab-product-rule);
    }

    #\${ROOT_ID} .ab-author-body { min-width: 0; }

    #\${ROOT_ID} .ab-author-name {
      display: inline-block;
      margin: 0;
      color: var(--ab-product-accent-dark);
      font-size: 1.18rem;
      font-weight: 400;
      line-height: 1.35;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    #\${ROOT_ID} .ab-author-meta {
      margin: var(--ab-product-space-3xs) 0 0;
      color: var(--ab-product-muted);
      font-family: var(--ab-product-number);
      font-size: 0.9rem;
    }

    #\${ROOT_ID} .ab-author-description {
      grid-column: 1 / -1;
      max-width: 72ch;
      color: var(--ab-product-ink);
      font-size: 0.98rem;
      font-weight: 400;
      line-height: 1.72;
      font-synthesis-weight: none;
    }

    #\${ROOT_ID} .ab-author-description * {
      color: inherit !important;
      font-family: inherit !important;
      font-weight: 400 !important;
      background: transparent !important;
    }

    #\${ROOT_ID} .ab-author-description p { margin: 0 0 var(--ab-product-space-xs); }
    #\${ROOT_ID} .ab-author-description p:last-child { margin-bottom: 0; }

    #\${ROOT_ID} .ab-author-description-empty {
      grid-column: 1 / -1;
      margin: var(--ab-product-space-3xs) 0 0;
      color: var(--ab-product-muted);
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.5;
    }

    #\${ROOT_ID} .ab-author-name:hover { text-decoration: underline; }
    #\${ROOT_ID} .ab-author-name:active { color: var(--ab-product-accent); }
    #\${ROOT_ID} .ab-author-name:focus-visible,
    #\${ROOT_ID} .ab-product-link:focus-visible,
    #\${ROOT_ID} .ab-product-grid:focus-visible {
      outline: 3px solid var(--ab-product-focus);
      outline-offset: 3px;
    }

    #\${ROOT_ID} .ab-author-name[aria-disabled="true"],
    #\${ROOT_ID} .ab-product-link[aria-disabled="true"] {
      pointer-events: none;
      cursor: not-allowed;
      opacity: 0.55;
    }

    #\${ROOT_ID} .ab-section-note {
      margin: calc(var(--ab-product-space-xs) * -1) 0 var(--ab-product-space-sm);
      color: var(--ab-product-muted);
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.5;
    }

    #\${ROOT_ID} .ab-product-grid {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(8.75rem, 44%);
      grid-template-columns: none;
      gap: var(--ab-product-space-xs);
      align-items: start;
      min-width: 0;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scroll-snap-type: inline proximity;
      scrollbar-color: var(--ab-product-rule) transparent;
      scrollbar-width: thin;
      padding-block-end: var(--ab-product-space-2xs);
    }

    #\${ROOT_ID} .ab-product-card {
      min-width: 0;
      display: grid;
      grid-template-rows: 9.75rem minmax(2.5rem, auto) auto auto auto;
      gap: var(--ab-product-space-3xs);
      padding: 0;
      color: var(--ab-product-ink);
      text-align: center;
      text-decoration: none;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0;
      font-family: inherit;
      font-weight: 400;
      font-synthesis-weight: none;
      scroll-snap-align: start;
      transition: none;
    }

    #\${ROOT_ID} .ab-product-link {
      min-width: 0;
      color: inherit;
      text-decoration: none;
    }

    #\${ROOT_ID} .ab-product-link:active {
      color: var(--ab-product-accent-dark);
    }

    #\${ROOT_ID} .ab-product-card > .ab-product-link:first-child {
      display: grid;
      height: 9.75rem;
      place-items: center;
    }

    #\${ROOT_ID} .ab-product-card img {
      display: block;
      width: 7.25rem;
      height: 9.75rem;
      max-width: 100%;
      object-fit: contain;
      background: var(--ab-product-paper-soft);
      border-radius: 0;
    }

    #\${ROOT_ID} .ab-product-name {
      display: -webkit-box;
      min-width: 0;
      min-height: 2.5rem;
      margin: 0;
      overflow: hidden;
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.3;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    #\${ROOT_ID} .ab-product-author {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      color: var(--ab-product-muted);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #\${ROOT_ID} .ab-product-price {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: center;
      gap: var(--ab-product-space-3xs);
      margin: 0;
      font-family: var(--ab-product-number);
      font-variant-numeric: tabular-nums;
    }

    #\${ROOT_ID} .ab-product-current-price {
      color: var(--ab-product-ink);
      font-size: 0.875rem;
      font-weight: 400;
    }

    #\${ROOT_ID} .ab-product-old-price {
      color: var(--ab-product-muted);
      font-size: 0.8rem;
      text-decoration: line-through;
    }

    #\${ROOT_ID} .ab-add-cart-button,
    #\${CATEGORY_LIBRARY_ID} .ab-add-cart-button {
      display: flex;
      width: 100%;
      min-height: 2.75rem;
      margin-inline: auto;
      align-items: center;
      justify-content: center;
      padding-inline: var(--ab-product-space-2xs);
      color: var(--ab-product-accent-dark);
      background: var(--ab-product-paper);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
      border: 1px solid var(--ab-product-accent);
      border-radius: var(--ab-product-radius-sm);
      cursor: pointer;
      transition: none;
    }

    #\${ROOT_ID} .ab-add-cart-button:hover,
    #\${CATEGORY_LIBRARY_ID} .ab-add-cart-button:hover {
      color: var(--ab-product-accent);
      border-color: var(--ab-product-accent-dark);
    }

    #\${ROOT_ID} .ab-add-cart-button:active,
    #\${CATEGORY_LIBRARY_ID} .ab-add-cart-button:active {
      color: var(--ab-product-paper);
      background: var(--ab-product-accent-dark);
    }

    #\${ROOT_ID} .ab-add-cart-button:focus-visible,
    #\${CATEGORY_LIBRARY_ID} .ab-add-cart-button:focus-visible {
      outline: 3px solid var(--ab-product-focus);
      outline-offset: 3px;
    }

    #\${ROOT_ID} .ab-add-cart-button:disabled,
    #\${CATEGORY_LIBRARY_ID} .ab-add-cart-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    /* The Angular cart's component styles are scoped, so a cart row created
       by this enhancement needs the same styles explicitly. Keep this in
       lockstep with the native .cart-item treatment. */
    app-cart-slide .ab-live-cart-fallback {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 20px;
      padding: 15px;
      box-sizing: border-box;
      border-bottom: 1px solid #e8e8e8;
    }

    app-cart-slide .ab-live-cart-fallback .cart-img {
      display: block;
      position: relative;
      min-width: 100px;
      overflow: hidden;
      border-radius: 8px;
    }

    app-cart-slide .ab-live-cart-fallback .cart-img img {
      display: block;
      width: 100px;
    }

    app-cart-slide .ab-live-cart-fallback .del {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      visibility: hidden;
      opacity: 0;
      transform: scale(0);
      transform-origin: center;
      border-radius: 8px;
      background-color: #0006;
      transition: all .3s linear;
    }

    app-cart-slide .ab-live-cart-fallback:hover .del {
      visibility: visible;
      opacity: 1;
      transform: scale(1);
    }

    app-cart-slide .ab-live-cart-fallback .del span {
      display: inline-block;
      width: 32px;
      height: 32px;
      border-radius: 5px;
      color: #ff3838;
      background: rgba(255, 255, 255, .9);
      font-size: 18px;
      line-height: 32px;
      text-align: center;
      cursor: pointer;
    }

    app-cart-slide .ab-live-cart-fallback .cart-text {
      display: block;
      width: 100%;
      min-width: 0;
    }

    app-cart-slide .ab-live-cart-fallback .cart-text h4 {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      color: #252525;
      font-size: 16px;
      font-weight: 400;
      line-height: 26px;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }

    app-cart-slide .ab-live-cart-fallback .cart-text > span {
      display: block;
      color: #555;
      font-size: 14px;
      font-weight: 400;
      line-height: 22px;
    }

    app-cart-slide .ab-live-cart-fallback .quantity-price,
    app-cart-slide .ab-live-cart-fallback .quantity {
      display: flex;
      align-items: center;
    }

    app-cart-slide .ab-live-cart-fallback .quantity-price {
      justify-content: space-between;
      gap: 10px;
      margin-top: 13px;
    }

    app-cart-slide .ab-live-cart-fallback .quantity { gap: 5px; }

    app-cart-slide .ab-live-cart-fallback .quantity button {
      display: flex;
      width: 30px;
      height: 30px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 5px;
      outline: 0;
      color: #555;
      background-color: #f5f5f5;
      font-size: 11px;
      cursor: pointer;
    }

    app-cart-slide .ab-live-cart-fallback .quantity input {
      width: 40px;
      height: 30px;
      border: 0;
      border-radius: 5px;
      outline: 0;
      color: #129245;
      background-color: #f5f5f5;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }

    app-cart-slide .ab-live-cart-fallback .price b {
      display: block;
      color: #129245;
      font-size: 17px;
      font-weight: 500;
    }

    @media (min-width: 48rem) {
      #\${CATEGORY_LIBRARY_ID} .ab-library-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      #\${ROOT_ID} .ab-author-card {
        grid-template-columns: 6.5rem minmax(0, 1fr);
        gap: var(--ab-product-space-2xs) var(--ab-product-space-md);
        align-items: start;
      }

      #\${ROOT_ID} .ab-author-image {
        grid-row: 1 / span 2;
        width: 6.5rem;
      }

      #\${ROOT_ID} .ab-author-description {
        grid-column: 2;
        max-width: none;
      }

      #\${ROOT_ID} .ab-author-description-empty { grid-column: 2; }

      #\${ROOT_ID} .ab-recommendation-section {
        padding-block: var(--ab-product-space-lg);
      }

      #\${ROOT_ID} .ab-recommendation-section .ab-section-heading {
        margin-block-end: var(--ab-product-space-md) !important;
      }

      #\${ROOT_ID} .ab-product-grid {
        grid-auto-columns: 9rem;
        gap: var(--ab-product-space-md);
      }
    }

    @media (min-width: 64rem) {
      #\${CATEGORY_LIBRARY_ID} .ab-library-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      #\${CATEGORY_LIBRARY_ID} .ab-library-link {
        grid-template-rows: 12rem minmax(2.5rem, auto) auto auto;
      }

      #\${CATEGORY_LIBRARY_ID} .ab-library-image-wrap {
        height: 12rem;
      }

      #\${ROOT_ID} .ab-product-grid {
        grid-auto-flow: row;
        grid-auto-columns: auto;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: var(--ab-product-space-xs);
        width: 100%;
        overflow-x: visible;
        scroll-snap-type: none;
        padding-block-end: 0;
      }

      #\${ROOT_ID} .ab-product-card {
        grid-template-rows: 9rem minmax(2.5rem, auto) auto auto auto;
        padding: var(--ab-product-space-xs);
        background: var(--ab-product-paper);
        border-color: var(--ab-product-rule);
        border-radius: var(--ab-product-radius-sm);
      }

      #\${ROOT_ID} .ab-product-card > .ab-product-link:first-child {
        height: 9rem;
      }

      #\${ROOT_ID} .ab-product-card img {
        width: 6.75rem;
        height: 9rem;
      }

      #\${ROOT_ID} .ab-product-card:nth-child(n + 7) { display: none; }
    }

    app-product-details .ab-review-section > .product-menu { display: none !important; }
    app-product-details .ab-review-section > .section-title { margin: 0 !important; padding: 0 !important; }
    app-product-details .ab-review-section > .section-info-area { display: block !important; margin: 0 !important; padding: 0 !important; }

    app-product-details .ab-review-section app-all-reviews,
    app-product-details .ab-review-section app-all-reviews .review-area,
    app-product-details .ab-review-section app-all-reviews .container {
      display: block;
      width: 100%;
      max-width: none;
      margin: 0 !important;
      padding-inline: 0 !important;
    }

    app-product-details .ab-review-section .review-rating-main {
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    app-product-details .ab-review-section button:focus-visible {
      outline: 3px solid var(--ab-product-focus) !important;
      outline-offset: 3px;
    }

    @media (max-width: 767px) {
      #ab-sticky-commerce {
        position: fixed;
        z-index: 10010;
        right: 0;
        top: 0;
        left: 0;
        display: grid;
        grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
        align-items: center;
        gap: 0.45rem;
        min-height: 3.6rem;
        padding: max(0.45rem, env(safe-area-inset-top)) 0.7rem 0.45rem;
        border-bottom: 1px solid var(--ab-product-rule);
        background: color-mix(in oklab, var(--ab-product-paper) 96%, white);
        box-shadow: 0 0.35rem 1.1rem rgb(20 45 28 / 0.1);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-115%);
        transition: transform var(--ab-product-dur-short) var(--ab-product-ease-out), opacity var(--ab-product-dur-short) linear;
      }

      #ab-sticky-commerce.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      #ab-sticky-commerce button {
        position: relative;
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        place-items: center;
        border: 0;
        border-radius: 0.35rem;
        background: transparent;
        color: var(--ab-product-accent-dark);
        font-size: 1.15rem;
      }

      #ab-sticky-commerce .ab-sticky-search {
        width: 100%;
        min-width: 0;
        height: 2.55rem;
        padding: 0 0.8rem;
        border: 1px solid var(--ab-product-rule);
        border-radius: 0.35rem;
        outline: 0;
        background: #fff;
        color: var(--ab-product-ink);
        font: inherit;
      }

      #ab-sticky-commerce .ab-sticky-search-wrap {
        position: relative;
        min-width: 0;
      }

      #ab-sticky-commerce .ab-sticky-search-results {
        position: absolute;
        z-index: 2;
        top: calc(100% + 0.38rem);
        right: 0;
        left: 0;
        display: grid;
        max-height: min(23rem, calc(100vh - 5rem));
        overflow: auto;
        border: 1px solid var(--ab-product-rule);
        border-radius: 0.45rem;
        background: #fff;
        box-shadow: 0 0.85rem 1.7rem rgb(20 45 28 / 0.16);
      }

      #ab-sticky-commerce .ab-sticky-search-results[hidden] {
        display: none;
      }

      #ab-sticky-commerce .ab-sticky-search-state,
      #ab-sticky-commerce .ab-sticky-search-item {
        min-width: 0;
        padding: 0.72rem;
      }

      #ab-sticky-commerce .ab-sticky-search-state {
        color: var(--ab-product-muted);
        font-size: 0.88rem;
      }

      #ab-sticky-commerce .ab-sticky-search-item {
        display: grid;
        grid-template-columns: 2.7rem minmax(0, 1fr) auto;
        gap: 0.68rem;
        align-items: center;
        color: var(--ab-product-ink);
        text-decoration: none;
      }

      #ab-sticky-commerce .ab-sticky-search-item + .ab-sticky-search-item {
        border-top: 1px solid var(--ab-product-rule);
      }

      #ab-sticky-commerce .ab-sticky-search-item:focus-visible,
      #ab-sticky-commerce .ab-sticky-search-item:hover {
        background: var(--ab-product-surface-muted);
        outline: 0;
      }

      #ab-sticky-commerce .ab-sticky-search-item img {
        width: 2.7rem;
        height: 3.45rem;
        object-fit: contain;
        background: var(--ab-product-surface-muted);
      }

      #ab-sticky-commerce .ab-sticky-search-title,
      #ab-sticky-commerce .ab-sticky-search-author,
      #ab-sticky-commerce .ab-sticky-search-price {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #ab-sticky-commerce .ab-sticky-search-title {
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1.35;
      }

      #ab-sticky-commerce .ab-sticky-search-author {
        margin-top: 0.14rem;
        color: var(--ab-product-muted);
        font-size: 0.78rem;
      }

      #ab-sticky-commerce .ab-sticky-search-price {
        color: var(--ab-product-accent-dark);
        font-family: var(--ab-product-number);
        font-size: 0.86rem;
        font-weight: 700;
      }

      #ab-sticky-commerce .ab-sticky-cart-count {
        position: absolute;
        top: 0.1rem;
        right: 0.08rem;
        display: none;
        min-width: 1.15rem;
        height: 1.15rem;
        padding: 0 0.2rem;
        border: 2px solid var(--ab-product-paper);
        border-radius: 999px;
        background: var(--ab-product-discount);
        color: #fff;
        font-family: var(--ab-product-number);
        font-size: 0.66rem;
        font-weight: 700;
        line-height: 1rem;
        text-align: center;
      }

      #ab-sticky-commerce .ab-sticky-cart-count.has-items { display: block; }

      #ab-sticky-commerce .ab-sticky-cart.is-added {
        animation: ab-cart-guidance 720ms var(--ab-product-ease-out) 1;
      }

      #ab-sticky-product-actions {
        position: fixed;
        z-index: 10020;
        right: 0;
        bottom: 0;
        left: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 0.65rem;
        padding: 0.65rem 0.85rem max(0.65rem, env(safe-area-inset-bottom));
        border-top: 1px solid var(--ab-product-rule);
        background: color-mix(in oklab, var(--ab-product-paper) 96%, white);
        box-shadow: 0 -0.35rem 1.1rem rgb(20 45 28 / 0.12);
        opacity: 0;
        pointer-events: none;
        transform: translateY(115%);
        transition: transform var(--ab-product-dur-short) var(--ab-product-ease-out), opacity var(--ab-product-dur-short) linear;
      }

      #ab-sticky-product-actions.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      #ab-sticky-product-actions.is-cart-ready { grid-template-columns: minmax(0, 1fr); }

      #ab-sticky-product-actions button {
        min-width: 0;
        min-height: 3.15rem;
        border: 1px solid var(--ab-product-accent);
        border-radius: 0.35rem;
        background: var(--ab-product-surface);
        color: var(--ab-product-accent-dark);
        font: 800 1rem/1.1 var(--ab-product-heading);
      }

      #ab-sticky-product-actions .ab-sticky-product-buy,
      #ab-sticky-product-actions.is-cart-ready .ab-sticky-product-go-cart {
        background: var(--ab-product-accent);
        color: #fff;
      }

      #ab-sticky-product-actions.is-cart-ready .ab-sticky-product-buy,
      #ab-sticky-product-actions.is-cart-ready .ab-sticky-product-add {
        display: none;
      }

      #ab-sticky-product-actions .ab-sticky-product-go-cart { display: none; }
      #ab-sticky-product-actions.is-cart-ready .ab-sticky-product-go-cart { display: block; }

      #ab-cart-sticky-checkout {
        position: fixed;
        z-index: 10040;
        right: 0;
        bottom: 0;
        left: 0;
        display: none;
        padding: 0.65rem 0.8rem max(0.65rem, env(safe-area-inset-bottom));
        border-top: 1px solid var(--ab-product-rule);
        background: color-mix(in oklab, var(--ab-product-paper) 96%, white);
        box-shadow: 0 -0.35rem 1.1rem rgb(20 45 28 / 0.12);
      }

      body.ab-cart-enhanced #ab-cart-sticky-checkout {
        display: block;
      }

      #ab-cart-sticky-checkout button {
        display: block;
        width: 100%;
        min-height: 3.25rem;
        border: 0;
        border-radius: 0.35rem;
        background: #4495f8;
        color: #fff;
        font: 800 1.12rem/1.15 var(--ab-product-heading-bold);
        text-align: center;
      }

      #ab-added-cart-modal {
        position: fixed;
        z-index: 10060;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        background: rgb(0 0 0 / 0.48);
      }

      #ab-added-cart-modal .ab-added-cart-panel {
        width: min(100%, 35rem);
        max-height: min(86vh, 44rem);
        overflow: auto;
        border-radius: 0.42rem;
        background: #fff;
        color: #2f3438;
        box-shadow: 0 1rem 3rem rgb(0 0 0 / 0.24);
      }

      #ab-added-cart-modal .ab-added-cart-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 2.5rem;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #eef0f2;
      }

      #ab-added-cart-modal .ab-added-cart-title {
        margin: 0;
        color: #26292c;
        font: 800 1.2rem/1.35 var(--ab-product-heading-bold);
      }

      #ab-added-cart-modal .ab-added-cart-check {
        display: inline-grid;
        width: 1.35rem;
        height: 1.35rem;
        place-items: center;
        margin-inline-start: 0.25rem;
        border: 2px solid #31c45d;
        border-radius: 999px;
        color: #31c45d;
        font: 900 0.9rem/1 var(--ab-product-number);
      }

      #ab-added-cart-modal .ab-added-cart-close {
        width: 2.25rem;
        height: 2.25rem;
        border: 0;
        background: transparent;
        color: #72777d;
        font-size: 1.8rem;
        line-height: 1;
      }

      #ab-added-cart-modal .ab-added-cart-body {
        padding: 1.1rem 1.25rem 1.25rem;
      }

      #ab-added-cart-modal .ab-added-cart-summary {
        margin-bottom: 1.2rem;
        padding: 1rem;
        background: #f7f7f7;
        text-align: center;
      }

      #ab-added-cart-modal .ab-added-cart-summary p {
        margin: 0 0 0.35rem;
        color: #33383d;
        font: 800 1rem/1.35 var(--ab-product-number);
      }

      #ab-added-cart-modal .ab-added-cart-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 0.75rem;
        margin-top: 0.85rem;
      }

      #ab-added-cart-modal .ab-added-cart-actions button {
        min-height: 2.85rem;
        border: 1px solid #08a5dd;
        border-radius: 0.25rem;
        background: #fff;
        color: #099bd0;
        font: 800 1rem/1 var(--ab-product-heading-bold);
      }

      #ab-added-cart-modal .ab-added-cart-actions .ab-added-cart-go {
        background: #0aa1d6;
        color: #fff;
      }

      #ab-added-cart-modal .ab-added-cart-reco-title {
        margin: 0 0 0.85rem;
        color: #33383d;
        font: 800 1.35rem/1.25 var(--ab-product-heading-bold);
      }

      #ab-added-cart-modal .ab-added-cart-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }

      #ab-added-cart-modal .ab-added-cart-card {
        min-width: 0;
        overflow: hidden;
        border: 1px solid #eef0f2;
        border-radius: 0.35rem;
        background: #fff;
      }

      #ab-added-cart-modal .ab-added-cart-card img {
        display: block;
        width: 100%;
        height: 11rem;
        object-fit: contain;
        background: #f8faf8;
      }

      #ab-added-cart-modal .ab-added-cart-card-body { padding: 0.65rem; }
      #ab-added-cart-modal .ab-added-cart-card h3,
      #ab-added-cart-modal .ab-added-cart-card p {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #ab-added-cart-modal .ab-added-cart-card h3 { font: 800 1rem/1.25 var(--ab-product-heading-bold); }
      #ab-added-cart-modal .ab-added-cart-card p { color: #74787d; font-size: 0.85rem; }
      #ab-added-cart-modal .ab-added-cart-card-price { color: #25292d !important; font: 800 0.95rem/1.3 var(--ab-product-number) !important; }
      #ab-added-cart-modal .ab-added-cart-card-price s { color: #a3a6aa; font-weight: 700; }
      #ab-added-cart-modal .ab-added-cart-card .ab-add-cart-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 2.7rem;
        margin: 0.65rem 0 0;
        padding: 0 0.7rem;
        border: 1px solid #0d62c8;
        border-radius: 0.25rem;
        background: #fff;
        color: #0d62c8;
        font: 800 0.98rem/1.1 var(--ab-product-heading-bold);
        text-decoration: none;
        appearance: none;
        box-shadow: none;
      }

      #ab-added-cart-modal .ab-added-cart-card .ab-add-cart-button:focus {
        outline: 2px solid #0d62c8;
        outline-offset: 2px;
      }

      /* Native cart/checkout repairs.  These are intentionally scoped to their
       * routes so the compiled storefront keeps ownership of its layout. */
      body.ab-cart-enhanced #ab-co-progress,
      body.ab-cart-enhanced #ab-co-giftrow,
      body.ab-cart-enhanced #ab-co-more { display: none !important; }

      body.ab-checkout-enhanced #ab-co-progress,
      body.ab-checkout-enhanced #ab-co-giftrow,
      body.ab-checkout-enhanced #ab-co-more { display: none !important; }

      #ab-checkout-gift {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
        padding: 0.75rem;
        border: 0 solid var(--ab-product-rule);
        border-top-width: 1px;
        border-radius: 0;
        background: color-mix(in oklab, var(--ab-product-accent) 8%, var(--ab-product-surface));
        color: var(--ab-product-ink);
        font-family: var(--ab-product-heading);
      }

      #ab-checkout-gift img {
        width: 3.75rem;
        height: 4.75rem;
        object-fit: contain;
        background: var(--ab-product-surface);
      }

      #ab-checkout-gift h3 {
        margin: 0 0 0.2rem;
        color: var(--ab-product-ink);
        font: 800 1rem/1.25 var(--ab-product-heading-bold);
      }

      #ab-checkout-gift p {
        margin: 0;
        color: var(--ab-product-muted);
        font-size: 0.88rem;
        line-height: 1.35;
      }

      #ab-checkout-gift strong {
        color: var(--ab-product-accent-dark);
        font: 800 1rem/1 var(--ab-product-heading-bold);
      }

      body.ab-checkout-enhanced .method-data img[data-ab-delivery-icon="true"] {
        width: 2.5rem !important;
        height: 2.5rem !important;
        max-width: 2.5rem !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced #amol-cart-toast,
      body.ab-product-enhanced #amol-cart-toast { display: none !important; }

      body.ab-cart-enhanced .select-items-area.ab-cart-summary-source {
        display: none !important;
      }

      body.ab-cart-enhanced #ab-cart-summary-inline {
        margin: 0 !important;
        border-width: 1px 0 0 !important;
        border-radius: 0 !important;
        background: var(--ab-product-paper-soft) !important;
      }

      #ab-cart-offer-progress,
      #ab-cart-recent {
        max-width: var(--ab-product-content-max);
        margin: var(--ab-product-space-sm) auto;
        box-sizing: border-box;
        font-family: var(--ab-product-heading);
      }

      #ab-cart-offer-progress {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--ab-product-space-xs);
        align-items: center;
        padding: var(--ab-product-space-sm);
        border: 1px solid color-mix(in oklab, var(--ab-product-accent) 34%, var(--ab-product-rule));
        border-radius: 0.75rem;
        background: linear-gradient(135deg, color-mix(in oklab, var(--ab-product-accent) 14%, var(--ab-product-surface)), var(--ab-product-surface));
        color: var(--ab-product-ink);
      }
      #ab-cart-offer-progress .ab-cart-offer-icon { font-size: 1.5rem; }
      #ab-cart-offer-progress .ab-cart-offer-notebook { width: 3rem; height: 3.9rem; object-fit: cover; border-radius: var(--ab-product-radius-sm); background: var(--ab-product-surface); box-shadow: 0 2px 7px var(--ab-product-shadow); }
      #ab-cart-offer-progress strong { color: var(--ab-product-accent-dark); }
      #ab-cart-offer-progress p { margin: 0; font-size: 0.94rem; font-weight: 700; line-height: 1.45; }
      #ab-cart-offer-progress .ab-cart-offer-bar { grid-column: 2; height: 0.45rem; overflow: hidden; border-radius: 999px; background: color-mix(in oklab, var(--ab-product-accent) 20%, var(--ab-product-surface)); }
      #ab-cart-offer-progress .ab-cart-offer-fill { height: 100%; border-radius: inherit; background: var(--ab-product-accent); transition: width 280ms var(--ab-product-ease-out); }
      #ab-cart-offer-suggestions { grid-column: 1 / -1; padding-top: var(--ab-product-space-xs); border-top: 1px solid color-mix(in oklab, var(--ab-product-accent) 20%, var(--ab-product-rule)); }
      #ab-cart-offer-suggestions h2 { margin: 0 0 var(--ab-product-space-xs); color: var(--ab-product-accent-dark); font: 800 1rem/1.35 var(--ab-product-heading-bold); }
      #ab-cart-offer-suggestions .ab-cart-offer-books { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--ab-product-space-xs); }
      #ab-cart-offer-suggestions .ab-cart-offer-book { display: grid; grid-template-columns: 2.45rem minmax(0, 1fr); gap: 0.45rem; align-items: center; min-width: 0; }
      #ab-cart-offer-suggestions img { width: 2.45rem; height: 3.2rem; object-fit: contain; background: var(--ab-product-surface); }
      #ab-cart-offer-suggestions a:not(#ab-cart-offer-all-books) { color: inherit; text-decoration: none; }
      #ab-cart-offer-suggestions h3, #ab-cart-offer-suggestions p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #ab-cart-offer-suggestions h3 { font-size: 0.78rem; font-weight: 800; }
      #ab-cart-offer-suggestions p { color: var(--ab-product-accent-dark); font-family: var(--ab-product-number); font-size: 0.8rem; font-weight: 800; }
      #ab-cart-offer-suggestions .ab-native-cart-add { grid-column: 1 / -1; margin-top: 0; }
      #ab-cart-offer-all-books { display: inline-flex; align-items: center; justify-content: center; grid-column: 1 / -1; min-height: 2.25rem; margin-top: var(--ab-product-space-xs); border-radius: var(--ab-product-radius-sm); background: var(--ab-product-accent); color: var(--ab-product-surface); font: 800 0.86rem/1 var(--ab-product-heading); text-decoration: none; }

      #ab-cart-recent { padding: var(--ab-product-space-sm); border: 1px solid var(--ab-product-rule); border-radius: 0.75rem; background: var(--ab-product-paper-soft); }
      #ab-cart-recent h2 { margin: 0 0 var(--ab-product-space-xs); color: var(--ab-product-accent-dark); font: 800 1.2rem/1.3 var(--ab-product-heading-bold); }
      #ab-cart-recent .ab-cart-recent-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--ab-product-space-xs); }
      #ab-cart-recent .ab-cart-recent-card { display: grid; grid-template-rows: auto auto auto 1fr auto; gap: 0.3rem; min-width: 0; padding: var(--ab-product-space-2xs); border-radius: var(--ab-product-radius-sm); background: var(--ab-product-surface); }
      #ab-cart-recent img { display: block; width: min(100%, 5.5rem); height: 7.35rem; margin-inline: auto; object-fit: contain; background: var(--ab-product-surface-muted); }
      #ab-cart-recent h3, #ab-cart-recent p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #ab-cart-recent h3 { font-size: 0.82rem; font-weight: 700; }
      #ab-cart-recent p { color: var(--ab-product-muted); font-size: 0.72rem; }
      #ab-cart-recent .ab-cart-recent-price { color: var(--ab-product-accent-dark); font-family: var(--ab-product-number); font-size: 0.85rem; font-weight: 800; }

      .ab-native-cart-add {
        display: block;
        position: relative;
        z-index: 3;
        width: 100%;
        margin-top: 0.55rem;
        padding: 0.5rem;
        border: 1px solid var(--ab-product-accent);
        border-radius: var(--ab-product-radius-sm);
        background: var(--ab-product-surface);
        color: var(--ab-product-accent-dark);
        cursor: pointer;
        font: 700 0.82rem/1 var(--ab-product-heading);
      }
      .ab-native-cart-add:disabled { opacity: 0.62; }

      body.ab-cart-enhanced .cart-card .ab-cart-native-author,
      body.ab-cart-enhanced .cart-card .ab-cart-native-discount {
        display: block;
        margin-top: 0.25rem;
        font-family: var(--ab-product-heading);
        line-height: 1.35;
      }
      body.ab-cart-enhanced .cart-card .ab-cart-native-author { color: var(--ab-product-muted); font-size: 0.82rem; }
      body.ab-cart-enhanced .cart-card .ab-cart-native-discount { color: var(--ab-product-discount); font-size: 0.8rem; font-weight: 800; }

      body.ab-cart-enhanced .ab-live-cart-page-item {
        animation: ab-cart-row-in 240ms var(--ab-product-ease-out) both;
      }

      body.ab-cart-enhanced .cart-card.ab-cart-native-stale {
        display: none !important;
      }

      body.ab-cart-enhanced [data-ab-cart-prelude="true"],
      body.ab-cart-enhanced app-related-products,
      body.ab-cart-enhanced .kids-book-contents,
      body.ab-cart-enhanced .related-products,
      body.ab-cart-enhanced .products-list {
        display: none !important;
      }

      @media (min-width: 768px) {
        body.ab-cart-enhanced {
          background: var(--ab-product-paper-soft) !important;
        }

        body.ab-cart-enhanced app-cart .section,
        body.ab-cart-enhanced app-cart .cart-section {
          background: var(--ab-product-paper-soft) !important;
        }

        body.ab-cart-enhanced app-cart .container {
          width: min(100%, var(--ab-product-content-max)) !important;
          max-width: var(--ab-product-content-max) !important;
          margin-inline: auto !important;
          padding: 1.5rem var(--ab-product-space-md) 2.25rem !important;
        }

        body.ab-cart-enhanced app-cart-information,
        body.ab-cart-enhanced app-cart-information .section-main,
        body.ab-cart-enhanced app-cart .section-main {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 1.25rem !important;
          align-items: start !important;
          width: min(100%, 56rem) !important;
          max-width: 56rem !important;
          margin: 0 !important;
          margin-inline: auto !important;
        }

        body.ab-cart-enhanced app-cart .section-main > .section-left,
        body.ab-cart-enhanced app-cart .section-main > .section-right,
        body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
          grid-column: 1 / -1 !important;
          align-self: start !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
        }

        body.ab-cart-enhanced app-cart .section-main > .section-left {
          grid-row: 1 !important;
        }

        body.ab-cart-enhanced app-cart .section-main > .section-right {
          grid-row: 2 !important;
        }

        body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
          grid-row: 1 !important;
        }

        body.ab-cart-enhanced app-cart-information .section-main > .section-left {
          grid-column: 1 !important;
          grid-row: 2 !important;
          width: 100% !important;
          max-width: none !important;
        }

        body.ab-cart-enhanced app-cart-information .section-main > .section-right {
          grid-column: 1 !important;
          grid-row: 3 !important;
          width: 100% !important;
          max-width: none !important;
        }

        body.ab-cart-enhanced app-cart-information .section-left,
        body.ab-cart-enhanced app-cart-information .cart-area,
        body.ab-cart-enhanced app-cart-information .cart-area-main,
        body.ab-cart-enhanced app-cart-information .section-right,
        body.ab-cart-enhanced app-cart-information .section-main > *,
        body.ab-cart-enhanced app-cart-information .select-items-area,
        body.ab-cart-enhanced app-cart .section-main > .section-left,
        body.ab-cart-enhanced app-cart .section-main > .section-right {
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        body.ab-cart-enhanced app-cart-information .section-left,
        body.ab-cart-enhanced app-cart-information .cart-area {
          display: grid !important;
          gap: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-area {
          overflow: hidden !important;
          border: 1px solid var(--ab-product-rule) !important;
          border-radius: 0.5rem !important;
          background: var(--ab-product-surface) !important;
          box-shadow: 0 0.45rem 1rem rgba(37, 41, 45, 0.06) !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-area-main {
          display: grid !important;
          gap: 0 !important;
          padding: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-card {
          display: grid !important;
          grid-template-columns: 6rem minmax(0, 1fr) 9rem !important;
          gap: 1rem !important;
          align-items: start !important;
          margin: 0 !important;
          padding: 1rem !important;
          border: 0 !important;
          border-bottom: 1px solid var(--ab-product-rule) !important;
          border-radius: 0 !important;
          background: var(--ab-product-surface) !important;
          box-shadow: none !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-card:last-child {
          border-bottom: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-card img {
          display: block !important;
          width: 6rem !important;
          height: 7.8rem !important;
          max-width: 6rem !important;
          object-fit: contain !important;
          background: var(--ab-product-surface-muted) !important;
          border-radius: 0.35rem !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-text-info,
        body.ab-cart-enhanced app-cart-information .cart-text {
          display: block !important;
          min-width: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-text-info h3,
        body.ab-cart-enhanced app-cart-information .cart-text h4 {
          display: -webkit-box !important;
          margin: 0 !important;
          overflow: hidden !important;
          color: var(--ab-product-ink) !important;
          font: 800 1rem/1.4 var(--ab-product-heading-bold) !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-price-area,
        body.ab-cart-enhanced app-cart-information .quantity-price {
          justify-self: end !important;
          align-self: stretch !important;
          display: grid !important;
          align-content: start !important;
          min-width: 0 !important;
          width: 9rem !important;
          text-align: right !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-price-area h3,
        body.ab-cart-enhanced app-cart-information .price b {
          margin: 0 !important;
          color: var(--ab-product-accent-dark) !important;
          font: 800 1.05rem/1.25 var(--ab-product-number) !important;
          white-space: nowrap !important;
        }

        body.ab-cart-enhanced app-cart-information .quantity,
        body.ab-cart-enhanced app-cart-information .cart-quantity {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 0.35rem !important;
          margin-top: var(--ab-product-space-xs) !important;
        }

        body.ab-cart-enhanced app-cart-information .quantity button,
        body.ab-cart-enhanced app-cart-information .cart-quantity button {
          border: 1px solid var(--ab-product-rule) !important;
          border-radius: var(--ab-product-radius-sm) !important;
          background: var(--ab-product-surface-muted) !important;
          color: var(--ab-product-ink) !important;
        }

        body.ab-cart-enhanced app-cart-information .quantity input,
        body.ab-cart-enhanced app-cart-information .cart-quantity input {
          border: 1px solid var(--ab-product-rule) !important;
          border-radius: var(--ab-product-radius-sm) !important;
          background: var(--ab-product-surface) !important;
          color: var(--ab-product-accent-dark) !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-area-bottom {
          display: grid !important;
          gap: var(--ab-product-space-sm) !important;
          padding: var(--ab-product-space-sm) !important;
          border-top: 1px solid var(--ab-product-rule) !important;
          background: var(--ab-product-surface-muted) !important;
        }

        body.ab-cart-enhanced #ab-cart-summary-inline {
          display: grid !important;
          gap: 0.55rem !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        body.ab-cart-enhanced #ab-cart-summary-inline h3,
        body.ab-cart-enhanced #ab-cart-summary-inline p {
          margin: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .cart-area-bottom button,
        body.ab-cart-enhanced app-cart-information .cart-area-bottom a {
          min-height: 2.85rem !important;
          border-radius: var(--ab-product-radius-sm) !important;
          font: 800 0.95rem/1 var(--ab-product-heading-bold) !important;
          width: 100% !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right {
          position: static !important;
          display: grid !important;
          gap: var(--ab-product-space-sm) !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right > *,
        body.ab-cart-enhanced app-cart-information .select-items-area:not(.ab-cart-summary-source) {
          overflow: hidden !important;
          border: 1px solid var(--ab-product-rule) !important;
          border-radius: 0.5rem !important;
          background: var(--ab-product-surface) !important;
          box-shadow: 0 0.45rem 1rem rgba(37, 41, 45, 0.06) !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right ul {
          display: grid !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right li {
          display: grid !important;
          grid-template-columns: 2.3rem minmax(0, 1fr) !important;
          gap: var(--ab-product-space-xs) !important;
          align-items: center !important;
          padding: var(--ab-product-space-sm) !important;
          border-bottom: 1px solid var(--ab-product-rule) !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right li:last-child {
          border-bottom: 0 !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right li img {
          width: 2.25rem !important;
          height: 2.25rem !important;
          object-fit: contain !important;
        }

        body.ab-cart-enhanced app-cart-information .section-right li,
        body.ab-cart-enhanced app-cart-information .section-right li * {
          color: var(--ab-product-ink) !important;
          font-family: var(--ab-product-heading) !important;
          font-size: 0.9rem !important;
          line-height: 1.45 !important;
        }

        body.ab-cart-enhanced #ab-cart-recent {
          margin: var(--ab-product-space-md) auto !important;
          border-radius: 0.5rem !important;
        }

        body.ab-cart-enhanced #ab-cart-offer-progress {
          border-radius: 0.5rem !important;
        }

        body.ab-cart-enhanced #ab-cart-recent {
          background: var(--ab-product-surface) !important;
        }

        body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: var(--ab-product-space-sm) !important;
        }

        body.ab-cart-enhanced app-related-products,
        body.ab-cart-enhanced .related-products,
        body.ab-cart-enhanced .related-product,
        body.ab-cart-enhanced .products-list {
          max-width: var(--ab-product-content-max) !important;
          margin-inline: auto !important;
          box-sizing: border-box !important;
        }

        body.ab-cart-enhanced app-related-products img,
        body.ab-cart-enhanced .related-products img,
        body.ab-cart-enhanced .products-list img {
          max-height: 12rem !important;
          object-fit: contain !important;
        }

        body.ab-cart-enhanced app-related-products .card,
        body.ab-cart-enhanced app-related-products .product-card,
        body.ab-cart-enhanced .related-products .card,
        body.ab-cart-enhanced .products-list .card {
          overflow: hidden !important;
          border: 1px solid var(--ab-product-rule) !important;
          border-radius: 0.5rem !important;
          background: var(--ab-product-surface) !important;
        }
      }

      @media (min-width: 1024px) {
        body.ab-cart-enhanced app-cart-information .section-main > .section-left {
          grid-column: 1 !important;
        }

        body.ab-cart-enhanced app-cart-information .section-main > .section-right {
          grid-column: 1 !important;
        }
      }

      @media (min-width: 1280px) {
        body.ab-cart-enhanced app-cart-information .section-main > .section-left {
          grid-column: 1 !important;
        }

        body.ab-cart-enhanced app-cart-information .section-main > .section-right {
          grid-column: 1 !important;
        }
      }

      body.ab-cart-enhanced .ab-cart-gift-row {
        border: 1px solid color-mix(in oklab, var(--ab-product-accent) 44%, var(--ab-product-rule));
        background: color-mix(in oklab, var(--ab-product-accent) 7%, var(--ab-product-surface));
      }

      body.ab-cart-enhanced .ab-cart-gift-row .ab-cart-gift-label {
        color: var(--ab-product-accent-dark);
        font-weight: 800;
      }

      body.ab-cart-enhanced .ab-cart-gift-row .cart-price-area h3 {
        color: var(--ab-product-accent-dark);
      }

      #ab-checkout-journey {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ab-product-space-xs);
        max-width: var(--ab-product-content-max);
        margin: var(--ab-product-space-sm) auto;
        padding: 0.7rem var(--ab-product-space-sm);
        border: 1px solid var(--ab-product-rule);
        background: var(--ab-product-surface-muted);
        color: var(--ab-product-muted);
        font: 700 0.84rem/1.2 var(--ab-product-heading);
      }
      #ab-checkout-journey a { color: var(--ab-product-accent-dark); text-decoration: none; }
      #ab-checkout-journey .is-active { color: var(--ab-product-accent-dark); }
      #ab-checkout-journey .ab-checkout-separator { color: var(--ab-product-rule); }

    @keyframes ab-cart-guidance {
        0%, 100% { transform: scale(1); background: transparent; }
        35% { transform: scale(1.22) rotate(-8deg); background: color-mix(in oklab, var(--ab-product-accent) 18%, transparent); }
        65% { transform: scale(1.07) rotate(5deg); }
      }

      #\${ROOT_ID} .ab-product-section,
      app-product-details .ab-review-section { padding-block: var(--ab-product-space-md); }

      #\${ROOT_ID} .ab-facts-section {
        margin-inline: 0;
        padding-inline: 0;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
        scrollbar-width: thin;
      }

      #\${ROOT_ID} .ab-facts-strip {
        grid-auto-flow: column;
        grid-auto-columns: minmax(7.9rem, 33.333%);
        grid-template-columns: none;
        min-width: 100%;
      }

      #\${ROOT_ID} .ab-fact {
        min-height: 5.8rem;
        padding-inline: var(--ab-product-space-xs);
      }

      #\${ROOT_ID} .ab-fact-label { font-size: 0.68rem; }
      #\${ROOT_ID} .ab-fact-icon { font-size: 1.08rem; }
      #\${ROOT_ID} .ab-fact-value { font-size: 0.88rem; }
      #\${ROOT_ID} .ab-fact-value-strong { font-size: 1rem; }

      #\${ROOT_ID} .ab-rich-text { font-size: 0.95rem; line-height: 1.7; }
      #\${ROOT_ID} .ab-author-card { grid-template-columns: 4.5rem minmax(0, 1fr); gap: var(--ab-product-space-xs) var(--ab-product-space-sm); }
      #\${ROOT_ID} .ab-author-image { width: 4.5rem; }
      #\${ROOT_ID} .ab-author-name { font-size: 1rem; }

      #\${ROOT_ID} .ab-section-heading,
      app-product-details .ab-review-section > .section-title h3 { font-size: 1.3rem !important; }

      #ab-cart-page .ab-cart-page-shell { padding: var(--ab-product-space-sm); }
      #ab-cart-page .ab-cart-page-layout { grid-template-columns: minmax(0, 1fr); gap: var(--ab-product-space-sm); }
      #ab-cart-page .ab-cart-page-summary-card { position: static; }
      #ab-cart-page .ab-cart-page-item { grid-template-columns: 4.15rem minmax(0, 1fr); gap: var(--ab-product-space-xs); }
      #ab-cart-page .ab-cart-page-image { width: 4.15rem; height: 5.25rem; }
      #ab-cart-page .ab-cart-page-price { grid-column: 2; text-align: left; }
      #ab-cart-page .ab-cart-page-remove { display: inline; margin-left: var(--ab-product-space-xs); }

      #\${CATEGORY_LIBRARY_ID} .ab-library-card:nth-child(n + 5) {
        display: none;
      }

      #ab-cart-offer-progress, #ab-cart-recent, #ab-checkout-journey { margin-inline: var(--ab-product-space-sm); }
      #ab-cart-offer-progress .ab-cart-offer-notebook { width: 2.65rem; height: 3.45rem; }
      #ab-cart-recent .ab-cart-recent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #ab-cart-recent { padding: var(--ab-product-space-xs); }
      #ab-cart-recent h2 { font-size: 1.08rem; }
      #ab-cart-recent img { width: min(100%, 3.8rem); height: 5.05rem; }
      #ab-cart-recent .ab-cart-recent-card { padding: 0.4rem; }
      #ab-cart-recent .ab-native-cart-add { margin-top: 0.35rem; padding: 0.42rem; }
      #ab-cart-offer-suggestions .ab-cart-offer-books { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #ab-checkout-journey { justify-content: flex-start; overflow-x: auto; white-space: nowrap; }
    }

    @media (min-width: 768px) {
      body.ab-checkout-enhanced #ab-checkout-journey {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 1.4rem !important;
        width: min(100% - 4rem, var(--ab-product-content-max)) !important;
        max-width: var(--ab-product-content-max) !important;
        margin: var(--ab-product-space-lg) auto var(--ab-product-space-md) !important;
        padding: 1rem 1.25rem !important;
        overflow: visible !important;
        white-space: normal !important;
        text-align: center !important;
        border: 1px solid var(--ab-product-rule) !important;
        background: var(--ab-product-surface-muted) !important;
        color: var(--ab-product-muted) !important;
        font: 800 1rem/1.35 var(--ab-product-heading-bold) !important;
        box-sizing: border-box !important;
      }

      body.ab-checkout-enhanced #ab-checkout-journey > * {
        flex: 0 0 auto !important;
      }

      body.ab-checkout-enhanced #ab-checkout-journey .ab-checkout-separator {
        color: color-mix(in oklab, var(--ab-product-muted) 45%, var(--ab-product-rule)) !important;
        font-size: 1.15rem !important;
      }

      body.ab-cart-enhanced app-cart .section,
      body.ab-cart-enhanced app-cart .cart-section {
        background: var(--ab-product-paper-soft) !important;
      }

      body.ab-cart-enhanced app-cart .container {
        width: min(100%, var(--ab-product-content-max)) !important;
        max-width: var(--ab-product-content-max) !important;
        margin-inline: auto !important;
        padding: var(--ab-product-space-lg) var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: var(--ab-product-space-md) !important;
        align-items: start !important;
        width: min(100%, 56rem) !important;
        max-width: 56rem !important;
        margin-inline: auto !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        gap: var(--ab-product-space-xs) !important;
        align-items: center !important;
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        align-self: start !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress .ab-cart-offer-notebook-link {
        display: inline-grid !important;
        width: 3rem !important;
        height: 3.9rem !important;
        align-self: center !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress .ab-cart-offer-notebook {
        width: 3rem !important;
        height: 3.9rem !important;
        object-fit: cover !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress .ab-cart-offer-bar {
        grid-column: 2 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-left {
        grid-column: 1 !important;
        grid-row: 2 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-right {
        grid-column: 1 !important;
        grid-row: 3 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-left,
      body.ab-cart-enhanced app-cart-information .cart-area,
      body.ab-cart-enhanced app-cart-information .cart-area-main,
      body.ab-cart-enhanced app-cart-information .section-right,
      body.ab-cart-enhanced app-cart-information .select-items-area {
        min-width: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area {
        overflow: hidden !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: 0.5rem !important;
        background: var(--ab-product-surface) !important;
        box-shadow: 0 0.55rem 1.4rem var(--ab-product-shadow) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-main {
        display: grid !important;
        gap: 0 !important;
        padding: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card {
        display: grid !important;
        grid-template-columns: 5.75rem minmax(0, 1fr) minmax(7rem, auto) !important;
        gap: var(--ab-product-space-sm) !important;
        align-items: center !important;
        margin: 0 !important;
        padding: var(--ab-product-space-sm) !important;
        border: 0 !important;
        border-bottom: 1px solid var(--ab-product-rule) !important;
        border-radius: 0 !important;
        background: var(--ab-product-surface) !important;
        box-shadow: none !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card:last-child {
        border-bottom: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card img {
        width: 5.75rem !important;
        height: 7.4rem !important;
        max-width: 5.75rem !important;
        object-fit: contain !important;
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-text-info,
      body.ab-cart-enhanced app-cart-information .cart-text {
        min-width: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-text-info h3,
      body.ab-cart-enhanced app-cart-information .cart-text h4 {
        display: -webkit-box !important;
        margin: 0 !important;
        overflow: hidden !important;
        color: var(--ab-product-ink) !important;
        font: 800 1rem/1.4 var(--ab-product-heading-bold) !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area,
      body.ab-cart-enhanced app-cart-information .quantity-price {
        justify-self: end !important;
        min-width: 7rem !important;
        text-align: right !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area h3,
      body.ab-cart-enhanced app-cart-information .price b {
        margin: 0 !important;
        color: var(--ab-product-accent-dark) !important;
        font: 800 1.05rem/1.25 var(--ab-product-number) !important;
        white-space: nowrap !important;
      }

      body.ab-cart-enhanced app-cart-information .quantity,
      body.ab-cart-enhanced app-cart-information .cart-quantity {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 0.35rem !important;
        margin-top: var(--ab-product-space-xs) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom {
        display: grid !important;
        gap: var(--ab-product-space-sm) !important;
        padding: var(--ab-product-space-sm) !important;
        border-top: 1px solid var(--ab-product-rule) !important;
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced #ab-cart-summary-inline {
        display: grid !important;
        gap: 0.55rem !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom button,
      body.ab-cart-enhanced app-cart-information .cart-area-bottom a {
        min-height: 2.85rem !important;
        border-radius: var(--ab-product-radius-sm) !important;
        font: 800 0.95rem/1 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right {
        position: static !important;
        display: grid !important;
        gap: var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right > * {
        overflow: hidden !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: 0.5rem !important;
        background: var(--ab-product-surface) !important;
        box-shadow: 0 0.55rem 1.4rem var(--ab-product-shadow) !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right ul {
        display: grid !important;
        gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right li {
        display: grid !important;
        grid-template-columns: 2.3rem minmax(0, 1fr) !important;
        gap: var(--ab-product-space-xs) !important;
        align-items: center !important;
        padding: var(--ab-product-space-sm) !important;
        border-bottom: 1px solid var(--ab-product-rule) !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right li:last-child {
        border-bottom: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right li img {
        width: 2.25rem !important;
        height: 2.25rem !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced #ab-cart-recent {
        margin: var(--ab-product-space-md) auto !important;
        border-radius: 0.5rem !important;
        background: var(--ab-product-surface) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress {
        border-radius: 0.5rem !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: var(--ab-product-space-sm) !important;
      }
    }

    @media (min-width: 768px) {
      body.ab-cart-enhanced app-cart .container {
        width: min(100%, 60rem) !important;
        max-width: 60rem !important;
        padding: 1.5rem var(--ab-product-space-md) 2.25rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main,
      body.ab-cart-enhanced #ab-cart-offer-progress,
      body.ab-cart-enhanced #ab-cart-recent,
      body.ab-cart-enhanced app-related-products {
        width: min(100%, 56rem) !important;
        max-width: 56rem !important;
        margin-inline: auto !important;
        box-sizing: border-box !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 1rem !important;
        align-items: start !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress,
      body.ab-cart-enhanced app-cart-information .section-main > .section-left,
      body.ab-cart-enhanced app-cart-information .section-main > .section-right {
        grid-column: 1 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress { grid-row: 1 !important; }
      body.ab-cart-enhanced app-cart-information .section-main > .section-left { grid-row: 2 !important; }
      body.ab-cart-enhanced app-cart-information .section-main > .section-right { grid-row: 3 !important; position: static !important; }

      body.ab-cart-enhanced app-cart-information .cart-area,
      body.ab-cart-enhanced app-cart-information .section-right > *,
      body.ab-cart-enhanced #ab-cart-recent {
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: 0.5rem !important;
        background: var(--ab-product-surface) !important;
        box-shadow: 0 0.35rem 0.9rem rgba(37, 41, 45, 0.06) !important;
        overflow: hidden !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card {
        display: grid !important;
        grid-template-columns: 6rem minmax(0, 1fr) 7.5rem !important;
        gap: 0.85rem !important;
        align-items: start !important;
        min-height: 9.25rem !important;
        padding: 1rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card img {
        width: 6rem !important;
        height: 7.8rem !important;
        max-width: 6rem !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-text-info h3,
      body.ab-cart-enhanced app-cart-information .cart-text h4 {
        font-size: 1rem !important;
        line-height: 1.45 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area,
      body.ab-cart-enhanced app-cart-information .quantity-price {
        width: 7.5rem !important;
        min-width: 0 !important;
        justify-self: end !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-books,
      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent img,
      body.ab-cart-enhanced app-related-products img,
      body.ab-cart-enhanced .related-products img,
      body.ab-cart-enhanced .products-list img {
        width: auto !important;
        max-width: 7rem !important;
        height: 9.25rem !important;
        max-height: 9.25rem !important;
        margin-inline: auto !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom button,
      body.ab-cart-enhanced app-cart-information .cart-area-bottom a {
        width: 100% !important;
      }
    }

    @media (min-width: 1024px) {
      body.ab-cart-enhanced {
        background: #f6f8f7 !important;
      }

      body.ab-cart-enhanced app-cart .container {
        width: min(100%, 74rem) !important;
        max-width: 74rem !important;
        padding: 2rem 1.5rem 3rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        width: min(100%, 74rem) !important;
        max-width: 74rem !important;
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem) !important;
        gap: 1.25rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-left {
        grid-column: 1 !important;
        grid-row: 2 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-right {
        grid-column: 2 !important;
        grid-row: 2 !important;
        position: sticky !important;
        top: 1rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area,
      body.ab-cart-enhanced app-cart-information .section-right > *,
      body.ab-cart-enhanced #ab-cart-recent {
        border-color: #dfe5df !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 1rem 2rem rgba(29, 42, 34, 0.07) !important;
      }

      body.ab-cart-enhanced app-cart-information .select-items-area {
        padding: 1.15rem 1.25rem !important;
        background: #ffffff !important;
      }

      body.ab-cart-enhanced app-cart-information .select-items-area h1,
      body.ab-cart-enhanced app-cart-information .select-items-area h2,
      body.ab-cart-enhanced app-cart-information .select-items-area h3 {
        margin: 0 !important;
        color: #26312b !important;
        font: 800 1.35rem/1.25 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card {
        grid-template-columns: 6.5rem minmax(0, 1fr) 9.75rem !important;
        gap: 1.15rem !important;
        min-height: 9.75rem !important;
        padding: 1.15rem 1.25rem !important;
        align-items: center !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card img {
        width: 6.5rem !important;
        height: 8.25rem !important;
        max-width: 6.5rem !important;
        border: 1px solid #edf1ed !important;
        border-radius: 0.45rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-text-info h3,
      body.ab-cart-enhanced app-cart-information .cart-text h4 {
        max-width: 34rem !important;
        font-size: 1.08rem !important;
        line-height: 1.4 !important;
      }

      body.ab-cart-enhanced .cart-card .ab-cart-native-author {
        margin-top: 0.4rem !important;
        font-size: 0.9rem !important;
      }

      body.ab-cart-enhanced .cart-card .ab-cart-native-discount {
        margin-top: 0.25rem !important;
        font-size: 0.86rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area,
      body.ab-cart-enhanced app-cart-information .quantity-price {
        width: 9.75rem !important;
        align-content: center !important;
      }

      body.ab-cart-enhanced app-cart-information .quantity,
      body.ab-cart-enhanced app-cart-information .cart-quantity {
        gap: 0 !important;
        border: 1px solid #dbe4dd !important;
        border-radius: 0.45rem !important;
        overflow: hidden !important;
        background: #f3f7f4 !important;
      }

      body.ab-cart-enhanced app-cart-information .quantity button,
      body.ab-cart-enhanced app-cart-information .cart-quantity button,
      body.ab-cart-enhanced app-cart-information .quantity input,
      body.ab-cart-enhanced app-cart-information .cart-quantity input {
        width: 2.4rem !important;
        height: 2.35rem !important;
        min-width: 2.4rem !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        text-align: center !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom {
        grid-template-columns: minmax(0, 1fr) 14rem !important;
        align-items: center !important;
        padding: 1.15rem 1.25rem !important;
        background: #f1f6f2 !important;
      }

      body.ab-cart-enhanced #ab-cart-summary-inline {
        gap: 0.25rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom button,
      body.ab-cart-enhanced app-cart-information .cart-area-bottom a {
        min-height: 3.15rem !important;
        font-size: 1rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right li {
        grid-template-columns: 2.5rem minmax(0, 1fr) !important;
        padding: 1rem !important;
      }

      body.ab-cart-enhanced #ab-cart-recent,
      body.ab-cart-enhanced app-related-products {
        width: min(100%, 74rem) !important;
        max-width: 74rem !important;
      }
    }

    @media (min-width: 768px) {
      body.ab-cart-enhanced app-cart .container,
      body.ab-cart-enhanced app-cart-information,
      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        width: min(100%, 56rem) !important;
        max-width: 56rem !important;
        margin-inline: auto !important;
        box-sizing: border-box !important;
      }

      body.ab-cart-enhanced app-cart-information,
      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 1rem !important;
      }

      body.ab-cart-enhanced app-cart .section-main > .section-left,
      body.ab-cart-enhanced app-cart .section-main > .section-right,
      body.ab-cart-enhanced app-cart-information .section-main > .section-left,
      body.ab-cart-enhanced app-cart-information .section-main > .section-right {
        grid-column: 1 !important;
        width: 100% !important;
        max-width: 100% !important;
        position: static !important;
      }

      body.ab-cart-enhanced app-cart .section-main > .section-left,
      body.ab-cart-enhanced app-cart-information .section-main > .section-left { grid-row: 1 !important; }

      body.ab-cart-enhanced app-cart .section-main > .section-right,
      body.ab-cart-enhanced app-cart-information .section-main > .section-right { grid-row: 2 !important; }

      body.ab-cart-enhanced app-cart app-related-products,
      body.ab-cart-enhanced app-cart .kids-book-contents,
      body.ab-cart-enhanced app-cart .related-products,
      body.ab-cart-enhanced app-cart .products-list {
        display: none !important;
      }
    }

    /* Hallmark · pre-emit critique: P4 H4 E4 S4 R5 V4 · contrast: pass · slop: pass · mobile: pass
     * Hallmark · macrostructure: Workbench · tone: quiet, utilitarian commerce · anchor hue: Amol forest green
     * Desktop cart reset. This must remain after the legacy tablet pass above:
     * the compiled page's responsive selectors otherwise collapse desktop into one column. */
    @media (min-width: 1024px) {
      body.ab-cart-enhanced {
        background: var(--ab-product-paper-soft) !important;
      }

      body.ab-cart-enhanced app-cart .container {
        width: min(100%, 78rem) !important;
        max-width: 78rem !important;
        padding: var(--ab-product-space-lg) var(--ab-product-space-lg) 3.5rem !important;
      }

      body.ab-cart-enhanced app-cart-information {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main,
      body.ab-cart-enhanced app-cart .section-main {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 21.5rem !important;
        gap: var(--ab-product-space-md) !important;
        align-items: start !important;
        width: 100% !important;
        max-width: none !important;
        margin-inline: auto !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
        grid-column: 1 !important;
        grid-row: 1 !important;
        width: 100% !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-left,
      body.ab-cart-enhanced app-cart .section-main > .section-left {
        grid-column: 1 !important;
        grid-row: 2 !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > .section-right,
      body.ab-cart-enhanced app-cart .section-main > .section-right {
        grid-column: 2 !important;
        grid-row: 1 / span 2 !important;
        display: grid !important;
        gap: var(--ab-product-space-sm) !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        position: sticky !important;
        top: var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area,
      body.ab-cart-enhanced app-cart-information .section-right > *,
      body.ab-cart-enhanced #ab-cart-offer-progress,
      body.ab-cart-enhanced #ab-cart-recent {
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface) !important;
        box-shadow: 0 1rem 2.25rem var(--ab-product-shadow) !important;
        overflow: hidden !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress {
        display: block !important;
        padding: var(--ab-product-space-sm) var(--ab-product-space-md) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > .ab-cart-offer-notebook-link {
        display: inline-block !important;
        width: 3.5rem !important;
        height: 4.5rem !important;
        margin: 0 var(--ab-product-space-xs) 0 0 !important;
        vertical-align: middle !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > p {
        display: inline-block !important;
        width: calc(100% - 4.5rem) !important;
        margin: 0 !important;
        vertical-align: middle !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > .ab-cart-offer-bar {
        display: block !important;
        width: calc(100% - 4.5rem) !important;
        margin: var(--ab-product-space-xs) 0 0 4.25rem !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: var(--ab-product-space-sm) !important;
        width: 100% !important;
        margin-top: var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions h2,
      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-native-cart-add,
      body.ab-cart-enhanced #ab-cart-offer-suggestions #ab-cart-offer-all-books {
        grid-column: 1 / -1 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-books {
        display: grid !important;
        grid-column: 1 / -1 !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: var(--ab-product-space-sm) !important;
        width: 100% !important;
      }

      /* Override the earlier tablet-specific selector with the same ownership
         path. Without this, its display grid rule leaves a zero-width
         message column and turns the offer into a tall blank panel. */
      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress {
        display: block !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress > .ab-cart-offer-notebook-link {
        display: inline-block !important;
        width: 3.5rem !important;
        height: 4.5rem !important;
        margin: 0 var(--ab-product-space-xs) 0 0 !important;
        vertical-align: middle !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress > p {
        display: inline-block !important;
        width: calc(100% - 4.5rem) !important;
        height: auto !important;
        margin: 0 !important;
        vertical-align: middle !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress > .ab-cart-offer-bar {
        display: block !important;
        width: calc(100% - 4.5rem) !important;
        height: 0.45rem !important;
        margin: var(--ab-product-space-xs) 0 0 4.25rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress > #ab-cart-offer-suggestions {
        display: grid !important;
        width: 100% !important;
        margin-top: var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book {
        display: grid !important;
        grid-template-columns: 2.5rem minmax(0, 1fr) !important;
        gap: var(--ab-product-space-2xs) !important;
        align-items: center !important;
        min-width: 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions img {
        display: block !important;
        width: 2.5rem !important;
        height: 3.25rem !important;
        max-width: 2.5rem !important;
        max-height: 3.25rem !important;
        margin: 0 !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-main {
        padding: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card {
        display: block !important;
        min-height: 9.5rem !important;
        padding: var(--ab-product-space-md) !important;
        border-bottom: 1px solid var(--ab-product-rule) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card-main {
        display: grid !important;
        grid-template-columns: 5.75rem minmax(0, 1fr) !important;
        gap: var(--ab-product-space-md) !important;
        align-items: center !important;
        width: 100% !important;
        max-width: none !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card .cart-img {
        width: 5.75rem !important;
        min-width: 5.75rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card .cart-body {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 10.25rem !important;
        grid-template-rows: auto auto !important;
        gap: var(--ab-product-space-xs) var(--ab-product-space-md) !important;
        align-items: center !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card .cart-text-info {
        grid-column: 1 !important;
        grid-row: 1 / span 2 !important;
        width: auto !important;
        min-width: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card .quantity-area {
        grid-column: 2 !important;
        grid-row: 1 !important;
        justify-self: end !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card .cart-price-area {
        grid-column: 2 !important;
        grid-row: 2 !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-card img {
        width: 5.75rem !important;
        height: 7.5rem !important;
        max-width: 5.75rem !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface) !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-text-info h3,
      body.ab-cart-enhanced app-cart-information .cart-text h4 {
        max-width: 34rem !important;
        color: var(--ab-product-ink) !important;
        font: 800 1.15rem/1.4 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced .cart-card .ab-cart-native-author {
        margin-top: var(--ab-product-space-2xs) !important;
        color: var(--ab-product-muted) !important;
        font-size: 0.9rem !important;
      }

      body.ab-cart-enhanced .cart-card .ab-cart-native-discount {
        margin-top: var(--ab-product-space-3xs) !important;
        font-size: 0.84rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area,
      body.ab-cart-enhanced app-cart-information .quantity-price {
        display: grid !important;
        width: 10.25rem !important;
        min-width: 0 !important;
        justify-items: end !important;
        align-content: center !important;
        gap: var(--ab-product-space-xs) !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-price-area h3,
      body.ab-cart-enhanced app-cart-information .price b {
        color: var(--ab-product-accent-dark) !important;
        font-size: 1.2rem !important;
      }

      body.ab-cart-enhanced app-cart-information .quantity,
      body.ab-cart-enhanced app-cart-information .cart-quantity {
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced app-cart-information .quantity button,
      body.ab-cart-enhanced app-cart-information .cart-quantity button,
      body.ab-cart-enhanced app-cart-information .quantity input,
      body.ab-cart-enhanced app-cart-information .cart-quantity input {
        width: 2.55rem !important;
        height: 2.5rem !important;
        min-width: 2.55rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 14.5rem !important;
        gap: var(--ab-product-space-md) !important;
        align-items: center !important;
        padding: var(--ab-product-space-md) !important;
        border-top: 1px solid var(--ab-product-rule) !important;
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced #ab-cart-summary-inline {
        display: grid !important;
        gap: var(--ab-product-space-3xs) !important;
      }

      body.ab-cart-enhanced #ab-cart-summary-inline h3 {
        color: var(--ab-product-ink) !important;
        font-size: 1.05rem !important;
      }

      body.ab-cart-enhanced app-cart-information .cart-area-bottom button,
      body.ab-cart-enhanced app-cart-information .cart-area-bottom a {
        width: 100% !important;
        min-height: 3.25rem !important;
        border-radius: var(--ab-product-radius-sm) !important;
        font-size: 1rem !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right > * {
        margin: 0 !important;
      }

      body.ab-cart-enhanced app-cart-information .section-right li {
        grid-template-columns: 2.4rem minmax(0, 1fr) !important;
        gap: var(--ab-product-space-xs) !important;
        padding: var(--ab-product-space-sm) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent {
        width: min(100%, 78rem) !important;
        max-width: 78rem !important;
        margin: var(--ab-product-space-lg) auto 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: var(--ab-product-space-sm) !important;
        align-items: stretch !important;
      }

      body.ab-cart-enhanced #ab-cart-recent {
        padding: var(--ab-product-space-md) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent h2 {
        margin: 0 0 var(--ab-product-space-sm) !important;
        padding-bottom: var(--ab-product-space-xs) !important;
        border-bottom: 1px solid var(--ab-product-rule) !important;
        color: var(--ab-product-ink) !important;
        font: 800 1.25rem/1.3 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card {
        display: grid !important;
        grid-template-rows: 10rem auto auto auto 2.75rem !important;
        gap: var(--ab-product-space-3xs) !important;
        min-width: 0 !important;
        min-height: 19rem !important;
        padding: var(--ab-product-space-sm) !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface) !important;
        box-shadow: none !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card img {
        display: block !important;
        width: 100% !important;
        max-width: 7.5rem !important;
        height: 10rem !important;
        max-height: 10rem !important;
        margin: 0 auto !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card h3,
      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card p {
        position: static !important;
        width: auto !important;
        margin: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card h3 {
        color: var(--ab-product-ink) !important;
        font: 800 0.95rem/1.4 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card p {
        color: var(--ab-product-muted) !important;
        font-size: 0.8rem !important;
        line-height: 1.4 !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-cart-recent-card .ab-cart-recent-price {
        color: var(--ab-product-accent-dark) !important;
        font-size: 0.95rem !important;
        font-weight: 800 !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-native-cart-add {
        align-self: end !important;
        min-height: 2.75rem !important;
        margin: var(--ab-product-space-2xs) 0 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-native-cart-add:hover,
      body.ab-cart-enhanced #ab-cart-recent .ab-native-cart-add:active {
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-native-cart-add:focus-visible {
        outline: 2px solid var(--ab-product-focus) !important;
        outline-offset: 1px !important;
      }

      body.ab-cart-enhanced #ab-cart-recent .ab-native-cart-add:disabled {
        cursor: not-allowed !important;
      }

      body.ab-cart-enhanced #ab-sticky-product-actions {
        display: none !important;
      }
    }

    @media (min-width: 768px) {
      body.ab-cart-enhanced #ab-cart-offer-progress {
        display: grid !important;
        grid-template-columns: 4rem minmax(0, 1fr) !important;
        grid-template-rows: auto auto auto !important;
        gap: var(--ab-product-space-2xs) var(--ab-product-space-sm) !important;
        padding: var(--ab-product-space-md) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > .ab-cart-offer-notebook-link {
        grid-column: 1 !important;
        grid-row: 1 / span 2 !important;
        width: 4rem !important;
        height: 5.25rem !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress .ab-cart-offer-notebook {
        width: 4rem !important;
        height: 5.25rem !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > p {
        grid-column: 2 !important;
        grid-row: 1 !important;
        align-self: end !important;
        width: auto !important;
        margin: 0 !important;
        color: var(--ab-product-ink) !important;
        font-size: 1rem !important;
        line-height: 1.5 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-progress > .ab-cart-offer-bar {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: start !important;
        width: 100% !important;
        height: 0.45rem !important;
        margin: 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions,
      body.ab-cart-enhanced app-cart-information .section-main > #ab-cart-offer-progress > #ab-cart-offer-suggestions {
        display: block !important;
        grid-column: 1 / -1 !important;
        grid-row: 3 !important;
        width: 100% !important;
        margin: var(--ab-product-space-xs) 0 0 !important;
        padding-top: var(--ab-product-space-sm) !important;
        border-top: 1px solid var(--ab-product-rule) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions h2 {
        margin: 0 0 var(--ab-product-space-xs) !important;
        color: var(--ab-product-ink) !important;
        font: 800 1.05rem/1.35 var(--ab-product-heading-bold) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-books {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: var(--ab-product-space-xs) !important;
        width: 100% !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book {
        display: grid !important;
        grid-template-columns: 3rem minmax(0, 1fr) !important;
        grid-template-rows: 4rem 2.5rem !important;
        gap: var(--ab-product-space-2xs) var(--ab-product-space-xs) !important;
        align-items: center !important;
        min-width: 0 !important;
        padding: var(--ab-product-space-xs) !important;
        border: 1px solid var(--ab-product-rule) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface-muted) !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book img {
        grid-column: 1 !important;
        grid-row: 1 !important;
        width: 3rem !important;
        height: 4rem !important;
        max-width: 3rem !important;
        max-height: 4rem !important;
        margin: 0 !important;
        border-radius: var(--ab-product-radius-sm) !important;
        object-fit: contain !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book > a {
        grid-column: 1 !important;
        grid-row: 1 !important;
        display: block !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book > div {
        grid-column: 2 !important;
        grid-row: 1 !important;
        min-width: 0 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book h3 {
        display: -webkit-box !important;
        margin: 0 0 var(--ab-product-space-3xs) !important;
        overflow: hidden !important;
        color: var(--ab-product-ink) !important;
        font: 700 0.84rem/1.35 var(--ab-product-heading) !important;
        white-space: normal !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book p {
        margin: 0 !important;
        color: var(--ab-product-accent-dark) !important;
        font-size: 0.88rem !important;
        font-weight: 800 !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-suggestions .ab-cart-offer-book .ab-native-cart-add {
        grid-column: 1 / -1 !important;
        grid-row: 2 !important;
        align-self: end !important;
        min-height: 2.5rem !important;
        margin: 0 !important;
        border: 1px solid var(--ab-product-accent) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-surface) !important;
        color: var(--ab-product-accent-dark) !important;
        font: 700 0.82rem/1 var(--ab-product-heading) !important;
        white-space: nowrap !important;
      }

      body.ab-cart-enhanced #ab-cart-offer-all-books {
        display: inline-flex !important;
        grid-column: 1 / -1 !important;
        align-items: center !important;
        justify-content: flex-start !important;
        min-height: 2.25rem !important;
        margin: 0 !important;
        padding: 0 var(--ab-product-space-xs) !important;
        background: transparent !important;
        color: var(--ab-product-accent-dark) !important;
        font-size: 0.86rem !important;
        text-decoration: underline !important;
        text-underline-offset: 0.15rem !important;
      }
    }

    body.ab-cart-enhanced app-related-products.ab-cart-popular,
    body.ab-cart-enhanced app-related-products.ab-cart-popular .kids-book,
    body.ab-cart-enhanced app-related-products.ab-cart-popular .kids-book-contents {
      display: block !important;
    }

    @media (min-width: 768px) {
      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide {
        display: flex !important;
        flex-direction: column !important;
        height: auto !important;
      }

      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide > .ab-native-cart-add {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        min-height: 2.5rem !important;
        margin: var(--ab-product-space-xs) 0 0 !important;
        padding: 0 var(--ab-product-space-xs) !important;
        border: 1px solid var(--ab-product-accent) !important;
        border-radius: var(--ab-product-radius-sm) !important;
        background: var(--ab-product-accent) !important;
        color: var(--ab-product-surface) !important;
        cursor: pointer !important;
        font: 700 0.82rem/1 var(--ab-product-heading) !important;
        white-space: nowrap !important;
      }

      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide > .ab-native-cart-add:hover,
      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide > .ab-native-cart-add:active {
        background: var(--ab-product-accent-dark) !important;
      }

      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide > .ab-native-cart-add:focus-visible {
        outline: 2px solid var(--ab-product-focus) !important;
        outline-offset: 1px !important;
      }

      body.ab-cart-enhanced app-related-products.ab-cart-popular .swiper-slide > .ab-native-cart-add:disabled {
        cursor: not-allowed !important;
        opacity: 0.62 !important;
      }
    }

    @keyframes ab-cart-row-in {
      from { opacity: 0; transform: translateY(-0.45rem); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 359px) {
      #\${ROOT_ID} .ab-product-grid { grid-auto-columns: minmax(8.5rem, 47%); }
      #\${ROOT_ID} .ab-product-name { font-size: 0.9rem; }
      #\${ROOT_ID} .ab-product-author { font-size: 0.74rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      #\${ROOT_ID} .ab-product-card { transition-duration: 0ms; }
    }
  \`;

  function installStyle() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  function isProductPage() {
    return location.pathname.indexOf('/product-details/') !== -1 ||
      location.pathname.indexOf('/product-detail/') !== -1;
  }

  function getSlug() {
    var parts = location.pathname.split('/').filter(Boolean);
    if (!parts.length) return '';
    try { return decodeURIComponent(parts[parts.length - 1]); } catch (_) { return parts[parts.length - 1]; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeRichHtml(value) {
    var template = document.createElement('template');
    template.innerHTML = String(value || '');
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select').forEach(function (node) {
      node.remove();
    });
    template.content.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes || []).forEach(function (attribute) {
        var name = attribute.name.toLowerCase();
        var val = String(attribute.value || '').trim().toLowerCase();
        if (name.indexOf('on') === 0 || name === 'style' || (name === 'href' && val.indexOf('javascript:') === 0)) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    return template.innerHTML;
  }

  function plainText(value) {
    var box = document.createElement('div');
    box.innerHTML = String(value || '');
    return (box.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  function fetchJson(path, options, baseUrl) {
    return fetch((baseUrl || API_BASE) + path, Object.assign({ credentials: 'omit' }, options || {}))
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .catch(function () { return null; });
  }

  function normalizeCartOfferConfig(config) {
    if (!config) return null;
    config.giftMinAmount = CART_OFFER_FALLBACK_THRESHOLD;
    if (config.giftProduct) {
      var giftImage = config.giftProduct.image || (Array.isArray(config.giftProduct.images) && config.giftProduct.images[0]) || '';
      if (!giftImage || isPlaceholderImage(giftImage)) {
        config.giftProduct.image = FREE_NOTEBOOK_IMAGE_URL;
      }
    }
    return config;
  }

  function isPlaceholderImage(src) {
    return /dummy-image|user-young|user_low|avatar|placeholder|no-image|free-notebook-a015/i.test(src || '');
  }

  function imageUrl(value, fallback) {
    var image = String(value || '').trim();
    if (!image) return fallback || '/assets/images/avatar/user_low.png';
    if (image.indexOf('https://') === 0 || image.indexOf('http://') === 0) return image;
    return 'https://apisub.amolbooks.com' + (image.charAt(0) === '/' ? '' : '/') + image;
  }

  function notebookCoverUrl(notebook) {
    var cover = notebook && (notebook.image || Array.isArray(notebook.images) && notebook.images[0]) || '';
    if (!cover || isPlaceholderImage(cover)) return FREE_NOTEBOOK_IMAGE_URL;
    return imageUrl(cover, FREE_NOTEBOOK_IMAGE_URL);
  }

  function finalPrice(product) {
    var explicit = Number(product && product.afterDiscountPrice);
    if (explicit > 0) return explicit;
    var sale = Math.max(0, Number(product && product.salePrice) || 0);
    var discount = Math.max(0, Number(product && product.discountAmount) || 0);
    var type = Number(product && product.discountType) || 0;
    if (type === 1) return Math.max(0, Math.floor(sale - sale * discount / 100));
    if (type === 2) return Math.max(0, Math.floor(sale - discount));
    return sale;
  }

  function discountPercent(product) {
    var sale = Math.max(0, Number(product && product.salePrice) || 0);
    var price = finalPrice(product);
    if (!sale || price >= sale) return 0;
    return Math.max(1, Math.min(99, Math.round((sale - price) * 100 / sale)));
  }

  function money(value) {
    return '৳' + Math.round(Number(value) || 0).toLocaleString('en-US');
  }

  function numericPrice(value) {
    var normalized = String(value || '').replace(/[০-৯]/g, function (digit) {
      return String(digit.charCodeAt(0) - 0x09e6);
    }).replace(/,/g, '');
    var match = normalized.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  function firstName(value) {
    if (Array.isArray(value)) return value.map(firstName).filter(Boolean).join(', ');
    if (value && typeof value === 'object') return value.name || value.title || '';
    return String(value || '').trim();
  }

  function firstCategoryName(product) {
    var categories = Array.isArray(product && product.category) ? product.category : [];
    return firstName(categories[0] || product && product.category || product && product.subCategory);
  }

  function pushAddToCartTracking(product, quantity) {
    var item = product || {};
    var qty = Math.max(1, Number(quantity) || 1);
    var itemId = String(item._id || item.item_id || item.slug || '').trim();
    var itemName = String(item.name || item.item_name || '').trim();
    if (!itemId && !itemName) return;
    var price = Number(item.price);
    if (!(price >= 0)) price = finalPrice(item);
    var key = itemId + '|' + itemName + '|' + String(qty);
    var now = Date.now();
    if (key === addToCartTrackingLastKey && now - addToCartTrackingLastAt < 1800) return;
    addToCartTrackingLastKey = key;
    addToCartTrackingLastAt = now;
    var dataLayer = window.dataLayer = window.dataLayer || [];
    var trackingItem = {
      item_id: itemId,
      item_name: itemName,
      price: price,
      quantity: qty,
    };
    var category = firstCategoryName(item);
    if (category) trackingItem.item_category = category;
    var eventId = 'amol_add_to_cart_' + now + '_' + Math.random().toString(36).slice(2, 8);
    dataLayer.push({
      event: 'AddToCart',
      event_id: eventId,
      page_url: window.location.href,
      ecommerce: {
        add: {
          products: [{
            id: itemId,
            name: itemName,
            category: category || '',
            price: price,
            currency: 'BDT',
            quantity: qty,
          }],
        },
      },
    });
    dataLayer.push({ ecommerce: null });
    dataLayer.push({
      event: 'add_to_cart',
      event_id: eventId,
      ecommerce: {
        currency: 'BDT',
        value: price * qty,
        items: [trackingItem],
      },
    });
  }

  function pushAddToCartTrackingByProductId(productId, quantity, fallback) {
    var id = String(productId || '').trim();
    if (!id) return;
    fetchProductsByIds([id]).then(function (products) {
      pushAddToCartTracking(products[0] || Object.assign({ _id: id }, fallback || {}), quantity);
    });
  }

  function nativeAddToCartMeta(button) {
    var card = button && button.closest && button.closest('app-product-card-one, app-product-card-two, .product-card, .card, .swiper-slide, article, li');
    if (!card) return null;
    var link = card.querySelector('a[href*="/product-details/"], a[href*="/product-detail/"]');
    var href = String(link && link.getAttribute('href') || '');
    var slug = '';
    if (href) {
      var parts = href.split('?')[0].split('/').filter(Boolean);
      try { slug = decodeURIComponent(parts[parts.length - 1] || ''); } catch (_) { slug = parts[parts.length - 1] || ''; }
    }
    var title = card.querySelector('.title h1, .product-name, h3, h2, h1');
    var price = card.querySelector('.new-price, .price, .ab-product-current-price, .ab-library-price');
    return {
      slug: slug,
      name: title && (title.textContent || '').replace(/\s+/g, ' ').trim() || '',
      price: numericPrice(price && price.textContent || ''),
    };
  }

  function nativeAddToCartButton(target) {
    if (!target || !target.closest) return null;
    var button = target.closest('.add-to-cart-overlay, button, a');
    if (!button || button.closest('app-product-details, #ab-added-cart-modal, #ab-cart-page, #ab-cart-offer-suggestions, #' + CATEGORY_LIBRARY_ID)) return null;
    if (button.matches && button.matches('.ab-add-cart-button, .ab-native-cart-add, [data-ab-cart-sticky-checkout], [data-ab-added-cart-go], [data-ab-added-cart-close]')) return null;
    var text = (button.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/add\s*to\s*cart|কার্টে যোগ|কার্টে যুক্ত|ক্রয় তালিকায় যুক্ত|ক্রয় তালিকায় যুক্ত/i.test(text)) return null;
    return button;
  }

  function languageCode(value) {
    var language = firstName(value);
    if (!language) return '';
    if (/bangla|bengali|বাংলা/i.test(language)) return 'BN';
    if (/english|ইংরেজ/i.test(language)) return 'EN';
    return language.slice(0, 2).toUpperCase();
  }

  function countryCode(value) {
    var country = String(value || '').trim();
    if (!country) return '';
    if (/bangladesh|বাংলাদেশ/i.test(country)) return 'BD';
    return country.slice(0, 2).toUpperCase();
  }

  function publicationYear(product) {
    var edition = String(product && product.edition || '').match(/(?:19|20)\\d{2}/);
    if (edition) return edition[0];
    var published = product && (product.publishedDate || product.publicationDate);
    if (!published) return '';
    var date = new Date(published);
    return Number.isFinite(date.getTime()) ? String(date.getFullYear()) : '';
  }

  function cartStorageKey() {
    /* The compiled storefront loaded by this local build uses this exact
       cased key. A prior bridge wrote uppercase ALAMBOOKS entries, splitting
       the injected cart from the native cart and checkout. Merge that stale
       key once into the native cart key, then remove it. */
    var storefrontKey = 'Amolbooks_USER_CART_1';
    var legacyKey = 'ALAMBOOKS_USER_CART_1';
    var legacyItems = [];
    var storefrontItems = [];
    try { legacyItems = JSON.parse(localStorage.getItem(legacyKey) || '[]') || []; } catch (_) { legacyItems = []; }
    if (!Array.isArray(legacyItems) || !legacyItems.length) return storefrontKey;
    try { storefrontItems = JSON.parse(localStorage.getItem(storefrontKey) || '[]') || []; } catch (_) { storefrontItems = []; }
    if (!Array.isArray(storefrontItems)) storefrontItems = [];
    legacyItems.forEach(function (legacyItem) {
      if (!legacyItem) return;
      var legacyProduct = String(legacyItem.product || '');
      var legacyPackage = String(legacyItem.specialPackage || '');
      var match = storefrontItems.find(function (item) {
        return item && String(item.product || '') === legacyProduct &&
          String(item.specialPackage || '') === legacyPackage &&
          String(item.selectedVariation || '') === String(legacyItem.selectedVariation || '');
      });
      if (!match) storefrontItems.push(legacyItem);
      else match.selectedQty = Math.max(Number(match.selectedQty) || 1, Number(legacyItem.selectedQty) || 1);
    });
    var mergedCart = JSON.stringify(storefrontItems);
    localStorage.setItem(storefrontKey, mergedCart);
    if (!cartMigrationScheduled) {
      cartMigrationScheduled = true;
      var finishMigration = function () {
        /* Angular persists its in-memory cart while unloading. Write the
           merged snapshot after that teardown too, so it cannot overwrite the
           recovered products before the next page reads them. */
        localStorage.setItem(storefrontKey, mergedCart);
        localStorage.removeItem(legacyKey);
      };
      window.addEventListener('beforeunload', finishMigration);
      window.addEventListener('pagehide', finishMigration);
      if (/^\\/(?:cart|checkout)(?:\\/|$)/.test(location.pathname)) {
        window.setTimeout(function () {
          var migrationUrl = new URL(window.location.href);
          if (migrationUrl.searchParams.has('ab-cart-migrated')) return;
          migrationUrl.searchParams.set('ab-cart-migrated', '1');
          window.location.replace(migrationUrl.toString());
        }, 0);
      }
    }
    return storefrontKey;
  }

  function guestCartItems() {
    if (Array.isArray(authenticatedCartItemsOverride)) return authenticatedCartItemsOverride.slice();
    var items = [];
    try { items = JSON.parse(localStorage.getItem(cartStorageKey()) || '[]') || []; } catch (_) { items = []; }
    return Array.isArray(items) ? items : [];
  }

  function setGuestCartItems(items) {
    localStorage.setItem(cartStorageKey(), JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('ab-cart-updated'));
  }

  function cartAuthorization() {
    return String(window.__abCartAuthorization || '').trim();
  }

  function recordCartAuthorization(value) {
    var authorization = String(value || '').trim();
    if (!authorization || authorization === cartAuthorization()) return;
    window.__abCartAuthorization = authorization;
    window.dispatchEvent(new CustomEvent('ab-cart-authorization'));
  }

  function installCartAuthorizationBridge() {
    if (window.__abCartAuthorizationBridgeInstalled) return;
    window.__abCartAuthorizationBridgeInstalled = true;
    var setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      if (String(name || '').toLowerCase() === 'authorization') {
        recordCartAuthorization(value);
      }
      return setRequestHeader.apply(this, arguments);
    };
  }

  function cartEntryKey(item) {
    if (!item) return '';
    return [
      String(item.product && item.product._id || item.product || ''),
      String(item.specialPackage && item.specialPackage._id || item.specialPackage || ''),
      String(item.selectedVariation && item.selectedVariation._id || item.selectedVariation || ''),
      String(Number(item.cartType) || 0),
    ].join(':');
  }

  function mergeGuestCartIntoAuthenticatedCart() {
    var authorization = cartAuthorization();
    if (!authorization || authenticatedCartMergePending || authenticatedCartMergeFinished) return Promise.resolve();
    var guestItems = [];
    try { guestItems = JSON.parse(localStorage.getItem(cartStorageKey()) || '[]') || []; } catch (_) { guestItems = []; }
    guestItems = Array.isArray(guestItems) ? guestItems.filter(function (item) { return cartEntryKey(item); }) : [];
    if (!guestItems.length) {
      authenticatedCartMergeFinished = true;
      return Promise.resolve();
    }
    authenticatedCartMergePending = true;
    return fetchJson('/cart/get-carts-by-user', {
      headers: { Authorization: authorization },
    }, RECOMMENDATION_API_BASE).then(function (result) {
      var accountItems = result && Array.isArray(result.data) ? result.data : [];
      var accountKeys = {};
      accountItems.forEach(function (item) { accountKeys[cartEntryKey(item)] = true; });
      var missingItems = guestItems.filter(function (item) { return !accountKeys[cartEntryKey(item)]; });
      if (!missingItems.length) return { success: true };
      return fetchJson('/cart/add-to-cart-multiple', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify(missingItems),
      }, RECOMMENDATION_API_BASE);
    }).then(function (result) {
      if (!result || result.success === false) return;
      localStorage.removeItem(cartStorageKey());
      authenticatedCartMergeFinished = true;
      return syncAuthenticatedCartUi();
    }).finally(function () {
      authenticatedCartMergePending = false;
    });
  }

  function syncAuthenticatedCartUi() {
    var authorization = cartAuthorization();
    if (!authorization) return syncGuestCartUi();
    return fetchJson('/cart/get-carts-by-user', {
      headers: { Authorization: authorization },
    }, RECOMMENDATION_API_BASE).then(function (result) {
      var carts = result && Array.isArray(result.data) ? result.data : [];
      authenticatedCartItemsOverride = carts.map(function (cart) {
        var product = cart && cart.product;
        return {
          product: product && product._id || product,
          selectedQty: Math.max(1, Number(cart && cart.selectedQty) || 1),
          cartType: Number(cart && cart.cartType) || 0,
        };
      }).filter(function (item) { return item.product; });
      var pending = syncGuestCartUi();
      authenticatedCartItemsOverride = null;
      return pending;
    });
  }

  function syncLiveCartUi() {
    return cartAuthorization() ? syncAuthenticatedCartUi() : syncGuestCartUi();
  }

  function stickyCart() {
    return document.getElementById('ab-sticky-commerce');
  }

  function stickyProductActions() {
    return document.getElementById('ab-sticky-product-actions');
  }

  function updateStickyCartCount() {
    var bar = stickyCart();
    if (!bar) return;
    var count = guestCartItems().length;
    if (!count) {
      var nativeBadge = document.querySelector('.bottom-nav .fa-shopping-bag');
      nativeBadge = nativeBadge && nativeBadge.closest('li') && nativeBadge.closest('li').querySelector('small');
      var nativeCount = nativeBadge && Number(String(nativeBadge.textContent || '').replace(/\\D/g, ''));
      if (nativeCount) count = nativeCount;
    }
    var badge = bar.querySelector('.ab-sticky-cart-count');
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('has-items', count > 0);
  }

  function updateNativeCartCount(items) {
    var count = Array.isArray(items) ? items.length : 0;
    var navItem = document.querySelector('.bottom-nav .fa-shopping-bag');
    navItem = navItem && navItem.closest('li');
    if (!navItem) return;
    var badge = navItem.querySelector('small');
    if (!badge && count) {
      badge = document.createElement('small');
      navItem.appendChild(badge);
    }
    if (badge) badge.textContent = String(count);
  }

  function pulseStickyCart() {
    updateStickyCartCount();
    var button = stickyCart() && stickyCart().querySelector('.ab-sticky-cart');
    if (!button) return;
    button.classList.remove('is-added');
    window.requestAnimationFrame(function () {
      button.classList.add('is-added');
      window.setTimeout(function () { button.classList.remove('is-added'); }, 760);
    });
  }

  function nativeSearchInput() {
    return document.querySelector('input#searchInput, app-header input[type="search"], app-header input[placeholder*="খুঁজ"], app-header input[placeholder*="Search"]');
  }

  function submitNativeSearch(value) {
    var query = String(value || '').trim();
    if (!query) return false;
    var nativeInput = nativeSearchInput();
    if (nativeInput) {
      nativeInput.focus();
      nativeInput.value = query;
      nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var target = '/product-list?searchQuery=' + encodeURIComponent(query);
    if (location.pathname + location.search === target) window.dispatchEvent(new Event('popstate'));
    else window.location.assign(target);
    return true;
  }

  function syncNativeSearchValue(value) {
    var nativeInput = nativeSearchInput();
    if (!nativeInput) return;
    nativeInput.value = value;
    nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
    nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function stickySearchResults() {
    var bar = stickyCart();
    return bar && bar.querySelector('.ab-sticky-search-results');
  }

  function hideStickySearchResults() {
    var results = stickySearchResults();
    if (!results) return;
    results.hidden = true;
    results.innerHTML = '';
  }

  function renderStickySearchState(message) {
    var results = stickySearchResults();
    if (!results) return;
    results.innerHTML = '<p class="ab-sticky-search-state">' + escapeHtml(message) + '</p>';
    results.hidden = false;
  }

  function stickySearchProductHtml(product) {
    var href = '/product-details/' + encodeURIComponent(product.slug || '');
    var author = authorName(product);
    return '<a class="ab-sticky-search-item" href="' + escapeHtml(href) + '">' +
      '<img src="' + escapeHtml(imageUrl(product.images && product.images[0], '/assets/images/placeholder/test.png')) + '" alt="' + escapeHtml(product.name || 'বই') + '" loading="lazy" decoding="async">' +
      '<span>' +
        '<p class="ab-sticky-search-title">' + escapeHtml(product.name || '') + '</p>' +
        (author ? '<p class="ab-sticky-search-author">' + escapeHtml(author) + '</p>' : '') +
      '</span>' +
      '<p class="ab-sticky-search-price">' + escapeHtml(money(finalPrice(product))) + '</p>' +
    '</a>';
  }

  function renderStickySearchProducts(products) {
    var results = stickySearchResults();
    if (!results) return;
    if (!products.length) {
      renderStickySearchState('কোনো বই পাওয়া যায়নি');
      return;
    }
    results.innerHTML = products.map(stickySearchProductHtml).join('');
    results.hidden = false;
  }

  function searchStickyProducts(query) {
    stickySearchRequestVersion += 1;
    var version = stickySearchRequestVersion;
    var value = String(query || '').trim();
    if (value.length < 2) {
      hideStickySearchResults();
      return;
    }
    renderStickySearchState('খোঁজা হচ্ছে...');
    fetchJson('/product/get-all?q=' + encodeURIComponent(value), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish' },
        pagination: { pageSize: 6, currentPage: 0 },
        sort: { priority: -1, totalSold: -1 },
        select: {
          name: 1, slug: 1, images: 1, salePrice: 1, afterDiscountPrice: 1,
          discountAmount: 1, discountType: 1, author: 1,
        },
      }),
    }, CATALOG_API_BASE).then(function (result) {
      if (version !== stickySearchRequestVersion) return;
      var products = result && Array.isArray(result.data) ? result.data : [];
      renderStickySearchProducts(products.filter(function (product) {
        return product && product.slug && product.name;
      }).slice(0, 6));
    });
  }

  function scheduleStickyProductSearch(value) {
    window.clearTimeout(stickySearchTimer);
    stickySearchTimer = window.setTimeout(function () {
      searchStickyProducts(value);
    }, 220);
  }

  function nativeProductAction(label) {
    return document.querySelector('app-product-details .product-action-btn button[data-ab-action-label="' + label + '"]');
  }

  function clickNativeProductAction(label) {
    var button = nativeProductAction(label);
    if (!button || button.disabled) return false;
    if (label === 'buy-now') finishBuyNowCheckout();
    button.click();
    return true;
  }

  function clearCartAddedFeedback() {
    var modal = document.getElementById('ab-added-cart-modal');
    if (modal) modal.remove();
    var toast = document.getElementById('amol-cart-toast');
    if (toast) toast.classList.remove('amol-show');
  }

  function finishBuyNowCheckout() {
    suppressAddedCartModalUntil = Date.now() + 1600;
    window.setTimeout(function () {
      clearCartAddedFeedback();
      if (location.pathname.indexOf('/checkout') !== 0) window.location.assign('/checkout');
    }, 140);
  }

  function openNativeCatalogue() {
    var bottomCategory = document.querySelector('.bottom-nav li .fa-bars');
    bottomCategory = bottomCategory && bottomCategory.closest('li');
    if (bottomCategory) {
      bottomCategory.click();
      return;
    }
    var categoryLink = document.querySelector('app-header a[href*="category"], header a[href*="category"]');
    if (categoryLink) categoryLink.click();
  }

  function cartPageOpen() {
    return location.pathname === '/cart';
  }

  function syncCartPageFrame(page) {
    if (!page) return;
    var header = document.querySelector('app-header .header, app-header, .header');
    var bottomNav = document.querySelector('.bottom-nav');
    var headerBottom = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
    var bottomHeight = bottomNav ? Math.max(0, Math.round(bottomNav.getBoundingClientRect().height)) : 0;
    page.style.top = String(headerBottom) + 'px';
    page.style.bottom = String(bottomHeight) + 'px';
  }

  function closeCartPage() {
    var cartPage = document.getElementById('ab-cart-page');
    if (cartPage) cartPage.remove();
    if (history.state && history.state.abCartPage) history.back();
    else history.replaceState({}, '', currentSlug ? '/product-details/' + encodeURIComponent(currentSlug) : '/');
  }

  function cartPageItems() {
    if (cartAuthorization()) {
      return fetchJson('/cart/get-carts-by-user', { headers: { Authorization: cartAuthorization() } }, RECOMMENDATION_API_BASE)
        .then(function (result) {
          return (result && Array.isArray(result.data) ? result.data : []).map(function (cart) {
            return { product: cart && cart.product, selectedQty: Math.max(1, Number(cart && cart.selectedQty) || 1) };
          }).filter(function (item) { return item.product; });
        });
    }
    return Promise.resolve(guestCartItems());
  }

  function cartPageProductId(item) {
    var product = item && item.product;
    return String(product && product._id || product || '');
  }

  function cartPageHeader(count) {
    return '<header class="ab-cart-page-header"><div><h1>ক্রয় তালিকা</h1><p class="ab-cart-page-count">' + escapeHtml(String(count)) + ' টি বই নির্বাচিত</p></div><button class="ab-cart-page-back" type="button" data-ab-cart-page-close="true">ফিরে যান</button></header>';
  }

  function renderCartPage(force) {
    var stale = document.getElementById('ab-cart-page');
    if (stale) stale.remove();
    cartPageLoading = false;
    cartPageRefreshQueued = false;
  }

  function openCartPage() {
    if (!cartPageOpen()) window.location.assign('/cart');
  }

  function productIsInCart() {
    if (!currentProduct || !currentProduct._id) return mainCartClickedSlug === currentSlug;
    return guestCartItems().some(function (item) {
      return String(item && item.product || '') === String(currentProduct._id);
    }) || mainCartClickedSlug === currentSlug;
  }

  function updateStickyProductActions() {
    var bar = stickyProductActions();
    if (!bar) return;
    var visible = isProductPage() && window.scrollY > 150;
    var ready = productIsInCart();
    bar.classList.toggle('is-visible', visible);
    bar.classList.toggle('is-cart-ready', ready);
  }

  function mountStickyCommerce() {
    var bar = stickyCart();
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ab-sticky-commerce';
      bar.setAttribute('aria-label', 'দ্রুত নেভিগেশন');
      bar.innerHTML = '<button class="ab-sticky-catalogue" type="button" aria-label="ক্যাটালগ খুলুন"><i class="fa fa-bars" aria-hidden="true"></i></button><div class="ab-sticky-search-wrap"><input class="ab-sticky-search" type="search" placeholder="বই খুঁজুন" aria-label="বই খুঁজুন" autocomplete="off"><div class="ab-sticky-search-results" hidden></div></div><button class="ab-sticky-cart" type="button" aria-label="ক্রয় তালিকা"><i class="fa fa-shopping-bag" aria-hidden="true"></i><span class="ab-sticky-cart-count"></span></button>';
      document.body.appendChild(bar);
    }
    var visible = isProductPage() && window.scrollY > 150;
    bar.classList.toggle('is-visible', visible);
    updateStickyCartCount();
  }

  function mountStickyProductActions() {
    var bar = stickyProductActions();
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ab-sticky-product-actions';
      bar.setAttribute('aria-label', 'দ্রুত ক্রয়');
      bar.innerHTML = '<button class="ab-sticky-product-buy" type="button">Buy Now</button><button class="ab-sticky-product-add" type="button">Add to Cart</button><button class="ab-sticky-product-go-cart" type="button">Go To Cart →</button>';
      document.body.appendChild(bar);
    }
    updateStickyProductActions();
  }

  function mountCartStickyCheckout() {
    var bar = document.getElementById('ab-cart-sticky-checkout');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ab-cart-sticky-checkout';
      bar.setAttribute('aria-label', 'অর্ডার সম্পন্ন করুন');
      bar.innerHTML = '<button type="button" data-ab-cart-sticky-checkout="true">অর্ডার করতে এগিয়ে যান →</button>';
      document.body.appendChild(bar);
    }
    bar.hidden = !cartPageOpen();
  }

  function addedCartProductCard(product) {
    var price = finalPrice(product);
    var sale = Number(product && product.salePrice) || 0;
    var author = Array.isArray(product && product.author) && product.author[0] ? product.author[0].name : '';
    return '<article class="ab-added-cart-card">' +
      '<a href="/product-details/' + encodeURIComponent(product.slug || '') + '"><img src="' + escapeHtml(imageUrl(product.images && product.images[0], '/assets/images/placeholder/test.png')) + '" alt="' + escapeHtml(product.name || 'বই') + '"></a>' +
      '<div class="ab-added-cart-card-body">' +
        '<h3>' + escapeHtml(product.name || '') + '</h3>' +
        '<p>' + escapeHtml(author) + '</p>' +
        '<p class="ab-added-cart-card-price">' + escapeHtml(money(price)) + (sale > price ? ' <s>' + escapeHtml(money(sale)) + '</s>' : '') + '</p>' +
        '<button class="ab-add-cart-button" type="button" data-product-id="' + escapeHtml(product._id || '') + '">Add to Cart</button>' +
      '</div>' +
    '</article>';
  }

  function renderAddedCartModal(addedProduct, products) {
    cartPageItems().then(function (items) {
      var ids = items.map(cartPageProductId).filter(Boolean);
      var embeddedProducts = items.map(function (item) {
        return item && item.product && typeof item.product === 'object' ? item.product : null;
      }).filter(Boolean);
      fetchProductsByIds(ids).then(function (fetchedProducts) {
      var cartProducts = embeddedProducts.concat(fetchedProducts || []);
      var subtotal = cartTotalFromProducts(items, cartProducts);
      var itemCount = items.reduce(function (total, item) {
        return total + Math.max(1, Number(item && item.selectedQty) || 1);
      }, 0);
      var modal = document.getElementById('ab-added-cart-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ab-added-cart-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        document.body.appendChild(modal);
      }
      var title = (addedProduct && (addedProduct.nameEn || addedProduct.name)) || 'Product';
      var cards = (products || []).filter(function (product) {
        return product && product._id && String(product._id) !== String(addedProduct && addedProduct._id || '');
      }).slice(0, 2).map(addedCartProductCard).join('');
      modal.innerHTML = '<div class="ab-added-cart-panel">' +
        '<header class="ab-added-cart-head"><h2 class="ab-added-cart-title">' + escapeHtml(title) + ' কার্টে যুক্ত হয়েছে <span class="ab-added-cart-check">✓</span></h2><button class="ab-added-cart-close" type="button" data-ab-added-cart-close="true" aria-label="বন্ধ করুন">×</button></header>' +
        '<div class="ab-added-cart-body">' +
          '<section class="ab-added-cart-summary"><p>' + escapeHtml(String(itemCount)) + ' Item(s)</p><p>Subtotal: ' + escapeHtml(money(subtotal)) + '</p><div class="ab-added-cart-actions"><button type="button" data-ab-added-cart-close="true">Buy More</button><button class="ab-added-cart-go" type="button" data-ab-added-cart-go="true">Go To Cart →</button></div></section>' +
          (cards ? '<h3 class="ab-added-cart-reco-title">Customers Also Bought</h3><div class="ab-added-cart-grid">' + cards + '</div>' : '') +
        '</div>' +
      '</div>';
      });
    });
  }

  function showAddedCartModal(productId) {
    if (!isProductPage()) return;
    var addedPromise = currentProduct && String(currentProduct._id || '') === String(productId)
      ? Promise.resolve(currentProduct)
      : fetchProductsByIds([productId]).then(function (products) { return products[0] || currentProduct || null; });
    addedPromise.then(function (product) {
      if (addedCartModalProducts) {
        renderAddedCartModal(product, addedCartModalProducts);
        return;
      }
      if (addedCartModalLoading) {
        renderAddedCartModal(product, []);
        return;
      }
      addedCartModalLoading = true;
      recommendations(product || currentProduct || {}, (product && product.slug) || currentSlug).then(function (payload) {
        addedCartModalLoading = false;
        addedCartModalProducts = payload && payload.data && Array.isArray(payload.data.products) ? payload.data.products : [];
        renderAddedCartModal(product, addedCartModalProducts);
      });
    });
  }

  function syncGuestCartUi() {
    var items = guestCartItems();
    updateStickyCartCount();
    updateNativeCartCount(items);

    var ids = items.filter(function (item) {
      return item && (!item.cartType || Number(item.cartType) === 2) && item.product;
    }).map(function (item) { return item.product; });
    if (!ids.length) {
      syncNativeCartPage(items, []);
      renderCartGiftRow(false);
      return Promise.resolve();
    }

    return fetchProductsByIds(ids).then(function (products) {
      if (!products.length) return;
      var productById = {};
      products.forEach(function (product) { productById[String(product._id)] = product; });
      if (cartPageOpen()) {
        cartNativeProductSignature = cartItemsSignature(items);
        cartNativeProducts = products;
        syncNativeCartPage(items, products);
        enhanceNativeCartRows(items, products);
        renderCartOffer(items, products);
        renderCartRecentlyViewed(items);
      }
      var slide = document.querySelector('app-cart-slide');
      var main = slide && slide.querySelector('.cart-slide-main');
      if (!main) return;
      var area = main.querySelector('.cart-item-area');
      if (!area) {
        area = document.createElement('div');
        area.className = 'cart-item-area';
        main.insertBefore(area, main.firstChild);
      }

      area.querySelectorAll('.ab-live-cart-item').forEach(function (row) {
        var stillPresent = items.some(function (item) {
          return String(item.product || '') === row.getAttribute('data-product-id');
        });
        if (!stillPresent) row.remove();
      });

      var total = 0;
      items.forEach(function (item) {
        var product = productById[String(item.product || '')];
        if (!product) return;
        var quantity = Math.max(1, Number(item.selectedQty) || 1);
        var unitPrice = finalPrice(product);
        total += unitPrice * quantity;
        var rows = Array.prototype.slice.call(area.querySelectorAll('.cart-item'));
        var row = rows.find(function (candidate) {
          var heading = candidate.querySelector('.cart-text h4');
          return candidate.getAttribute('data-product-id') === String(product._id) ||
            Boolean(heading && heading.textContent === product.name);
        });
        if (!row) {
          var nativeTemplate = area.querySelector('.cart-item:not(.ab-live-cart-item)');
          if (nativeTemplate) {
            row = nativeTemplate.cloneNode(true);
            row.classList.add('ab-live-cart-item');
          } else {
            row = document.createElement('div');
            row.className = 'cart-item ab-live-cart-item ab-live-cart-fallback';
            row.innerHTML =
              '<div class="cart-img"><img><div class="del"><span><i class="fa fa-trash-alt"></i></span></div></div>' +
              '<div class="cart-text"><h4></h4><span></span><div class="quantity-price"><div class="quantity">' +
                '<div><button type="button"><i class="fa fa-minus"></i></button></div>' +
                '<div><input type="text" readonly></div>' +
                '<div><button type="button"><i class="fa fa-plus"></i></button></div>' +
              '</div><div class="price"><b></b></div></div></div>';
          }
          area.appendChild(row);
        }
        row.setAttribute('data-product-id', String(product._id));
        var image = row.querySelector('.cart-img img');
        if (image) {
          image.src = imageUrl(product.images && product.images[0]);
          image.alt = product.name || 'বই';
        }
        var title = row.querySelector('.cart-text h4');
        if (title) title.textContent = product.name || '';
        var unitPriceNode = row.querySelector('.cart-text > span');
        if (unitPriceNode) unitPriceNode.textContent = 'Unit Price - ' + money(unitPrice);
        var remove = row.querySelector('.del');
        if (remove) {
          remove.setAttribute('data-ab-cart-op', 'remove');
          remove.setAttribute('aria-label', 'কার্ট থেকে সরান');
        }
        var quantityButtons = row.querySelectorAll('.quantity button');
        if (quantityButtons[0]) {
          quantityButtons[0].setAttribute('data-ab-cart-op', 'minus');
          quantityButtons[0].setAttribute('aria-label', 'পরিমাণ কমান');
        }
        if (quantityButtons[1]) {
          quantityButtons[1].setAttribute('data-ab-cart-op', 'plus');
          quantityButtons[1].setAttribute('aria-label', 'পরিমাণ বাড়ান');
          quantityButtons[1].disabled = false;
        }
        var input = row.querySelector('.quantity input');
        if (input) {
          input.value = String(quantity);
          input.setAttribute('aria-label', 'পরিমাণ');
        }
        var minus = row.querySelector('[data-ab-cart-op="minus"]');
        if (minus) minus.disabled = quantity <= 1;
        var linePrice = row.querySelector('.price b');
        if (linePrice) linePrice.textContent = money(unitPrice * quantity);
      });

      var countTitle = slide.querySelector('.cart-slide-top h3');
      if (countTitle) countTitle.innerHTML = '<i class="fas fa-shopping-basket"></i>কার্ট আইটেম(' + String(items.length).padStart(2, '0') + ')';
      var totalNode = slide.querySelector('.cart-slide-bottom a span');
      if (totalNode && products.length === ids.length) totalNode.textContent = money(total);
    });
  }

  function updateGuestCartItem(productId, operation) {
    var items = guestCartItems();
    var index = items.findIndex(function (item) {
      return item && String(item.product || '') === String(productId);
    });
    if (index < 0) return;
    if (operation === 'remove') items.splice(index, 1);
    if (operation === 'plus') items[index].selectedQty = Math.max(1, Number(items[index].selectedQty) || 1) + 1;
    if (operation === 'minus') items[index].selectedQty = Math.max(1, (Number(items[index].selectedQty) || 1) - 1);
    setGuestCartItems(items);
    syncGuestCartUi();
  }

  function updateNodeText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function syncNativeCartPage(items, products) {
    if (!cartPageOpen()) return;
    var area = document.querySelector('app-cart-information .cart-area-main');
    if (!area) return;
    var byId = {};
    (products || []).forEach(function (product) { byId[String(product._id)] = product; });
    var paidIds = (items || []).map(cartPageProductId).filter(Boolean);
    var activeNames = (products || []).map(function (product) { return String(product && product.name || '').trim(); }).filter(Boolean);

    area.querySelectorAll('.cart-card:not(.ab-live-cart-page-item)').forEach(function (row) {
      var title = row.querySelector('.cart-text-info h3');
      var name = String(title && title.textContent || '').trim();
      row.classList.toggle('ab-cart-native-stale', !name || activeNames.indexOf(name) === -1);
    });

    area.querySelectorAll('.ab-live-cart-page-item:not(.ab-cart-gift-row)').forEach(function (row) {
      if (paidIds.indexOf(row.getAttribute('data-product-id') || '') === -1) row.remove();
    });

    (items || []).forEach(function (item) {
      var productId = cartPageProductId(item);
      var product = byId[productId];
      if (!product) return;
      var quantity = Math.max(1, Number(item && item.selectedQty) || 1);
      var injected = area.querySelector('.ab-live-cart-page-item[data-product-id="' + escapeHtml(productId) + '"]');
      var nativeMatch = Array.prototype.slice.call(area.querySelectorAll('.cart-card:not(.ab-live-cart-page-item)')).find(function (row) {
        var title = row.querySelector('.cart-text-info h3');
        return Boolean(title && (title.textContent || '').trim() === String(product.name || '').trim());
      });
      if (nativeMatch) {
        if (injected) injected.remove();
        return;
      }
      var row = injected;
      if (!row) {
        var template = area.querySelector('.cart-card:not(.ab-live-cart-page-item)');
        if (!template) return;
        row = template.cloneNode(true);
        row.classList.remove('ab-cart-native-stale');
        row.classList.add('ab-live-cart-item', 'ab-live-cart-page-item');
        row.querySelectorAll('.ab-cart-native-author, .ab-cart-native-discount').forEach(function (node) { node.remove(); });
        area.appendChild(row);
      }
      row.setAttribute('data-product-id', productId);
      var image = row.querySelector('.cart-img img');
      if (image) {
        image.setAttribute('src', imageUrl(product.images && product.images[0]));
        image.setAttribute('alt', product.name || 'বই');
      }
      updateNodeText(row.querySelector('.cart-text-info h3'), product.name || '');
      updateNodeText(row.querySelector('.cart-text-info > p'), authorName(product));
      updateNodeText(row.querySelector('.cart-text-info h4'), money(finalPrice(product)));
      updateNodeText(row.querySelector('.cart-price-area h3'), money(finalPrice(product) * quantity));
      var remove = row.querySelector('.cart-text-info ul span');
      if (remove) {
        remove.setAttribute('data-ab-cart-op', 'remove');
        remove.setAttribute('aria-label', 'কার্ট থেকে সরান');
      }
      var controls = row.querySelectorAll('.quantity-area .q-icon span');
      if (controls[0]) {
        controls[0].setAttribute('data-ab-cart-op', 'plus');
        controls[0].setAttribute('aria-label', 'পরিমাণ বাড়ান');
      }
      if (controls[1]) {
        controls[1].setAttribute('data-ab-cart-op', 'minus');
        controls[1].setAttribute('aria-label', 'পরিমাণ কমান');
        controls[1].classList.toggle('is-disabled', quantity <= 1);
      }
      var input = row.querySelector('.quantity-area input');
      if (input) input.value = String(quantity);
    });

    var total = cartTotalFromProducts(items || [], products || []);
    var summary = document.querySelectorAll('app-cart-information .select-items-area h3');
    updateNodeText(summary[0], 'মোট আইটেম(' + String((items || []).length) + ')');
    updateNodeText(summary[1], 'সর্বমোট টাকা : ' + money(total));
    placeCartSummaryInsideItems();
  }

  function renderCartGiftRow(earned) {
    var area = document.querySelector('app-cart-information .cart-area-main');
    var existing = area && area.querySelector('.ab-cart-gift-row');
    if (!earned || !area) {
      if (existing) existing.remove();
      return;
    }
    var notebook = cartOfferNotebook || {};
    if (!notebook._id && !notebook.name) return;
    var row = existing;
    if (!row) {
      var template = area.querySelector('.cart-card:not(.ab-live-cart-page-item)');
      if (!template) return;
      row = template.cloneNode(true);
      row.classList.remove('ab-cart-native-stale');
      row.classList.add('ab-live-cart-page-item', 'ab-cart-gift-row');
      row.querySelectorAll('.quantity-area, .cart-text-info ul, .ab-cart-native-author, .ab-cart-native-discount').forEach(function (node) { node.remove(); });
      area.appendChild(row);
    }
    var notebookName = notebook.name || cartOfferConfig && cartOfferConfig.giftProduct && cartOfferConfig.giftProduct.name || 'ফ্রি নোটবুক';
    var notebookCover = notebookCoverUrl(notebook);
    var image = row.querySelector('.cart-img img');
    if (image) {
      image.setAttribute('src', notebookCover);
      image.setAttribute('alt', notebookName);
    }
    updateNodeText(row.querySelector('.cart-text-info h3'), notebookName);
    var label = row.querySelector('.cart-text-info > p');
    updateNodeText(label, 'ফ্রি উপহার · ' + String(NOTEBOOK_PAGE_COUNT).replace(/\\d/g, function (digit) { return String.fromCharCode(0x09e6 + Number(digit)); }) + ' পৃষ্ঠা');
    if (label) label.classList.add('ab-cart-gift-label');
    updateNodeText(row.querySelector('.cart-text-info h4'), money(0));
    updateNodeText(row.querySelector('.cart-price-area h3'), money(0));
  }

  function updateAuthenticatedCartItem(productId, operation) {
    var authorization = cartAuthorization();
    if (!authorization) return updateGuestCartItem(productId, operation);
    fetchJson('/cart/get-carts-by-user', {
      headers: { Authorization: authorization },
    }, RECOMMENDATION_API_BASE).then(function (result) {
      var carts = result && Array.isArray(result.data) ? result.data : [];
      var cart = carts.find(function (entry) {
        var product = entry && entry.product;
        return String(product && product._id || product || '') === String(productId);
      });
      if (!cart || !cart._id) return;
      var path = operation === 'remove' ? '/cart/delete/' + encodeURIComponent(cart._id) :
        '/cart/update-qty/' + encodeURIComponent(cart._id);
      var options = operation === 'remove' ? {
        method: 'DELETE', headers: { Authorization: authorization },
      } : {
        method: 'PUT',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedQty: 1, type: operation === 'plus' ? 'increment' : 'decrement' }),
      };
      return fetchJson(path, options, RECOMMENDATION_API_BASE).then(syncAuthenticatedCartUi);
    });
  }

  function addProductToCart(productId, button) {
    if (!productId) return;
    var authorization = cartAuthorization();
    if (authorization) {
      var previousLabel = button && button.textContent;
      if (button) {
        button.textContent = 'Adding…';
        button.disabled = true;
      }
      fetchJson('/cart/add-to-cart', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productId, selectedQty: 1, cartType: 0 }),
      }, RECOMMENDATION_API_BASE).then(function (result) {
        if (!result || result.success === false) return;
        pushAddToCartTrackingByProductId(productId, 1);
        window.dispatchEvent(new CustomEvent('ab-cart-updated', { detail: { product: productId } }));
        window.dispatchEvent(new CustomEvent('amol-cart-added', { detail: { product: productId } }));
        pulseStickyCart();
        return syncAuthenticatedCartUi();
      }).finally(function () {
        if (!button) return;
        button.textContent = previousLabel || 'Add to Cart';
        button.disabled = false;
      });
      return;
    }
    addGuestProductToCart(productId, button);
  }

  function addGuestProductToCart(productId, button) {
    if (!productId) return;
    var key = cartStorageKey();
    var items = [];
    try { items = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (_) { items = []; }
    var index = items.findIndex(function (item) { return item && item.product === productId && !item.selectedVariation; });
    if (index === -1) {
      items.push({ product: productId, selectedQty: 1, cartType: 0 });
    } else {
      items[index].selectedQty = Math.max(1, Number(items[index].selectedQty) || 1) + 1;
    }
    localStorage.setItem(key, JSON.stringify(items));
    pushAddToCartTrackingByProductId(productId, 1);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('ab-cart-updated', { detail: { product: productId } }));
    window.dispatchEvent(new CustomEvent('amol-cart-added', { detail: { product: productId } }));
    pulseStickyCart();
    syncGuestCartUi();
    if (button) {
      var previous = button.textContent;
      button.textContent = 'Added';
      button.disabled = true;
      window.setTimeout(function () {
        button.textContent = previous || 'Add to Cart';
        button.disabled = false;
      }, 900);
    }
  }

  function section(title, body, className) {
    return '<section class="ab-product-section ' + escapeHtml(className || '') + '">' +
      '<h2 class="ab-section-heading">' + escapeHtml(title) + '</h2>' + body + '</section>';
  }

  function factItem(label, icon, value, subValue, strongValue) {
    if (!value && !subValue && !strongValue) return '';
    var hasIcon = !!String(icon || '').trim();
    var iconHtml = icon === 'book'
      ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M4.5 5.25c0-.83.67-1.5 1.5-1.5h5.25c.97 0 1.75.78 1.75 1.75v14.25c0-.97-.78-1.75-1.75-1.75H6c-.83 0-1.5-.67-1.5-1.5V5.25Z" stroke-width="1.7" stroke-linejoin="round"/><path d="M19.5 5.25c0-.83-.67-1.5-1.5-1.5h-5.25c-.97 0-1.75.78-1.75 1.75v14.25c0-.97.78-1.75 1.75-1.75H18c.83 0 1.5-.67 1.5-1.5V5.25Z" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 5.5v14.25" stroke-width="1.7" stroke-linecap="round"/></svg>'
      : escapeHtml(icon);
    return '<div class="ab-fact' + (hasIcon ? '' : ' ab-fact-no-icon') + '">' +
      '<p class="ab-fact-label">' + escapeHtml(label) + '</p>' +
      (hasIcon ? '<div class="ab-fact-icon" aria-hidden="true">' + iconHtml + '</div>' : '') +
      '<p class="ab-fact-value">' +
        (strongValue ? '<span class="ab-fact-value-strong">' + escapeHtml(strongValue) + '</span>' : escapeHtml(value || '')) +
        (subValue ? '<span class="ab-fact-sub">' + escapeHtml(subValue) + '</span>' : '') +
      '</p>' +
    '</div>';
  }

  function productFactsHtml(product) {
    var pageCount = Number(product && product.totalPages) || 0;
    var language = firstName(product && product.language);
    var publisher = firstName(product && product.publisher);
    var authors = firstName(product && product.author);
    var country = product && product.country || '';
    var items = [
      factItem('Genre', '▦', firstCategoryName(product), '', ''),
      factItem('Number of Pages', '', '', pageCount ? 'Pages' : '', pageCount ? String(pageCount) : ''),
      factItem('Language', '', '', language, languageCode(product && product.language)),
      factItem('Publication', 'book', publisher, '', ''),
      factItem('Author', '✒', authors, '', ''),
      factItem('ISBN', '▧', product && (product.isbn || product.sku) || '', '', ''),
      factItem('Edition', '', '', product && product.edition || '', publicationYear(product)),
      factItem('Country', '', '', country, countryCode(country)),
    ].filter(Boolean).join('');
    if (!items) return '';
    return '<section class="ab-facts-section" aria-label="Product information">' +
      '<div class="ab-facts-strip">' + items + '</div>' +
    '</section>';
  }

  function authorHtml(author, fallback) {
    var source = author || fallback || {};
    var authorId = source._id || fallback && fallback._id || '';
    var slug = source.slug || fallback && fallback.slug || '';
    var name = source.name || fallback && fallback.name || 'লেখক';
    var authorImage = source.image || source.imageUrl || source.imagePath ||
      fallback && (fallback.image || fallback.imageUrl || fallback.imagePath) || legacyAuthorImageById[String(authorId)] || '';
    var href = slug ? '/author-list/author-details/' + encodeURIComponent(slug) : '#';
    var description = safeRichHtml(
      source.description || source.descriptionEn || source.biography || source.bio || source.about ||
      fallback && (fallback.description || fallback.descriptionEn || fallback.biography || fallback.bio || fallback.about) || '',
    );
    var followers = Math.max(0, Number(source.followers) || 0);
    return '<article class="ab-author-card">' +
      '<img class="ab-author-image" src="' + escapeHtml(imageUrl(authorImage)) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async" data-author-id="' + escapeHtml(authorId) + '" data-ab-fallback="/assets/images/avatar/user_low.png" onerror="this.onerror=null;this.src=this.dataset.abFallback">' +
      '<div class="ab-author-body">' +
        '<a class="ab-author-name" href="' + escapeHtml(href) + '">' + escapeHtml(name) + '</a>' +
        (followers ? '<p class="ab-author-meta">' + escapeHtml(followers.toLocaleString('en-US')) + ' followers</p>' : '') +
      '</div>' +
      (description
        ? '<div class="ab-author-description">' + description + '</div>'
        : '<p class="ab-author-description-empty">লেখকের পরিচিতি এখনো যোগ করা হয়নি।</p>') +
    '</article>';
  }

  function hydrateAuthorImages(root) {
    if (!root) return;
    root.querySelectorAll('.ab-author-image[data-author-id]').forEach(function (image) {
      var authorId = image.getAttribute('data-author-id');
      var fallback = image.getAttribute('data-ab-fallback') || '/assets/images/avatar/user_low.png';
      if (image.getAttribute('src') === fallback) image.removeAttribute('data-ab-author-image-loading');
      if (!authorId || image.getAttribute('data-ab-author-image-loading')) return;
      image.setAttribute('data-ab-author-image-loading', 'true');
      fetchJson('/author/' + encodeURIComponent(authorId), { cache: 'no-store' }, CATALOG_API_BASE).then(function (result) {
        var author = result && result.data || {};
        var source = author.image || author.imageUrl || author.imagePath || '';
        if (!source) return;
        image.setAttribute('data-ab-author-image-source', imageUrl(source));
        image.src = imageUrl(source);
      });
    });
  }

  function relatedProducts(product) {
    var categories = Array.isArray(product.category) ? product.category : [];
    var categoryId = categories[0] && categories[0]._id;
    if (!categoryId) return Promise.resolve(null);
    return fetchJson('/product/get-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish', quantity: { $gt: 0 }, 'category._id': categoryId },
        pagination: { pageSize: 9, currentPage: 0 },
        sort: { totalSold: -1, priority: -1 },
        select: {
          name: 1, slug: 1, images: 1, salePrice: 1, afterDiscountPrice: 1,
          discountAmount: 1, discountType: 1, author: 1,
        },
      }),
    }, CATALOG_API_BASE).then(function (result) {
      var products = result && Array.isArray(result.data) ? result.data : [];
      products = products.filter(function (entry) { return entry && entry.slug !== product.slug; }).slice(0, 8);
      return products.length ? { success: true, data: { source: 'related', products: products } } : null;
    });
  }

  function recommendations(product, slug) {
    return fetchJson(
      '/product/customers-also-bought/' + encodeURIComponent(slug),
      null,
      CATALOG_API_BASE,
    ).then(function (result) {
      var products = result && result.data && result.data.products;
      if (Array.isArray(products) && products.length) return result;
      return relatedProducts(product);
    });
  }

  function recommendationsHtml(payload) {
    var data = payload && payload.data || {};
    var products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) return '';
    var title = 'Customers Bought Together';
    var cards = products.map(function (product) {
      var price = finalPrice(product);
      var sale = Number(product.salePrice) || 0;
      var author = Array.isArray(product.author) && product.author[0] ? product.author[0].name : '';
      var href = '/product-details/' + encodeURIComponent(product.slug || '');
      return '<article class="ab-product-card">' +
        '<a class="ab-product-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml((product.name || 'বই') + ' দেখুন') + '">' +
          '<img src="' + escapeHtml(imageUrl(product.images && product.images[0], '/assets/images/placeholder/test.png')) + '" alt="' + escapeHtml(product.name || 'বই') + '" loading="lazy" decoding="async">' +
        '</a>' +
        '<h3 class="ab-product-name"><a class="ab-product-link" href="' + escapeHtml(href) + '">' + escapeHtml(product.name || '') + '</a></h3>' +
        '<p class="ab-product-author">' + escapeHtml(author) + '</p>' +
        '<p class="ab-product-price"><span class="ab-product-current-price">' + escapeHtml(money(price)) + '</span>' +
          (sale > price ? '<span class="ab-product-old-price">' + escapeHtml(money(sale)) + '</span>' : '') + '</p>' +
        '<button class="ab-add-cart-button" type="button" data-product-id="' + escapeHtml(product._id || '') + '" aria-live="polite">Add to Cart</button>' +
      '</article>';
    }).join('');
    return section(title, '<div class="ab-product-grid" role="region" aria-label="Customers Bought Together products" tabindex="0">' + cards + '</div>', 'ab-recommendation-section');
  }

  function libraryProductHtml(product, badge) {
    var price = finalPrice(product);
    var percent = discountPercent(product);
    var author = Array.isArray(product.author) && product.author[0] ? product.author[0].name : '';
    var href = '/product-details/' + encodeURIComponent(product.slug || '');
    var badgeText = String(badge || '').trim();
    return '<article class="ab-library-card">' +
      '<a class="ab-library-link" href="' + escapeHtml(href) + '">' +
        '<div class="ab-library-image-wrap">' +
          '<img class="ab-library-image" src="' + escapeHtml(imageUrl(product.images && product.images[0], '/assets/images/placeholder/test.png')) + '" alt="' + escapeHtml(product.name || 'বই') + '" loading="lazy" decoding="async">' +
          (badgeText ? '<span class="ab-library-rank-badge">' + escapeHtml(badgeText) + '</span>' : '') +
          (percent ? '<span class="ab-library-discount" aria-label="' + escapeHtml(percent + ' percent discount') + '">' + escapeHtml(percent) + '%<small>OFF</small></span>' : '') +
        '</div>' +
        '<h3 class="ab-library-title">' + escapeHtml(product.name || '') + '</h3>' +
        '<p class="ab-library-author">' + escapeHtml(author) + '</p>' +
        '<p class="ab-library-price">' + escapeHtml(money(price)) + '</p>' +
      '</a>' +
      '<button class="ab-add-cart-button ab-library-cart" type="button" data-product-id="' + escapeHtml(product._id || '') + '" aria-live="polite">Add to Cart</button>' +
    '</article>';
  }

  function productCategories(product) {
    var categories = Array.isArray(product && product.category) ? product.category : [];
    return categories.map(function (category) {
      if (!category) return null;
      var name = firstName(category);
      if (!name) return null;
      return {
        key: String(category._id || name),
        name: name,
      };
    }).filter(Boolean);
  }

  function categoryShelfTitle(name) {
    var value = String(name || '').trim();
    if (/কুরআন|quran/i.test(value)) return 'কুরআন শেখার বই';
    if (/হাদিস|hadith/i.test(value)) return 'হাদিসের বই';
    if (/সীরাত|সিরাত|seerah/i.test(value)) return 'সিরাত গ্রন্থসমূহ';
    if (/দোয়া|দুআ|দরূদ|যিকর/i.test(value)) return 'দোয়া, দরূদ ও যিকরের বই';
    if (/আত্মশুদ্ধি|অনুপ্রেরণা/i.test(value)) return 'আত্মশুদ্ধি ও অনুপ্রেরণার বই';
    if (/প্রোডাক্টিভ/i.test(value)) return 'প্রোডাক্টিভিটির বই';
    if (/ইসলামে নারী|নারী/i.test(value)) return 'ইসলামে নারী বিষয়ক বই';
    if (/অর্থনীতি|বিনিয়োগ/i.test(value)) return 'অর্থনীতি ও বিনিয়োগের বই';
    if (/আদব|আখলাক/i.test(value)) return 'আদব ও আখলাকের বই';
    if (/আদর্শ|মতবাদ|আকিদা/i.test(value)) return 'ইসলামী আদর্শ ও আকিদার বই';
    return /বই|গ্রন্থ/.test(value) ? value : value + ' বই';
  }

  function categoryShelvesHtml(products, current) {
    var groups = {};
    (Array.isArray(products) ? products : []).forEach(function (product) {
      if (!product || product.slug === current.slug) return;
      productCategories(product).forEach(function (category) {
        if (!groups[category.key]) groups[category.key] = { key: category.key, name: category.name, products: [] };
        groups[category.key].products.push(product);
      });
    });

    var available = Object.keys(groups).map(function (key) { return groups[key]; }).filter(function (group) {
      return group.products.length >= 2;
    });
    var selected = [];
    function selectGroup(group) {
      if (!group || selected.some(function (entry) {
        return entry.key === group.key || categoryShelfTitle(entry.name) === categoryShelfTitle(group.name);
      })) return;
      selected.push(group);
    }

    var currentCategories = productCategories(current);
    currentCategories.forEach(function (category) { selectGroup(groups[category.key]); });
    [
      /হাদিস|hadith/i,
      /কুরআন|quran/i,
      /সীরাত|সিরাত|seerah/i,
      /আত্মশুদ্ধি|অনুপ্রেরণা/i,
      /দোয়া|দুআ|দরূদ|যিকর/i,
      /প্রোডাক্টিভ/i,
      /ইসলামে নারী|নারী/i,
      /অর্থনীতি|বিনিয়োগ/i,
      /আদব|আখলাক/i,
      /আদর্শ|মতবাদ|আকিদা/i,
    ].forEach(function (pattern) {
      if (selected.length >= 12) return;
      selectGroup(available.find(function (group) { return pattern.test(group.name); }));
    });
    available.sort(function (a, b) { return b.products.length - a.products.length; }).forEach(function (group) {
      if (selected.length < 12) selectGroup(group);
    });

    var usedProducts = {};
    var renderedShelfCount = 0;
    return selected.map(function (group) {
      if (renderedShelfCount >= 7) return '';
      var shelfProducts = group.products.filter(function (product) {
        var key = String(product && (product._id || product.slug) || '');
        return key && !usedProducts[key];
      }).slice(0, 6);
      if (shelfProducts.length < 2) return '';
      shelfProducts.forEach(function (product) {
        usedProducts[String(product._id || product.slug)] = true;
      });
      var index = renderedShelfCount;
      renderedShelfCount += 1;
      var cards = shelfProducts.map(function (product, productIndex) {
        var badge = productIndex === 0 && Number(product.totalSold) > 0 ? 'বেস্টসেলার' : '';
        return libraryProductHtml(product, badge);
      }).join('');
      return '<section class="ab-library-shelf" aria-labelledby="' + CATEGORY_LIBRARY_ID + '-shelf-' + index + '">' +
        '<h3 class="ab-library-shelf-heading" id="' + CATEGORY_LIBRARY_ID + '-shelf-' + index + '">' + escapeHtml(categoryShelfTitle(group.name)) + '</h3>' +
        '<div class="ab-library-grid">' + cards + '</div>' +
      '</section>';
    }).join('');
  }

  function fallbackLibraryHtml(products, current) {
    var books = (Array.isArray(products) ? products : []).filter(function (product) {
      return product && product.slug && product.slug !== current.slug;
    }).slice(0, 6);
    if (!books.length) return '';
    return '<section class="ab-library-shelf" aria-labelledby="' + CATEGORY_LIBRARY_ID + '-fallback">' +
      '<h3 class="ab-library-shelf-heading" id="' + CATEGORY_LIBRARY_ID + '-fallback">জনপ্রিয় বই</h3>' +
      '<div class="ab-library-grid">' + books.map(function (product, index) {
        return libraryProductHtml(product, index === 0 ? 'বেস্টসেলার' : '');
      }).join('') + '</div></section>';
  }

  function fetchCategoryLibraryProducts() {
    return fetchJson('/product/get-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish', quantity: { $gt: 0 } },
        pagination: { pageSize: 180, currentPage: 0 },
        sort: { totalSold: -1, priority: -1 },
        select: {
          _id: 1, name: 1, slug: 1, images: 1, salePrice: 1, afterDiscountPrice: 1,
          discountAmount: 1, discountType: 1, totalSold: 1, author: 1, category: 1,
        },
      }),
    }, CATALOG_API_BASE);
  }

  function repairProductActionLabels() {
    var area = document.querySelector('app-product-details .product-action-btn');
    if (!area) return;
    area.querySelectorAll('button').forEach(function (button) {
      var text = (button.textContent || '').replace(/\s+/g, ' ').trim();
      if (/অগ্রিম টাকা ছাড়া অর্ডার করুন/.test(text) && button.parentElement) {
        button.parentElement.style.display = 'none';
        return;
      }
      if (text === 'অর্ডার করুন' || button.getAttribute('data-ab-action-label') === 'buy-now') {
        button.setAttribute('data-ab-action-label', 'buy-now');
        if (text !== 'Buy Now') button.textContent = 'Buy Now';
        return;
      }
      var isCartAction = /ক্রয় তালিকা|ক্রয় তালিকা|Add to Cart|Go to Cart(?: Page)?/i.test(text) ||
        button.getAttribute('data-ab-action-label') === 'cart';
      if (!isCartAction) return;
      button.setAttribute('data-ab-action-label', 'cart');
      button.setAttribute('data-ab-cart-route', currentSlug);
      var isInCart = mainCartClickedSlug === currentSlug;
      var label = isInCart ? 'Go to Cart' : 'Add to Cart';
      if (text !== label) button.textContent = label;
    });

    /* The WhatsApp link is rendered before the purchase buttons by the
       compiled storefront. Keep it as the final purchase option. */
    var whatsApp = area.querySelector('#__wa-order-btn');
    var whatsAppRow = whatsApp && whatsApp.parentElement;
    var actionList = area.querySelector('ul');
    if (whatsAppRow && actionList && whatsAppRow.parentElement === actionList &&
      actionList.lastElementChild !== whatsAppRow) {
      actionList.appendChild(whatsAppRow);
    }
  }

  function repairDeliveryIcons() {
    var icons = document.querySelectorAll('app-product-details .cash-on-delivery-area > ul > li img');
    var sources = [
      '/assets/images/logo/cod-small.svg',
      '/assets/images/logo/happy-return-big.svg',
    ];
    var labels = ['ক্যাশ অন ডেলিভারি', 'পণ্য পরিবর্তনের সুবিধা'];
    icons.forEach(function (icon, index) {
      if (!sources[index]) return;
      if (icon.getAttribute('src') !== sources[index]) icon.setAttribute('src', sources[index]);
      icon.setAttribute('alt', labels[index]);
      icon.setAttribute('data-ab-delivery-icon', 'true');
    });
  }

  function svgIcon(path, label) {
    return 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1f5038" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="' + escapeHtml(label || '') + '">' + path + '</svg>'
    );
  }

  function replaceIcon(image, source, label) {
    if (!image || !source) return;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    image.setAttribute('alt', label || '');
    image.setAttribute('data-ab-delivery-icon', 'true');
  }

  function cartTrustList() {
    return Array.prototype.slice.call(document.querySelectorAll('.section-right ul, .cash-on-delivery-area ul')).find(function (list) {
      var text = (list.textContent || '').replace(/\s+/g, ' ');
      return /পণ্য হাতে|পরিবর্তনের সুযোগ|অরিজিনাল|ত্রুটিযুক্ত/.test(text) && list.offsetParent !== null;
    });
  }

  function repairCartTrustIcons() {
    var list = cartTrustList();
    if (!list) return;
    var sources = [
      '/assets/images/logo/cod-small.svg',
      '/assets/images/logo/happy-return-big.svg',
      svgIcon('<path d="m12 3 7 3v5c0 4.5-3 7.8-7 10-4-2.2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>', 'গুণগত মান নিশ্চিত'),
      svgIcon('<path d="M4 7h11l-2-2"/><path d="M15 7 13 5"/><path d="M20 17H9l2 2"/><path d="m9 17 2-2"/><path d="M4 7v4a6 6 0 0 0 6 6h10"/>', 'সহজ রিটার্ন'),
      svgIcon('<path d="M12 3v18"/><path d="M7 7h7a3 3 0 0 1 0 6H10a3 3 0 0 0 0 6h7"/>', 'সাশ্রয়ী মূল্য'),
    ];
    Array.prototype.slice.call(list.querySelectorAll('li')).forEach(function (item, index) {
      replaceIcon(item.querySelector('img'), sources[index] || sources[sources.length - 1], 'সেবার সুবিধা');
    });
  }

  function repairEmptyCartImage() {
    var image = document.querySelector('div.empty-cart-card > div.card-body > div.empty-cart-details > img');
    if (!image) return;
    var source = svgIcon(
      '<path d="M3 4h2l2.1 9.7a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 7H6.2"/>' +
      '<path d="M9 10h8"/><circle cx="10" cy="19" r="1.25"/><circle cx="18" cy="19" r="1.25"/>',
      'খালি ক্রয় তালিকা',
    );
    replaceIcon(image, source, 'খালি ক্রয় তালিকা');
    image.setAttribute('data-ab-empty-cart-image', 'true');
  }

  function placeCartSummaryInsideItems() {
    var summary = document.querySelector('app-cart-information .select-items-area');
    var cartArea = document.querySelector('app-cart-information .cart-area');
    var cartBottom = cartArea && cartArea.querySelector('.cart-area-bottom');
    if (!summary || !cartArea || !cartBottom) return;
    summary.classList.add('ab-cart-summary-source');
    var inline = document.getElementById('ab-cart-summary-inline');
    if (!inline) {
      inline = summary.cloneNode(true);
      inline.id = 'ab-cart-summary-inline';
      inline.classList.remove('ab-cart-summary-source');
      cartBottom.insertBefore(inline, cartBottom.firstChild);
    }
    var sourceValues = summary.querySelectorAll('h3');
    var inlineValues = inline.querySelectorAll('h3');
    for (var i = 0; i < Math.min(sourceValues.length, inlineValues.length); i++) {
      updateNodeText(inlineValues[i], sourceValues[i].textContent || '');
    }
  }

  function repairCheckoutJourney() {
    if (location.pathname.indexOf('/checkout') !== 0 || location.pathname.indexOf('order-success') !== -1) return;
    document.body.classList.add('ab-checkout-enhanced');
    var existing = document.getElementById('ab-checkout-journey');
    if (!existing) {
      existing = document.createElement('nav');
      existing.id = 'ab-checkout-journey';
      existing.setAttribute('aria-label', 'অর্ডারের ধাপ');
      existing.innerHTML = '<a href="/cart">১. ক্রয় তালিকা</a><span class="ab-checkout-separator">→</span><span class="is-active">২. তথ্য ও পেমেন্ট</span><span class="ab-checkout-separator">→</span><span>৩. অর্ডার সম্পন্ন</span>';
      var form = document.querySelector('app-checkout form, app-checkout .container, app-checkout');
      if (form && form.parentNode) form.parentNode.insertBefore(existing, form);
    }
    var methodImage = Array.prototype.slice.call(document.querySelectorAll('.method-data img')).find(function (image) {
      var container = image.closest('.method-data');
      return container && /Cash on Delivery|বই হাতে পেয়ে টাকা দিন/.test(container.textContent || '');
    });
    replaceIcon(methodImage, '/assets/images/logo/cod-small.svg', 'Cash on Delivery');
    if (!cartOfferConfig && !cartOfferConfigPending) {
      cartOfferConfigPending = true;
      fetchJson('/order-offer/get', null, API_BASE).then(function (result) {
        cartOfferConfigPending = false;
        cartOfferConfig = normalizeCartOfferConfig(result && result.data);
        warmCartOfferNotebook();
        renderCheckoutGift();
      });
    }
    renderCheckoutGift();
  }

  function checkoutGiftPlacement() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('app-checkout .cart-card, app-checkout .cart-item')).filter(function (row) {
      return row.offsetParent && row.id !== 'ab-checkout-gift';
    });
    if (rows.length) {
      var last = rows[rows.length - 1];
      return { parent: last.parentNode, before: last.nextSibling };
    }
    var productImages = Array.prototype.slice.call(document.querySelectorAll('app-checkout img')).filter(function (image) {
      if (!image.offsetParent || image.closest('#ab-checkout-gift, header, app-header')) return false;
      var node = image.parentElement;
      for (var i = 0; node && i < 6; i += 1, node = node.parentElement) {
        var text = (node.textContent || '').replace(/\s+/g, ' ');
        if (/৳|ট/.test(text) && /পরিমাণ|ছাড়|ছাড়/.test(text)) return true;
      }
      return false;
    });
    if (productImages.length) {
      var row = productImages[productImages.length - 1];
      while (row.parentElement && row.parentElement.querySelectorAll('img').length === 1) row = row.parentElement;
      return { parent: row.parentNode, before: row.nextSibling };
    }
    var heading = Array.prototype.slice.call(document.querySelectorAll('app-checkout h1, app-checkout h2, app-checkout h3, app-checkout h4, app-checkout p, app-checkout span')).find(function (node) {
      return node.offsetParent && /^মোট\s+আইটেম/i.test((node.textContent || '').replace(/\s+/g, ' ').trim());
    });
    var box = heading && heading.parentElement;
    while (box && box.parentElement && box.querySelectorAll('img').length < 1) box = box.parentElement;
    if (box) {
      var nextBlock = Array.prototype.slice.call(box.children).find(function (child) {
        return child !== heading && child.id !== 'ab-checkout-gift' && /coupon|promo|ভাউচার|প্রোমো|delivery|ডেলিভারি/i.test(child.textContent || '');
      });
      return { parent: box, before: nextBlock || null };
    }
    return null;
  }

  function removeCheckoutGift() {
    var existing = document.getElementById('ab-checkout-gift');
    if (existing) existing.remove();
  }

  function renderCheckoutGift() {
    if (location.pathname.indexOf('/checkout') !== 0 || location.pathname.indexOf('order-success') !== -1) {
      removeCheckoutGift();
      return;
    }
    if (!cartOfferConfig) return;
    cartPageItems().then(function (items) {
      var ids = (items || []).map(cartPageProductId).filter(Boolean);
      if (!ids.length) {
        checkoutGiftRenderKey = '';
        checkoutGiftPendingKey = '';
        removeCheckoutGift();
        return;
      }
      var renderKey = cartItemsSignature(items) + '|' + String(cartOfferConfig.giftMinAmount || '') + '|' + String(cartOfferConfig.giftProduct && cartOfferConfig.giftProduct.slug || '');
      if (checkoutGiftRenderKey === renderKey && document.getElementById('ab-checkout-gift')) return;
      if (checkoutGiftPendingKey === renderKey) return;
      checkoutGiftPendingKey = renderKey;
      fetchProductsByIds(ids).then(function (products) {
        checkoutGiftPendingKey = '';
        var threshold = Number(cartOfferConfig.giftMinAmount) || CART_OFFER_FALLBACK_THRESHOLD;
        var giftSlug = cartOfferConfig.giftProduct && cartOfferConfig.giftProduct.slug;
        var paidProducts = products.filter(function (product) {
          return product && String(product.slug || '') !== String(giftSlug || '');
        });
        var total = cartTotalFromProducts(items, paidProducts);
        var earned = threshold > 0 && total >= threshold;
        if (!earned) {
          checkoutGiftRenderKey = '';
          removeCheckoutGift();
          return;
        }
        warmCartOfferNotebook();
        var notebook = cartOfferNotebook || cartOfferConfig.giftProduct || {};
        if (!notebook.name && !notebook.slug) return;
        var placement = checkoutGiftPlacement();
        if (!placement || !placement.parent) return;
        var gift = document.getElementById('ab-checkout-gift');
        if (!gift) {
          gift = document.createElement('section');
          gift.id = 'ab-checkout-gift';
          gift.setAttribute('aria-live', 'polite');
        }
        if (gift.parentNode !== placement.parent || gift.nextSibling !== placement.before) {
          placement.parent.insertBefore(gift, placement.before);
        }
        var cover = notebookCoverUrl(notebook);
        var pages = String(NOTEBOOK_PAGE_COUNT).replace(/\\d/g, function (digit) { return String.fromCharCode(0x09e6 + Number(digit)); });
        gift.innerHTML =
          '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(notebook.name || 'ফ্রি নোটবুক') + '">' +
          '<div><h3>' + escapeHtml(notebook.name || 'Amol Notebook') + '</h3><p>ফ্রি উপহার · ' + escapeHtml(pages) + ' পৃষ্ঠা</p></div><strong>' + money(0) + '</strong>';
        checkoutGiftRenderKey = renderKey;
      });
    });
  }

  function cartItemsSignature(items) {
    return (items || []).map(function (item) {
      return cartPageProductId(item) + ':' + Math.max(1, Number(item && item.selectedQty) || 1);
    }).filter(Boolean).sort().join('|');
  }

  function fetchProductsByIds(ids) {
    if (!ids.length) return Promise.resolve([]);
    var path = '/product/get-products-by-ids?select=name%20slug%20salePrice%20discountType%20discountAmount%20afterDiscountPrice%20images%20author';
    var bases = [RECOMMENDATION_API_BASE];
    if (CATALOG_API_BASE !== RECOMMENDATION_API_BASE) bases.push(CATALOG_API_BASE);
    return Promise.all(bases.map(function (baseUrl) {
      return fetchJson(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids }),
      }, baseUrl);
    })).then(function (results) {
      var byId = {};
      results.forEach(function (result) {
        var products = result && Array.isArray(result.data) ? result.data : [];
        products.forEach(function (product) {
          if (product && product._id) byId[String(product._id)] = Object.assign({}, byId[String(product._id)] || {}, product);
        });
      });
      return ids.map(function (id) { return byId[String(id)]; }).filter(Boolean);
    });
  }

  function authorName(product) {
    var author = product && product.author;
    return Array.isArray(author) && author[0] ? firstName(author[0]) : firstName(author);
  }

  function enhanceNativeCartRows(items, products) {
    var productsById = {};
    products.forEach(function (product) { productsById[String(product._id)] = product; });
    Array.prototype.slice.call(document.querySelectorAll('.cart-card, .cart-item')).forEach(function (row) {
      if (!row.offsetParent) return;
      var text = (row.textContent || '').replace(/\s+/g, ' ').trim();
      var product = products.find(function (candidate) { return candidate && candidate.name && text.indexOf(candidate.name) !== -1; });
      if (!product) return;
      var target = row.querySelector('.cart-text-info, .cart-text') || row;
      var author = authorName(product);
      var discount = discountPercent(product);
      var authorNode = target.querySelector('.ab-cart-native-author');
      if (!authorNode && author) {
        authorNode = document.createElement('p');
        authorNode.className = 'ab-cart-native-author';
        target.appendChild(authorNode);
      }
      if (authorNode && authorNode.textContent !== author) authorNode.textContent = author;
      var discountNode = target.querySelector('.ab-cart-native-discount');
      if (!discountNode && discount) {
        discountNode = document.createElement('p');
        discountNode.className = 'ab-cart-native-discount';
        target.appendChild(discountNode);
      }
      var discountText = discount + '% ছাড় · ' + money(finalPrice(product)) + ' (আগে ' + money(product.salePrice) + ')';
      if (discountNode && discountNode.textContent !== discountText) discountNode.textContent = discountText;
    });
  }

  function fetchCartCatalogProducts() {
    if (Array.isArray(cartCatalogProducts)) return Promise.resolve(cartCatalogProducts);
    if (cartCatalogProductsPending) return Promise.resolve([]);
    cartCatalogProductsPending = true;
    return fetchJson('/product/get-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish' },
        pagination: { pageSize: 300, currentPage: 0 },
        select: { _id: 1, name: 1, slug: 1, images: 1, salePrice: 1, afterDiscountPrice: 1, discountAmount: 1, discountType: 1, author: 1 },
      }),
    }, API_BASE).then(function (result) {
      cartCatalogProductsPending = false;
      cartCatalogProducts = result && Array.isArray(result.data) ? result.data : [];
      return cartCatalogProducts;
    });
  }

  function cartTotalFromProducts(items, products) {
    var byId = {};
    products.forEach(function (product) { byId[String(product._id)] = product; });
    return (items || []).reduce(function (total, item) {
      var product = byId[cartPageProductId(item)];
      return total + (product ? finalPrice(product) * Math.max(1, Number(item.selectedQty) || 1) : 0);
    }, 0);
  }

  function cartOfferAnchor() {
    return document.querySelector('app-cart-information .section-main, app-cart-information .section-main, .cart-information .section-main') ||
      document.querySelector('.cart-area-main, app-cart .container, app-cart .section-main');
  }

  function banglaNumber(value) {
    var digits = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    return String(value || '').replace(/[০-৯]/g, function (digit) { return digits[digit]; });
  }

  function cartDisplayedTotal() {
    var root = document.querySelector('app-cart-information .section-main, app-cart-information .section-main, .cart-area-main');
    if (!root) return 0;
    var text = banglaNumber(root.textContent || '').replace(/,/g, '');
    var match = text.match(/(?:সর্বমোট\\s*টাকা|মোট\\s*টাকা|Subtotal|Total)\\s*:?\\s*৳?\\s*(\\d+(?:\\.\\d+)?)/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function warmCartOfferNotebook() {
    if (cartOfferNotebook || cartOfferNotebookPending || !cartOfferConfig || !cartOfferConfig.giftProduct || !cartOfferConfig.giftProduct.slug) return;
    cartOfferNotebookPending = true;
    fetchJson('/product/get-by-slug/' + encodeURIComponent(cartOfferConfig.giftProduct.slug), null, API_BASE).then(function (result) {
      cartOfferNotebookPending = false;
      cartOfferNotebook = result && result.data || null;
      renderCartOffer([], []);
      renderCheckoutGift();
    });
  }

  function mountCartOfferSuggestions(host, earned) {
    var existing = document.getElementById('ab-cart-offer-suggestions');
    if (earned) {
      if (existing) existing.remove();
      return;
    }
    if (!host) return;
    function render(products) {
      cartPageItems().then(function (items) {
      var cartIds = {};
      (items || []).forEach(function (item) { cartIds[cartPageProductId(item)] = true; });
      var giftId = String(cartOfferConfig && cartOfferConfig.giftProduct && cartOfferConfig.giftProduct._id || '');
      if (giftId) cartIds[giftId] = true;
      products = (products || []).filter(function (product) {
        var price = finalPrice(product);
        return product && product._id && !cartIds[String(product._id)] && price >= 100 && price <= 200;
      }).sort(function (a, b) {
        return (Number(b.totalSold) || 0) - (Number(a.totalSold) || 0) ||
          (Number(b.priority) || 0) - (Number(a.priority) || 0);
      });
      if (products.length > 3) {
        var seedText = cartItemsSignature(items) + '|' + String(cartOfferSuggestionSeed);
        var seed = 0;
        for (var si = 0; si < seedText.length; si += 1) seed = (seed + seedText.charCodeAt(si)) % products.length;
        products = products.slice(seed).concat(products.slice(0, seed));
      }
      var varied = [];
      var seenTypes = {};
      products.forEach(function (product) {
        var categories = Array.isArray(product.category) ? product.category : [];
        var type = String(categories[0] && (categories[0]._id || categories[0].name) || '');
        if (varied.length >= 3 || !type || seenTypes[type]) return;
        seenTypes[type] = true;
        varied.push(product);
      });
      products = varied.concat(products.filter(function (product) {
        return varied.indexOf(product) === -1;
      })).slice(0, 3);
      if (!products.length || !cartPageOpen()) {
        var old = document.getElementById('ab-cart-offer-suggestions');
        if (old) old.remove();
        return;
      }
      var box = document.getElementById('ab-cart-offer-suggestions');
      if (!box) {
        box = document.createElement('section');
        box.id = 'ab-cart-offer-suggestions';
        host.appendChild(box);
      }
      box.innerHTML = '<h2>এই অফারটি পেতে আরও বই যোগ করুন</h2><div class="ab-cart-offer-books">' + products.map(function (product) {
        var productUrl = '/product-details/' + encodeURIComponent(product.slug || '');
        var title = escapeHtml(product.name || '');
        return '<article class="ab-cart-offer-book" data-product-url="' + productUrl + '"><a class="ab-cart-offer-product-link" href="' + productUrl + '" aria-label="' + title + '"><img src="' + escapeHtml(imageUrl(product.images && product.images[0])) + '" alt="' + escapeHtml(product.name || 'বই') + '"></a><div><a class="ab-cart-offer-product-link" href="' + productUrl + '"><h3>' + title + '</h3></a><p>' + escapeHtml(money(finalPrice(product))) + '</p></div><button class="ab-add-cart-button ab-native-cart-add" type="button" data-product-id="' + escapeHtml(product._id || '') + '">Add to Cart</button></article>';
      }).join('') + '<a id="ab-cart-offer-all-books" href="/product-list">সব বই দেখুন</a></div>';
      });
    }
    if (Array.isArray(cartOfferSuggestionsProducts)) { render(cartOfferSuggestionsProducts); return; }
    if (cartOfferSuggestionsLoading) return;
    cartOfferSuggestionsLoading = true;
    fetchJson('/product/get-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish', quantity: { $gt: 0 } },
        pagination: { pageSize: 80, currentPage: 0 },
        sort: { totalSold: -1, priority: -1 },
        select: { _id: 1, name: 1, slug: 1, images: 1, salePrice: 1, afterDiscountPrice: 1, discountAmount: 1, discountType: 1, category: 1, totalSold: 1, priority: 1 },
      }),
    }, API_BASE).then(function (result) {
      cartOfferSuggestionsLoading = false;
      cartOfferSuggestionsProducts = result && Array.isArray(result.data) ? result.data : [];
      render(cartOfferSuggestionsProducts);
    });
  }

  function renderCartOffer(items, products) {
    if (!cartOfferConfig) return;
    var anchor = cartOfferAnchor();
    if (!anchor) return;
    var threshold = Number(cartOfferConfig.giftMinAmount) || CART_OFFER_FALLBACK_THRESHOLD;
    var total = cartDisplayedTotal() || cartTotalFromProducts(items || [], products || []);
    if (!total) return;
    var remaining = Math.max(0, Math.ceil(threshold - total));
    var progress = document.getElementById('ab-cart-offer-progress');
    if (!progress) {
      progress = document.createElement('section');
      progress.id = 'ab-cart-offer-progress';
      progress.setAttribute('aria-live', 'polite');
      anchor.insertBefore(progress, anchor.firstChild);
    }
    warmCartOfferNotebook();
    var notebook = cartOfferNotebook || {};
    var notebookCover = notebookCoverUrl(notebook);
    var notebookPages = String(NOTEBOOK_PAGE_COUNT).replace(/\\d/g, function (digit) { return String.fromCharCode(0x09e6 + Number(digit)); });
    var notebookImage = '<a class="ab-cart-offer-notebook-link" href="/product-details/' + encodeURIComponent(notebook.slug || cartOfferConfig.giftProduct && cartOfferConfig.giftProduct.slug || '') + '" aria-label="' + escapeHtml((notebook.name || 'ফ্রি নোটবুক') + ' দেখুন') + '"><img class="ab-cart-offer-notebook" src="' + escapeHtml(notebookCover) + '" alt="' + escapeHtml(notebook.name || 'ফ্রি নোটবুক') + '"></a>';
    var earned = remaining === 0;
    var progressMarkup = notebookImage + '<p>' +
      (earned ? '<strong>অভিনন্দন!</strong> আপনার অর্ডারের সঙ্গে <strong>' + escapeHtml(notebookPages) + ' পৃষ্ঠার ফ্রি নোটবুক</strong> উপহার হিসেবে যুক্ত হয়েছে।' : 'আর মাত্র <strong>' + money(remaining) + '</strong> টাকার বই যোগ করুন — পেয়ে যান <strong>' + escapeHtml(notebookPages) + ' পৃষ্ঠার ফ্রি নোটবুক</strong>!') +
      '</p><div class="ab-cart-offer-bar"><div class="ab-cart-offer-fill" style="width:' + Math.min(100, threshold ? Math.round(total * 100 / threshold) : 0) + '%"></div></div>';
    var progressRenderKey = [threshold, total, remaining, notebookCover, notebookPages].join('|');
    if (progress.getAttribute('data-render-key') !== progressRenderKey) {
      progress.innerHTML = progressMarkup;
      progress.setAttribute('data-render-key', progressRenderKey);
    }
    mountCartOfferSuggestions(progress, earned);
    renderCartGiftRow(earned);
  }

  function rememberViewedProduct(product) {
    if (!product || !product._id) return;
    try {
      var ids = JSON.parse(localStorage.getItem(recentlyViewedStorageKey) || '[]');
      ids = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
      ids = [String(product._id)].concat(ids.filter(function (id) { return id !== String(product._id); })).slice(0, 12);
      localStorage.setItem(recentlyViewedStorageKey, JSON.stringify(ids));
    } catch (_) {}
  }

  function renderCartRecentlyViewed(cartItems) {
    var ids;
    try { ids = JSON.parse(localStorage.getItem(recentlyViewedStorageKey) || '[]'); } catch (_) { ids = []; }
    ids = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
    var cartIds = (cartItems || []).map(cartPageProductId);
    ids = ids.filter(function (id) { return cartIds.indexOf(id) === -1; }).slice(0, 4);
    var signature = ids.join('|');
    var existing = document.getElementById('ab-cart-recent');
    if (!ids.length) {
      cartRecentRequestSignature = '';
      cartRecentRequestVersion += 1;
      if (existing) existing.remove();
      return;
    }
    function placeRecentSection(node) {
      /* Angular owns everything inside .page-render and redraws both app-cart
         and app-related-products while cart state settles. Place this shelf at
         the stable route/footer boundary so Angular never removes and recreates it. */
      var routeHost = document.querySelector('app-pages > .page-render');
      if (routeHost && routeHost.parentNode && routeHost.nextElementSibling !== node) {
        routeHost.insertAdjacentElement('afterend', node);
      }
    }
    if (existing && existing.getAttribute('data-product-ids') === signature) {
      placeRecentSection(existing);
      return;
    }
    if (cartRecentRequestSignature === signature) return;
    cartRecentRequestSignature = signature;
    var requestVersion = ++cartRecentRequestVersion;
    fetchProductsByIds(ids).then(function (products) {
      if (requestVersion !== cartRecentRequestVersion) return;
      cartRecentRequestSignature = '';
      if (!products.length || !cartPageOpen()) return;
      var node = document.getElementById('ab-cart-recent');
      if (!node) {
        node = document.createElement('section');
        node.id = 'ab-cart-recent';
      }
      node.setAttribute('data-product-ids', signature);
      node.innerHTML = '<h2>আপনার দেখা বই</h2><div class="ab-cart-recent-grid">' + products.slice(0, 4).map(function (product) {
        return '<article class="ab-cart-recent-card"><img src="' + escapeHtml(imageUrl(product.images && product.images[0])) + '" alt="' + escapeHtml(product.name || 'বই') + '"><h3>' + escapeHtml(product.name || '') + '</h3><p>' + escapeHtml(authorName(product)) + '</p><p class="ab-cart-recent-price">' + escapeHtml(money(finalPrice(product))) + '</p><button class="ab-add-cart-button ab-native-cart-add" type="button" data-product-id="' + escapeHtml(product._id || '') + '">Add to Cart</button></article>';
      }).join('') + '</div>';
      placeRecentSection(node);
    });
  }

  function repairCartPopularProducts() {
    Array.prototype.slice.call(document.querySelectorAll('.kids-book-contents > .kids-book-main.carousel:nth-of-type(2) swiper .swiper-slide:not(.swiper-slide-duplicate), .kids-book-contents > .kids-book-main.carousel:nth-of-type(2) .swiper-slide:not(.swiper-slide-duplicate)')).forEach(function (slide) {
      if (!slide.offsetParent || slide.querySelector('.ab-native-cart-add')) return;
      var link = slide.querySelector('a[href*="product-details"]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var slug = decodeURIComponent((href.split('/product-details/')[1] || '').split(/[?#]/)[0]);
      if (!slug) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ab-native-cart-add';
      button.setAttribute('data-ab-native-product-slug', slug);
      button.textContent = 'Add to Cart';
      slide.appendChild(button);
    });
  }

  function containCartRouteSections() {
    var cartInfo = document.querySelector('app-cart-information');
    if (!cartInfo) return;
    var node = cartInfo.previousElementSibling;
    while (node) {
      node.setAttribute('data-ab-cart-prelude', 'true');
      node = node.previousElementSibling;
    }
    Array.prototype.slice.call(document.querySelectorAll('app-cart app-related-products, app-cart .kids-book-contents, app-cart .products-list, app-cart .related-products')).forEach(function (section) {
      if (!cartInfo.contains(section)) section.setAttribute('data-ab-cart-prelude', 'true');
    });
    var popular = Array.prototype.slice.call(document.querySelectorAll('app-cart app-related-products')).find(function (section) {
      return (section.textContent || '').indexOf('জনপ্রিয় কিছু বই দেখুন') !== -1;
    });
    if (popular) {
      popular.classList.add('ab-cart-popular');
      popular.removeAttribute('data-ab-cart-prelude');
      Array.prototype.slice.call(popular.querySelectorAll('[data-ab-cart-prelude="true"]')).forEach(function (section) {
        section.removeAttribute('data-ab-cart-prelude');
      });
    }
  }

  function repairCartPage() {
    if (!cartPageOpen()) return;
    document.body.classList.add('ab-cart-enhanced');
    mountCartStickyCheckout();
    var cartToast = document.getElementById('amol-cart-toast');
    if (cartToast) cartToast.classList.remove('amol-show');
    placeCartSummaryInsideItems();
    document.querySelectorAll('.cart-area-bottom button').forEach(function (button) {
      var text = (button.textContent || '').replace(/\s+/g, ' ').trim();
      if (/অর্ডার প্রদান করুন/.test(text)) button.textContent = 'অর্ডার করতে এগিয়ে যান';
      if (/ক্রয় চালিয়ে যান/.test(text)) button.textContent = 'আরও ক্রয় করুন';
    });
    repairEmptyCartImage();
    repairCartTrustIcons();
    containCartRouteSections();
    repairCartPopularProducts();
    if (!cartOfferConfig && !cartOfferConfigPending) {
      cartOfferConfigPending = true;
      // Offers are centrally managed in the published order service.  Keep this
      // endpoint on that source even for localhost previews so the cart badge
      // always mirrors the checkout promise and server-side gift rule.
      fetchJson('/order-offer/get', null, API_BASE).then(function (result) {
        cartOfferConfigPending = false;
        cartOfferConfig = normalizeCartOfferConfig(result && result.data);
        warmCartOfferNotebook();
        renderCartOffer([], []);
      });
    }
    cartPageItems().then(function (items) {
      updateNativeCartCount(items);
      var signature = cartItemsSignature(items);
      var ids = (items || []).map(cartPageProductId).filter(Boolean);
      if (!ids.length) {
        renderCartOffer([], []);
        return;
      }
      if (cartNativeProductSignature === signature && cartNativeProducts.length) {
        syncNativeCartPage(items, cartNativeProducts);
        enhanceNativeCartRows(items, cartNativeProducts);
        renderCartOffer(items, cartNativeProducts);
        renderCartRecentlyViewed(items);
        return;
      }
      fetchProductsByIds(ids).then(function (products) {
        if (!cartPageOpen()) return;
        cartNativeProductSignature = signature;
        cartNativeProducts = products;
        syncNativeCartPage(items, products);
        enhanceNativeCartRows(items, products);
        renderCartOffer(items, products);
        renderCartRecentlyViewed(items);
      });
      fetchCartCatalogProducts().then(function (products) {
        if (cartPageOpen()) enhanceNativeCartRows(items, products);
      });
    });
  }

  function removeCategoryLibrary() {
    categoryLibraryVersion += 1;
    if (categoryLibraryObserver) categoryLibraryObserver.disconnect();
    categoryLibraryObserver = null;
    var library = document.getElementById(CATEGORY_LIBRARY_ID);
    if (library) library.remove();
    document.querySelectorAll('app-product-details app-best-selling-book.ab-category-library-source').forEach(function (nativeSection) {
      nativeSection.classList.remove('ab-category-library-source');
    });
    categoryLibraryPage = 0;
    categoryLibraryLoading = false;
    categoryLibraryDone = false;
    categoryLibrarySeen = {};
  }

  function mountCategoryLibrary(product) {
    var nativeSection = document.querySelector('app-product-details app-best-selling-book');
    if (!product || !nativeSection || !nativeSection.parentNode) return;
    var existing = document.getElementById(CATEGORY_LIBRARY_ID);
    if (existing && existing.getAttribute('data-product-slug') === String(product.slug || currentSlug)) {
      if (existing.querySelector('.ab-library-shelf')) {
        nativeSection.classList.add('ab-category-library-source');
        return;
      }
      existing.remove();
    }
    removeCategoryLibrary();
    currentProduct = product;
    categoryLibrarySeen[String(product.slug || currentSlug)] = true;
    var library = document.createElement('section');
    library.id = CATEGORY_LIBRARY_ID;
    library.setAttribute('data-product-slug', String(product.slug || currentSlug));
    library.setAttribute('aria-labelledby', CATEGORY_LIBRARY_ID + '-heading');
    library.innerHTML =
      '<h2 class="ab-library-heading" id="' + CATEGORY_LIBRARY_ID + '-heading">বিষয়ভিত্তিক জনপ্রিয় বই</h2>' +
      '<div class="ab-library-shelves" role="status" aria-live="polite">বইগুলো সাজানো হচ্ছে…</div>';
    nativeSection.parentNode.insertBefore(library, nativeSection);
    nativeSection.classList.add('ab-category-library-source');
    var requestVersion = categoryLibraryVersion;
    var requestSlug = library.getAttribute('data-product-slug');
    fetchCategoryLibraryProducts().then(function (result) {
      var activeLibrary = document.getElementById(CATEGORY_LIBRARY_ID);
      if (!activeLibrary || requestVersion !== categoryLibraryVersion || activeLibrary.getAttribute('data-product-slug') !== requestSlug) return;
      var products = result && Array.isArray(result.data) ? result.data : [];
      var shelves = activeLibrary.querySelector('.ab-library-shelves');
      var html = categoryShelvesHtml(products, product) || fallbackLibraryHtml(products, product);
      if (shelves) shelves.innerHTML = html || '<p class="ab-library-status">বিষয়ভিত্তিক বই পাওয়া যায়নি।</p>';
    });
  }

  function findOverviewSection() {
    var headings = document.querySelectorAll('app-product-details h3');
    for (var i = 0; i < headings.length; i++) {
      var text = (headings[i].textContent || '').replace(/\\s+/g, ' ').trim();
      if (text === 'একনজরে বইয়ের বিবরণ' || text === 'রিভিউ ও রেটিং') {
        var sectionMain = headings[i].closest('.section-main');
        if (sectionMain) return sectionMain;
      }
    }
    return null;
  }

  function activateReviewSection(overview) {
    if (!overview) return;
    var buttons = overview.querySelectorAll('.product-menu button');
    var reviewButton = null;
    for (var i = 0; i < buttons.length; i++) {
      if ((buttons[i].textContent || '').trim() === 'রিভিউ') reviewButton = buttons[i];
    }
    if (!overview.querySelector('app-all-reviews') && reviewButton) {
      reviewButton.click();
      window.setTimeout(function () { activateReviewSection(overview); }, 180);
      return;
    }
    if (!overview.querySelector('app-all-reviews')) return;
    overview.classList.add('ab-review-section');
    var heading = overview.querySelector(':scope > .section-title h3');
    if (heading) heading.textContent = 'রিভিউ ও রেটিং';
    repairReviewImages(overview);
    window.setTimeout(function () { repairReviewImages(overview); }, 300);
  }

  function isPlaceholderReviewImage(src) {
    return /dummy-image|user-young|avatar|placeholder|no-image/i.test(src || '');
  }

  function normalizeReviewImageSrc(src) {
    var value = String(src || '').trim();
    if (!value || isPlaceholderReviewImage(value)) return value;
    if (/^https?:\\/\\//i.test(value)) return value;
    if (value.indexOf('/api/upload/images/') === 0) {
      return 'https://apisub.amolbooks.com' + value;
    }
    if (value.indexOf('api/upload/images/') === 0) {
      return 'https://apisub.amolbooks.com/' + value;
    }
    if (value.indexOf('/upload/images/') === 0) {
      return 'https://apisub.amolbooks.com/api' + value;
    }
    if (value.indexOf('upload/images/') === 0) {
      return 'https://apisub.amolbooks.com/api/' + value;
    }
    return value;
  }

  function markReviewImageBroken(img) {
    if (!img) return;
    img.setAttribute('data-ab-review-image-broken', 'true');
    var wrapper = img.closest('lightgallery') || img.closest('.review-product-img-main') || img.parentElement;
    if (wrapper) wrapper.setAttribute('data-ab-review-image-empty', 'true');
    var area = img.closest('.review-product-image-area');
    if (area) {
      var visibleImages = area.querySelectorAll('img:not([data-ab-review-image-broken="true"])');
      if (!visibleImages.length) area.setAttribute('data-ab-review-image-empty', 'true');
    }
  }

  function repairReviewImages(scope) {
    var root = scope || document;
    root.querySelectorAll('.review-product-image-area img, .review-product-img-main img, lightgallery img').forEach(function (img) {
      var rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
      var currentSrc = img.currentSrc || img.src || rawSrc;
      if (isPlaceholderReviewImage(rawSrc) || isPlaceholderReviewImage(currentSrc)) {
        markReviewImageBroken(img);
        return;
      }
      var normalizedSrc = normalizeReviewImageSrc(rawSrc || currentSrc);
      if (normalizedSrc && normalizedSrc !== rawSrc && normalizedSrc !== currentSrc) {
        img.setAttribute('src', normalizedSrc);
      }
      if (img.complete && img.naturalWidth === 0) {
        markReviewImageBroken(img);
        return;
      }
      if (!img.getAttribute('data-ab-review-image-watch')) {
        img.setAttribute('data-ab-review-image-watch', 'true');
        img.addEventListener('error', function () {
          markReviewImageBroken(img);
        });
      }
    });
  }

  function restoreOverview() {
    document.querySelectorAll('app-product-details .ab-review-section').forEach(function (overview) {
      overview.classList.remove('ab-review-section');
      var heading = overview.querySelector(':scope > .section-title h3');
      if (heading) heading.textContent = 'একনজরে বইয়ের বিবরণ';
    });
  }

  function moveBoughtTogetherBelowRecommendations(root) {
    if (!root) return;
    var recommendation = root.querySelector('.ab-recommendation-section');
    var component = document.querySelector('app-product-details app-bought-together');
    var sectionMain = component && (component.closest('.section-main') || component);
    if (!recommendation || !sectionMain || sectionMain === root) return;

    if (!boughtTogetherPlaceholder || !boughtTogetherPlaceholder.isConnected) {
      boughtTogetherPlaceholder = document.createComment('ab-bought-together-home');
      sectionMain.parentNode.insertBefore(boughtTogetherPlaceholder, sectionMain);
    }

    movedBoughtTogetherSection = sectionMain;
    sectionMain.classList.add('ab-bought-together-section');
    /* mount() runs repeatedly as Angular updates the page. Re-inserting an
       already correctly placed native component restarts its hover state. */
    if (recommendation.nextElementSibling !== sectionMain) {
      recommendation.insertAdjacentElement('afterend', sectionMain);
    }
  }

  function restoreBoughtTogetherSection() {
    if (movedBoughtTogetherSection) {
      movedBoughtTogetherSection.classList.remove('ab-bought-together-section');
      if (boughtTogetherPlaceholder && boughtTogetherPlaceholder.parentNode) {
        boughtTogetherPlaceholder.parentNode.insertBefore(
          movedBoughtTogetherSection,
          boughtTogetherPlaceholder.nextSibling,
        );
        boughtTogetherPlaceholder.remove();
      }
    }
    boughtTogetherPlaceholder = null;
    movedBoughtTogetherSection = null;
  }

  function removeMountedSections() {
    restoreBoughtTogetherSection();
    removeCategoryLibrary();
    var root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    restoreOverview();
    currentProduct = null;
  }

  function renderProductSections(product, authors, recommendations, overview, version) {
    if (version !== renderVersion || getSlug() !== currentSlug || !overview || !overview.isConnected) return;
    removeMountedSections();
    currentProduct = product;
    rememberViewedProduct(product);
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-product-slug', currentSlug);

    var summaryValue = product.shortDescription || product.description || '';
    var descriptionValue = product.description || '';
    var summary = safeRichHtml(summaryValue);
    var description = descriptionValue && plainText(descriptionValue) !== plainText(summaryValue)
      ? safeRichHtml(descriptionValue)
      : '';

    var html = productFactsHtml(product);
    if (summary) html += section('সারসংক্ষেপ', '<div class="ab-rich-text">' + summary + '</div>', 'ab-summary-section');
    if (description) html += section('বিবরণ', '<div class="ab-rich-text">' + description + '</div>', 'ab-description-section');
    if (authors.length) {
      html += section('লেখক পরিচিতি', '<div class="ab-author-list">' + authors.map(function (entry) {
        return authorHtml(entry.detail, entry.fallback);
      }).join('') + '</div>', 'ab-author-section');
    }
    html += recommendationsHtml(recommendations);
    root.innerHTML = html;
    overview.parentNode.insertBefore(root, overview);
    hydrateAuthorImages(root);
    moveBoughtTogetherBelowRecommendations(root);
    repairDeliveryIcons();
    mountCategoryLibrary(product);
    activateReviewSection(overview);
  }

  function loadAndRender(overview, slug, version) {
    fetchJson('/product/get-by-slug/' + encodeURIComponent(slug), null, CATALOG_API_BASE).then(function (productResult) {
      if (version !== renderVersion) return;
      if (!productResult || !productResult.data) {
        loadingSlug = '';
        return;
      }
      var product = productResult.data;
      var authorRefs = Array.isArray(product.author) ? product.author.filter(Boolean) : [];
      var authorRequests = authorRefs.map(function (author) {
        if (!author._id) return Promise.resolve({ detail: author, fallback: author });
        return fetchJson('/author/' + encodeURIComponent(author._id), { cache: 'no-store' }, CATALOG_API_BASE).then(function (result) {
          return { detail: result && result.data || author, fallback: author };
        });
      });
      Promise.all([
        Promise.all(authorRequests),
        recommendations(product, slug),
      ]).then(function (results) {
        if (version === renderVersion) loadingSlug = '';
        renderProductSections(product, results[0] || [], results[1], overview, version);
      });
    });
  }

  function mount() {
    installStyle();
    document.body.classList.toggle('ab-product-enhanced', isProductPage());
    mountStickyCommerce();
    mountStickyProductActions();
    repairCheckoutJourney();
    if (cartPageOpen()) {
      repairCartPage();
      renderCartPage();
      return;
    }
    document.body.classList.remove('ab-cart-enhanced');
    mountCartStickyCheckout();
    cartRecentRequestSignature = '';
    cartRecentRequestVersion += 1;
    var cartRecent = document.getElementById('ab-cart-recent');
    if (cartRecent) cartRecent.remove();
    renderCartPage();
    repairDeliveryIcons();
    repairProductActionLabels();
    if (!isProductPage()) {
      if (currentSlug) {
        currentSlug = '';
        loadingSlug = '';
        renderVersion += 1;
        removeMountedSections();
      }
      return;
    }
    var slug = getSlug();
    var overview = findOverviewSection();
    if (!slug || !overview) return;
    var existing = document.getElementById(ROOT_ID);
    if (slug === currentSlug && loadingSlug === slug) return;
    if (slug === currentSlug && existing && existing.getAttribute('data-product-slug') === slug) {
      moveBoughtTogetherBelowRecommendations(existing);
      mountCategoryLibrary(currentProduct);
      activateReviewSection(overview);
      repairReviewImages(overview);
      return;
    }
    currentSlug = slug;
    loadingSlug = slug;
    renderVersion += 1;
    removeMountedSections();
    loadAndRender(overview, slug, renderVersion);
  }

  function scheduleMount() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      mount();
      repairReviewImages(document);
    }, 120);
  }

  document.addEventListener('click', function (event) {
    var offerProductLink = event.target && event.target.closest &&
      event.target.closest('#ab-cart-offer-suggestions a.ab-cart-offer-product-link[href]');
    var offerProductCard = event.target && event.target.closest &&
      event.target.closest('#ab-cart-offer-suggestions .ab-cart-offer-book[data-product-url]');
    if (!offerProductLink && (!offerProductCard || event.target.closest('button'))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = offerProductLink ? offerProductLink.href : offerProductCard.getAttribute('data-product-url');
  }, true);

  document.addEventListener('click', function (event) {
    var nativeTrackedButton = nativeAddToCartButton(event.target);
    if (nativeTrackedButton) {
      window.setTimeout(function () {
        pushAddToCartTracking(nativeAddToCartMeta(nativeTrackedButton), 1);
      }, 0);
    }

    var stickyCatalogue = event.target && event.target.closest && event.target.closest('.ab-sticky-catalogue');
    if (stickyCatalogue) {
      event.preventDefault();
      openNativeCatalogue();
      return;
    }

    var stickyCartButton = event.target && event.target.closest && event.target.closest('.ab-sticky-cart');
    if (stickyCartButton) {
      event.preventDefault();
      openCartPage();
      return;
    }

    var stickyProductBuy = event.target && event.target.closest && event.target.closest('.ab-sticky-product-buy');
    if (stickyProductBuy) {
      event.preventDefault();
      event.stopPropagation();
      clickNativeProductAction('buy-now');
      return;
    }

    var stickyProductAdd = event.target && event.target.closest && event.target.closest('.ab-sticky-product-add');
    if (stickyProductAdd) {
      event.preventDefault();
      event.stopPropagation();
      clickNativeProductAction('cart');
      return;
    }

    var stickyProductGo = event.target && event.target.closest && event.target.closest('.ab-sticky-product-go-cart, [data-ab-added-cart-go]');
    if (stickyProductGo) {
      event.preventDefault();
      event.stopPropagation();
      openCartPage();
      return;
    }

    var cartStickyCheckout = event.target && event.target.closest && event.target.closest('[data-ab-cart-sticky-checkout]');
    if (cartStickyCheckout) {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign('/checkout');
      return;
    }

    var closeAddedCartModal = event.target && event.target.closest && event.target.closest('[data-ab-added-cart-close]');
    if (closeAddedCartModal || event.target && event.target.id === 'ab-added-cart-modal') {
      event.preventDefault();
      var modal = document.getElementById('ab-added-cart-modal');
      if (modal) modal.remove();
      return;
    }

    var checkoutLink = event.target && event.target.closest && event.target.closest('.cart-area-bottom button, .cart-area-bottom a');
    var checkoutText = checkoutLink && (checkoutLink.textContent || '').replace(/\s+/g, ' ').trim();
    if (cartPageOpen() && checkoutLink && /অর্ডার (?:করতে এগিয়ে যান|প্রদান করুন)|checkout/i.test(checkoutText)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign('/checkout');
      return;
    }

    var cartPageClose = event.target && event.target.closest && event.target.closest('[data-ab-cart-page-close]');
    if (cartPageClose) {
      event.preventDefault();
      closeCartPage();
      return;
    }

    var cartPageOperation = event.target && event.target.closest && event.target.closest('[data-ab-cart-page-op]');
    if (cartPageOperation) {
      var cartPageRow = cartPageOperation.closest('.ab-cart-page-item');
      var cartPageProduct = cartPageRow && cartPageRow.getAttribute('data-product-id');
      if (cartPageProduct) {
        event.preventDefault();
        var operation = cartPageOperation.getAttribute('data-ab-cart-page-op');
        if (cartAuthorization()) updateAuthenticatedCartItem(cartPageProduct, operation);
        else updateGuestCartItem(cartPageProduct, operation);
        window.setTimeout(function () {
          syncLiveCartUi();
          renderCartPage();
        }, 180);
      }
      return;
    }

    var cartOperation = event.target && event.target.closest && event.target.closest('[data-ab-cart-op]');
    if (cartOperation) {
      var cartRow = cartOperation.closest('.ab-live-cart-item');
      if (cartRow) {
        event.preventDefault();
        event.stopPropagation();
        updateGuestCartItem(cartRow.getAttribute('data-product-id'), cartOperation.getAttribute('data-ab-cart-op'));
      }
      return;
    }

    var nativeBuyButton = event.target && event.target.closest &&
      event.target.closest('app-product-details .product-action-btn button[data-ab-action-label="buy-now"]');
    if (nativeBuyButton) finishBuyNowCheckout();

    var nativeCartButton = event.target && event.target.closest &&
      event.target.closest('app-product-details .product-action-btn button[data-ab-action-label="cart"]');
    if (nativeCartButton) {
      var cartLabel = (nativeCartButton.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Go to Cart(?: Page)?$/i.test(cartLabel)) {
        event.preventDefault();
        event.stopPropagation();
        openCartPage();
        return;
      }
      mainCartClickedSlug = currentSlug;
      nativeCartButton.setAttribute('data-ab-cart-clicked', 'true');
      window.setTimeout(function () {
        nativeCartButton.textContent = 'Go to Cart';
        pulseStickyCart();
        updateStickyProductActions();
      }, 0);
    }

    var bottomCart = event.target && event.target.closest && event.target.closest('.bottom-nav li');
    if (bottomCart && bottomCart.querySelector('.fa-shopping-bag')) {
      if (!cartAuthorization()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (cartPageOpen()) window.location.reload();
        else window.location.assign('/cart');
        return;
      }
      window.setTimeout(syncAuthenticatedCartUi, 80);
    }

    var button = event.target && event.target.closest && event.target.closest('.ab-add-cart-button');
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.location.hostname === 'localhost' && button.closest('#ab-cart-offer-suggestions')) {
        addGuestProductToCart(button.getAttribute('data-product-id'), button);
        return;
      }
      addProductToCart(button.getAttribute('data-product-id'), button);
      return;
    }

    var nativeCartAdd = event.target && event.target.closest && event.target.closest('.ab-native-cart-add[data-ab-native-product-slug]');
    if (!nativeCartAdd) return;
    event.preventDefault();
    event.stopPropagation();
    var nativeSlug = nativeCartAdd.getAttribute('data-ab-native-product-slug');
    if (!nativeSlug) return;
    nativeCartAdd.disabled = true;
    nativeCartAdd.textContent = 'Adding…';
    fetchJson('/product/get-by-slug/' + encodeURIComponent(nativeSlug), null, CATALOG_API_BASE).then(function (result) {
      var product = result && result.data;
      if (product && product._id) {
        nativeCartAdd.textContent = 'Add to Cart';
        nativeCartAdd.disabled = false;
        if (window.location.hostname === 'localhost') addGuestProductToCart(product._id, nativeCartAdd);
        else addProductToCart(product._id, nativeCartAdd);
      }
      else {
        nativeCartAdd.textContent = 'Add to Cart';
        nativeCartAdd.disabled = false;
      }
    });
  }, true);

  document.addEventListener('input', function (event) {
    var stickySearch = event.target && event.target.matches && event.target.matches('.ab-sticky-search') ? event.target : null;
    if (!stickySearch) return;
    syncNativeSearchValue(stickySearch.value);
    scheduleStickyProductSearch(stickySearch.value);
  }, true);

  document.addEventListener('keydown', function (event) {
    var stickySearch = event.target && event.target.matches && event.target.matches('.ab-sticky-search') ? event.target : null;
    if (!stickySearch || event.key !== 'Enter') return;
    event.preventDefault();
    hideStickySearchResults();
    submitNativeSearch(stickySearch.value);
  }, true);

  document.addEventListener('search', function (event) {
    var stickySearch = event.target && event.target.matches && event.target.matches('.ab-sticky-search') ? event.target : null;
    if (!stickySearch) return;
    event.preventDefault();
    hideStickySearchResults();
    submitNativeSearch(stickySearch.value);
  }, true);

  document.addEventListener('change', function (event) {
    var stickySearch = event.target && event.target.matches && event.target.matches('.ab-sticky-search') ? event.target : null;
    if (!stickySearch) return;
    syncNativeSearchValue(stickySearch.value);
    scheduleStickyProductSearch(stickySearch.value);
  }, true);

  document.addEventListener('focusin', function (event) {
    var stickySearch = event.target && event.target.matches && event.target.matches('.ab-sticky-search') ? event.target : null;
    if (!stickySearch || !String(stickySearch.value || '').trim()) return;
    scheduleStickyProductSearch(stickySearch.value);
  }, true);

  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('#ab-sticky-commerce .ab-sticky-search-wrap')) return;
    hideStickySearchResults();
  }, true);

  installStyle();
  installCartAuthorizationBridge();
  scheduleMount();
  window.addEventListener('scroll', mountStickyCommerce, { passive: true });
  window.addEventListener('scroll', mountStickyProductActions, { passive: true });
  window.addEventListener('resize', function () {
    syncCartPageFrame(document.getElementById('ab-cart-page'));
  }, { passive: true });
  window.addEventListener('ab-cart-updated', function () {
    updateStickyCartCount();
    updateStickyProductActions();
    if (cartPageOpen()) renderCartPage(true);
  });
  window.addEventListener('amol-cart-added', function (event) {
    pulseStickyCart();
    updateStickyProductActions();
    if (Date.now() < suppressAddedCartModalUntil) {
      clearCartAddedFeedback();
      return;
    }
    showAddedCartModal(event && event.detail && event.detail.product);
  });
  window.addEventListener('ab-cart-authorization', function () {
    mergeGuestCartIntoAuthenticatedCart();
  });
  window.setInterval(mount, 900);
  observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', scheduleMount);
  window.addEventListener('hashchange', scheduleMount);
})();
`;
