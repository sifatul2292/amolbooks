/* Amolbooks sales-boost widgets — injected via index.html <script src=ab-widgets.js>
   Source of truth: gtm-snippets/*.html. */

/* ===================== lever2-urgency ===================== */
(function () {
  'use strict';

  window.__abGet = window.__abGet || (function () {
    var store = {};
    return function (url, ttl, cb) {
      var now = Date.now(), e = store[url];
      if (e && e.done && (now - e.at < ttl)) { cb(e.err, e.data); return; }
      if (e && e.waiters) { e.waiters.push(cb); return; }
      store[url] = { waiters: [cb], at: now, done: false };
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        var err = null, data = null;
        if (x.status >= 200 && x.status < 300) { try { data = JSON.parse(x.responseText); } catch (e2) { err = e2; } }
        else err = new Error('HTTP ' + x.status);
        var entry = store[url], ws = (entry && entry.waiters) || [];
        store[url] = { done: true, at: err ? 0 : Date.now(), err: err, data: data };
        ws.forEach(function (w) { try { w(err, data); } catch (e3) {} });
      };
      x.send();
    };
  })();
  window.__abTheme = window.__abTheme || function () {
    if (document.getElementById('ab-theme')) return;
    var s = document.createElement('style'); s.id = 'ab-theme';
    s.textContent = ':root{--ab-green:#173a2b;--ab-green2:#1f5038;--ab-yellow:#f4d44e;--ab-ink:#173a2b}' +
      '@keyframes ab-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}' +
      '.ab-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff5a4d;animation:ab-pulse 1.1s infinite}';
    document.head.appendChild(s);
  };

  var API_BASE = 'https://apisub.amolbooks.com/api';
  var WIDGET_ID = 'ab-urgency-widget';
  var POLL_MS = 400, POLL_MAX = 25;

  function toBn(n) { var m=['০','১','২','৩','৪','৫','৬','৭','৮','৯']; return String(n).replace(/\d/g,function(d){return m[d];}); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lastSegment() { var p = location.pathname.split('/').filter(Boolean); return p.length ? decodeURIComponent(p[p.length-1]) : ''; }

  function findPriceAnchor() {
    var els = document.querySelectorAll('p,div,span,h1,h2,h3');
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '');
      if ((t.indexOf('You Save') !== -1 || t.indexOf('Off)') !== -1) && t.length < 120 && els[i].offsetWidth > 150) return els[i];
    }
    return null;
  }

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-urgency-style')) return;
    var s = document.createElement('style'); s.id = 'ab-urgency-style';
    s.textContent =
      '#' + WIDGET_ID + '{display:flex;flex-wrap:wrap;gap:8px;width:100%;margin:10px 0;font-family:hind-siliguri,sans-serif}' +
      '#' + WIDGET_ID + ' .ab-pill{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;font-size:13.5px;font-weight:700;line-height:1}' +
      '#' + WIDGET_ID + ' .ab-count{background:var(--ab-green);color:#fff}' +
      '#' + WIDGET_ID + ' .ab-count b{color:var(--ab-yellow);font-variant-numeric:tabular-nums}' +
      '#' + WIDGET_ID + ' .ab-stock{background:#fdecec;color:#c0392b;border:1px solid #f3b9b3}';
    document.head.appendChild(s);
  }

  function render(product, anchor) {
    styleOnce();
    var old = document.getElementById(WIDGET_ID); if (old) old.parentNode.removeChild(old);
    var wrap = document.createElement('div'); wrap.id = WIDGET_ID;

    var end = product.discountEndDateTime ? new Date(product.discountEndDateTime) : null;
    if (end && !isNaN(end.getTime()) && end.getTime() > Date.now()) {
      var c = document.createElement('span'); c.className = 'ab-pill ab-count';
      c.innerHTML = '⏳ অফার শেষ হতে <b class="ab-clock"></b>';
      wrap.appendChild(c);
      tick(c.querySelector('.ab-clock'), end, c);
    }
    var qty = Number(product.quantity);
    if (!isNaN(qty) && qty > 0 && qty <= 10) {
      var st = document.createElement('span'); st.className = 'ab-pill ab-stock';
      st.innerHTML = '<span class="ab-dot"></span> স্টক প্রায় শেষ — মাত্র ' + toBn(qty) + ' কপি বাকি';
      wrap.appendChild(st);
    }
    if (wrap.childNodes.length) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
  }

  function tick(clockEl, end, container) {
    function update() {
      var diff = end.getTime() - Date.now();
      if (diff <= 0) { if (container.parentNode) container.parentNode.removeChild(container); return; }
      var s = Math.floor(diff/1000), d = Math.floor(s/86400); s-=d*86400;
      var h = Math.floor(s/3600); s-=h*3600; var m = Math.floor(s/60); s-=m*60;
      clockEl.textContent = (d>0?toBn(d)+'দিন ':'') + toBn(pad(h)) + ':' + toBn(pad(m)) + ':' + toBn(pad(s));
      if (document.body.contains(clockEl)) setTimeout(update, 1000);
    }
    update();
  }

  function boot() {
    var slug = lastSegment(); if (!slug) return;
    window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (err, res) {
      if (err || !res || !res.data || !(res.data._id || res.data.slug)) return;
      var product = res.data, tries = 0;
      (function wait() {
        var a = findPriceAnchor();
        if (a) { render(product, a); return; }
        if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
      })();
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var w = document.getElementById(WIDGET_ID); if (w && w.parentNode) w.parentNode.removeChild(w);
    boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 1000);
})();

