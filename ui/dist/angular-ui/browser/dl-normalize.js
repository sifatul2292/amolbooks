/**
 * Amolbooks dataLayer normalizer v2
 *
 * Responsibilities:
 * 1. Block Angular from double-loading GTM (same container ID already in index.html).
 * 2. Transform UA ecommerce format → GA4 format before GTM processes events.
 * 3. Prevent duplicate purchase events for the same order ID (localStorage guard).
 *
 * Must load in <head> BEFORE the GTM snippet.
 *
 * Long-term: remove this file once Angular source pushes native GA4 format.
 * Transition: GA4-format events pass through untouched (no UA wrapper detected).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'amol_fired_purchases';
  var DEDUP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ── Purchase dedup helpers ─────────────────────────────────────────────

  function loadFiredPurchases() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveFiredPurchases(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) { /* storage full or unavailable — fail open */ }
  }

  function isPurchaseFired(transactionId) {
    if (!transactionId) return false;
    var map = loadFiredPurchases();
    var entry = map[transactionId];
    if (!entry) return false;
    // Treat stale entries (> 7 days) as expired
    if (Date.now() - entry.ts > DEDUP_TTL_MS) {
      delete map[transactionId];
      saveFiredPurchases(map);
      return false;
    }
    return true;
  }

  function markPurchaseFired(transactionId) {
    if (!transactionId) return;
    var map = loadFiredPurchases();
    map[transactionId] = { ts: Date.now() };
    // Prune entries older than TTL to prevent unbounded growth
    var now = Date.now();
    Object.keys(map).forEach(function (k) {
      if (now - map[k].ts > DEDUP_TTL_MS) delete map[k];
    });
    saveFiredPurchases(map);
  }

  // ── GTM double-load guard ──────────────────────────────────────────────
  // Angular's scriptLoaderService.loadGtmScript() may inject a second GTM
  // script at runtime if tagManagerId is set in admin analytics settings.
  // Block that second load — GTM is already loaded via index.html (Stape).
  var _GTM_ID = 'GTM-NNZV54QJ';
  var _fbeventsRequested = false; // Track first fbevents.js load (GTM) — block subsequent (Angular)
  var _origCreateElement = document.createElement.bind(document);
  document.createElement = function (tag) {
    var el = _origCreateElement(tag);
    if (tag && tag.toLowerCase() === 'script') {
      var _origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function (name, value) {
        // Block Angular from double-loading GTM (already loaded via Stape in index.html)
        if (
          name === 'src' &&
          typeof value === 'string' &&
          value.indexOf(_GTM_ID) !== -1 &&
          value.indexOf('server.amolbooks.com') === -1
        ) {
          console.warn('[amol-dl] Blocked duplicate GTM load:', value);
          return;
        }
        // Block duplicate fbevents.js loads — GTM loads it first (first request allowed),
        // Angular loads it again when facebookPixelId is set in admin. The duplicate
        // causes "Multiple pixels with conflicting versions" warning and double-fires
        // browser-side pixel events. Only the first load (GTM's) goes through.
        if (
          name === 'src' &&
          typeof value === 'string' &&
          value.indexOf('connect.facebook.net') !== -1
        ) {
          if (_fbeventsRequested) {
            console.warn('[amol-dl] Blocked duplicate fbevents.js load (GTM already loaded it):', value);
            return;
          }
          _fbeventsRequested = true;
          // First load — allow through (this is GTM's Meta Pixel base code)
        }
        return _origSetAttr(name, value);
      };
    }
    return el;
  };

  // ── dataLayer normalizer ───────────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];

  function normalizeEvent(obj) {
    if (!obj || typeof obj !== 'object' || !obj.event) return obj;

    var ev = obj.event;
    var ec = obj.ecommerce;

    // ── purchase ──────────────────────────────────────────────────────
    if (ev === 'purchase') {
      // Support both UA format (ec.purchase.actionField) and native GA4 format
      var transactionId, value, products;

      if (ec && ec.purchase && ec.purchase.actionField) {
        // UA format — transform to GA4
        var af = ec.purchase.actionField;
        transactionId = af.id || '';
        value = Number(af.revenue) || 0;
        products = (ec.purchase.products || []).map(function (p) {
          return {
            item_id: p.id || p._id || '',
            item_name: p.name || '',
            item_category: p.category || 'Books',
            price: Number(p.price || p.salePrice) || 0,
            quantity: Number(p.quantity) || 1,
          };
        });
        obj.ecommerce = {
          transaction_id: transactionId,
          value: value,
          tax: Number(af.tax) || 0,
          shipping: Number(af.shipping) || 0,
          currency: af.currency || 'BDT',
          coupon: af.coupon || undefined,
          items: products,
        };
      } else if (ec && ec.transaction_id) {
        // Already GA4 format
        transactionId = ec.transaction_id;
      }

      // Normalize event_id — overwrite unconditionally, never conditionally.
      //
      // Every consumer deduplicates on `order_<orderId>`: the storefront's own
      // purchase_stape push (index.html), the Tagioo container (its
      // "Tagioo - event_id" variable reads this event_id first), and the
      // server-side CAPI Purchase in order.service.ts. Angular mints its own
      // random id like "1786521197711_178652120545233", which matched neither
      // of the old conditions and passed through untouched — so Meta received
      // the browser and server events under different keys and could not
      // collapse them into one sale.
      if (transactionId) {
        obj.event_id = 'order_' + transactionId;
      }

      // ── Duplicate purchase guard ───────────────────────────────────
      // Blocks re-fire on hard reload, revisit, or navigation back.
      // Uses localStorage with 7-day TTL per transaction_id.
      if (transactionId) {
        if (isPurchaseFired(transactionId)) {
          console.warn('[amol-dl] Duplicate purchase blocked for order:', transactionId);
          return null; // Signal to caller: drop this event
        }
        markPurchaseFired(transactionId);
      }
    }

    // ── add_to_cart ───────────────────────────────────────────────────
    if (ev === 'add_to_cart' && ec && ec.add) {
      var prods = ec.add.products || [];
      var total = prods.reduce(function (s, p) {
        return s + (Number(p.price || p.salePrice) || 0) * (Number(p.quantity) || 1);
      }, 0);
      obj.ecommerce = {
        currency: 'BDT',
        value: total,
        items: prods.map(function (p) {
          return {
            item_id: p.id || p._id || '',
            item_name: p.name || '',
            item_category: p.category || 'Books',
            price: Number(p.price || p.salePrice) || 0,
            quantity: Number(p.quantity) || 1,
          };
        }),
      };
    }

    // ── begin_checkout ────────────────────────────────────────────────
    if (ev === 'begin_checkout' && ec && ec.checkout) {
      var prods = ec.checkout.products || [];
      var total = prods.reduce(function (s, p) {
        return s + (Number(p.price || p.salePrice) || 0) * (Number(p.quantity) || 1);
      }, 0);
      obj.ecommerce = {
        currency: 'BDT',
        value: total,
        items: prods.map(function (p) {
          return {
            item_id: p.id || p._id || '',
            item_name: p.name || '',
            item_category: p.category || 'Books',
            price: Number(p.price || p.salePrice) || 0,
            quantity: Number(p.quantity) || 1,
          };
        }),
      };
    }

    // ── view_item ─────────────────────────────────────────────────────
    // Angular pushes top-level items[] without ecommerce wrapper.
    // Wrap to standard GA4: ecommerce.items[].
    if (ev === 'view_item' && obj.items && Array.isArray(obj.items) && !ec) {
      obj.ecommerce = {
        currency: obj.currency || 'BDT',
        value: Number(obj.value) || 0,
        items: obj.items.map(function (it) {
          return {
            item_id: it.item_id || it.id || '',
            item_name: it.item_name || it.name || '',
            item_category: it.item_category || 'Books',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
          };
        }),
      };
      delete obj.items;
      delete obj.value;
      delete obj.currency;
    }

    return obj;
  }

  // ── dataLayer.push patch ──────────────────────────────────────────────────
  // GTM replaces window.dataLayer.push outright when it initializes, which
  // silently discarded this normalizer. Re-patching on `window load` was a race
  // and it lost on /checkout/order-success, where index.html starts GTM
  // immediately instead of waiting for load — GTM's overwrite landed after the
  // re-patch, so Angular's purchase event reached GTM unnormalized and kept its
  // random event_id.
  //
  // An accessor removes the race entirely: any later assignment to
  // dataLayer.push is wrapped instead of replacing us, so it does not matter
  // whether GTM initializes before or after this file.

  function wrapPush(rawPush) {
    if (!rawPush || rawPush._amolNormalized) return rawPush;

    var patchedPush = function () {
      var args = Array.prototype.slice.call(arguments);
      var filtered = [];
      for (var i = 0; i < args.length; i++) {
        try {
          var normalized = normalizeEvent(args[i]);
          if (normalized !== null) {
            filtered.push(normalized);
          }
          // null return = event dropped (duplicate purchase guard)
        } catch (e) {
          console.error('[amol-dl] normalizeEvent error:', e);
          filtered.push(args[i]); // fail open — pass original on error
        }
      }
      if (filtered.length === 0) return window.dataLayer.length;
      return rawPush.apply(window.dataLayer, filtered);
    };
    patchedPush._amolNormalized = true;
    return patchedPush;
  }

  function installPatch() {
    var current = wrapPush(window.dataLayer.push);
    try {
      Object.defineProperty(window.dataLayer, 'push', {
        configurable: true,
        enumerable: false,
        get: function () { return current; },
        set: function (next) { current = wrapPush(next); },
      });
      console.log('[amol-dl] dataLayer.push patched (assignment-guarded)');
    } catch (e) {
      // Older engine without configurable redefinition — fall back to the
      // plain assignment plus the window-load re-patch below.
      window.dataLayer.push = current;
      console.log('[amol-dl] dataLayer.push patched');
    }
  }

  // Patch now (pre-GTM, covers early pushes)
  installPatch();

  // Safety net for the defineProperty fallback path only; a no-op once the
  // accessor is installed, since the wrap survives on its own by then.
  window.addEventListener('load', function () {
    installPatch();
  });
})();
