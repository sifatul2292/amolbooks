/**
 * Bought-Together Widget — injected into the compiled Angular admin.
 * Runs synchronously in <head> so fetch/XHR patches fire before Angular boots.
 *
 * Works on both:
 *   /product/edit-product/:id   (loads existing BT config)
 *   /product/add-product        (intercepts save to apply BT config to new product)
 */
(function () {
  'use strict';

  var API = window.location.hostname==="localhost" ? "http://localhost:3000" : "https://apisub.amolbooks.com";
  var capturedToken = null;
  var currentProductId = null;   // null on add page
  var isAddPage = false;
  var selectedProducts = [];     // [{_id, name, images, salePrice}]
  var pendingNewProductId = null;// set when add-product API responds
  var searchTimeout = null;
  var mountTimer = null;
  var PANEL_ID = 'bt-inline-panel';

  /* ─────────────────────────────────────────────────
   * 1. Patch fetch + XHR to capture auth token
   *    AND intercept the add-product response.
   * ───────────────────────────────────────────────── */
  var _origFetch = window.fetch;
  var _origXhrOpen = XMLHttpRequest.prototype.open;
  var _origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  // XHR token capture
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (typeof name === 'string' && name.toLowerCase() === 'administrator' && value) {
      capturedToken = value;
    }
    return _origXhrSetHeader.apply(this, arguments);
  };

  // fetch patch — token capture + add-product response interception
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    try {
      if (init && init.headers) {
        var h = init.headers;
        if (h instanceof Headers) {
          var t = h.get('administrator');
          if (t) capturedToken = t;
        } else {
          var t2 = h['administrator'] || h['Administrator'];
          if (t2) capturedToken = t2;
        }
      }
    } catch (_) {}

    var promise = _origFetch.apply(this, arguments);

    // Intercept add-product response to get the new product's _id
    if (url && url.includes('/api/product/add') && selectedProducts.length > 0) {
      return promise.then(function (response) {
        var clone = response.clone();
        clone.json().then(function (json) {
          var newId = json && json.data && json.data._id;
          if (newId) {
            var ids = selectedProducts.map(function (p) { return p._id; });
            apiPut('/api/product/update/' + newId, { boughtTogetherIds: ids })
              .then(function () { showStatus('✅ Bought Together saved!'); })
              .catch(function (e) { console.error('[BT] post-save update failed', e); });
          }
        }).catch(function () {});
        return response;
      });
    }

    return promise;
  };

  /* ─────────────────────────────────────────────────
   * 2. Route detection
   * ───────────────────────────────────────────────── */
  function getRouteInfo(path) {
    path = path || location.pathname;
    var editMatch = path.match(/\/product\/edit-product\/([a-f0-9]{24})/i);
    if (editMatch) return { type: 'edit', id: editMatch[1] };
    if (/\/product\/add-product/i.test(path)) return { type: 'add', id: null };
    return null;
  }

  function onRouteChange() {
    var info = getRouteInfo();
    if (info) {
      var newId = info.id;
      var wasAlreadyMounted = !!document.getElementById(PANEL_ID);
      var sameRoute = (newId === currentProductId) && (info.type === (isAddPage ? 'add' : 'edit'));
      if (!wasAlreadyMounted || !sameRoute) {
        currentProductId = newId;
        isAddPage = info.type === 'add';
        clearTimeout(mountTimer);
        mountTimer = setTimeout(mountPanel, 1600);
      }
    } else {
      currentProductId = null;
      isAddPage = false;
      removePanel();
    }
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
    // Re-check when Angular re-renders (shallow)
    new MutationObserver(function () { onRouteChange(); })
      .observe(document.body, { childList: true });
  });

  /* ─────────────────────────────────────────────────
   * 3. API helpers
   * ───────────────────────────────────────────────── */
  function authHeaders() {
    var h = { 'Content-Type': 'application/json' };
    if (capturedToken) h['administrator'] = capturedToken;
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

  async function fetchProductById(id) {
    var j = await apiGet('/api/product/' + id);
    return j.data || null;
  }

  async function fetchProductsByIds(ids) {
    if (!ids || !ids.length) return [];
    var j = await apiPost('/api/product/get-products-by-ids', {
      ids: ids,
      select: { name: 1, images: 1, salePrice: 1 },
    });
    return j.data || [];
  }

  // Search uses ?q= query param — that's what the backend's getAllProducts reads
  async function searchProducts(query) {
    var j = await apiPost('/api/product/get-all?q=' + encodeURIComponent(query), {
      page: 1,
      limit: 10,
      status: 'publish',
      select: { name: 1, images: 1, salePrice: 1 },
    });
    return j.data || [];
  }

  async function saveToProduct(productId, ids) {
    var res = await _origFetch(API + '/api/product/update/' + productId, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ boughtTogetherIds: ids }),
    });
    return res.ok;
  }

  /* ─────────────────────────────────────────────────
   * 4. Mount / remove
   * ───────────────────────────────────────────────── */
  async function mountPanel() {
    removePanel();
    injectStyles();
    tryRecoverToken();

    selectedProducts = [];

    if (currentProductId) {
      try {
        var product = await fetchProductById(currentProductId);
        if (product && product.boughtTogetherIds && product.boughtTogetherIds.length) {
          selectedProducts = (await fetchProductsByIds(product.boughtTogetherIds)).slice(0, 3);
        }
      } catch (e) {
        console.warn('[BT Widget] load error:', e);
      }
    }

    var anchor = findInsertionAnchor();
    if (anchor) {
      injectInline(anchor);
    } else {
      // Angular hasn't rendered yet — retry once
      clearTimeout(mountTimer);
      mountTimer = setTimeout(mountPanel, 1200);
    }
  }

  function removePanel() {
    var el = document.getElementById(PANEL_ID);
    if (el) el.remove();
  }

  /* ─────────────────────────────────────────────────
   * 5. Find where to insert in the Angular form
   * ───────────────────────────────────────────────── */
  function findInsertionAnchor() {
    // Skip our own already-injected panel
    var existing = document.getElementById(PANEL_ID);

    // Collect all top-level mat-card elements (Angular Material cards)
    var allCards = Array.prototype.slice.call(
      document.querySelectorAll('mat-card, .mat-card')
    ).filter(function (c) {
      // Exclude cards that are nested inside other mat-cards, and our own panel
      var parent = c.parentElement;
      if (!parent) return false;
      if (c.id === PANEL_ID) return false;
      // Don't include cards nested inside another mat-card
      var ancestor = parent;
      while (ancestor && ancestor !== document.body) {
        if (ancestor.tagName === 'MAT-CARD' || (ancestor.classList && ancestor.classList.contains('mat-card'))) {
          return false;
        }
        ancestor = ancestor.parentElement;
      }
      return true;
    });

    if (!allCards.length) return null;

    // Strategy 1: find card whose first-line text starts with "priority" (case-insensitive)
    var priorityCard = null;
    var videoUrlCard = null;
    for (var i = 0; i < allCards.length; i++) {
      var c = allCards[i];
      var firstLine = (c.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (firstLine.startsWith('priority')) priorityCard = c;
      if (firstLine.startsWith('video')) videoUrlCard = c;
    }

    // Strategy 2: pick the last card in the narrower right column
    // Cards in the right column are typically < 55% of viewport width
    var rightCards = allCards.filter(function (c) {
      var r = c.getBoundingClientRect();
      return r.width > 0 && r.width < window.innerWidth * 0.55;
    });
    var lastRightCard = rightCards.length ? rightCards[rightCards.length - 1] : null;

    var target = priorityCard || lastRightCard || allCards[allCards.length - 1];
    if (!target) return null;

    return { parent: target.parentElement, after: target };
  }

  /* ─────────────────────────────────────────────────
   * 6. Build and inject the inline card
   * ───────────────────────────────────────────────── */
  function injectInline(anchor) {
    var card = document.createElement('div');
    card.id = PANEL_ID;
    card.innerHTML = buildCardHTML();

    if (anchor.after && anchor.after.nextSibling) {
      anchor.parent.insertBefore(card, anchor.after.nextSibling);
    } else if (anchor.after) {
      anchor.parent.appendChild(card);
    } else {
      anchor.parent.appendChild(card);
    }

    bindEvents();
    renderSelectedList();
  }

  function buildCardHTML() {
    return [
      '<div class="bt-card-inner">',
      '  <div class="bt-card-title">',
      '    <span class="bt-title-text">Bought Together</span>',
      '    <span class="bt-badge" id="bt-badge">0/3</span>',
      '  </div>',
      '  <p class="bt-sub">Select up to 3 products to show in "Bought Together" on the product page.',
      '  If none selected, the global default applies.</p>',
      '  <div class="bt-selected-wrap">',
      '    <div class="bt-section-lbl">Selected Products</div>',
      '    <div id="bt-selected-list"></div>',
      '  </div>',
      '  <div class="bt-search-wrap">',
      '    <div class="bt-section-lbl">Search &amp; Add</div>',
      '    <input id="bt-search" class="bt-search-input" type="text" placeholder="Type a product name to search…" />',
      '    <div id="bt-search-results"></div>',
      '  </div>',
      '  <div class="bt-actions">',
      '    <button class="bt-btn-clear" id="bt-clear">Clear All</button>',
      '    <button class="bt-btn-save" id="bt-save">',
      isAddPage
        ? '✔ Will Save After Product is Created'
        : '💾 Save Bought Together',
      '    </button>',
      '  </div>',
      '  <div class="bt-status" id="bt-status"></div>',
      '</div>',
    ].join('');
  }

  /* ─────────────────────────────────────────────────
   * 7. Render selected products list
   * ───────────────────────────────────────────────── */
  function renderSelectedList() {
    var list = document.getElementById('bt-selected-list');
    var badge = document.getElementById('bt-badge');
    if (!list) return;

    if (badge) badge.textContent = selectedProducts.length + '/3';

    if (!selectedProducts.length) {
      list.innerHTML = '<div class="bt-empty">No products selected — global default will show on the product page.</div>';
      return;
    }

    list.innerHTML = selectedProducts.map(function (p, i) {
      return '<div class="bt-chip">' +
        '<img src="' + esc(getThumb(p)) + '" onerror="this.style.display=\'none\'" />' +
        '<span class="bt-chip-name" title="' + esc(p.name) + '">' + esc(p.name) + '</span>' +
        '<span class="bt-chip-price">৳' + (p.salePrice || 0) + '</span>' +
        '<button class="bt-chip-remove" data-i="' + i + '">Remove</button>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.bt-chip-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedProducts.splice(+btn.getAttribute('data-i'), 1);
        renderSelectedList();
        highlightResults();
      });
    });
  }

  function highlightResults() {
    var ids = selectedProducts.map(function (p) { return p._id; });
    document.querySelectorAll('#bt-search-results .bt-result-row').forEach(function (row) {
      var sel = ids.indexOf(row.dataset.id) !== -1;
      row.classList.toggle('bt-result-sel', sel);
      var ck = row.querySelector('.bt-check');
      if (ck) ck.style.opacity = sel ? '1' : '0';
    });
  }

  function renderSearchResults(products) {
    var el = document.getElementById('bt-search-results');
    if (!el) return;
    if (!products || !products.length) {
      el.innerHTML = '<div class="bt-no-results">No products found</div>';
      return;
    }
    var selIds = selectedProducts.map(function (p) { return p._id; });
    el.innerHTML = products.map(function (p) {
      var sel = selIds.indexOf(p._id) !== -1;
      return '<div class="bt-result-row' + (sel ? ' bt-result-sel' : '') + '" data-id="' + p._id + '">' +
        '<img src="' + esc(getThumb(p)) + '" onerror="this.style.display=\'none\'" />' +
        '<span class="bt-result-name" title="' + esc(p.name) + '">' + esc(p.name) + '</span>' +
        '<span class="bt-result-price">৳' + (p.salePrice || 0) + '</span>' +
        '<span class="bt-check" style="opacity:' + (sel ? '1' : '0') + '">✓</span>' +
        '</div>';
    }).join('');

    el.querySelectorAll('.bt-result-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var rid = row.dataset.id;
        var idx = selectedProducts.findIndex(function (p) { return p._id === rid; });
        if (idx !== -1) {
          selectedProducts.splice(idx, 1);
        } else {
          if (selectedProducts.length >= 3) { showStatus('Maximum 3 products allowed.', true); return; }
          var obj = products.find(function (p) { return p._id === rid; });
          if (obj) selectedProducts.push(obj);
        }
        renderSelectedList();
        highlightResults();
      });
    });
  }

  /* ─────────────────────────────────────────────────
   * 8. Event bindings
   * ───────────────────────────────────────────────── */
  function bindEvents() {
    // Search input
    var inp = document.getElementById('bt-search');
    if (inp) {
      inp.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        var q = inp.value.trim();
        var res = document.getElementById('bt-search-results');
        if (!q) { if (res) res.innerHTML = ''; return; }
        if (res) res.innerHTML = '<div class="bt-loading">Searching…</div>';
        searchTimeout = setTimeout(async function () {
          try {
            var results = await searchProducts(q);
            // exclude the product currently being edited
            if (currentProductId) {
              results = results.filter(function (p) { return p._id !== currentProductId; });
            }
            renderSearchResults(results);
          } catch (e) {
            console.error('[BT Widget] search error:', e);
            var el = document.getElementById('bt-search-results');
            if (el) el.innerHTML = '<div class="bt-no-results" style="color:#d32f2f">Search failed — check console</div>';
          }
        }, 400);
      });
    }

    // Clear button
    var clr = document.getElementById('bt-clear');
    if (clr) {
      clr.addEventListener('click', function () {
        selectedProducts = [];
        renderSelectedList();
        highlightResults();
      });
    }

    // Save button (only for edit page — add page uses response interception)
    var sav = document.getElementById('bt-save');
    if (sav) {
      if (isAddPage) {
        sav.disabled = true;
        sav.title = 'BT products will be saved automatically after the product is created.';
      } else {
        sav.addEventListener('click', async function () {
          sav.disabled = true;
          sav.textContent = 'Saving…';
          try {
            var ids = selectedProducts.map(function (p) { return p._id; });
            var ok = await saveToProduct(currentProductId, ids);
            showStatus(ok ? '✅ Saved successfully!' : 'Save failed.', !ok);
          } catch (e) {
            console.error('[BT Widget] save error:', e);
            showStatus('Save failed — see console.', true);
          }
          sav.disabled = false;
          sav.textContent = '💾 Save Bought Together';
        });
      }
    }
  }

  function showStatus(msg, isErr) {
    var el = document.getElementById('bt-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#d32f2f' : '#2e7d32';
    setTimeout(function () { if (el) el.textContent = ''; }, 4000);
  }

  /* ─────────────────────────────────────────────────
   * 9. Helpers
   * ───────────────────────────────────────────────── */
  function getThumb(p) {
    var img = Array.isArray(p.images) ? p.images[0] : p.images;
    if (!img) return '';
    return img.startsWith('http') ? img : API + '/upload/static/' + img;
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function tryRecoverToken() {
    if (capturedToken) return;
    try {
      var keys = ['admin_token', 'adminToken', 'token', 'administrator'];
      for (var i = 0; i < keys.length; i++) {
        var v = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if (v && v.length > 20 && !v.startsWith('{')) { capturedToken = v; return; }
      }
    } catch (_) {}
  }

  /* ─────────────────────────────────────────────────
   * 10. Styles — match Angular Material admin look
   * ───────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('bt-styles')) return;
    var s = document.createElement('style');
    s.id = 'bt-styles';
    s.textContent = [
      /* Card wrapper — matches other cards on the page */
      '#bt-inline-panel{',
      '  background:#fff;',
      '  border-radius:4px;',
      '  box-shadow:0 2px 1px -1px rgba(0,0,0,.2),0 1px 1px 0 rgba(0,0,0,.14),0 1px 3px 0 rgba(0,0,0,.12);',
      '  margin-bottom:16px;',
      '  overflow:hidden;',
      '}',
      '#bt-inline-panel .bt-card-inner{padding:20px 24px 16px}',

      /* Title row */
      '#bt-inline-panel .bt-card-title{',
      '  display:flex;align-items:center;gap:10px;',
      '  border-left:3px solid #3f51b5;padding-left:10px;margin-bottom:8px',
      '}',
      '#bt-inline-panel .bt-title-text{font-size:15px;font-weight:700;color:#1a1a2e}',
      '#bt-inline-panel .bt-badge{',
      '  background:#3f51b5;color:#fff;border-radius:999px;',
      '  padding:1px 9px;font-size:11px;font-weight:700',
      '}',
      '#bt-inline-panel .bt-sub{font-size:12px;color:#757575;margin:0 0 16px;line-height:1.5}',

      /* Section labels */
      '#bt-inline-panel .bt-section-lbl{',
      '  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;',
      '  color:#9e9e9e;margin-bottom:8px',
      '}',

      /* Selected chips */
      '#bt-inline-panel .bt-selected-wrap{margin-bottom:16px}',
      '#bt-inline-panel .bt-empty{font-size:12px;color:#bdbdbd;font-style:italic;padding:4px 0 8px}',
      '#bt-inline-panel .bt-chip{',
      '  display:flex;align-items:center;gap:10px;',
      '  background:#f5f5f5;border:1px solid #e0e0e0;',
      '  border-radius:6px;padding:8px 10px;margin-bottom:6px',
      '}',
      '#bt-inline-panel .bt-chip img{',
      '  width:36px;height:36px;object-fit:cover;border-radius:4px;',
      '  background:#e0e0e0;flex-shrink:0',
      '}',
      '#bt-inline-panel .bt-chip-name{',
      '  flex:1;font-size:13px;color:#212121;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
      '}',
      '#bt-inline-panel .bt-chip-price{font-size:12px;color:#2e7d32;white-space:nowrap;font-weight:600}',
      '#bt-inline-panel .bt-chip-remove{',
      '  background:none;border:1px solid #ef9a9a;color:#d32f2f;',
      '  border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;',
      '  white-space:nowrap;flex-shrink:0;transition:background .15s',
      '}',
      '#bt-inline-panel .bt-chip-remove:hover{background:#ffebee}',

      /* Search */
      '#bt-inline-panel .bt-search-wrap{margin-bottom:16px}',
      '#bt-inline-panel .bt-search-input{',
      '  width:100%;border:1px solid #bdbdbd;border-radius:4px;',
      '  padding:9px 12px;font-size:13px;color:#212121;',
      '  box-sizing:border-box;outline:none;margin-bottom:6px;',
      '  font-family:inherit;transition:border-color .2s',
      '}',
      '#bt-inline-panel .bt-search-input:focus{border-color:#3f51b5}',
      '#bt-inline-panel .bt-search-input::placeholder{color:#bdbdbd}',

      /* Search results */
      '#bt-inline-panel .bt-result-row{',
      '  display:flex;align-items:center;gap:10px;',
      '  padding:8px 10px;border-radius:5px;cursor:pointer;',
      '  transition:background .15s;margin-bottom:3px',
      '}',
      '#bt-inline-panel .bt-result-row:hover{background:#f5f5f5}',
      '#bt-inline-panel .bt-result-sel{background:#e8eaf6 !important}',
      '#bt-inline-panel .bt-result-row img{',
      '  width:32px;height:32px;object-fit:cover;border-radius:4px;',
      '  background:#e0e0e0;flex-shrink:0',
      '}',
      '#bt-inline-panel .bt-result-name{',
      '  flex:1;font-size:12px;color:#212121;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
      '}',
      '#bt-inline-panel .bt-result-price{font-size:11px;color:#2e7d32;white-space:nowrap;font-weight:600}',
      '#bt-inline-panel .bt-check{font-size:14px;color:#3f51b5;font-weight:700;flex-shrink:0;transition:opacity .15s}',
      '#bt-inline-panel .bt-loading{font-size:12px;color:#9e9e9e;padding:6px 0;text-align:center}',
      '#bt-inline-panel .bt-no-results{font-size:12px;color:#bdbdbd;padding:6px 0;text-align:center;font-style:italic}',

      /* Action row */
      '#bt-inline-panel .bt-actions{display:flex;gap:10px;padding-top:4px}',
      '#bt-inline-panel .bt-btn-save{',
      '  flex:1;background:#3f51b5;color:#fff;border:none;',
      '  border-radius:4px;padding:10px 0;font-size:13px;font-weight:700;',
      '  cursor:pointer;transition:background .15s;font-family:inherit',
      '}',
      '#bt-inline-panel .bt-btn-save:hover:not(:disabled){background:#303f9f}',
      '#bt-inline-panel .bt-btn-save:disabled{background:#9fa8da;cursor:default}',
      '#bt-inline-panel .bt-btn-clear{',
      '  background:#fff;color:#616161;border:1px solid #bdbdbd;',
      '  border-radius:4px;padding:10px 16px;font-size:13px;',
      '  cursor:pointer;transition:background .15s;font-family:inherit',
      '}',
      '#bt-inline-panel .bt-btn-clear:hover{background:#f5f5f5}',

      /* Status */
      '#bt-inline-panel .bt-status{font-size:12px;min-height:18px;padding:6px 0 0;font-weight:600}',
    ].join('\n');
    document.head.appendChild(s);
  }

})();