/* ===================== lever3-sticky-cta ===================== */
(function () {
  'use strict';

  window.__abGet = window.__abGet || (function () {
    var store = {};
    return function (url, ttl, cb) {
      var now = Date.now(), e = store[url];
      if (e && e.done && (now - e.at < ttl)) { cb(e.err, e.data); return; }
      if (e && e.waiters) { e.waiters.push(cb); return; }
      store[url] = { waiters: [cb], at: now, done: false };
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        var err = null, data = null;
        if (x.status >= 200 && x.status < 300) { try { data = JSON.parse(x.responseText); } catch (e2) { err = e2; } }
        else err = new Error('HTTP ' + x.status);
        var entry = store[url], ws = (entry && entry.waiters) || [];
        store[url] = { done: true, at: err ? 0 : Date.now(), err: err, data: data };
        ws.forEach(function (w) { try { w(err, data); } catch (e3) {} });
      };
      x.send();
    };
  })();
  window.__abTheme = window.__abTheme || function () {
    if (document.getElementById('ab-theme')) return;
    var s = document.createElement('style'); s.id = 'ab-theme';
    s.textContent = ':root{--ab-green:#173a2b;--ab-green2:#1f5038;--ab-yellow:#f4d44e;--ab-ink:#173a2b}' +
      '@keyframes ab-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}' +
      '.ab-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff5a4d;animation:ab-pulse 1.1s infinite}';
    document.head.appendChild(s);
  };

  var API_BASE = 'https://apisub.amolbooks.com/api';
  var BAR_ID = 'ab-sticky-cta';
  var MAX_W = 768, POLL_MS = 400, POLL_MAX = 25, ROTATE_MS = 4500;
  var HONORIFICS = { 'md': 1, 'md.': 1, 'mohammad': 1, 'mohammed': 1, 'muhammad': 1, 'mst': 1, 'mst.': 1, 'mrs': 1, 'mr': 1, 'mr.': 1, 'dr': 1, 'dr.': 1 };

  function lastSegment() { var p = location.pathname.split('/').filter(Boolean); return p.length ? decodeURIComponent(p[p.length-1]) : ''; }
  function relTimeBn(iso) {
    var t = new Date(iso).getTime(); if (isNaN(t)) return 'সম্প্রতি';
    var min = Math.floor((Date.now()-t)/60000);
    if (min < 60) return 'এই মাত্র';
    if (min < 1440) return 'কিছুক্ষণ আগে';
    return 'সম্প্রতি';
  }
  function cleanName(name) {
    var parts = (name || '').toString().trim().split(/\s+/).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].toLowerCase();
      if (!HONORIFICS[w]) return parts[i];
    }
    return parts[0] || '';
  }

  function findRealOrderButton() {
    var b = document.querySelectorAll('button,a');
    for (var i = 0; i < b.length; i++) if ((b[i].textContent||'').trim() === 'অর্ডার করুন') return b[i];
    for (var j = 0; j < b.length; j++) if ((b[j].textContent||'').indexOf('অর্ডার করুন') !== -1) return b[j];
    return null;
  }
  function findWhatsApp() {
    var b = document.querySelectorAll('button,a');
    for (var i = 0; i < b.length; i++) if ((b[i].textContent||'').indexOf('হোয়াটসঅ্যাপে') !== -1) return b[i];
    return null;
  }

  // Site's own fixed bottom nav (মূলপাতা / ক্যাটালগ / ক্রয় তালিকা / লগইন).
  // Our sticky CTA must sit ABOVE it, not cover it.
  function findBottomNav() {
    var els = document.querySelectorAll('nav,footer,div,ul');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.id === BAR_ID) continue;
      var t = (el.textContent || '');
      if (t.indexOf('মূলপাতা') === -1 && t.indexOf('ক্রয় তালিকা') === -1) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      var r = el.getBoundingClientRect();
      if (r.height > 28 && r.height < 150 && r.bottom >= window.innerHeight - 6) return el;
    }
    return null;
  }
  function navHeight() {
    var n = findBottomNav();
    return n ? Math.round(n.getBoundingClientRect().height) : 0;
  }

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-sticky-style')) return;
    var s = document.createElement('style'); s.id = 'ab-sticky-style';
    s.textContent =
      '#' + BAR_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:998;font-family:hind-siliguri,sans-serif;' +
        'background:linear-gradient(180deg,var(--ab-green2),var(--ab-green));box-shadow:0 -3px 10px rgba(0,0,0,.22);' +
        'padding:3px 9px calc(3px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px}' +
      '#' + BAR_ID + '.ab-hide{display:none!important}' +
      '@media(min-width:' + (MAX_W+1) + 'px){#' + BAR_ID + '{display:none!important}}' +
      '#' + BAR_ID + ' .ab-tick{flex:1;min-width:0;color:#fff;font-size:11px;font-weight:600;line-height:1.25;' +
        'display:flex;align-items:center;gap:6px;transition:opacity .35s}' +
      '#' + BAR_ID + ' .ab-tick .txt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + BAR_ID + ' .ab-tick b{color:var(--ab-yellow)}' +
      '#' + BAR_ID + ' .ab-go{flex:0 0 auto;background:var(--ab-yellow);color:var(--ab-ink);font-weight:800;border:0;' +
        'border-radius:999px;padding:6px 13px;font-size:12px;font-family:inherit;white-space:nowrap}' +
      '#' + BAR_ID + ' .ab-go:active{filter:brightness(.94)}' +
      'body.ab-has-sticky{padding-bottom:48px!important}';
    document.head.appendChild(s);
  }

  function buildMessages(buyers) {
    var urgency = 'স্টক প্রায় শেষ! অফার শেষ হলে <b>বোনাসগুলো</b> আর পাবেন না';
    var msgs = [];
    (buyers || []).forEach(function (b) {
      var nm = cleanName(b && b.firstName);
      if (nm) {
        var when = relTimeBn(b.purchasedAt);
        msgs.push('<b>' + nm + '</b> ' + when + ' বইটি কিনেছেন, আপনিও দেরি করবেন না');
      }
    });
    if (!msgs.length) return [urgency];
    var out = []; msgs.forEach(function (m, i) { out.push(m); if (i % 2 === 1) out.push(urgency); }); out.push(urgency);
    return out;
  }

  function render(messages) {
    styleOnce();
    var old = document.getElementById(BAR_ID); if (old) { if (old._t) clearInterval(old._t); old.parentNode.removeChild(old); }

    var bar = document.createElement('div'); bar.id = BAR_ID;
    var tick = document.createElement('div'); tick.className = 'ab-tick';
    tick.innerHTML = '<span class="ab-dot"></span><span class="txt"></span>';
    var txt = tick.querySelector('.txt');
    bar.appendChild(tick);

    var go = document.createElement('button');
    go.className = 'ab-go'; go.type = 'button'; go.textContent = 'এখনই অর্ডার করুন →';
    go.addEventListener('click', function () {
      var live = findRealOrderButton();
      if (live) {
        try { window.dataLayer && window.dataLayer.push({ event: 'ab_sticky_cta_click' }); } catch (e) {}
        live.click(); live.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    bar.appendChild(go);

    document.body.appendChild(bar);
    document.body.classList.add('ab-has-sticky');

    // Sit above the site's native bottom nav (if any), and keep clear of it.
    function reposition() {
      var nh = navHeight();
      bar.style.bottom = nh + 'px';
      document.body.style.setProperty('padding-bottom',
        (nh + bar.getBoundingClientRect().height + 8) + 'px', 'important');
    }
    reposition();
    var reTries = 0;
    var reTimer = setInterval(function () { reposition(); if (++reTries > 12) clearInterval(reTimer); }, 600);
    window.addEventListener('resize', reposition);
    bar._reTimer = reTimer;

    // Hide the CTA whenever a site overlay (cart sidebar / PDF popup / modal) is open.
    bar._ovTimer = setInterval(function () { bar.classList.toggle('ab-hide', overlayOpen()); }, 250);

    var idx = 0;
    function show() {
      tick.style.opacity = '0';
      setTimeout(function () { txt.innerHTML = messages[idx % messages.length]; tick.style.opacity = '1'; idx++; }, 220);
    }
    show();
    if (messages.length > 1) bar._t = setInterval(show, ROTATE_MS);
  }

  function cleanup() {
    var b = document.getElementById(BAR_ID);
    if (b) { if (b._t) clearInterval(b._t); if (b._reTimer) clearInterval(b._reTimer); if (b._ovTimer) clearInterval(b._ovTimer); b.parentNode.removeChild(b); }
    document.body.classList.remove('ab-has-sticky');
    document.body.style.removeProperty('padding-bottom');
  }

  // Don't show the product CTA on cart / checkout pages (they have their own bar).
  // The cart sidebar is always in the DOM (hidden) so we require a VISIBLE cart
  // header — otherwise we'd hide the CTA on every page.
  function visibleCartHeader() {
    var all = document.querySelectorAll('h1,h2,h3,h4,div,span,p');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], t = (el.textContent || '').trim();
      if (t.indexOf('কার্ট আইটেম') !== -1 && t.length < 40 && el.offsetParent !== null) return el;
    }
    return null;
  }
  function isCartLike() {
    var p = location.pathname.toLowerCase();
    // URL-only: the hidden cart sidebar carries "কার্ট আইটেম" on every page, so
    // text-based detection wrongly hid the CTA site-wide.
    return p.indexOf('cart') !== -1 || p.indexOf('checkout') !== -1;
  }

  // True only when an overlay is ACTUALLY visible on screen (cart sidebar open,
  // PDF popup, modal). Strict visibility checks so the always-present hidden
  // sidebar never counts (that was the earlier bug that hid the CTA forever).
  function overlayOpen() {
    if (document.querySelector('.cart-slide-active')) return true;
    var sel = '.cart-overlay,[class*=overlay],[class*=backdrop],[class*=modal],[class*=popup],[class*=lightbox]';
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.id === BAR_ID || (el.closest && el.closest('#' + BAR_ID))) continue;
      if (el.offsetParent === null) continue;            // display:none somewhere up the tree
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      var r = el.getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.7 && r.height >= window.innerHeight * 0.4) return true;
    }
    return false;
  }

  function boot() {
    if (window.innerWidth > MAX_W) return;
    if (isCartLike()) return;
    var slug = lastSegment(); if (!slug) return;
    window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (err, res) {
      if (err || !res || !res.data || !(res.data._id || res.data.slug)) return;
      window.__abGet(API_BASE + '/order/recent-buyers/' + encodeURIComponent(slug), 60000, function (e2, r2) {
        var buyers = (!e2 && r2 && r2.data) ? r2.data : [];
        var messages = buildMessages(buyers), tries = 0;
        (function wait() {
          if (findRealOrderButton()) { render(messages); return; }
          if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
        })();
      });
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (document.getElementById(BAR_ID) && isCartLike()) { cleanup(); return; } // leaked onto cart
    if (location.pathname === lastPath) return;
    lastPath = location.pathname; cleanup(); boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 800);
})();

