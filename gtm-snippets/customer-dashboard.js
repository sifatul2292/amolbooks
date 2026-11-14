/* Customer dashboard (owner, 2026-11-13: "make the customer dashboard much more polish for both
   desktop and mobile ... they can see their previous order and their review is pending").
   Loaded on /account pages by gtm-snippets/customer-dashboard-loader.html, served by the API at
   /api/storefront-page/customer-dashboard.js. The storefront (compiled Angular, no source) keeps
   the login, routes and dialogs; this draws:
     - the account menu (sidebar on desktop, profile card + tabs on mobile),
     - সারসংক্ষেপ (/account/profile): profile, numbers, latest orders, reviews, addresses,
     - আমার অর্ডার (/account/orders): order cards with progress, books and review state,
     - আমার রিভিউ (/account/review): reviews with "pending" / "published".
   Other account pages (wishlist, notifications, ...) stay the storefront's own, in the same layout.
   Data comes from the customer's own API calls (the login token the storefront sends, captured by
   customer-account-mobile.html). Nothing here changes an order. */
(function () {
  'use strict';
  if (window.__abCustomerDashboardApp) return;
  window.__abCustomerDashboardApp = true;

  var host = location.hostname;
  var LOCAL = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(host) ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || /\.trycloudflare\.com$/.test(host);
  var API = LOCAL ? location.origin + '/api' : 'https://apisub.amolbooks.com/api';
  var BN = '০১২৩৪৫৬৭৮৯';
  var MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var VIEWS = { '/account': 'home', '/account/profile': 'home', '/account/orders': 'orders', '/account/review': 'reviews' };
  var NAV = [
    { route: '/account/profile', label: 'সারসংক্ষেপ', icon: 'home' },
    { route: '/account/orders', label: 'আমার অর্ডার', icon: 'bag', count: 'orders' },
    { route: '/account/review', label: 'আমার রিভিউ', icon: 'star', count: 'reviews' },
    { route: '/account/wishlist', label: 'উইশলিস্ট', icon: 'heart' },
    { route: '/account/notification', label: 'নোটিফিকেশন', icon: 'bell' },
    { action: 'address', label: 'ঠিকানা', icon: 'pin' },
    { action: 'logout', label: 'লগআউট', icon: 'out' },
  ];
  // orderStatus → [label, tone]. Steps: 0 placed, 1 confirmed, 2 on the way, 3 delivered.
  var STATUS = {
    0: ['অপেক্ষমাণ', 'wait'], 1: ['অর্ডার গ্রহণ করা হয়েছে', 'wait'], 2: ['অর্ডার নিশ্চিত', 'ok'],
    3: ['প্যাকিং চলছে', 'ok'], 4: ['পাঠানো হয়েছে', 'way'], 5: ['ডেলিভারি সম্পন্ন', 'done'],
    6: ['বাতিল হয়েছে', 'bad'], 7: ['রিফান্ড হয়েছে', 'bad'], 8: ['কুরিয়ারে আছে', 'way'],
    9: ['ফেরত এসেছে', 'bad'], 10: ['অপেক্ষায় রাখা হয়েছে', 'wait'],
  };
  var STEP = { 0: 0, 1: 0, 10: 0, 2: 1, 3: 1, 4: 2, 8: 2, 5: 3 };
  var STEPS = ['অর্ডার', 'নিশ্চিত', 'পথে', 'পৌঁছেছে'];
  // Icons drawn inline (24×24 outlines): they show at once, with no icon font to download.
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    bag: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.3C1.5 8 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.5 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4"/><path d="M5 12h10"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  };
  function icon(name) {
    return '<svg class="abd-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }
  var FILTERS = [['all', 'সব'], ['active', 'চলমান'], ['done', 'পৌঁছেছে'], ['closed', 'বাতিল / ফেরত']];

  var state = { user: null, orders: null, reviews: null, addresses: null, links: {}, error: '', loadedAt: 0, loading: null, filter: 'all' };
  var side = null;
  var main = null;

  /* ---------- small helpers ---------- */
  function bn(value) { return String(value).replace(/\d/g, function (d) { return BN[Number(d)]; }); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(value) { return '৳' + bn(Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-IN')); }
  function day(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return bn(date.getDate()) + ' ' + MONTHS[date.getMonth()] + ' ' + bn(date.getFullYear());
  }
  function initials(name) {
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.length ? words.slice(0, 2).map(function (w) { return w.charAt(0); }).join('') : 'আ';
  }
  function image(src) {
    var url = String(src || '');
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    return 'https://apisub.amolbooks.com/' + url.replace(/^\/+/, '');
  }
  function read(key) { try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; } }
  function view() { return VIEWS[location.pathname.replace(/\/+$/, '') || '/account'] || ''; }
  function onAccount() { return /^\/account(?:\/|$)/.test(location.pathname); }
  // English headings on the storefront's own account pages.
  var HEADINGS = { 'My Notifications': 'নোটিফিকেশন', 'My Transactions': 'আমার লেনদেন', 'My Following Authors': 'অনুসরণ করা লেখক', 'My Gift List': 'উইশলিস্ট' };
  function translateHeadings() {
    Array.prototype.forEach.call(document.querySelectorAll('app-account .account-right h3'), function (h) {
      var bengali = HEADINGS[String(h.textContent || '').trim()];
      if (bengali) h.textContent = bengali;
    });
  }

  /* ---------- styles ---------- */
  var css = [
    'html.ab-dash-on app-account .account-left,html.ab-dash-on .ab-account-hub,html.ab-dash-on app-account .mobile-bar{display:none!important}',
    // The storefront's own account styles are more specific (component attributes), so the layout uses !important.
    'html.ab-dash-on app-account .account-main{display:grid!important;grid-template-columns:260px minmax(0,1fr)!important;gap:24px!important;align-items:start!important;padding:20px 0 32px!important;margin:0!important;width:100%!important;max-width:100%!important;min-width:0!important}',
    'html.ab-dash-on app-account .account-right{grid-column:2!important;grid-row:1!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;background:#fff;border:1px solid #e6ece8;border-radius:16px;padding:16px!important;box-shadow:0 1px 3px rgba(16,40,26,.05);overflow-x:auto}',
    'html.ab-dash-own app-account .account-right{display:none!important}',
    // The storefront's own pages (wishlist, notifications, ...) sit in our card: no second frame inside it.
    'html.ab-dash-on app-account .account-right .section-main{box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;background:none!important;max-width:100%!important}',
    'html.ab-dash-on app-account .account-right .section-top h3,html.ab-dash-on app-account .account-right .section-main > h3{font-size:1.25rem!important;font-weight:700!important;line-height:1.3!important;margin:0 0 12px!important;color:#1f2a24!important}',
    'html.ab-dash-on app-account .account-right img{max-width:100%;height:auto}',
    'html.ab-dash-on:not(.ab-dash-own) #ab-dash-main{display:none}',
    '#ab-dash-side,#ab-dash-main{color:#1f2a24;font-size:16px;line-height:1.55}',
    '#ab-dash-side *,#ab-dash-main *{box-sizing:border-box}',
    '#ab-dash-side{grid-column:1!important;grid-row:1!important;position:sticky;top:96px;min-width:0;background:#fff;border:1px solid #e6ece8;border-radius:16px;padding:18px;box-shadow:0 1px 3px rgba(16,40,26,.05)}',
    '#ab-dash-main{grid-column:2!important;grid-row:1!important;min-width:0}',
    '.abd-me{display:flex;align-items:center;gap:12px;padding-bottom:14px;margin-bottom:10px;border-bottom:1px solid #edf1ee}',
    '.abd-avatar{width:52px;height:52px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;background:#e7f4ec;color:#0f5c31;font-weight:700;font-size:1.2rem;overflow:hidden}',
    '.abd-avatar img{width:100%;height:100%;object-fit:cover}',
    '.abd-me-text{min-width:0}',
    '.abd-me-text strong{display:block;font-size:1.05rem;line-height:1.3;word-break:break-word}',
    '.abd-me-text span{display:block;color:#5d6b63;font-size:.9rem}',
    '.abd-nav{display:flex;flex-direction:column;gap:2px;margin:0;padding:0}',
    '.abd-nav a,.abd-nav button{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:10px;background:none;color:#2b3a31;font:inherit;font-size:.98rem;text-align:left;text-decoration:none;cursor:pointer}',
    '.abd-nav a:hover,.abd-nav button:hover{background:#f2f7f4}',
    '.abd-nav a[aria-current=page]{background:#e7f4ec;color:#0f5c31;font-weight:700}',
    '.abd-ic{width:20px;height:20px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;display:block}',
    '.abd-nav .abd-ic{color:#168747}',
    '.abd-btn .abd-ic{width:17px;height:17px}',
    '.abd-nav .abd-count{margin-left:auto;background:#eef2ef;color:#41524a;border-radius:999px;padding:0 8px;font-size:.8rem;line-height:1.6}',
    '.abd-nav .abd-out{color:#a61b1b}.abd-nav .abd-out .abd-ic{color:#a61b1b}',
    '.abd-title{font-size:1.4rem;line-height:1.3;margin:2px 0 14px;font-weight:700}',
    '.abd-card{background:#fff;border:1px solid #e6ece8;border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(16,40,26,.05)}',
    // Books to buy next and "আবার কিনুন" (owner, 2026-11-14: buy more along the way).
    '.abd-shelf{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px}',
    '.abd-pick{display:flex;flex-direction:column;gap:4px;text-decoration:none!important;color:inherit;border:1px solid #e6ece8;border-radius:12px;padding:8px;background:#fff;min-width:0}',
    '.abd-pick:hover{border-color:#bfe0cc;box-shadow:0 2px 8px rgba(16,40,26,.08)}',
    '.abd-pick img,.abd-pick .abd-blank{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#f1f4f2;display:block}',
    '.abd-pick .abd-pick-cover{position:relative;display:block;overflow:hidden;border-radius:8px}',
    '.abd-pick b{font-size:.9rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px;color:#1d2a22}',
    '.abd-pick small{color:#5b6b62;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.abd-pick .abd-price{font-weight:700;color:#168747}',
    '.abd-pick .abd-price s{color:#98a39c;font-weight:400;font-size:.8rem;margin-left:4px}',
    '.abd-pick .abd-buy{margin-top:auto;text-align:center;background:#ea2929;color:#fff;border-radius:8px;padding:7px 6px;font-weight:700;font-size:.88rem}',
    '.abd-again{display:inline-block;margin-top:4px;margin-left:8px;color:#ea2929!important;font-weight:700;font-size:.85rem;text-decoration:none}',
    '.abd-again:hover{text-decoration:underline}',
    '@media (max-width:991px){.abd-shelf{grid-template-columns:repeat(3,minmax(0,1fr))!important}}',
    '@media (max-width:640px){.abd-shelf{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}}',
    '.abd-card h2{font-size:1.1rem;margin:0;font-weight:700}',
    '.abd-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}',
    '.abd-head a,.abd-link{color:#168747;font-weight:600;text-decoration:none;font-size:.95rem;background:none;border:0;font-family:inherit;cursor:pointer;padding:0}',
    '.abd-head a:hover,.abd-link:hover{text-decoration:underline}',
    '.abd-hello{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
    '.abd-hello .abd-avatar{width:60px;height:60px;font-size:1.35rem}',
    '.abd-hello-text{flex:1 1 200px;min-width:0}',
    '.abd-hello-text strong{display:block;font-size:1.25rem;line-height:1.3}',
    '.abd-hello-text span{color:#5d6b63;font-size:.95rem}',
    '.abd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:8px 16px;border-radius:10px;border:1px solid #168747;background:#fff;color:#168747;font:inherit;font-weight:600;font-size:.95rem;text-decoration:none;cursor:pointer;white-space:nowrap}',
    '.abd-btn:hover{background:#f2f7f4}',
    '.abd-btn.solid{background:#168747;color:#fff}.abd-btn.solid:hover{background:#0f6e3a}',
    '.abd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}',
    '.abd-stat{background:#fff;border:1px solid #e6ece8;border-radius:14px;padding:14px;text-decoration:none;color:inherit;display:block}',
    '.abd-stat:hover{border-color:#bfe0cc}',
    '.abd-stat b{display:block;font-size:1.6rem;line-height:1.2;color:#0f5c31}',
    '.abd-stat span{color:#5d6b63;font-size:.9rem}',
    '.abd-banner{display:flex;gap:12px;align-items:flex-start;background:#eef8f2;border:1px solid #cfe6d8;border-radius:14px;padding:14px;margin-bottom:16px;color:#0f5c31}',
    '.abd-banner b{display:block}.abd-banner p{margin:2px 0 0;color:#2f4a3b;font-size:.95rem}',
    '.abd-banner .abd-x{margin-left:auto;border:0;background:none;color:#0f5c31;font-size:1.3rem;line-height:1;cursor:pointer;padding:0 4px}',
    '.abd-order{border:1px solid #e6ece8;border-radius:14px;padding:14px;margin-bottom:12px;background:#fff}',
    '.abd-order:last-child{margin-bottom:0}',
    '.abd-order-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-bottom:10px}',
    '.abd-order-top strong{font-size:1.02rem}',
    '.abd-order-top .abd-date{color:#5d6b63;font-size:.9rem}',
    '.abd-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 10px;font-size:.82rem;font-weight:600;line-height:1.6;white-space:nowrap}',
    '.abd-pill.wait{background:#fff6e5;color:#8a5300}.abd-pill.ok{background:#eaf2fc;color:#1d4f8a}.abd-pill.way{background:#eaf2fc;color:#1d4f8a}',
    '.abd-pill.done{background:#e7f4ec;color:#0f5c31}.abd-pill.bad{background:#fff1f0;color:#a61b1b}',
    '.abd-order-top .abd-pill{margin-left:auto}',
    '.abd-steps{display:grid;grid-template-columns:repeat(4,1fr);margin:4px 0 14px;position:relative}',
    '.abd-steps li{list-style:none;text-align:center;font-size:.78rem;color:#7b8a82;position:relative;padding-top:18px}',
    '.abd-steps li:before{content:"";position:absolute;top:4px;left:50%;transform:translateX(-50%);width:12px;height:12px;border-radius:50%;background:#dfe7e2;z-index:1}',
    '.abd-steps li:after{content:"";position:absolute;top:9px;left:-50%;width:100%;height:2px;background:#dfe7e2}',
    '.abd-steps li:first-child:after{display:none}',
    '.abd-steps li.on{color:#0f5c31;font-weight:600}.abd-steps li.on:before,.abd-steps li.on:after{background:#168747}',
    '.abd-items{display:flex;flex-direction:column;gap:10px;margin:0;padding:0}',
    '.abd-item{display:flex;gap:12px;align-items:flex-start;list-style:none}',
    '.abd-cover{width:46px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #e6ece8;background:#f3f5f4;flex-shrink:0}',
    '.abd-item-text{flex:1;min-width:0}',
    '.abd-item-text a{color:#1f2a24;text-decoration:none;font-weight:600;line-height:1.35}',
    '.abd-item-text a:hover{color:#168747}',
    '.abd-item-text small{display:block;color:#5d6b63;font-size:.85rem}',
    '.abd-item-text small s{margin-left:6px;color:#8a958f;font-weight:400}',
    '.abd-item .abd-pill,.abd-item .abd-write{margin-top:4px}',
    '.abd-write{display:inline-block;font-size:.85rem;color:#168747;font-weight:600;text-decoration:none}',
    '.abd-order-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:12px;padding-top:12px;border-top:1px dashed #e1e8e4}',
    '.abd-order-foot .abd-total{font-weight:700;font-size:1.05rem}',
    '.abd-order-foot .abd-pay{color:#5d6b63;font-size:.88rem}',
    '.abd-order-foot .abd-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}',
    '.abd-order-foot .abd-btn{min-height:38px;padding:6px 12px;font-size:.9rem}',
    '.abd-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}',
    '.abd-filters button{border:1px solid #d7e2db;background:#fff;color:#2b3a31;border-radius:999px;padding:6px 14px;font:inherit;font-size:.9rem;cursor:pointer}',
    '.abd-filters button[aria-pressed=true]{background:#168747;border-color:#168747;color:#fff}',
    '.abd-review{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #edf1ee}',
    '.abd-review:first-child{padding-top:0}.abd-review:last-child{border-bottom:0;padding-bottom:0}',
    '.abd-review-body{flex:1;min-width:0}',
    '.abd-review-top{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}',
    '.abd-review-top a{color:#1f2a24;font-weight:700;text-decoration:none}',
    '.abd-stars{color:#f5a524;letter-spacing:1px}.abd-stars .off{color:#d9d9d9}',
    '.abd-review p{margin:6px 0 0;white-space:pre-wrap;word-break:break-word;color:#2f3d35}',
    '.abd-review small{display:block;color:#7b8a82;font-size:.82rem;margin-top:4px}',
    '.abd-address{border:1px solid #e6ece8;border-radius:12px;padding:12px;margin-bottom:10px}',
    '.abd-address:last-child{margin-bottom:0}',
    '.abd-address b{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.abd-address .abd-line{display:block;color:#5d6b63;font-size:.92rem}',
    '.abd-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
    '.abd-two .abd-card{margin-bottom:0}',
    '.abd-empty{text-align:center;padding:26px 12px;color:#5d6b63}',
    '.abd-empty b{display:block;color:#1f2a24;font-size:1.05rem;margin-bottom:4px}',
    '.abd-empty .abd-btn{margin-top:12px}',
    '.abd-is-empty .wishlist-area,app-wish-list.abd-is-empty .section-top p{display:none!important}',
    '.abd-skeleton{height:110px;border-radius:14px;background:#eef2ef;margin-bottom:12px}',
    // Small laptops / large tablets in landscape: a narrower menu.
    '@media (min-width:992px) and (max-width:1199px){',
    '  html.ab-dash-on app-account .account-main{grid-template-columns:220px minmax(0,1fr)!important;gap:18px!important}',
    '  #ab-dash-side{padding:14px}',
    '  .abd-nav a,.abd-nav button{padding:9px 10px;gap:10px}',
    '}',
    // Tablets and phones: one column; the menu becomes a scrolling tab bar.
    '@media (max-width:991px){',
    '  html.ab-dash-on app-account .account-main{display:flex!important;flex-direction:column!important;gap:14px!important;padding:12px 0 24px!important}',
    '  #ab-dash-side,#ab-dash-main,html.ab-dash-on app-account .account-right{width:100%!important}',
    '  #ab-dash-side{position:static;padding:8px;border-radius:14px}',
    '  .abd-me{display:none}',
    '  .abd-nav{flex-direction:row;overflow-x:auto;gap:8px;padding:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}',
    '  .abd-nav::-webkit-scrollbar{display:none}',
    '  .abd-nav a,.abd-nav button{width:auto;flex-shrink:0;padding:8px 14px;border:1px solid #dfe8e2;border-radius:999px;font-size:.92rem;gap:8px;white-space:nowrap;scroll-snap-align:start}',
    '  .abd-nav a[aria-current=page]{border-color:#168747;background:#168747;color:#fff}',
    '  .abd-nav a[aria-current=page] .abd-ic{color:#fff}',
    '  .abd-nav .abd-count{display:none}',
    '}',
    // Phones: two numbers per row, cards stacked, full-width buttons.
    '@media (max-width:640px){',
    '  .abd-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '  .abd-two{grid-template-columns:minmax(0,1fr)}',
    '  .abd-two .abd-card{margin-bottom:16px}',
    '  .abd-title{font-size:1.25rem}',
    '  .abd-card{padding:14px;border-radius:14px}',
    '  .abd-order{padding:12px}',
    '  .abd-order-foot .abd-actions{margin-left:0;width:100%}',
    '  .abd-order-foot .abd-actions .abd-btn{flex:1}',
    '  .abd-hello .abd-btn{width:100%}',
    '  html.ab-dash-on app-account .account-right{padding:12px!important;border-radius:14px}',
    '}',
    // Small phones (320-380 px).
    '@media (max-width:380px){',
    '  .abd-stat{padding:10px}',
    '  .abd-stat b{font-size:1.35rem}',
    '  .abd-stat span{font-size:.82rem}',
    '  .abd-hello .abd-avatar{width:48px;height:48px;font-size:1.1rem}',
    '  .abd-hello-text strong{font-size:1.1rem}',
    '  .abd-steps li{font-size:.72rem}',
    '  .abd-cover{width:40px;height:56px}',
    '  .abd-filters button{padding:5px 11px;font-size:.85rem}',
    '  .abd-banner{padding:12px}',
    '}',
  ].join('\n');

  /* ---------- data (the customer's own API calls) ---------- */
  function auth() { return String(window.__abCartAuthorization || ''); }
  function waitForAuth() {
    return new Promise(function (resolve) {
      if (auth()) return resolve(auth());
      var settled = false;
      function done() { if (settled) return; settled = true; resolve(auth()); }
      window.addEventListener('ab-cart-authorization', done, { once: true });
      setTimeout(done, 7000);
    });
  }
  function call(path, body) {
    var headers = { Authorization: auth() };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      });
  }
  function load(force) {
    if (state.loading) return state.loading;
    if (!force && state.loadedAt && Date.now() - state.loadedAt < 60000) return Promise.resolve();
    state.loading = waitForAuth().then(function (token) {
      if (!token) { state.error = 'login'; return; }
      return Promise.all([
        call('/user/logged-in-user-data?select=' + encodeURIComponent('name phoneNo email username profileImg')).then(function (j) { state.user = j.data || {}; }, function () {}),
        call('/order/get-orders-by-user', {
          filter: null, sort: { createdAt: -1 }, pagination: { pageSize: 50, currentPage: 0 },
          select: { orderId: 1, orderStatus: 1, orderedItems: 1, grandTotal: 1, deliveryCharge: 1, createdAt: 1, paymentType: 1, paymentStatus: 1, deliveryDate: 1 },
        }).then(function (j) { state.orders = Array.isArray(j.data) ? j.data : []; }, function () { state.orders = state.orders || []; }),
        call('/review/get-Review-by-user').then(function (j) { state.reviews = Array.isArray(j.data) ? j.data : []; }, function () { state.reviews = state.reviews || []; }),
        call('/user/get-user-address').then(function (j) { state.addresses = Array.isArray(j.data) ? j.data : []; }, function () { state.addresses = state.addresses || []; }),
        // Books to buy next, from their latest order (ReviewRequestService.moreForUser).
        call('/order-review/mine/books').then(function (j) { state.more = Array.isArray(j.data) ? j.data : []; }, function () { state.more = state.more || []; }),
        // Review page links of their orders (ReviewRequestService.linksFor): "রিভিউ দিন" opens the order's page.
        call('/order-review/mine').then(function (j) {
          state.links = {};
          (j.data || []).forEach(function (row) { if (row && row.order && row.token) state.links[row.order] = row.token; });
        }, function () {}),
      ]).then(function () { state.error = ''; state.loadedAt = Date.now(); });
    }).catch(function () { state.error = 'load'; }).then(function () { state.loading = null; render(); });
    return state.loading;
  }

  /* ---------- pieces ---------- */
  function counts() {
    var orders = state.orders || [];
    return {
      orders: orders.length,
      active: orders.filter(function (o) { return STEP[o.orderStatus] !== undefined && o.orderStatus !== 5; }).length,
      done: orders.filter(function (o) { return o.orderStatus === 5; }).length,
      reviews: (state.reviews || []).length,
      pending: (state.reviews || []).filter(function (r) { return r.status !== true; }).length,
    };
  }
  function userName() {
    var user = state.user || {};
    return String(user.name || '').trim() || 'আমার অ্যাকাউন্ট';
  }
  function avatar() {
    var user = state.user || {};
    return '<span class="abd-avatar" aria-hidden="true">' +
      (user.profileImg ? '<img src="' + esc(image(user.profileImg)) + '" alt="">' : esc(initials(user.name))) + '</span>';
  }
  function pill(tone, text) { return '<span class="abd-pill ' + tone + '">' + esc(text) + '</span>'; }
  function stars(rating) {
    var n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return '<span class="abd-stars" aria-label="' + bn(n) + ' তারা">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span></span>';
  }
  function reviewFor(order, item) {
    var reviews = state.reviews || [];
    var id = String(item && item._id || '');
    return reviews.find(function (r) { return r.order && String(r.order._id) === String(order._id) && String(r.product && r.product._id) === id; }) ||
      reviews.find(function (r) { return String(r.product && r.product._id) === id; }) || null;
  }
  function payment(order) {
    if (order.paymentStatus === 'paid') return 'পরিশোধিত';
    return order.paymentType === 'cash_on_delivery' ? 'ক্যাশ অন ডেলিভারি' : 'পেমেন্ট বাকি';
  }

  function orderCard(order) {
    var status = STATUS[order.orderStatus] || ['অর্ডার', 'wait'];
    var step = STEP[order.orderStatus];
    var items = (order.orderedItems || []).filter(function (item) { return item && item.name; });
    var steps = step === undefined ? '' : '<ol class="abd-steps" aria-label="অর্ডারের অবস্থা">' +
      STEPS.map(function (label, n) { return '<li class="' + (n <= step ? 'on' : '') + '">' + esc(label) + '</li>'; }).join('') + '</ol>';
    var list = '<ul class="abd-items">' + items.map(function (item) {
      var review = order.orderStatus === 5 && !item.isGift ? reviewFor(order, item) : null;
      var link = item.slug ? '/product-details/' + encodeURIComponent(item.slug) : '';
      var badge = '';
      if (review) badge = review.status === true ? pill('done', '✓ রিভিউ প্রকাশিত') : pill('wait', 'রিভিউ অনুমোদনের অপেক্ষায়');
      else if (order.orderStatus === 5 && !item.isGift && (link || state.links[order._id])) {
        var write = state.links[order._id] ? '/rate/' + encodeURIComponent(state.links[order._id]) : link;
        badge = '<a class="abd-write" href="' + write + '">✎ রিভিউ দিন</a>';
      }
      // Price the customer paid for one copy (checkout saves it as unitPrice/salePrice after the
      // book's discount); the list price is shown struck through when it was higher.
      var paid = Number(item.unitPrice || item.salePrice || 0);
      var list = Number(item.regularPrice || 0);
      var price = item.isGift ? ' · উপহার'
        : paid ? ' · ' + money(paid) + (list > paid ? '<s>' + money(list) + '</s>' : '') : '';
      // A delivered book can be bought again from its page.
      var again = order.orderStatus === 5 && !item.isGift && link ? '<a class="abd-again" href="' + link + '">আবার কিনুন</a>' : '';
      return '<li class="abd-item">' +
        (item.image ? '<img class="abd-cover" src="' + esc(image(item.image)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="abd-cover"></span>') +
        '<div class="abd-item-text">' + (link ? '<a href="' + link + '">' + esc(item.name) + '</a>' : '<b>' + esc(item.name) + '</b>') +
        '<small>' + bn(item.quantity || 1) + ' কপি' + price + '</small>' + badge + again + '</div></li>';
    }).join('') + '</ul>';
    var active = step !== undefined && order.orderStatus !== 5;
    return '<article class="abd-order">' +
      '<div class="abd-order-top"><strong>অর্ডার #' + esc(bn(order.orderId || '')) + '</strong><span class="abd-date">' + esc(day(order.createdAt)) + '</span>' + pill(status[1], status[0]) + '</div>' +
      steps + list +
      '<div class="abd-order-foot"><span class="abd-total">মোট ' + money(order.grandTotal) + '</span><span class="abd-pay">' + esc(payment(order)) + '</span>' +
      '<span class="abd-actions">' +
      (active ? '<a class="abd-btn solid" href="/order-track/' + encodeURIComponent(order._id) + '" data-route>ট্র্যাক করুন</a>' : '') +
      '<a class="abd-btn" href="/order-details/' + encodeURIComponent(order._id) + '" data-route>বিস্তারিত</a></span></div></article>';
  }

  function reviewRow(review) {
    var product = review.product || {};
    var link = product.slug ? '/product-details/' + encodeURIComponent(product.slug) : '';
    var cover = (product.images || [])[0];
    var approved = review.status === true;
    return '<article class="abd-review">' +
      (cover ? '<img class="abd-cover" src="' + esc(image(cover)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="abd-cover"></span>') +
      '<div class="abd-review-body"><div class="abd-review-top">' +
      (link ? '<a href="' + link + '">' + esc(product.name || 'বই') + '</a>' : '<b>' + esc(product.name || 'বই') + '</b>') +
      (approved ? pill('done', '✓ প্রকাশিত') : pill('wait', 'অনুমোদনের অপেক্ষায়')) + '</div>' +
      stars(review.rating) + '<p>' + esc(review.review || '') + '</p>' +
      '<small>' + esc(day(review.reviewDate || review.createdAt)) +
      (approved ? (link ? ' · <a class="abd-link" href="' + link + '">বইয়ের পাতায় দেখুন</a>' : '') : ' · প্রকাশ হলে WhatsApp-এ জানিয়ে দেবো') + '</small></div></article>';
  }

  // Books to buy next: same author, publisher or subject as their latest order, not bought before.
  function moreShelf() {
    var more = state.more || [];
    if (!more.length) return '';
    return '<section class="abd-card"><div class="abd-head"><h2>আপনার জন্য আরও বই</h2><a href="/product-list">সব বই →</a></div>' +
      '<div class="abd-shelf">' + more.map(function (book) {
        var price = Number(book.price || 0);
        var list = Number(book.listPrice || 0);
        return '<a class="abd-pick" href="/product-details/' + encodeURIComponent(book.slug) + '">' +
          // Cover in its own box: the shop's "একটু পড়ে দেখুন" ribbon (homepage-redesign.html) sits on it.
          '<span class="abd-pick-cover">' + (book.image ? '<img src="' + esc(image(book.image)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="abd-blank"></span>') + '</span>' +
          '<b>' + esc(book.name) + '</b>' + (book.author ? '<small>' + esc(book.author) + '</small>' : '') +
          '<span class="abd-price">' + money(price) + (list > price ? '<s>' + money(list) + '</s>' : '') + '</span>' +
          '<span class="abd-buy">দেখুন ও কিনুন</span></a>';
      }).join('') + '</div></section>';
  }

  function addressRow(address) {
    var parts = [address.address, address.zone && address.zone.name, address.area && address.area.name, address.division && address.division.name].filter(Boolean);
    return '<div class="abd-address"><b>' + esc(address.name || userName()) + (address.setDefaultAddress ? ' ' + pill('done', 'ডিফল্ট') : '') + '</b>' +
      '<span class="abd-line">' + esc(parts.join(', ')) + '</span><span class="abd-line">' + esc(bn(address.phone || '')) + '</span></div>';
  }

  function justSentBanner() {
    var sent = null;
    try { sent = JSON.parse(read('ab-review-just-sent') || 'null'); } catch (_) {}
    if (!sent || Date.now() - Number(sent.at || 0) > 60 * 60 * 1000) return '';
    return '<div class="abd-banner" role="status"><span aria-hidden="true">✓</span><div><b>ধন্যবাদ! আপনার রিভিউ জমা হয়েছে।</b>' +
      '<p>আমরা দেখে নিয়ে সাইটে প্রকাশ করবো, তখন WhatsApp-এ জানিয়ে দেবো। নিচে আপনার অর্ডার আর রিভিউ দেখুন।</p></div>' +
      '<button type="button" class="abd-x" data-act="dismiss" aria-label="বন্ধ করুন">×</button></div>';
  }

  function empty(title, text, href, label) {
    return '<div class="abd-empty"><b>' + esc(title) + '</b>' + esc(text) + (href ? '<br><a class="abd-btn solid" href="' + href + '">' + esc(label) + '</a>' : '') + '</div>';
  }

  // The storefront's own wishlist and notification pages (owner, 2026-11-14): Bengali digits in the
  // wishlist count, and a friendly note instead of a blank box when either list is empty. Waits a
  // moment after the page opens so the note never flashes before the list has loaded.
  var EMPTY_AFTER = 1200;
  function polishNativePages() {
    var settled = Date.now() - (place.since || 0) > EMPTY_AFTER;
    var wish = document.querySelector('app-account .account-right app-wish-list');
    if (wish) {
      var line = wish.querySelector('.section-top p');
      if (line) bengaliDigits(line);
      var items = wish.querySelectorAll('.wishlist-area .delete').length;
      markEmpty(wish, settled && !items, 'আপনার উইশলিস্ট এখনো খালি',
        'পছন্দের বইয়ের ♡ চাপুন, পরে কেনার জন্য এখানে জমা থাকবে।', '/product-list', 'বই দেখুন');
    }
    var notes = document.querySelector('app-account .account-right app-notification');
    if (notes) {
      var any = Array.prototype.some.call(notes.querySelectorAll('.produt-area'), function (area) {
        return area.children.length > 0 || String(area.textContent || '').trim() !== '';
      });
      markEmpty(notes, settled && !any, 'এখনো কোনো নোটিফিকেশন নেই', 'অর্ডার আর অফারের খবর এলে এখানে দেখাবে।', '', '');
    }
  }
  function bengaliDigits(node) {
    // Change the text in place: Angular keeps these text nodes and updates them when the list changes.
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (var text = walker.nextNode(); text; text = walker.nextNode()) {
      if (/\d/.test(text.data)) text.data = bn(text.data);
    }
  }
  function markEmpty(host, isEmpty, title, text, href, label) {
    var box = host.querySelector('.abd-native-empty');
    if (isEmpty && !box) {
      box = document.createElement('div');
      box.className = 'abd-native-empty';
      box.innerHTML = empty(title, text, href, label);
      var top = host.querySelector('.section-top');
      if (top) top.insertAdjacentElement('afterend', box); else host.appendChild(box);
    } else if (!isEmpty && box) {
      box.remove();
    }
    if (host.classList.contains('abd-is-empty') !== isEmpty) host.classList.toggle('abd-is-empty', isEmpty);
  }

  /* ---------- views ---------- */
  function homeView() {
    var c = counts();
    var user = state.user || {};
    var orders = (state.orders || []).slice(0, 2);
    var reviews = (state.reviews || []).slice(0, 2);
    var addresses = state.addresses || [];
    return '<h1 class="abd-title">আমার অ্যাকাউন্ট</h1>' + justSentBanner() +
      '<section class="abd-card abd-hello">' + avatar() +
      '<div class="abd-hello-text"><strong>আসসালামু আলাইকুম, ' + esc(userName()) + '</strong>' +
      '<span>' + esc(bn(user.phoneNo || user.username || '')) + (user.email ? ' · ' + esc(user.email) : '') + '</span></div>' +
      '<button type="button" class="abd-btn" data-act="edit-profile">' + icon('pencil') + ' তথ্য বদলান</button></section>' +
      '<div class="abd-stats">' +
      '<a class="abd-stat" href="/account/orders" data-route><b>' + bn(c.orders) + '</b><span>মোট অর্ডার</span></a>' +
      '<a class="abd-stat" href="/account/orders" data-route data-filter="active"><b>' + bn(c.active) + '</b><span>চলমান অর্ডার</span></a>' +
      '<a class="abd-stat" href="/account/orders" data-route data-filter="done"><b>' + bn(c.done) + '</b><span>হাতে পেয়েছেন</span></a>' +
      '<a class="abd-stat" href="/account/review" data-route><b>' + bn(c.reviews) + '</b><span>রিভিউ' + (c.pending ? ' (' + bn(c.pending) + 'টি অপেক্ষায়)' : '') + '</span></a></div>' +
      '<section class="abd-card"><div class="abd-head"><h2>সাম্প্রতিক অর্ডার</h2>' + (c.orders > 2 ? '<a href="/account/orders" data-route>সব অর্ডার →</a>' : '') + '</div>' +
      (orders.length ? orders.map(orderCard).join('') : empty('এখনো কোনো অর্ডার নেই', 'পছন্দের বই খুঁজে অর্ডার করুন।', '/', 'বই দেখুন')) + '</section>' +
      moreShelf() +
      '<div class="abd-two">' +
      '<section class="abd-card"><div class="abd-head"><h2>আমার রিভিউ</h2>' + (c.reviews ? '<a href="/account/review" data-route>সব রিভিউ →</a>' : '') + '</div>' +
      (reviews.length ? reviews.map(reviewRow).join('') : empty('এখনো রিভিউ দেননি', 'বই পড়ে মতামত জানালে অন্য পাঠকরা উপকৃত হন।')) + '</section>' +
      '<section class="abd-card"><div class="abd-head"><h2>আমার ঠিকানা</h2><button type="button" class="abd-link" data-act="address">' + (addresses.length ? 'বদলান' : 'যোগ করুন') + '</button></div>' +
      (addresses.length ? addresses.slice(0, 3).map(addressRow).join('') : empty('কোনো ঠিকানা সেভ নেই', 'ঠিকানা সেভ রাখলে পরের অর্ডার আরও দ্রুত হবে।')) + '</section></div>';
  }

  function ordersView() {
    var orders = state.orders || [];
    var filter = state.filter;
    var shown = orders.filter(function (o) {
      if (filter === 'active') return STEP[o.orderStatus] !== undefined && o.orderStatus !== 5;
      if (filter === 'done') return o.orderStatus === 5;
      if (filter === 'closed') return STEP[o.orderStatus] === undefined;
      return true;
    });
    return '<h1 class="abd-title">আমার অর্ডার</h1>' +
      '<div class="abd-filters" role="group" aria-label="অর্ডার বাছাই">' + FILTERS.map(function (f) {
        return '<button type="button" data-act="filter" data-filter="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + esc(f[1]) + '</button>';
      }).join('') + '</div>' +
      (shown.length ? shown.map(orderCard).join('')
        : '<section class="abd-card">' + (orders.length ? empty('এই তালিকায় কোনো অর্ডার নেই', 'অন্য তালিকা দেখুন।') : empty('এখনো কোনো অর্ডার নেই', 'পছন্দের বই খুঁজে অর্ডার করুন।', '/', 'বই দেখুন')) + '</section>');
  }

  function reviewsView() {
    var reviews = state.reviews || [];
    return '<h1 class="abd-title">আমার রিভিউ</h1>' + justSentBanner() +
      '<section class="abd-card">' + (reviews.length ? reviews.map(reviewRow).join('')
        : empty('এখনো রিভিউ দেননি', 'ডেলিভারি পাওয়া বইয়ের পাশে "রিভিউ দিন" চাপুন।', '/account/orders', 'আমার অর্ডার')) + '</section>';
  }

  /* ---------- drawing ---------- */
  function sideHtml() {
    var c = counts();
    var path = location.pathname.replace(/\/+$/, '');
    var user = state.user || {};
    return '<div class="abd-me">' + avatar() + '<div class="abd-me-text"><strong>' + esc(userName()) + '</strong><span>' + esc(bn(user.phoneNo || user.username || '')) + '</span></div></div>' +
      '<nav class="abd-nav" aria-label="অ্যাকাউন্ট মেনু">' + NAV.map(function (item) {
        var mark = icon(item.icon);
        if (item.action) {
          return '<button type="button" data-act="' + item.action + '"' + (item.action === 'logout' ? ' class="abd-out"' : '') + '>' + mark + '<span>' + esc(item.label) + '</span></button>';
        }
        var current = path === item.route || (item.route === '/account/profile' && path === '/account');
        var count = item.count && state.loadedAt ? c[item.count] : 0;
        return '<a href="' + item.route + '" data-route' + (current ? ' aria-current="page"' : '') + '>' + mark + '<span>' + esc(item.label) + '</span>' +
          (count ? '<span class="abd-count">' + bn(count) + '</span>' : '') + '</a>';
      }).join('') + '</nav>';
  }

  function render() {
    if (!side || !main) return;
    side.innerHTML = sideHtml();
    // Mobile tab bar: keep the open page's tab in view.
    var nav = side.querySelector('.abd-nav');
    var open = side.querySelector('.abd-nav [aria-current=page]');
    if (nav && open && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, open.offsetLeft - nav.offsetLeft - 12);
    var current = view();
    if (!current) return;
    if (state.error === 'login') {
      main.innerHTML = '<section class="abd-card">' + empty('লগইন করুন', 'আপনার অর্ডার আর রিভিউ দেখতে লগইন করুন।', '/login', 'লগইন') + '</section>';
      return;
    }
    if (!state.loadedAt) {
      main.innerHTML = '<div class="abd-skeleton"></div><div class="abd-skeleton"></div><div class="abd-skeleton"></div>';
      return;
    }
    main.innerHTML = current === 'orders' ? ordersView() : current === 'reviews' ? reviewsView() : homeView();
  }

  /* ---------- storefront actions (its own dialogs and routes) ---------- */
  function nativeItems() { return document.querySelectorAll('app-account .account-left .side-bar nav li'); }
  function nativeAction(name) {
    var items = Array.prototype.slice.call(nativeItems());
    if (name === 'address') {
      var address = items.find(function (li) { return /ঠিকানা|address/i.test(li.textContent || ''); }) || items[2];
      var link = address && (address.querySelector('a') || address);
      if (link) link.click();
      return;
    }
    if (name === 'logout') {
      var out = items.find(function (li) { return /লগআউট|logout|log out/i.test(li.textContent || ''); }) || items[items.length - 1];
      if (out) (out.querySelector('a,button') || out).click();
      return;
    }
    if (name === 'edit-profile') {
      var edit = Array.prototype.slice.call(document.querySelectorAll('app-profile button, app-profile a, app-profile .edit, app-profile span'))
        .find(function (el) { return /^\s*(edit|এডিট|সম্পাদনা)\s*$/i.test(el.textContent || ''); });
      if (edit) edit.click();
      else go('/account/profile');
    }
  }
  function go(route) {
    var link = document.querySelector('app-account .account-left a[href="' + route + '"]');
    if (link) link.click();
    else location.assign(route);
  }

  function onClick(event) {
    var target = event.target.closest('a,button');
    if (!target || !(side.contains(target) || main.contains(target))) return;
    var act = target.getAttribute('data-act');
    if (act) {
      event.preventDefault();
      if (act === 'filter') { state.filter = target.getAttribute('data-filter') || 'all'; render(); return; }
      if (act === 'dismiss') { try { sessionStorage.removeItem('ab-review-just-sent'); } catch (_) {} render(); return; }
      nativeAction(act);
      return;
    }
    if (target.hasAttribute('data-route') && target.getAttribute('href') && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      var href = target.getAttribute('href');
      if (target.getAttribute('data-filter')) state.filter = target.getAttribute('data-filter');
      else if (href === '/account/orders') state.filter = 'all';
      if (/^\/account\//.test(href) && document.querySelector('app-account .account-left a[href="' + href + '"]')) {
        event.preventDefault();
        go(href);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  /* ---------- placing it in the storefront's account page ---------- */
  function place() {
    var on = onAccount();
    var own = on && !!view();
    var shell = on && document.querySelector('app-account .account-main');
    document.documentElement.classList.toggle('ab-dash-on', !!shell);
    document.documentElement.classList.toggle('ab-dash-own', !!shell && own);
    if (!shell) return;
    if (place.sincePath !== location.pathname) {
      place.sincePath = location.pathname;
      place.since = Date.now();
      setTimeout(place, EMPTY_AFTER + 100);
    }
    if (!own) { translateHeadings(); polishNativePages(); }
    if (!side) {
      side = document.createElement('aside');
      side.id = 'ab-dash-side';
      side.setAttribute('aria-label', 'অ্যাকাউন্ট');
      main = document.createElement('section');
      main.id = 'ab-dash-main';
      main.setAttribute('aria-live', 'polite');
      side.addEventListener('click', onClick);
      main.addEventListener('click', onClick);
    }
    var changed = false;
    if (side.parentNode !== shell) { shell.insertBefore(side, shell.firstChild); changed = true; }
    if (main.parentNode !== shell) { shell.insertBefore(main, side.nextSibling); changed = true; }
    var path = location.pathname;
    if (changed || place.lastPath !== path) {
      place.lastPath = path;
      render();
      load(false);
    }
  }

  var style = document.createElement('style');
  style.id = 'ab-dash-style';
  style.textContent = css;
  document.head.appendChild(style);

  var scheduled = false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; place(); }, 40);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('ab-route', function () { setTimeout(place, 0); });
  place();
})();
