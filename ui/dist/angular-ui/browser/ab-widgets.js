/* Amolbooks sales-boost widgets — injected via index.html <script src=ab-widgets.js>
   Source of truth: gtm-snippets/*.html. Rebuild from those if edited.
   Dormant until OrderOffer gift config enabled. */

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

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-sticky-style')) return;
    var s = document.createElement('style'); s.id = 'ab-sticky-style';
    s.textContent =
      '#' + BAR_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:99999;font-family:hind-siliguri,sans-serif;' +
        'background:linear-gradient(180deg,var(--ab-green2),var(--ab-green));box-shadow:0 -6px 20px rgba(0,0,0,.28);' +
        'padding:9px 12px calc(9px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px}' +
      '@media(min-width:' + (MAX_W+1) + 'px){#' + BAR_ID + '{display:none!important}}' +
      '#' + BAR_ID + ' .ab-tick{flex:1;min-width:0;color:#fff;font-size:12.5px;font-weight:600;line-height:1.35;' +
        'display:flex;align-items:center;gap:7px;transition:opacity .35s}' +
      '#' + BAR_ID + ' .ab-tick .txt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + BAR_ID + ' .ab-tick b{color:var(--ab-yellow)}' +
      '#' + BAR_ID + ' .ab-go{flex:0 0 auto;background:var(--ab-yellow);color:var(--ab-ink);font-weight:800;border:0;' +
        'border-radius:999px;padding:11px 16px;font-size:14px;font-family:inherit;white-space:nowrap}' +
      '#' + BAR_ID + ' .ab-go:active{filter:brightness(.94)}' +
      'body.ab-has-sticky{padding-bottom:84px!important}';
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

    var idx = 0;
    function show() {
      tick.style.opacity = '0';
      setTimeout(function () { txt.innerHTML = messages[idx % messages.length]; tick.style.opacity = '1'; idx++; }, 220);
    }
    show();
    if (messages.length > 1) bar._t = setInterval(show, ROTATE_MS);
  }

  function cleanup() {
    var b = document.getElementById(BAR_ID); if (b) { if (b._t) clearInterval(b._t); b.parentNode.removeChild(b); }
    document.body.classList.remove('ab-has-sticky');
  }

  function boot() {
    if (window.innerWidth > MAX_W) return;
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
    if (location.pathname === lastPath) return;
    lastPath = location.pathname; cleanup(); boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 1000);
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
      '@media(max-width:560px){#' + CARD_ID + ' .ab-nb{width:52px;height:64px;flex-basis:52px}#' + CARD_ID + ' .ab-l1{font-size:14px}}';
    document.head.appendChild(s);
  }

  function render(cfg, isThisBook) {
    styleOnce();
    var old = document.getElementById(CARD_ID); if (old) old.parentNode.removeChild(old);

    var anchor = findPriceAnchor();
    var mode = 'afterPrice';
    if (!anchor) { anchor = findCtaAnchor(); mode = 'beforeCta'; }
    if (!anchor) return false;

    var img = (cfg.giftProduct && cfg.giftProduct.image) || '';
    var qty = toBn(Number(cfg.giftBuyXQty) || 2);
    var minamt = toBn(Number(cfg.giftMinAmount) || 750);

    var card = document.createElement('div');
    card.id = CARD_ID; card.className = 'ab-card';
    var imgHtml = img ? '<img class="ab-nb" src="' + img + '" alt="free notebook">' : '';
    var l1 = isThisBook
      ? 'এই বইটি <b>' + qty + 'টি</b> নিন — সাথে <b>ফ্রি নোটবুক</b> 🎁'
      : '<b>৳' + minamt + '+</b> এর বই কিনলেই — <b>ফ্রি নোটবুক</b> 🎁';
    var l2 = isThisBook
      ? 'একটি নিজে রাখুন, একটি উপহার দিন · অথবা ৳' + minamt + '+ অর্ডারেও ফ্রি'
      : 'কার্টে ৳' + minamt + ' পূর্ণ করুন, নোটবুক যোগ হবে নিজে থেকেই';
    card.innerHTML = imgHtml +
      '<div class="ab-body"><span class="ab-tag">🎁 ফ্রি গিফট অফার</span>' +
      '<div class="ab-l1">' + l1 + '</div><div class="ab-l2">' + l2 + '</div></div>';

    if (mode === 'afterPrice') anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else anchor.parentNode.insertBefore(card, anchor);
    return true;
  }

  function boot() {
    var slug = lastSegment();
    if (!slug) return;
    window.__abGet(API_BASE + '/order-offer/get', 60000, function (err, res) {
      if (err || !res || !res.data) return;
      var cfg = res.data;
      if (!cfg.giftEnabled || !cfg.giftProduct) return;
      // Confirm we're on a product page (avoids cart/list pages).
      window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (e2, r2) {
        if (e2 || !r2 || !r2.data || !(r2.data._id || r2.data.slug)) return;
        var isThisBook = cfg.giftBuyXProductSlug === slug && !!cfg.giftBuyXQty;
        var tries = 0;
        (function wait() { if (render(cfg, isThisBook)) return; if (++tries < POLL_MAX) setTimeout(wait, POLL_MS); })();
      });
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var c = document.getElementById(CARD_ID); if (c && c.parentNode) c.parentNode.removeChild(c);
    boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 1000);
})();