/* ===================== lever1-buy2-banner ===================== */
(function () {
  'use strict';

  window.__abGet = window.__abGet || (function () {
    var store = {};
    return function (url, ttl, cb) {
      var now = Date.now(), e = store[url];
      if (e && e.done && (now - e.at < ttl)) { cb(e.err, e.data); return; }
      if (e && e.waiters) { e.waiters.push(cb); return; }
      store[url] = { waiters: [cb], at: now, done: false };
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        var err = null, data = null;
        if (x.status >= 200 && x.status < 300) { try { data = JSON.parse(x.responseText); } catch (e2) { err = e2; } }
        else err = new Error('HTTP ' + x.status);
        var entry = store[url], ws = (entry && entry.waiters) || [];
        store[url] = { done: true, at: err ? 0 : Date.now(), err: err, data: data };
        ws.forEach(function (w) { try { w(err, data); } catch (e3) {} });
      };
      x.send();
    };
  })();

  // Shared green/yellow theme — injected once, used by all AB widgets.
  window.__abTheme = window.__abTheme || function () {
    if (document.getElementById('ab-theme')) return;
    var s = document.createElement('style');
    s.id = 'ab-theme';
    s.textContent =
      ':root{--ab-green:#173a2b;--ab-green2:#1f5038;--ab-yellow:#f4d44e;--ab-ink:#173a2b;--ab-line:rgba(255,255,255,.16)}' +
      '@keyframes ab-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}' +
      '.ab-card{font-family:hind-siliguri,sans-serif;box-sizing:border-box}' +
      '.ab-yellowbtn{background:var(--ab-yellow);color:var(--ab-ink);font-weight:700;border:0;border-radius:999px;cursor:pointer;font-family:inherit}' +
      '.ab-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#ff5a4d;animation:ab-pulse 1.1s infinite}';
    document.head.appendChild(s);
  };

  var API_BASE = 'https://apisub.amolbooks.com/api';
  var CARD_ID = 'ab-offer-card';
  var POLL_MS = 400, POLL_MAX = 25;

  function lastSegment() {
    var p = location.pathname.split('/').filter(Boolean);
    return p.length ? decodeURIComponent(p[p.length - 1]) : '';
  }
  function toBn(n) { var m=['০','১','২','৩','৪','৫','৬','৭','৮','৯']; return String(n).replace(/\d/g,function(d){return m[d];}); }

  // Grid-safe anchor: insert right AFTER the price line (inside the info column),
  // never climbing into the 3-column product grid.
  function findPriceAnchor() {
    var els = document.querySelectorAll('p,div,span,h1,h2,h3');
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '');
      if ((t.indexOf('You Save') !== -1 || t.indexOf('Off)') !== -1) && t.length < 120 && els[i].offsetWidth > 150) {
        return els[i];
      }
    }
    return null;
  }
  function findCtaAnchor() {
    var b = document.querySelectorAll('button,a');
    for (var i = 0; i < b.length; i++) {
      if ((b[i].textContent || '').indexOf('অর্ডার করুন') !== -1) {
        var el = b[i]; for (var u = 0; u < 3 && el.parentElement; u++) el = el.parentElement; return el;
      }
    }
    return null;
  }

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-offer-style')) return;
    var s = document.createElement('style');
    s.id = 'ab-offer-style';
    s.textContent =
      '#' + CARD_ID + '{display:flex;gap:13px;align-items:center;width:100%;margin:14px 0;padding:14px 16px;' +
        'border-radius:14px;background:linear-gradient(135deg,var(--ab-green),var(--ab-green2));' +
        'box-shadow:0 6px 18px rgba(23,58,43,.22);color:#fff;position:relative;overflow:hidden}' +
      '#' + CARD_ID + ' .ab-nb{flex:0 0 60px;width:60px;height:74px;border-radius:8px;object-fit:cover;' +
        'background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
      '#' + CARD_ID + ' .ab-body{flex:1;min-width:0}' +
      '#' + CARD_ID + ' .ab-tag{display:inline-block;background:var(--ab-yellow);color:var(--ab-ink);' +
        'font-size:11px;font-weight:800;padding:2px 9px;border-radius:999px;margin-bottom:5px}' +
      '#' + CARD_ID + ' .ab-l1{font-size:15px;font-weight:800;line-height:1.45}' +
      '#' + CARD_ID + ' .ab-l1 b{color:var(--ab-yellow)}' +
      '#' + CARD_ID + ' .ab-l2{font-size:12.5px;opacity:.92;margin-top:3px}' +
      '#' + CARD_ID + ' .ab-bar{margin-top:9px;height:9px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}' +
      '#' + CARD_ID + ' .ab-fill{height:100%;background:var(--ab-yellow);width:0;transition:width .5s ease}' +
      '@media(max-width:560px){#' + CARD_ID + ' .ab-nb{width:52px;height:64px;flex-basis:52px}#' + CARD_ID + ' .ab-l1{font-size:14px}}';
    document.head.appendChild(s);
  }

  // Real cart total from the SPA's own localStorage cart (guest + logged-in mirror).
  // Reading it (not the DOM) means we never touch the cart/checkout markup.
  function cartTotal() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.toUpperCase().indexOf('USER_CART') === -1) continue;
        var arr; try { arr = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
        if (!Array.isArray(arr)) continue;
        var sum = 0;
        arr.forEach(function (it) {
          if (!it) return;
          var p = Number(it.salePrice != null ? it.salePrice
                    : (it.product && it.product.salePrice != null ? it.product.salePrice
                    : (it.unitPrice != null ? it.unitPrice : (it.afterDiscountPrice != null ? it.afterDiscountPrice : NaN))));
          var q = Number(it.selectedQty != null ? it.selectedQty : (it.quantity != null ? it.quantity : 1));
          if (!isNaN(p) && !isNaN(q)) sum += p * q;
        });
        if (sum > 0) return sum;
      }
    } catch (e) {}
    return 0;
  }

  function cardInner(cfg, isThisBook) {
    var img = (cfg.giftProduct && cfg.giftProduct.image) || '';
    var imgHtml = img ? '<img class="ab-nb" src="' + img + '" alt="free notebook">' : '';
    var threshold = Number(cfg.giftMinAmount) || 750;
    var qtyN = Number(cfg.giftBuyXQty) || 2;
    var total = cartTotal();

    var tag, l1, l2, bar = '';
    if (total >= threshold) {
      tag = '🎉 অভিনন্দন!';
      l1 = 'আপনি একটি <b>ফ্রি নোটবুক</b> পেয়েছেন 🎁';
      l2 = 'চেকআউটে নোটবুকটি উপহার হিসেবে যোগ হয়ে যাবে';
    } else if (total > 0) {
      var remaining = Math.max(1, Math.ceil(threshold - total));
      var pct = Math.min(100, Math.round((total / threshold) * 100));
      tag = '🎁 ফ্রি গিফট আনলক করুন';
      l1 = 'আর মাত্র <b>৳' + toBn(remaining) + '</b> টাকার বই যোগ করুন — পেয়ে যান <b>ফ্রি নোটবুক</b>!';
      l2 = 'কার্টে এখন ৳' + toBn(total) + ' / ৳' + toBn(threshold);
      bar = '<div class="ab-bar"><div class="ab-fill" style="width:' + pct + '%"></div></div>';
    } else {
      tag = '🎁 ফ্রি গিফট অফার';
      l1 = isThisBook
        ? 'এই বইটি <b>' + toBn(qtyN) + 'টি</b> নিন — সাথে <b>ফ্রি নোটবুক</b> 🎁'
        : '<b>৳' + toBn(threshold) + '+</b> এর বই কিনলেই — <b>ফ্রি নোটবুক</b> 🎁';
      l2 = isThisBook
        ? 'একটি নিজে রাখুন, একটি উপহার দিন · অথবা ৳' + toBn(threshold) + '+ অর্ডারেও ফ্রি'
        : 'কার্টে ৳' + toBn(threshold) + ' পূর্ণ করুন, নোটবুক যোগ হবে নিজে থেকেই';
    }
    return imgHtml + '<div class="ab-body"><span class="ab-tag">' + tag + '</span>' +
      '<div class="ab-l1">' + l1 + '</div><div class="ab-l2">' + l2 + '</div>' + bar + '</div>';
  }

  var _cfg = null, _isThisBook = false, _lastTotal = -1;

  function ensureCard() {
    if (document.getElementById(CARD_ID)) return true;
    var anchor = findPriceAnchor(), mode = 'afterPrice';
    if (!anchor) { anchor = findCtaAnchor(); mode = 'beforeCta'; }
    if (!anchor) return false;
    var card = document.createElement('div');
    card.id = CARD_ID; card.className = 'ab-card';
    card.innerHTML = cardInner(_cfg, _isThisBook);
    if (mode === 'afterPrice') anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else anchor.parentNode.insertBefore(card, anchor);
    _lastTotal = cartTotal();
    return true;
  }

  function refresh() {
    if (!_cfg) return;
    var card = document.getElementById(CARD_ID);
    if (!card) { styleOnce(); ensureCard(); return; }
    var t = cartTotal();
    if (t !== _lastTotal) { _lastTotal = t; card.innerHTML = cardInner(_cfg, _isThisBook); }
  }

  function boot() {
    var slug = lastSegment(); if (!slug) return;
    window.__abGet(API_BASE + '/order-offer/get', 60000, function (err, res) {
      if (err || !res || !res.data) return;
      var cfg = res.data;
      if (!cfg.giftEnabled || !cfg.giftProduct) return;
      window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (e2, r2) {
        if (e2 || !r2 || !r2.data || !(r2.data._id || r2.data.slug)) return;
        _cfg = cfg; _isThisBook = cfg.giftBuyXProductSlug === slug && !!cfg.giftBuyXQty;
        styleOnce();
        var tries = 0;
        (function wait() { if (ensureCard()) return; if (++tries < POLL_MAX) setTimeout(wait, POLL_MS); })();
      });
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname; _cfg = null; _lastTotal = -1;
      var c = document.getElementById(CARD_ID); if (c && c.parentNode) c.parentNode.removeChild(c);
      boot();
    } else {
      refresh(); // live-update card as the cart total changes
    }
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  window.addEventListener('storage', refresh);
  setInterval(maybeBoot, 900);
})();

