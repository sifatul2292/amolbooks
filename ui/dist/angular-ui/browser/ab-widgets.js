/* Amolbooks sales-boost widgets — injected via index.html <script src=ab-widgets.js>
   Source of truth: gtm-snippets/*.html. Rebuild this file from those if edited.
   Dormant until OrderOffer gift config is enabled. */

/* ===================== lever2-urgency ===================== */
(function () {
  'use strict';

  // ---- Shared cross-tag GET cache (dedupes calls across all AB tags) -------
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
        store[url] = err ? { done: true, at: Date.now(), err: err, data: null, ttl: 0 } // don't cache errors long
                         : { done: true, at: Date.now(), err: null, data: data };
        if (err) store[url].at = 0; // force refetch next time on error
        ws.forEach(function (w) { try { w(err, data); } catch (e3) {} });
      };
      x.send();
    };
  })();

  // ---- Config -------------------------------------------------------------
  var API_BASE = 'https://apisub.amolbooks.com/api'; // swap to prod API base if different
  var STOCK_THRESHOLD = 10;   // show "only N left" at or below this
  var WIDGET_ID = 'ab-urgency-widget';
  var POLL_MS = 400;          // wait for Angular to render the CTA
  var POLL_MAX = 25;          // give up after ~10s

  // ---- Helpers ------------------------------------------------------------
  function toBn(n) {
    var map = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(n).replace(/\d/g, function (d) { return map[d]; });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lastSegment() {
    var parts = location.pathname.split('/').filter(Boolean);
    return parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
  }
  function getJSON(url, cb) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState === 4) {
          if (x.status >= 200 && x.status < 300) {
            try { cb(null, JSON.parse(x.responseText)); }
            catch (e) { cb(e); }
          } else { cb(new Error('HTTP ' + x.status)); }
        }
      };
      x.send();
    } catch (e) { cb(e); }
  }

  // ---- Anchor: insert before the order-button group -----------------------
  // Angular DOM has minified classes, so we locate by stable Bangla button text.
  function findAnchor() {
    var btns = document.querySelectorAll('button, a');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').trim();
      if (t.indexOf('অর্ডার করুন') !== -1) {
        // climb to the row that holds the CTA buttons
        var el = btns[i];
        for (var up = 0; up < 4 && el.parentElement; up++) el = el.parentElement;
        return el;
      }
    }
    return null;
  }

  function styleOnce() {
    if (document.getElementById('ab-urgency-style')) return;
    var s = document.createElement('style');
    s.id = 'ab-urgency-style';
    s.textContent =
      '#' + WIDGET_ID + '{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px;font-family:hind-siliguri,sans-serif}' +
      '#' + WIDGET_ID + ' .ab-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;font-size:14px;font-weight:600;line-height:1}' +
      '#' + WIDGET_ID + ' .ab-count{background:#FFF4E5;color:#B45309;border:1px solid #FCD9A5}' +
      '#' + WIDGET_ID + ' .ab-stock{background:#FEECEC;color:#C0392B;border:1px solid #F5B7B1}' +
      '#' + WIDGET_ID + ' .ab-sold{background:#EAF7EE;color:#1E7E45;border:1px solid #BDE5C8}' +
      '#' + WIDGET_ID + ' .ab-clock{font-variant-numeric:tabular-nums}';
    document.head.appendChild(s);
  }

  function render(product, anchor) {
    styleOnce();
    var old = document.getElementById(WIDGET_ID);
    if (old) old.parentNode.removeChild(old);

    var wrap = document.createElement('div');
    wrap.id = WIDGET_ID;

    // Countdown
    var end = product.discountEndDateTime ? new Date(product.discountEndDateTime) : null;
    if (end && !isNaN(end.getTime()) && end.getTime() > Date.now()) {
      var c = document.createElement('span');
      c.className = 'ab-pill ab-count';
      var label = document.createElement('span');
      label.textContent = '⏳ অফার শেষ হতে বাকি ';
      var clock = document.createElement('span');
      clock.className = 'ab-clock';
      c.appendChild(label); c.appendChild(clock);
      wrap.appendChild(c);
      tick(clock, end, c);
    }

    // Low stock
    var qty = Number(product.quantity);
    if (!isNaN(qty) && qty > 0 && qty <= STOCK_THRESHOLD) {
      var st = document.createElement('span');
      st.className = 'ab-pill ab-stock';
      st.textContent = '🔥 মাত্র ' + toBn(qty) + ' কপি বাকি';
      wrap.appendChild(st);
    }

    // Sold counter
    var sold = Number(product.totalSold);
    if (!isNaN(sold) && sold > 0) {
      var rounded = sold >= 50 ? (Math.floor(sold / 50) * 50) + '+' : sold;
      var sd = document.createElement('span');
      sd.className = 'ab-pill ab-sold';
      sd.textContent = '✅ ' + toBn(rounded) + ' কপি বিক্রি হয়েছে';
      wrap.appendChild(sd);
    }

    if (wrap.childNodes.length) anchor.parentNode.insertBefore(wrap, anchor);
  }

  function tick(clockEl, end, container) {
    function update() {
      var diff = end.getTime() - Date.now();
      if (diff <= 0) { if (container.parentNode) container.parentNode.removeChild(container); return; }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600);  s -= h * 3600;
      var m = Math.floor(s / 60);    s -= m * 60;
      var str = (d > 0 ? toBn(d) + 'দিন ' : '') + toBn(pad(h)) + ':' + toBn(pad(m)) + ':' + toBn(pad(s));
      clockEl.textContent = str;
      if (document.body.contains(clockEl)) setTimeout(update, 1000);
    }
    update();
  }

  // ---- Boot: detect product page, then render -----------------------------
  function boot() {
    var slug = lastSegment();
    if (!slug) return;
    window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (err, res) {
      if (err || !res || !res.data || !(res.data._id || res.data.slug)) return; // not a product page
      var product = res.data;
      var tries = 0;
      (function waitAnchor() {
        var anchor = findAnchor();
        if (anchor) { render(product, anchor); return; }
        if (++tries < POLL_MAX) setTimeout(waitAnchor, POLL_MS);
      })();
    });
  }

  // initial + SPA route changes
  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var w = document.getElementById(WIDGET_ID);
    if (w && w.parentNode) w.parentNode.removeChild(w);
    boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  // GTM History Change also re-fires this whole tag; guard via lastPath above.
  setInterval(maybeBoot, 1000); // catch pushState navigations Angular does internally
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

  var API_BASE = 'https://apisub.amolbooks.com/api'; // swap to prod API base if different
  var BAR_ID = 'ab-sticky-cta';
  var MAX_W = 768;
  var POLL_MS = 400, POLL_MAX = 25;
  var ROTATE_MS = 4500;

  function lastSegment() {
    var p = location.pathname.split('/').filter(Boolean);
    return p.length ? decodeURIComponent(p[p.length - 1]) : '';
  }
  function getJSON(url, cb) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState === 4) {
          if (x.status >= 200 && x.status < 300) {
            try { cb(null, JSON.parse(x.responseText)); } catch (e) { cb(e); }
          } else { cb(new Error('HTTP ' + x.status)); }
        }
      };
      x.send();
    } catch (e) { cb(e); }
  }
  function relTimeBn(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var min = Math.floor((Date.now() - t) / 60000);
    if (min < 60) return 'এই মাত্র';        // within the hour -> "just now"
    var hr = Math.floor(min / 60);
    if (hr < 24) return 'কিছুক্ষণ আগে';
    return 'সম্প্রতি';
  }

  // The real Angular order button (located by stable Bangla text)
  function findRealOrderButton() {
    var btns = document.querySelectorAll('button, a');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').trim();
      // prefer the plain "অর্ডার করুন" (not the advance-free / whatsapp variants)
      if (t === 'অর্ডার করুন') return btns[i];
    }
    for (var j = 0; j < btns.length; j++) {
      if ((btns[j].textContent || '').indexOf('অর্ডার করুন') !== -1) return btns[j];
    }
    return null;
  }

  function styleOnce() {
    if (document.getElementById('ab-sticky-style')) return;
    var s = document.createElement('style');
    s.id = 'ab-sticky-style';
    s.textContent =
      '#' + BAR_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:9999;font-family:hind-siliguri,sans-serif;' +
        'box-shadow:0 -4px 16px rgba(0,0,0,.12);background:#fff;padding-bottom:env(safe-area-inset-bottom)}' +
      '@media(min-width:' + (MAX_W + 1) + 'px){#' + BAR_ID + '{display:none!important}}' +
      '#' + BAR_ID + ' .ab-ticker{font-size:12.5px;font-weight:600;text-align:center;padding:5px 12px;' +
        'background:#FFF7E8;color:#92400E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
        'transition:opacity .4s}' +
      '#' + BAR_ID + ' .ab-row{display:flex;gap:8px;padding:9px 12px}' +
      '#' + BAR_ID + ' .ab-primary{flex:1;border:0;border-radius:10px;padding:13px;font-size:16px;font-weight:700;' +
        'color:#fff;background:#2563EB;font-family:inherit}' +
      '#' + BAR_ID + ' .ab-primary:active{background:#1D4ED8}' +
      '#' + BAR_ID + ' .ab-wa{flex:0 0 52px;border:0;border-radius:10px;background:#25D366;color:#fff;font-size:22px}' +
      'body.ab-has-sticky{padding-bottom:120px!important}';
    document.head.appendChild(s);
  }

  function buildTickerMessages(buyers) {
    var urgency = 'অফার শেষ হলে বোনাসগুলো আর পাবেন না — এখনই সুযোগ!';
    var msgs = [];
    (buyers || []).forEach(function (b) {
      if (b && b.firstName) {
        var when = b.purchasedAt ? relTimeBn(b.purchasedAt) : 'সম্প্রতি';
        var verb = when === 'এই মাত্র' ? 'এই মাত্র বইটি কিনেছেন' : when + ' বইটি কিনেছেন';
        msgs.push(b.firstName + ' ' + verb + ', আপনিও দেরি করবেন না');
      }
    });
    // interleave urgency line between buyer lines (or use it alone if no buyers)
    if (!msgs.length) return [urgency];
    var out = [];
    msgs.forEach(function (m, i) { out.push(m); if (i % 2 === 1) out.push(urgency); });
    out.push(urgency);
    return out;
  }

  function render(realBtn, messages) {
    styleOnce();
    var old = document.getElementById(BAR_ID);
    if (old) old.parentNode.removeChild(old);

    var bar = document.createElement('div');
    bar.id = BAR_ID;

    var ticker = document.createElement('div');
    ticker.className = 'ab-ticker';
    bar.appendChild(ticker);

    var row = document.createElement('div');
    row.className = 'ab-row';

    var primary = document.createElement('button');
    primary.className = 'ab-primary';
    primary.type = 'button';
    primary.textContent = 'অর্ডার করুন';
    primary.addEventListener('click', function () {
      var live = findRealOrderButton() || realBtn; // re-find in case Angular re-rendered
      if (live) {
        try { window.dataLayer && window.dataLayer.push({ event: 'ab_sticky_cta_click' }); } catch (e) {}
        live.click();
        live.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    row.appendChild(primary);

    // optional WhatsApp shortcut if a WA button exists on page
    var wa = null;
    var all = document.querySelectorAll('button, a');
    for (var i = 0; i < all.length; i++) {
      if ((all[i].textContent || '').indexOf('হোয়াটসঅ্যাপে') !== -1) { wa = all[i]; break; }
    }
    if (wa) {
      var waBtn = document.createElement('button');
      waBtn.className = 'ab-wa'; waBtn.type = 'button'; waBtn.innerHTML = '🟢';
      waBtn.setAttribute('aria-label', 'WhatsApp এ অর্ডার');
      waBtn.addEventListener('click', function () { wa.click(); });
      row.appendChild(waBtn);
    }

    bar.appendChild(row);
    document.body.appendChild(bar);
    document.body.classList.add('ab-has-sticky');

    // rotate ticker
    var idx = 0;
    function show() {
      ticker.style.opacity = '0';
      setTimeout(function () { ticker.textContent = messages[idx % messages.length]; ticker.style.opacity = '1'; idx++; }, 250);
    }
    show();
    if (messages.length > 1) bar._timer = setInterval(show, ROTATE_MS);
  }

  function cleanup() {
    var b = document.getElementById(BAR_ID);
    if (b) { if (b._timer) clearInterval(b._timer); b.parentNode.removeChild(b); }
    document.body.classList.remove('ab-has-sticky');
  }

  function boot() {
    if (window.innerWidth > MAX_W) return; // mobile only
    var slug = lastSegment();
    if (!slug) return;
    window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (err, res) {
      if (err || !res || !res.data || !(res.data._id || res.data.slug)) return; // not product page
      // fetch buyers (non-blocking; render bar regardless)
      window.__abGet(API_BASE + '/order/recent-buyers/' + encodeURIComponent(slug), 60000, function (e2, r2) {
        var buyers = (!e2 && r2 && r2.data) ? r2.data : [];
        var messages = buildTickerMessages(buyers);
        var tries = 0;
        (function waitBtn() {
          var realBtn = findRealOrderButton();
          if (realBtn) { render(realBtn, messages); return; }
          if (++tries < POLL_MAX) setTimeout(waitBtn, POLL_MS);
        })();
      });
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    cleanup();
    boot();
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

  var API_BASE = 'https://apisub.amolbooks.com/api'; // swap to prod API base if different
  var BANNER_ID = 'ab-buy2-banner';
  var POLL_MS = 400, POLL_MAX = 25;

  function lastSegment() {
    var p = location.pathname.split('/').filter(Boolean);
    return p.length ? decodeURIComponent(p[p.length - 1]) : '';
  }
  function toBn(n) {
    var m = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(n).replace(/\d/g, function (d) { return m[d]; });
  }
  function getJSON(url, cb) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState === 4) {
          if (x.status >= 200 && x.status < 300) {
            try { cb(null, JSON.parse(x.responseText)); } catch (e) { cb(e); }
          } else { cb(new Error('HTTP ' + x.status)); }
        }
      };
      x.send();
    } catch (e) { cb(e); }
  }
  function findAnchor() {
    var btns = document.querySelectorAll('button, a');
    for (var i = 0; i < btns.length; i++) {
      if ((btns[i].textContent || '').indexOf('অর্ডার করুন') !== -1) {
        var el = btns[i];
        for (var up = 0; up < 4 && el.parentElement; up++) el = el.parentElement;
        return el;
      }
    }
    return null;
  }
  function styleOnce() {
    if (document.getElementById('ab-buy2-style')) return;
    var s = document.createElement('style');
    s.id = 'ab-buy2-style';
    s.textContent =
      '#' + BANNER_ID + '{display:flex;align-items:center;gap:10px;margin:10px 0 14px;padding:11px 14px;' +
        'border-radius:11px;background:linear-gradient(90deg,#FFF7E8,#FDECCB);border:1px solid #F3D08A;' +
        'font-family:hind-siliguri,sans-serif;color:#7A4E0B;font-weight:600;font-size:14.5px;line-height:1.5}' +
      '#' + BANNER_ID + ' .ab-emoji{font-size:22px;flex:0 0 auto}';
    document.head.appendChild(s);
  }
  function render(qty, anchor) {
    styleOnce();
    var old = document.getElementById(BANNER_ID);
    if (old) old.parentNode.removeChild(old);
    var b = document.createElement('div');
    b.id = BANNER_ID;
    var emoji = document.createElement('span'); emoji.className = 'ab-emoji'; emoji.textContent = '🎁';
    var txt = document.createElement('span');
    txt.innerHTML =
      '<b>' + toBn(qty) + 'টি কিনুন — এই আকর্ষণীয় নোটবুক একদম ফ্রি!</b><br>' +
      'একটি নিজে রাখুন, আরেকটি প্রিয়জনকে উপহার দিন।';
    b.appendChild(emoji); b.appendChild(txt);
    anchor.parentNode.insertBefore(b, anchor);
  }

  function boot() {
    var slug = lastSegment();
    if (!slug) return;
    window.__abGet(API_BASE + '/order-offer/get', 60000, function (err, res) {
      if (err || !res || !res.data) return;
      var cfg = res.data;
      if (!cfg.giftEnabled || !cfg.giftBuyXProductSlug || !cfg.giftBuyXQty) return;
      if (cfg.giftBuyXProductSlug !== slug) return; // only the configured book
      var qty = Number(cfg.giftBuyXQty) || 2;
      var tries = 0;
      (function wait() {
        var a = findAnchor();
        if (a) { render(qty, a); return; }
        if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
      })();
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var b = document.getElementById(BANNER_ID);
    if (b && b.parentNode) b.parentNode.removeChild(b);
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

  var API_BASE = 'https://apisub.amolbooks.com/api'; // swap to prod API base if different
  var ID = 'ab-threshold-nudge';
  var POLL_MS = 400, POLL_MAX = 25;

  function pathSegs() { return location.pathname.split('/').filter(Boolean); }
  function lastSegment() { var p = pathSegs(); return p.length ? decodeURIComponent(p[p.length - 1]) : ''; }
  function isCartPage() { return pathSegs().indexOf('cart') !== -1; }
  function toBn(n) { var m=['০','১','২','৩','৪','৫','৬','৭','৮','৯']; return String(n).replace(/\d/g,function(d){return m[d];}); }
  function getJSON(url, cb) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function () {
        if (x.readyState === 4) {
          if (x.status >= 200 && x.status < 300) { try { cb(null, JSON.parse(x.responseText)); } catch (e) { cb(e); } }
          else cb(new Error('HTTP ' + x.status));
        }
      };
      x.send();
    } catch (e) { cb(e); }
  }

  function styleOnce() {
    if (document.getElementById('ab-threshold-style')) return;
    var s = document.createElement('style');
    s.id = 'ab-threshold-style';
    s.textContent =
      '#' + ID + '{margin:10px 0 14px;padding:11px 14px;border-radius:11px;background:#F1FAF4;border:1px solid #BFE6CC;' +
        'font-family:hind-siliguri,sans-serif;color:#1E7E45;font-weight:600;font-size:14px;line-height:1.5}' +
      '#' + ID + ' .ab-msg{display:flex;align-items:center;gap:8px}' +
      '#' + ID + ' .ab-bar{margin-top:8px;height:9px;border-radius:6px;background:#D8EFE0;overflow:hidden}' +
      '#' + ID + ' .ab-fill{height:100%;background:linear-gradient(90deg,#34D058,#1E9E4A);width:0;transition:width .5s}' +
      '#' + ID + '.ab-unlocked{background:#EAF7EE;border-color:#9FDDB2}';
    document.head.appendChild(s);
  }

  function findProductAnchor() {
    var btns = document.querySelectorAll('button, a');
    for (var i = 0; i < btns.length; i++) {
      if ((btns[i].textContent || '').indexOf('অর্ডার করুন') !== -1) {
        var el = btns[i];
        for (var up = 0; up < 4 && el.parentElement; up++) el = el.parentElement;
        return el;
      }
    }
    return null;
  }

  // Cart page: read the rendered grand total from the DOM by scanning text near
  // a total label. Best-effort; returns NaN if not found (widget then hides bar).
  function readCartTotal() {
    var labels = ['সর্বমোট', 'মোট', 'সাবটোটাল', 'Total', 'Subtotal', 'Grand'];
    var all = document.querySelectorAll('*');
    var best = NaN, bestVal = -1;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length) continue; // leaf nodes only
      var t = (el.textContent || '').trim();
      var hasLabel = labels.some(function (l) { return t.indexOf(l) !== -1; });
      var ctx = el.parentElement ? (el.parentElement.textContent || '') : t;
      if (!hasLabel) continue;
      // find a number in this element or its siblings/parent context
      var m = ctx.replace(/[,৳]/g, '').match(/(\d[\d.]{1,7})/g);
      if (m) {
        var v = parseFloat(m[m.length - 1]);
        if (!isNaN(v) && v > bestVal) { bestVal = v; best = v; }
      }
    }
    return best;
  }

  function buildBox() {
    styleOnce();
    var old = document.getElementById(ID);
    if (old) old.parentNode.removeChild(old);
    var box = document.createElement('div');
    box.id = ID;
    var msg = document.createElement('div'); msg.className = 'ab-msg';
    box.appendChild(msg);
    return { box: box, msg: msg };
  }

  function renderProductTeaser(threshold, anchor) {
    var ui = buildBox();
    ui.msg.textContent = '🎁 ৳' + toBn(threshold) + '+ অর্ডারে এই আকর্ষণীয় নোটবুক একদম ফ্রি!';
    anchor.parentNode.insertBefore(ui.box, anchor);
  }

  function renderCartProgress(threshold, anchor) {
    var total = readCartTotal();
    var ui = buildBox();
    if (isNaN(total)) {
      // fall back to static teaser if total can't be read
      ui.msg.textContent = '🎁 ৳' + toBn(threshold) + '+ অর্ডারে এই আকর্ষণীয় নোটবুক ফ্রি!';
      anchor.parentNode.insertBefore(ui.box, anchor);
      return;
    }
    if (total >= threshold) {
      ui.box.className = 'ab-unlocked';
      ui.msg.textContent = '🎉 অভিনন্দন! আপনি একটি ফ্রি নোটবুক আনলক করেছেন।';
    } else {
      var remaining = Math.max(0, Math.ceil(threshold - total));
      ui.msg.textContent = '🎁 আর মাত্র ৳' + toBn(remaining) + ' টাকার বই যোগ করুন — পেয়ে যান এই আকর্ষণীয় নোটবুক একদম ফ্রি!';
      var bar = document.createElement('div'); bar.className = 'ab-bar';
      var fill = document.createElement('div'); fill.className = 'ab-fill';
      bar.appendChild(fill); ui.box.appendChild(bar);
      setTimeout(function () { fill.style.width = Math.min(100, Math.round((total / threshold) * 100)) + '%'; }, 50);
    }
    anchor.parentNode.insertBefore(ui.box, anchor.firstChild || anchor);
  }

  function boot() {
    window.__abGet(API_BASE + '/order-offer/get', 60000, function (err, res) {
      if (err || !res || !res.data) return;
      var cfg = res.data;
      if (!cfg.giftEnabled || !cfg.giftMinAmount) return;
      var threshold = Number(cfg.giftMinAmount);

      if (isCartPage()) {
        var tries = 0;
        (function wait() {
          // anchor near the checkout button on the cart page
          var anchor = findProductAnchor() ||
            (function () {
              var b = document.querySelectorAll('button, a');
              for (var i = 0; i < b.length; i++) {
                var t = (b[i].textContent || '');
                if (t.indexOf('চেকআউট') !== -1 || t.indexOf('Checkout') !== -1 || t.indexOf('অর্ডার') !== -1) {
                  var el = b[i]; for (var u = 0; u < 3 && el.parentElement; u++) el = el.parentElement; return el;
                }
              }
              return document.querySelector('main, .container, body');
            })();
          if (anchor) { renderCartProgress(threshold, anchor); return; }
          if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
        })();
      } else {
        // product page: only if this looks like a product page
        var slug = lastSegment();
        if (!slug) return;
        window.__abGet(API_BASE + '/product/get-by-slug/' + encodeURIComponent(slug), 60000, function (e2, r2) {
          if (e2 || !r2 || !r2.data || !(r2.data._id || r2.data.slug)) return;
          var tries = 0;
          (function wait() {
            var a = findProductAnchor();
            if (a) { renderProductTeaser(threshold, a); return; }
            if (++tries < POLL_MAX) setTimeout(wait, POLL_MS);
          })();
        });
      }
    });
  }

  var lastPath = '';
  function maybeBoot() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var b = document.getElementById(ID);
    if (b && b.parentNode) b.parentNode.removeChild(b);
    boot();
  }
  maybeBoot();
  window.addEventListener('popstate', maybeBoot);
  setInterval(maybeBoot, 1000);
})();