/* ===================== lever0-cart-threshold ===================== */
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
  var ID = 'ab-cart-slider';
  var POLL_MS = 500, POLL_MAX = 30;

  function isCartPage() { return location.pathname.split('/').filter(Boolean).indexOf('cart') !== -1; }
  function toBn(n) { var m=['০','১','২','৩','৪','৫','৬','৭','৮','৯']; return String(n).replace(/\d/g,function(d){return m[d];}); }

  // Read the cart grand total from the DOM (cart is server-side; total is on screen).
  function readCartTotal() {
    var labels = ['সর্বমোট','সাবটোটাল','মোট','Total','Subtotal','Grand'];
    var all = document.querySelectorAll('*'), best = NaN, bestVal = -1;
    for (var i = 0; i < all.length; i++) {
      var el = all[i]; if (el.children.length) continue;
      var t = (el.textContent || '').trim();
      if (!labels.some(function (l) { return t.indexOf(l) !== -1; })) continue;
      var ctx = el.parentElement ? (el.parentElement.textContent || '') : t;
      var m = ctx.replace(/[,৳]/g, '').match(/(\d[\d.]{1,7})/g);
      if (m) { var v = parseFloat(m[m.length-1]); if (!isNaN(v) && v > bestVal) { bestVal = v; best = v; } }
    }
    return best;
  }

  function findAnchor() {
    var b = document.querySelectorAll('button,a');
    for (var i = 0; i < b.length; i++) {
      var t = (b[i].textContent || '');
      if (t.indexOf('চেকআউট') !== -1 || t.indexOf('Checkout') !== -1 || t.indexOf('অর্ডার') !== -1 || t.indexOf('সম্পন্ন') !== -1) {
        var el = b[i]; for (var u = 0; u < 3 && el.parentElement; u++) el = el.parentElement; return el;
      }
    }
    return document.querySelector('main') || document.querySelector('.container') || document.body;
  }

  function styleOnce() {
    window.__abTheme();
    if (document.getElementById('ab-cart-style')) return;
    var s = document.createElement('style'); s.id = 'ab-cart-style';
    s.textContent =
      '#' + ID + '{width:100%;margin:12px 0;padding:14px 16px;border-radius:14px;font-family:hind-siliguri,sans-serif;' +
        'background:linear-gradient(135deg,var(--ab-green),var(--ab-green2));color:#fff;box-shadow:0 6px 18px rgba(23,58,43,.22)}' +
      '#' + ID + ' .ab-h{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;line-height:1.45}' +
      '#' + ID + ' .ab-h b{color:var(--ab-yellow)}' +
      '#' + ID + ' .ab-bar{margin-top:10px;height:11px;border-radius:7px;background:rgba(255,255,255,.18);overflow:hidden}' +
      '#' + ID + ' .ab-fill{height:100%;background:var(--ab-yellow);width:0;transition:width .6s ease}' +
      '#' + ID + ' .ab-gift{display:flex;align-items:center;gap:11px;margin-top:12px;padding:9px;border-radius:11px;background:rgba(255,255,255,.1)}' +
      '#' + ID + ' .ab-gift img{width:46px;height:56px;border-radius:7px;object-fit:cover;background:#fff}' +
      '#' + ID + ' .ab-gift .nm{flex:1;font-size:13px;font-weight:700}' +
      '#' + ID + ' .ab-gift .free{background:var(--ab-yellow);color:var(--ab-ink);font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}';
    document.head.appendChild(s);
  }

  function render(cfg, anchor) {
    styleOnce();
    var old = document.getElementById(ID); if (old) old.parentNode.removeChild(old);

    var threshold = Number(cfg.giftMinAmount);
    var total = readCartTotal();
    var box = document.createElement('div'); box.id = ID;
    var img = (cfg.giftProduct && cfg.giftProduct.image) || '';
    var giftName = (cfg.giftProduct && cfg.giftProduct.name) || 'ফ্রি নোটবুক';

    if (!isNaN(total) && total >= threshold) {
      box.innerHTML =
        '<div class="ab-h">🎉 অভিনন্দন! আপনি একটি <b>ফ্রি নোটবুক</b> আনলক করেছেন</div>' +
        '<div class="ab-gift">' + (img ? '<img src="' + img + '">' : '') +
        '<span class="nm">' + giftName + '</span><span class="free">ফ্রি 🎁</span></div>';
    } else if (!isNaN(total)) {
      var remaining = Math.max(0, Math.ceil(threshold - total));
      var pct = Math.min(100, Math.round((total / threshold) * 100));
      box.innerHTML =
        '<div class="ab-h">🎁 আর মাত্র <b>৳' + toBn(remaining) + '</b> টাকার বই যোগ করুন — পেয়ে যান <b>ফ্রি নোটবুক</b>!</div>' +
        '<div class="ab-bar"><div class="ab-fill"></div></div>';
      setTimeout(function () { var f = box.querySelector('.ab-fill'); if (f) f.style.width = pct + '%'; }, 60);
    } else {
      box.innerHTML = '<div class="ab-h">🎁 <b>৳' + toBn(threshold) + '+</b> অর্ডারে একটি নোটবুক একদম ফ্রি!</div>';
    }
    anchor.parentNode.insertBefore(box, anchor);
  }

  function boot() {
    if (!isCartPage()) return;
    window.__abGet(API_BASE + '/order-offer/get', 60000, function (err, res) {
      if (err || !res || !res.data || !res.data.giftEnabled || !res.data.giftMinAmount) return;
      var cfg = res.data, tries = 0;
      (function wait() {
        var a = findAnchor();
        if (a && !isNaN(readCartTotal())) { render(cfg, a); return; }
        if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
        else if (a) render(cfg, a); // render teaser even if total unreadable
      })();
    });
  }

  // Re-render on cart changes (qty edits) — cart page mutates without route change.
  var lastPath = '', lastTotal = null, watch = null;
  function maybeBoot() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      var b = document.getElementById(ID); if (b && b.parentNode) b.parentNode.removeChild(b);
      if (watch) { clearInterval(watch); watch = null; }
      boot();
      if (isCartPage()) {
        watch = setInterval(function () {
          var t = readCartTotal();
          if (t !== lastTotal) { lastTotal = t; var a = findAnchor(); if (a) { var c = document.getElementById(ID); /* re-render */ window.__abGet(API_BASE + '/order-offer/get', 60000, function (e, r) { if (!e && r && r.data && r.data.giftEnabled) render(r.data, findAnchor()); }); } }
        }, 1500);
      }
    }
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 1000);
})();
