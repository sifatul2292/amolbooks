/**
 * Amolbooks dataLayer normalizer
 * Transforms Universal Analytics (UA) ecommerce format → GA4 format
 * before GTM processes events. Must load in <head> BEFORE GTM snippet.
 *
 * Also prevents duplicate GTM loading if Angular dynamically re-injects
 * the same container ID.
 */
(function () {
  'use strict';

  // ── GTM double-load guard ──────────────────────────────────────────────
  // Angular may call scriptLoaderService.loadGtmScript() at runtime.
  // If it tries to inject a second GTM script with the same ID, block it.
  var _GTM_ID = 'GTM-NNZV54QJ';
  var _origCreateElement = document.createElement.bind(document);
  document.createElement = function (tag) {
    var el = _origCreateElement(tag);
    if (tag && tag.toLowerCase() === 'script') {
      var _origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function (name, value) {
        if (
          name === 'src' &&
          typeof value === 'string' &&
          value.indexOf(_GTM_ID) !== -1 &&
          value.indexOf('server.amolbooks.com') === -1 // allow Stape loader
        ) {
          // Block the duplicate script insertion
          console.warn('[amol-dl] Blocked duplicate GTM load:', value);
          return;
        }
        return _origSetAttr(name, value);
      };
    }
    return el;
  };

  // ── dataLayer normalizer ───────────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];

  var _origPush = Array.prototype.push;

  function normalizeEvent(obj) {
    if (!obj || typeof obj !== 'object' || !obj.event) return obj;

    var ev = obj.event;
    var ec = obj.ecommerce;

    // ── purchase ──────────────────────────────────────────────────────
    if (ev === 'purchase' && ec && ec.purchase) {
      var af = ec.purchase.actionField || {};
      var prods = ec.purchase.products || [];
      var orderId = af.id || '';

      obj.ecommerce = {
        transaction_id: orderId,
        value: Number(af.revenue) || 0,
        tax: Number(af.tax) || 0,
        shipping: Number(af.shipping) || 0,
        currency: af.currency || 'BDT',
        coupon: af.coupon || undefined,
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

      // Normalize event_id to "purchase_ORDER_ID" for Meta dedup
      if (obj.event_id && String(obj.event_id) === String(orderId)) {
        obj.event_id = 'purchase_' + orderId;
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
    // Angular pushes top-level items[] AND ecommerce.detail.products[].
    // Wrap to standard GA4: ecommerce.items[].
    if (ev === 'view_item' && obj.items && Array.isArray(obj.items) && !ec) {
      var items = obj.items;
      obj.ecommerce = {
        currency: obj.currency || 'BDT',
        value: Number(obj.value) || 0,
        items: items.map(function (it) {
          return {
            item_id: it.item_id || it.id || '',
            item_name: it.item_name || it.name || '',
            item_category: it.item_category || 'Books',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
          };
        }),
      };
      // Clean up top-level duplicates that Stape doesn't need
      delete obj.items;
      delete obj.value;
      delete obj.currency;
    }

    return obj;
  }

  // Patch dataLayer.push BEFORE GTM initializes
  // GTM will wrap our patched push, so events are normalized before GTM sees them
  var _nativePush = _origPush;
  window.dataLayer.push = function () {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
      try {
        args[i] = normalizeEvent(args[i]);
      } catch (e) {
        console.error('[amol-dl] normalizeEvent error:', e);
      }
    }
    return _nativePush.apply(window.dataLayer, args);
  };
})();
