export const STOREFRONT_ATTRIBUTION_SCRIPT = String.raw`(function (root) {
  'use strict';
  if (!root || root.__amolAttributionInstalled) return;
  root.__amolAttributionInstalled = true;

  var STORAGE_KEY = 'amol_attribution_v1';
  var ANON_KEY = 'amol_analytics_anonymous_id';

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

  function currentTouch() {
    var search = new URLSearchParams(root.location.search || '');
    var referrer = document.referrer || '';
    var externalReferrer = '';
    try {
      if (referrer && new URL(referrer).hostname !== root.location.hostname) externalReferrer = referrer;
    } catch (_) {}
    var fbclid = param(search, ['fbclid']);
    var fbc = cookie('_fbc');
    var fbp = cookie('_fbp');
    var source = param(search, ['utm_source']);
    if (!source && fbclid) source = 'facebook';
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
      fbc: fbc,
      fbp: fbp,
      capturedAt: new Date().toISOString(),
      hasCampaignSignal: !!(source || fbclid || externalReferrer)
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
    } catch (_) {}
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
      return originalFetch.call(this, input, init);
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
      return originalSend.call(this, enrich(this.__amolRequestUrl, body));
    };
  }
})(window);`;
