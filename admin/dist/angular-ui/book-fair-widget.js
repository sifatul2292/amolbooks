/**
 * Book Fair Bestseller Widget — injected into the compiled Angular admin.
 *
 * Adds a small product-edit panel where admins can mark a product for the
 * homepage bookfair section, choose its category card, and set display priority.
 */
(function () {
  'use strict';

  var API = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://apisub.amolbooks.com';
  var PANEL_ID = 'bf-inline-panel';
  var STYLE_ID = 'bf-widget-styles';
  var capturedToken = null;
  var currentProductId = null;
  var isAddPage = false;
  var mountTimer = null;
  var categories = [];
  var currentProduct = null;
  var pendingConfig = {
    isEnabled: false,
    category: null,
    priority: null,
  };

  var _origFetch = window.fetch;
  var _origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (typeof name === 'string' && name.toLowerCase() === 'administrator' && value) {
      capturedToken = value;
    }
    return _origXhrSetHeader.apply(this, arguments);
  };

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    tryCaptureToken(init);

    var promise = _origFetch.apply(this, arguments);

    if (url && url.indexOf('/api/product/add') !== -1 && hasMeaningfulConfig()) {
      return promise.then(function (response) {
        var clone = response.clone();
        clone.json().then(function (json) {
          var newId = json && json.data && json.data._id;
          if (newId) {
            saveToProduct(newId)
              .then(function () { showStatus('Book Fair setting saved.'); })
              .catch(function (e) { console.error('[BookFair] post-create save failed', e); });
          }
        }).catch(function () {});
        return response;
      });
    }

    return promise;
  };

  function tryCaptureToken(init) {
    try {
      if (!init || !init.headers) return;
      var h = init.headers;
      if (h instanceof Headers) {
        var t = h.get('administrator');
        if (t) capturedToken = t;
      } else {
        var t2 = h.administrator || h.Administrator;
        if (t2) capturedToken = t2;
      }
    } catch (_) {}
  }

  function authHeaders() {
    var h = { 'Content-Type': 'application/json' };
    if (capturedToken) h.administrator = capturedToken;
    return h;
  }

  function apiGet(path) {
    return _origFetch(API + path, { headers: authHeaders() }).then(function (r) { return r.json(); });
  }

  function apiPost(path, body) {
    return _origFetch(API + path, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function apiPut(path, body) {
    return _origFetch(API + path, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  }

  function getRouteInfo(path) {
    path = path || location.pathname;
    var editMatch = path.match(/\/product\/edit-product\/([a-f0-9]{24})/i);
    if (editMatch) return { type: 'edit', id: editMatch[1] };
    if (/\/product\/add-product/i.test(path)) return { type: 'add', id: null };
    return null;
  }

  function onRouteChange() {
    var info = getRouteInfo();
    if (!info) {
      currentProductId = null;
      isAddPage = false;
      removePanel();
      return;
    }

    var sameRoute = currentProductId === info.id && isAddPage === (info.type === 'add');
    if (sameRoute && document.getElementById(PANEL_ID)) return;

    currentProductId = info.id;
    isAddPage = info.type === 'add';
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mountPanel, 1600);
  }

  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      orig.apply(this, arguments);
      setTimeout(onRouteChange, 80);
    };
  });
  window.addEventListener('popstate', onRouteChange);
  document.addEventListener('DOMContentLoaded', function () {
    onRouteChange();
    new MutationObserver(function () { onRouteChange(); })
      .observe(document.body, { childList: true });
  });

  async function mountPanel() {
    removePanel();
    injectStyles();
    tryRecoverToken();

    currentProduct = null;
    pendingConfig = { isEnabled: false, category: null, priority: null };

    try {
      if (!categories.length) categories = await fetchCategories();
      if (currentProductId) {
        currentProduct = await fetchProductById(currentProductId);
        var saved = currentProduct && currentProduct.bookFairBestseller;
        pendingConfig = {
          isEnabled: !!(saved && saved.isEnabled),
          category: (saved && saved.category) || firstProductCategory(currentProduct),
          priority: saved && saved.priority ? saved.priority : null,
        };
      } else {
        pendingConfig.category = categories[0] || null;
      }
    } catch (e) {
      console.warn('[BookFair] load error', e);
    }

    var anchor = findInsertionAnchor();
    if (!anchor) {
      clearTimeout(mountTimer);
      mountTimer = setTimeout(mountPanel, 1200);
      return;
    }

    injectInline(anchor);
  }

  function removePanel() {
    var el = document.getElementById(PANEL_ID);
    if (el) el.remove();
  }

  async function fetchProductById(id) {
    var j = await apiGet('/api/product/' + id);
    return j.data || null;
  }

  async function fetchCategories() {
    var j = await apiPost('/api/category/get-all', {
      filter: null,
      pagination: null,
      select: { name: 1, nameEn: 1, slug: 1 },
      sort: { name: 1 },
    });
    return j.data || [];
  }

  function findInsertionAnchor() {
    var allCards = Array.prototype.slice.call(document.querySelectorAll('mat-card, .mat-card')).filter(function (c) {
      var parent = c.parentElement;
      if (!parent || c.id === PANEL_ID) return false;
      var ancestor = parent;
      while (ancestor && ancestor !== document.body) {
        if (ancestor.tagName === 'MAT-CARD' || (ancestor.classList && ancestor.classList.contains('mat-card'))) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
    if (!allCards.length) return null;

    var bt = document.getElementById('bt-inline-panel');
    if (bt && bt.parentElement) return { parent: bt.parentElement, after: bt };

    var rightCards = allCards.filter(function (c) {
      var r = c.getBoundingClientRect();
      return r.width > 0 && r.width < window.innerWidth * 0.55;
    });
    var priorityCard = allCards.find(function (c) {
      return (c.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().startsWith('priority');
    });
    var target = priorityCard || rightCards[rightCards.length - 1] || allCards[allCards.length - 1];
    return target ? { parent: target.parentElement, after: target } : null;
  }

  function injectInline(anchor) {
    var card = document.createElement('div');
    card.id = PANEL_ID;
    card.innerHTML = buildCardHTML();

    if (anchor.after && anchor.after.nextSibling) {
      anchor.parent.insertBefore(card, anchor.after.nextSibling);
    } else {
      anchor.parent.appendChild(card);
    }

    bindEvents();
    updatePreview();
  }

  function buildCardHTML() {
    return [
      '<div class="bf-card-inner">',
      '  <div class="bf-card-title">',
      '    <span class="bf-title-text">Book Fair Bestseller</span>',
      '    <span class="bf-badge" id="bf-badge">2026</span>',
      '  </div>',
      '  <p class="bf-sub">Tick this product for the homepage bookfair section, choose its category card, then set priority. Priority 1 shows first.</p>',
      '  <label class="bf-toggle-row">',
      '    <input id="bf-enabled" type="checkbox" ' + (pendingConfig.isEnabled ? 'checked' : '') + ' />',
      '    <span class="bf-checkmark">✓</span>',
      '    <span>Show in বইমেলা বেস্টসেলার ২০২৬</span>',
      '  </label>',
      '  <div class="bf-fields">',
      '    <label><span>Category Card</span><select id="bf-category">' + categoryOptionsHTML() + '</select></label>',
      '    <label><span>Priority</span><input id="bf-priority" type="number" min="1" step="1" placeholder="1" value="' + esc(pendingConfig.priority || '') + '" /></label>',
      '  </div>',
      '  <div class="bf-preview" id="bf-preview"></div>',
      '  <div class="bf-actions">',
      '    <button class="bf-btn-clear" id="bf-clear">Clear</button>',
      '    <button class="bf-btn-save" id="bf-save">' + (isAddPage ? 'Will Save After Product is Created' : 'Save Book Fair') + '</button>',
      '  </div>',
      '  <div class="bf-status" id="bf-status"></div>',
      '</div>',
    ].join('');
  }

  function categoryOptionsHTML() {
    var selectedSlug = pendingConfig.category && pendingConfig.category.slug;
    return categories.map(function (cat) {
      var sel = cat.slug === selectedSlug ? ' selected' : '';
      return '<option value="' + esc(cat._id) + '"' + sel + ' data-name="' + esc(cat.name || '') + '" data-name-en="' + esc(cat.nameEn || '') + '" data-slug="' + esc(cat.slug || '') + '">' + esc(cat.name || cat.nameEn || cat.slug || 'Category') + '</option>';
    }).join('');
  }

  function bindEvents() {
    var enabled = document.getElementById('bf-enabled');
    var category = document.getElementById('bf-category');
    var priority = document.getElementById('bf-priority');
    var clear = document.getElementById('bf-clear');
    var save = document.getElementById('bf-save');

    [enabled, category, priority].forEach(function (el) {
      if (el) el.addEventListener('change', readFormAndPreview);
      if (el && el.tagName === 'INPUT') el.addEventListener('input', readFormAndPreview);
    });

    if (clear) {
      clear.addEventListener('click', function () {
        pendingConfig = { isEnabled: false, category: getSelectedCategory(), priority: null };
        if (enabled) enabled.checked = false;
        if (priority) priority.value = '';
        updatePreview();
      });
    }

    if (save) {
      if (isAddPage) {
        save.disabled = true;
        save.title = 'Book Fair setting will save automatically after product creation.';
      } else {
        save.addEventListener('click', async function () {
          readForm();
          save.disabled = true;
          save.textContent = 'Saving...';
          try {
            var ok = await saveToProduct(currentProductId);
            showStatus(ok ? 'Saved successfully.' : 'Save failed.', !ok);
          } catch (e) {
            console.error('[BookFair] save error', e);
            showStatus('Save failed. Check console.', true);
          }
          save.disabled = false;
          save.textContent = 'Save Book Fair';
        });
      }
    }
  }

  function readFormAndPreview() {
    readForm();
    updatePreview();
  }

  function readForm() {
    var enabled = document.getElementById('bf-enabled');
    var priority = document.getElementById('bf-priority');
    pendingConfig = {
      isEnabled: !!(enabled && enabled.checked),
      category: getSelectedCategory(),
      priority: priority && priority.value ? Math.max(1, Number(priority.value)) : null,
    };
  }

  function getSelectedCategory() {
    var select = document.getElementById('bf-category');
    if (!select || !select.options.length) return null;
    var opt = select.options[select.selectedIndex];
    return {
      _id: opt.value,
      name: opt.getAttribute('data-name') || opt.textContent,
      nameEn: opt.getAttribute('data-name-en') || '',
      slug: opt.getAttribute('data-slug') || '',
    };
  }

  function updatePreview() {
    var preview = document.getElementById('bf-preview');
    if (!preview) return;
    var cat = pendingConfig.category || getSelectedCategory();
    preview.innerHTML = [
      '<div><strong>Status:</strong> ' + (pendingConfig.isEnabled ? 'Selected ✓' : 'Not selected') + '</div>',
      '<div><strong>Card:</strong> ' + esc(cat && cat.name ? cat.name : 'No category') + '</div>',
      '<div><strong>Priority:</strong> ' + esc(pendingConfig.priority || '-') + '</div>',
    ].join('');
  }

  async function saveToProduct(productId) {
    var payload = {
      bookFairBestseller: {
        isEnabled: !!pendingConfig.isEnabled,
        priority: pendingConfig.priority || null,
        category: pendingConfig.category || null,
      },
    };
    var res = await apiPut('/api/product/update/' + productId, payload);
    return res.ok;
  }

  function hasMeaningfulConfig() {
    return !!(pendingConfig.isEnabled || pendingConfig.priority || pendingConfig.category);
  }

  function firstProductCategory(product) {
    var cats = product && product.category;
    if (!cats) return categories[0] || null;
    if (Array.isArray(cats)) return cats[0] || categories[0] || null;
    return cats;
  }

  function showStatus(msg, isErr) {
    var el = document.getElementById('bf-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#d32f2f' : '#2e7d32';
    setTimeout(function () { if (el) el.textContent = ''; }, 4000);
  }

  function tryRecoverToken() {
    if (capturedToken) return;
    try {
      var keys = ['admin_token', 'adminToken', 'token', 'administrator'];
      for (var i = 0; i < keys.length; i++) {
        var v = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if (v && v.length > 20 && !v.startsWith('{')) {
          capturedToken = v;
          return;
        }
      }
    } catch (_) {}
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#bf-inline-panel{background:#fff;border-radius:4px;box-shadow:0 2px 1px -1px rgba(0,0,0,.2),0 1px 1px 0 rgba(0,0,0,.14),0 1px 3px 0 rgba(0,0,0,.12);margin-bottom:16px;overflow:hidden}',
      '#bf-inline-panel .bf-card-inner{padding:20px 24px 16px}',
      '#bf-inline-panel .bf-card-title{display:flex;align-items:center;gap:10px;border-left:3px solid #8b2031;padding-left:10px;margin-bottom:8px}',
      '#bf-inline-panel .bf-title-text{font-size:15px;font-weight:700;color:#1a1a2e}',
      '#bf-inline-panel .bf-badge{background:#8b2031;color:#fff;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:700}',
      '#bf-inline-panel .bf-sub{font-size:12px;color:#757575;margin:0 0 16px;line-height:1.5}',
      '#bf-inline-panel .bf-toggle-row{display:flex;align-items:center;gap:9px;background:#f9f3f4;border:1px solid #ead4d8;border-radius:6px;padding:10px;margin-bottom:14px;font-size:13px;color:#212121;cursor:pointer}',
      '#bf-inline-panel .bf-toggle-row input{width:16px;height:16px;accent-color:#8b2031}',
      '#bf-inline-panel .bf-checkmark{color:#8b2031;font-weight:800}',
      '#bf-inline-panel .bf-fields{display:grid;grid-template-columns:1fr 110px;gap:10px;margin-bottom:12px}',
      '#bf-inline-panel label span{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9e9e9e;margin-bottom:6px}',
      '#bf-inline-panel select,#bf-inline-panel input[type=number]{width:100%;border:1px solid #bdbdbd;border-radius:4px;padding:9px 10px;font-size:13px;color:#212121;box-sizing:border-box;outline:none;font-family:inherit}',
      '#bf-inline-panel select:focus,#bf-inline-panel input[type=number]:focus{border-color:#8b2031}',
      '#bf-inline-panel .bf-preview{background:#fafafa;border:1px solid #eee;border-radius:6px;padding:9px 10px;margin-bottom:14px;font-size:12px;color:#616161;line-height:1.6}',
      '#bf-inline-panel .bf-actions{display:flex;gap:10px;padding-top:4px}',
      '#bf-inline-panel .bf-btn-save{flex:1;background:#8b2031;color:#fff;border:none;border-radius:4px;padding:10px 0;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit}',
      '#bf-inline-panel .bf-btn-save:hover:not(:disabled){background:#731727}',
      '#bf-inline-panel .bf-btn-save:disabled{background:#caa4ac;cursor:default}',
      '#bf-inline-panel .bf-btn-clear{background:#fff;color:#616161;border:1px solid #bdbdbd;border-radius:4px;padding:10px 16px;font-size:13px;cursor:pointer;transition:background .15s;font-family:inherit}',
      '#bf-inline-panel .bf-btn-clear:hover{background:#f5f5f5}',
      '#bf-inline-panel .bf-status{font-size:12px;min-height:18px;padding:6px 0 0;font-weight:600}',
      '@media(max-width:700px){#bf-inline-panel .bf-fields{grid-template-columns:1fr}}',
    ].join('\n');
    document.head.appendChild(s);
  }
})();