/* ===================== lever4-qty ===================== */
(function () {
  'use strict';

  window.__abTheme = window.__abTheme || function () {
    if (document.getElementById('ab-theme')) return;
    var s = document.createElement('style'); s.id = 'ab-theme';
    s.textContent = ':root{--ab-green:#173a2b;--ab-green2:#1f5038;--ab-yellow:#f4d44e;--ab-ink:#173a2b}';
    document.head.appendChild(s);
  };

  var WRAP_ID = 'ab-qty';
  var POLL_MS = 500, POLL_MAX = 30;
  var CLICK_GAP = 280;
  var qty = 1, suppress = false;

  function lastSegment() { var p = location.pathname.split('/').filter(Boolean); return p.length ? decodeURIComponent(p[p.length-1]) : ''; }
  function toBn(n) { var m=['০','১','২','৩','৪','৫','৬','৭','৮','৯']; return String(n).replace(/\d/g,function(d){return m[d];}); }

  function findAddBtn() {
    var b = document.querySelectorAll('button,a');
    for (var i = 0; i < b.length; i++) {
      var t = (b[i].textContent || '').trim();
      if (t.indexOf('ক্রয় তালিকায় রাখুন') !== -1 || t.indexOf('ক্রয় তালিকায় যুক্ত') !== -1) return b[i];
    }
    return null;
  }

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-qty-style')) return;
    var s = document.createElement('style'); s.id = 'ab-qty-style';
    s.textContent =
      '#' + WRAP_ID + '{display:flex;align-items:center;gap:12px;width:100%;margin:10px 0;font-family:hind-siliguri,sans-serif}' +
      '#' + WRAP_ID + ' .lbl{font-size:14px;font-weight:700;color:var(--ab-ink)}' +
      '#' + WRAP_ID + ' .step{display:inline-flex;align-items:center;border:1.5px solid var(--ab-green2);border-radius:10px;overflow:hidden}' +
      '#' + WRAP_ID + ' button{width:42px;height:40px;border:0;background:#f1faf4;color:var(--ab-green);font-size:22px;font-weight:800;cursor:pointer;font-family:inherit;line-height:1}' +
      '#' + WRAP_ID + ' button:active{background:#e2f2e8}' +
      '#' + WRAP_ID + ' .n{min-width:46px;text-align:center;font-size:16px;font-weight:800;color:var(--ab-ink)}';
    document.head.appendChild(s);
  }

  function attach(addBtn) {
    if (addBtn._abHooked) return;
    addBtn._abHooked = true;
    addBtn.addEventListener('click', function () {
      if (suppress) return;
      var n = qty;
      if (n <= 1) return;
      suppress = true;
      var i = 1;
      (function more() {
        if (i >= n) { suppress = false; return; }
        try { addBtn.click(); } catch (e) {}
        i++; setTimeout(more, CLICK_GAP);
      })();
    }, false);
  }

  function render(addBtn) {
    styleOnce();
    var old = document.getElementById(WRAP_ID); if (old) old.parentNode.removeChild(old);
    var wrap = document.createElement('div'); wrap.id = WRAP_ID;
    wrap.innerHTML =
      '<span class="lbl">পরিমাণ:</span>' +
      '<span class="step"><button type="button" class="dec">−</button>' +
      '<span class="n">' + toBn(qty) + '</span>' +
      '<button type="button" class="inc">+</button></span>';
    var nEl = wrap.querySelector('.n');
    wrap.querySelector('.dec').addEventListener('click', function () { if (qty > 1) { qty--; nEl.textContent = toBn(qty); } });
    wrap.querySelector('.inc').addEventListener('click', function () { if (qty < 20) { qty++; nEl.textContent = toBn(qty); } });

    // place just above the add-to-cart button's row
    var blk = addBtn; for (var u = 0; u < 3 && blk.parentElement && blk.offsetWidth < 150; u++) blk = blk.parentElement;
    blk.parentNode.insertBefore(wrap, blk);
    attach(addBtn);
  }

  function boot() {
    var slug = lastSegment(); if (!slug) return;
    var tries = 0;
    (function wait() {
      var addBtn = findAddBtn();
      if (addBtn) { render(addBtn); return; }
      if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
    })();
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) {
      // keep the hook attached if Angular re-rendered the button
      var b = findAddBtn(); if (b) attach(b);
      return;
    }
    lastPath = location.pathname; qty = 1;
    var w = document.getElementById(WRAP_ID); if (w && w.parentNode) w.parentNode.removeChild(w);
    boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 900);
})();
