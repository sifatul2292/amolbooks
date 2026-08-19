export const STOREFRONT_ATTRIBUTION_SCRIPT = String.raw`(function (root) {
  'use strict';
  if (!root || root.__amolAttributionInstalled) return;
  root.__amolAttributionInstalled = true;

  var STORAGE_KEY = 'amol_attribution_v1';
  var ANON_KEY = 'amol_analytics_anonymous_id';
  var META_PIXEL_ID = '1294682478263474';
  var metaFallbackStarted = {};

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function anonymousId() {
    var existing = root.localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    var value = root.crypto && typeof root.crypto.randomUUID === 'function'
      ? root.crypto.randomUUID()
      : 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    root.localStorage.setItem(ANON_KEY, value);
    return value;
  }

  function param(search, names) {
    for (var i = 0; i < names.length; i++) {
      var value = search.get(names[i]);
      if (value) return value.slice(0, 500);
    }
    return '';
  }

  function cookie(name) {
    try {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.*+?^\${}()|[\]\\])/g, '\\$1') + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    } catch (_) { return ''; }
  }

  function gaClientId() {
    var value = cookie('_ga');
    if (!value) return '';
    var parts = value.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.').slice(0, 120) : '';
  }

  function gaSessionId() {
    var value = cookie('_ga_5VZPVFL0X9');
    if (!value) return '';
    var named = value.match(/(?:^|[.$])s(\d+)(?:[.$]|$)/);
    if (named && named[1]) return named[1];
    var parts = value.split('.');
    return parts.length >= 3 && /^\d+$/.test(parts[2]) ? parts[2] : '';
  }

  function currentTouch() {
    var search = new URLSearchParams(root.location.search || '');
    var referrer = document.referrer || '';
    var externalReferrer = '';
    try {
      if (referrer && new URL(referrer).hostname !== root.location.hostname) externalReferrer = referrer;
    } catch (_) {}
    var fbclid = param(search, ['fbclid']);
    var gclid = param(search, ['gclid']);
    var wbraid = param(search, ['wbraid']);
    var gbraid = param(search, ['gbraid']);
    var fbc = cookie('_fbc');
    var fbp = cookie('_fbp');
    var source = param(search, ['utm_source']);
    if (!source && fbclid) source = 'facebook';
    if (!source && (gclid || wbraid || gbraid)) source = 'google';
    if (!source && externalReferrer) {
      try { source = new URL(externalReferrer).hostname.replace(/^www\./, ''); } catch (_) {}
    }
    return {
      source: source || 'direct',
      medium: param(search, ['utm_medium']) || (externalReferrer ? 'referral' : 'none'),
      campaign: param(search, ['utm_campaign', 'campaign']),
      campaignId: param(search, ['campaign_id', 'utm_id']),
      adSet: param(search, ['adset', 'adset_name']),
      adSetId: param(search, ['adset_id']),
      ad: param(search, ['ad', 'ad_name', 'utm_content']),
      adId: param(search, ['ad_id']),
      landingPage: root.location.href.slice(0, 500),
      referrer: externalReferrer.slice(0, 500),
      fbclid: fbclid,
      gclid: gclid,
      wbraid: wbraid,
      gbraid: gbraid,
      fbc: fbc,
      fbp: fbp,
      capturedAt: new Date().toISOString(),
      hasCampaignSignal: !!(source || fbclid || gclid || wbraid || gbraid || externalReferrer)
    };
  }

  function cleanTouch(touch) {
    var output = {};
    Object.keys(touch || {}).forEach(function (key) {
      if (key !== 'hasCampaignSignal' && touch[key] !== '') output[key] = touch[key];
    });
    return output;
  }

  function attribution() {
    var saved = safeParse(root.localStorage.getItem(STORAGE_KEY), {}) || {};
    var touch = currentTouch();
    if (!saved.firstTouch) saved.firstTouch = cleanTouch(touch);
    if (!saved.lastTouch || touch.hasCampaignSignal) saved.lastTouch = cleanTouch(touch);
    ['firstTouch', 'lastTouch'].forEach(function (key) {
      if (!saved[key]) return;
      if (touch.fbc) saved[key].fbc = touch.fbc;
      if (touch.fbp) saved[key].fbp = touch.fbp;
    });
    saved.anonymousId = anonymousId();
    var analyticsClientId = gaClientId();
    var analyticsSessionId = gaSessionId();
    if (analyticsClientId) saved.gaClientId = analyticsClientId;
    if (analyticsSessionId) saved.gaSessionId = analyticsSessionId;
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return saved;
  }

  function enrichPendingPurchase() {
    try {
      var raw = root.sessionStorage.getItem('_pendingPurchase');
      if (!raw) return;
      var payload = safeParse(raw, null);
      if (!payload || typeof payload !== 'object') return;
      payload.user_data = payload.user_data || {};
      if (!payload.user_data.customer_id) {
        payload.user_data.customer_id = anonymousId();
        root.sessionStorage.setItem('_pendingPurchase', JSON.stringify(payload));
      }
      sendMetaPurchaseFallback(payload);
    } catch (_) {}
  }

  function sendMetaPurchaseFallback(payload) {
    var ecommerce = payload && payload.ecommerce || {};
    var transactionId = String(ecommerce.transaction_id || '').trim();
    if (!transactionId) return;

    var eventId = payload.event_id || ('order_' + transactionId);
    var sentKey = 'amol_meta_purchase_' + eventId;
    if (metaFallbackStarted[eventId]) return;
    try {
      if (root.sessionStorage.getItem(sentKey)) return;
    } catch (_) {}
    metaFallbackStarted[eventId] = true;

    var items = Array.isArray(ecommerce.items) ? ecommerce.items : [];
    var contentIds = [];
    var contents = [];
    for (var i = 0; i < items.length; i++) {
      var id = String(items[i].item_id || items[i].id || '').trim();
      if (!id) continue;
      var quantity = Math.max(1, Number(items[i].quantity) || 1);
      var price = Number(items[i].price || items[i].item_price || 0);
      contentIds.push(id);
      contents.push({ id: id, quantity: quantity, item_price: price });
    }

    var params = {
      currency: ecommerce.currency || 'BDT',
      value: Number(ecommerce.value || 0),
      content_type: 'product',
      content_ids: contentIds,
      contents: contents,
      order_id: transactionId
    };
    var attempts = 0;
    var completed = false;
    var deliver = function () {
      if (completed) return;
      attempts += 1;
      if (typeof root.fbq === 'function') {
        try {
          // This uses the existing browser Pixel as a resilient companion to
          // Tagioo CAPI. The identical eventID lets Meta deduplicate both.
          root.fbq('trackSingle', META_PIXEL_ID, 'Purchase', params, { eventID: eventId });
          completed = true;
          try { root.sessionStorage.setItem(sentKey, '1'); } catch (_) {}
          return;
        } catch (_) {}
      }
      if (attempts < 40) root.setTimeout(deliver, 500);
      else delete metaFallbackStarted[eventId];
    };

    root.setTimeout(deliver, 0);
    root.addEventListener('amol-gtm-ready', deliver, { once: true });
  }

  function isJsonBody(body) {
    return typeof body === 'string' && body.length > 1 && (body[0] === '{' || body[0] === '[');
  }

  function enrich(url, body) {
    var path = String(url || '');
    if (!isJsonBody(body)) return body;
    var payload = safeParse(body, null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return body;

    if (/\/api\/gtm\//.test(path)) {
      payload.user_data = payload.user_data || {};
      var trackingId = anonymousId();
      payload.user_data.analytics_anonymous_id = trackingId;
      if (!payload.user_data.customer_id) payload.user_data.customer_id = trackingId;
      return JSON.stringify(payload);
    }
    if (/\/api\/(?:v\d+\/)?order\/(?:add-order-by-(?:user|anonymous)|add|add-incomplete-order-by-(?:user|anonymous)|update-incomplete-order-by-id\/[^?]+)(?:\?|$)/.test(path)) {
      payload.attribution = attribution();
      return JSON.stringify(payload);
    }
    return body;
  }

  attribution();
  enrichPendingPurchase();

  if (typeof root.fetch === 'function') {
    var originalFetch = root.fetch;
    root.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      if (init && init.body) {
        init = Object.assign({}, init, { body: enrich(url, init.body) });
      }
      var request = originalFetch.call(this, input, init);
      if (/\/api\/(?:v\d+\/)?order\/(?:add-order-by-(?:user|anonymous)|add)(?:\?|$)/.test(String(url || ''))) {
        request.then(
          function () { root.setTimeout(enrichPendingPurchase, 0); },
          function () {}
        );
      }
      return request;
    };
  }

  if (root.XMLHttpRequest && root.XMLHttpRequest.prototype) {
    var originalOpen = root.XMLHttpRequest.prototype.open;
    var originalSend = root.XMLHttpRequest.prototype.send;
    root.XMLHttpRequest.prototype.open = function (method, url) {
      this.__amolRequestUrl = url;
      return originalOpen.apply(this, arguments);
    };
    root.XMLHttpRequest.prototype.send = function (body) {
      if (/\/api\/(?:v\d+\/)?order\/(?:add-order-by-(?:user|anonymous)|add)(?:\?|$)/.test(String(this.__amolRequestUrl || ''))) {
        this.addEventListener('loadend', function () { root.setTimeout(enrichPendingPurchase, 0); }, { once: true });
      }
      return originalSend.call(this, enrich(this.__amolRequestUrl, body));
    };
  }
})(window);`;
