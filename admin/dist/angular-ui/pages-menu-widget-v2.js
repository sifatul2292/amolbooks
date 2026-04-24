/**
 * Dynamic Pages + Redirect URLs Admin Widget
 * Injected into the compiled Angular admin so additional pages and URL redirects
 * can be managed from the Additional Pages route.
 */
(function () {
  'use strict';

  var API = window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://api.shobaz.com';
  var PANEL_ID   = 'pm-panel';
  var RU_PANEL_ID = 'ru-panel';
  var STYLES_ID  = 'pm-styles';
  var ROUTE_MATCHERS = ['additionl-page', 'additional-page'];
  var PAGE_LIST_ROUTE_MATCHERS = ['page-list'];
  var mountTimer = null;

  // Pages state
  var pages = [];
  var editingId = null;
  var searchTerm = '';

  // Redirect URLs state
  var redirects = [];
  var ruEditingId = null;
  var ruSaving = false;

  if (!window._shobazAdminToken) window._shobazAdminToken = null;

  var _origFetch = window._pmOrigFetch || window.fetch;
  var _origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  if (!window._shobazXhrPatched) {
    window._shobazXhrPatched = true;
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      if (typeof name === 'string' && name.toLowerCase() === 'administrator' && value) {
        window._shobazAdminToken = value;
      }
      return _origXhrSetHeader.apply(this, arguments);
    };
  }

  if (!window._shobazFetchPatched) {
    window._shobazFetchPatched = true;
    window._pmOrigFetch = window.fetch;
    _origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        if (init && init.headers) {
          var h = init.headers;
          if (h instanceof Headers) {
            var t = h.get('administrator');
            if (t) window._shobazAdminToken = t;
          } else {
            var t2 = h['administrator'] || h['Administrator'];
            if (t2) window._shobazAdminToken = t2;
          }
        }
      } catch (_) {}
      return _origFetch.apply(this, arguments);
    };
  }

  function getToken() {
    if (window._shobazAdminToken) return window._shobazAdminToken;
    try {
      var keys = ['admin_token', 'adminToken', 'token', 'administrator'];
      for (var i = 0; i < keys.length; i++) {
        var value = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if (value && value.length > 20 && !value.startsWith('{')) {
          window._shobazAdminToken = value;
          return value;
        }
      }
    } catch (_) {}
    return null;
  }

  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers.administrator = token;
    return headers;
  }

  function isPagesRoute() {
    var path = location.pathname || '';
    for (var i = 0; i < ROUTE_MATCHERS.length; i++) {
      if (path.indexOf(ROUTE_MATCHERS[i]) !== -1) return true;
    }
    return false;
  }

  function onRouteChange() {
    if (isPagesRoute()) {
      clearTimeout(mountTimer);
      mountTimer = setTimeout(mountAll, 500);
    } else {
      removeAll();
    }
  }

  ['pushState', 'replaceState'].forEach(function (fn) {
    var original = history[fn];
    history[fn] = function () {
      original.apply(this, arguments);
      setTimeout(onRouteChange, 80);
    };
  });

  window.addEventListener('popstate', onRouteChange);

  document.addEventListener('DOMContentLoaded', function () {
    onRouteChange();
    new MutationObserver(function () {
      if (isPagesRoute()) {
        if (!document.getElementById(PANEL_ID)) {
          clearTimeout(mountTimer);
          mountTimer = setTimeout(mountAll, 500);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    startRuWatcher();
  });

  /* ─────────────────── API helpers ─────────────────── */

  function apiRequest(path, options) {
    return _origFetch(API + path, options).then(async function (response) {
      var json = null;
      try { json = await response.json(); } catch (_) { json = null; }
      if (!response.ok) {
        var error = new Error((json && (json.message || json.error)) || 'Request failed');
        error.payload = json;
        throw error;
      }
      return json;
    });
  }

  function apiGet(path)         { return apiRequest(path, { headers: authHeaders() }); }
  function apiPost(path, body)  { return apiRequest(path, { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }); }
  function apiPut(path, body)   { return apiRequest(path, { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }); }
  function apiDelete(path)      { return apiRequest(path, { method: 'DELETE', headers: authHeaders() }); }

  /* ─────────────────── Mount / remove ─────────────────── */

  async function mountAll() {
    removeAll();
    injectStyles();

    var container = findContainer();
    if (!container) {
      clearTimeout(mountTimer);
      mountTimer = setTimeout(mountAll, 900);
      return;
    }

    // Fetch pages data
    try { await fetchPages(); } catch (e) { console.warn('[Pages Widget] load failed:', e); pages = []; }

    // Re-find container after await — Angular may have re-rendered
    container = findContainer() || container;

    // Mount pages panel
    var pPanel = document.createElement('div');
    pPanel.id = PANEL_ID;
    pPanel.innerHTML = buildPanelHTML();
    container.appendChild(pPanel);
    bindPanelEvents();

    // Redirect panel is mounted by its own independent watcher (startRuWatcher)
    // which fires as soon as pm-panel appears in the DOM.
  }

  /* ── Independent watcher for the Redirect URLs panel ──────────────────
     Completely decoupled from mountAll(). Watches for pm-panel to exist
     on the correct route and inserts ru-panel right after it.
     Retries automatically if Angular removes it.                         */
  function startRuWatcher() {
    var ruTimer = null;

    function tryMountRu() {
      if (!isPagesRoute()) return;

      var pmPanel = document.getElementById(PANEL_ID);
      var ruPanel = document.getElementById(RU_PANEL_ID);

      if (!pmPanel) {
        // Pages panel not ready yet — retry shortly
        ruTimer = setTimeout(tryMountRu, 300);
        return;
      }

      if (ruPanel) return; // already mounted

      console.log('[Redirects Widget] mounting ru-panel…');
      try {
        injectStyles();
        var rPanel = document.createElement('div');
        rPanel.id = RU_PANEL_ID;
        rPanel.innerHTML = buildRuPanelHTML();
        // Insert immediately after pm-panel (not inside a container that may re-render)
        pmPanel.insertAdjacentElement('afterend', rPanel);
        bindRuEvents();
        console.log('[Redirects Widget] ru-panel mounted, loading data…');
        fetchRedirects()
          .then(function () { rerenderRu(); console.log('[Redirects Widget] data loaded'); })
          .catch(function (e) { console.warn('[Redirects Widget] data load failed:', e); });
      } catch (e) {
        console.error('[Redirects Widget] mount error:', e);
      }
    }

    // Watch for DOM changes — re-mount ru-panel whenever pm-panel exists without it
    var obs = new MutationObserver(function () {
      if (!isPagesRoute()) return;
      var pmPanel = document.getElementById(PANEL_ID);
      var ruPanel = document.getElementById(RU_PANEL_ID);
      if (pmPanel && !ruPanel) {
        clearTimeout(ruTimer);
        ruTimer = setTimeout(tryMountRu, 150);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Also try on route changes
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () {
        orig.apply(this, arguments);
        setTimeout(tryMountRu, 600);
      };
    });

    // Initial attempt
    setTimeout(tryMountRu, 800);
  }

  function removeAll() {
    var p = document.getElementById(PANEL_ID);    if (p) p.remove();
    var r = document.getElementById(RU_PANEL_ID); if (r) r.remove();
  }

  function findContainer() {
    var path = location.pathname || '';
    var pageListRoute = PAGE_LIST_ROUTE_MATCHERS.some(function (segment) {
      return path.indexOf(segment) !== -1;
    });

    if (pageListRoute) {
      var listCard = document.querySelector('app-page-list mat-card, app-page-list .mat-card');
      if (listCard && listCard.parentElement) return listCard.parentElement;
      var pageListHost = document.querySelector('app-page-list');
      if (pageListHost) return pageListHost;
    }

    var viewForm = document.querySelector('app-view-page .container, app-view-page');
    if (viewForm) return viewForm;

    var contentArea = document.querySelector('.all-page-render, .page-render-area-main, .dashboard-page-render');
    if (contentArea) return contentArea;

    return null;
  }

  /* ─────────────────── PAGES PANEL (unchanged) ─────────────────── */

  async function fetchPages() {
    var response = await apiGet('/api/additional-page/get-all?includeInactive=true');
    var list = response && response.data ? response.data : [];
    pages = Array.isArray(list) ? list.slice().sort(sortPages) : [];
  }

  function sortPages(a, b) {
    var aHeader = typeof a.headerOrder === 'number' ? a.headerOrder : 999;
    var bHeader = typeof b.headerOrder === 'number' ? b.headerOrder : 999;
    var aFooter = typeof a.footerOrder === 'number' ? a.footerOrder : 999;
    var bFooter = typeof b.footerOrder === 'number' ? b.footerOrder : 999;
    if (aHeader !== bHeader) return aHeader - bHeader;
    if (aFooter !== bFooter) return aFooter - bFooter;
    return String(a.name || '').localeCompare(String(b.name || ''));
  }

  function buildPanelHTML() {
    return [
      '<div class="pm-shell">',
      '  <div class="pm-header">',
      '    <div>',
      '      <div class="pm-title">Dynamic Pages</div>',
      '      <div class="pm-subtitle">Create pages, edit HTML, and place them in header or footer.</div>',
      '    </div>',
      '    <button class="pm-icon-btn" id="pm-close" title="Collapse section">−</button>',
      '  </div>',
      '  <div class="pm-toolbar">',
      '    <input id="pm-search" class="pm-input pm-search" placeholder="Search pages..." value="' + escAttr(searchTerm) + '" />',
      '    <button class="pm-btn pm-btn-muted" id="pm-refresh">Refresh</button>',
      '    <button class="pm-btn" id="pm-new-page">New Page</button>',
      '  </div>',
      '  <div class="pm-body" id="pm-body">',
      '    <div class="pm-grid">',
      '      <div class="pm-col pm-col-list">',
               buildPagesListHTML(),
      '      </div>',
      '      <div class="pm-col pm-col-form">',
               buildFormHTML(getEditingPage()),
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function buildPagesListHTML() {
    var filtered = getFilteredPages();
    var rows = filtered.length ? filtered.map(buildPageRowHTML).join('') : '<div class="pm-empty">No pages found.</div>';
    return [
      '<div class="pm-section-head">',
      '  <span>All Pages</span>',
      '  <span class="pm-badge">' + filtered.length + '</span>',
      '</div>',
      '<div class="pm-list">' + rows + '</div>',
    ].join('');
  }

  function buildPageRowHTML(page) {
    var activeClass = page._id === editingId ? ' pm-row-active' : '';
    return [
      '<button class="pm-row' + activeClass + '" data-edit-id="' + escAttr(page._id || '') + '">',
      '  <div class="pm-row-top">',
      '    <span class="pm-row-name">' + esc(page.name || 'Untitled Page') + '</span>',
      '    <span class="pm-status-chip ' + (page.isActive === false ? 'pm-status-off' : 'pm-status-on') + '">' + (page.isActive === false ? 'Inactive' : 'Active') + '</span>',
      '  </div>',
      '  <div class="pm-row-meta">/' + esc(page.slug || '') + (page.menuLabel ? ' • Menu: ' + esc(page.menuLabel) : '') + '</div>',
      '  <div class="pm-row-meta">' + menuSummary(page) + '</div>',
      '</button>',
    ].join('');
  }

  function buildFormHTML(page) {
    var draft = page || { name: '', slug: '', menuLabel: '', isHtml: true, isActive: true, showInHeader: false, showInFooter: false, footerGroup: 'policy', headerOrder: 99, footerOrder: 99, content: '', description: '' };
    return [
      '<div class="pm-section-head">',
      '  <span>' + (page ? 'Edit Page' : 'Create Page') + '</span>',
      '  <span class="pm-badge">' + (page ? esc(page.slug || '') : 'new') + '</span>',
      '</div>',
      '<div id="pm-form-message" class="pm-form-message"></div>',
      '<form id="pm-form" class="pm-form">',
      '  <input type="hidden" id="pm-page-id" value="' + escAttr(page && page._id ? page._id : '') + '" />',
      '  <div class="pm-form-grid">',
      fieldHTML('Page Name', '<input id="pm-name" class="pm-input" value="' + escAttr(draft.name || '') + '" placeholder="About Us" required />'),
      fieldHTML('Slug', '<input id="pm-slug" class="pm-input" value="' + escAttr(draft.slug || '') + '" placeholder="about-us" required />'),
      fieldHTML('Menu Label', '<input id="pm-menu-label" class="pm-input" value="' + escAttr(draft.menuLabel || '') + '" placeholder="Optional label for menu" />'),
      fieldHTML('Footer Group', ['<select id="pm-footer-group" class="pm-input">', optionHTML('feature', draft.footerGroup === 'feature', 'Feature'), optionHTML('policy', !draft.footerGroup || draft.footerGroup === 'policy', 'Policy'), optionHTML('none', draft.footerGroup === 'none', 'None'), '</select>'].join('')),
      fieldHTML('Header Order', '<input id="pm-header-order" class="pm-input" type="number" value="' + escAttr(String(numberValue(draft.headerOrder, 99))) + '" />'),
      fieldHTML('Footer Order', '<input id="pm-footer-order" class="pm-input" type="number" value="' + escAttr(String(numberValue(draft.footerOrder, 99))) + '" />'),
      '</div>',
      '  <div class="pm-checks">',
      checkboxHTML('pm-is-active', draft.isActive !== false, 'Active'),
      checkboxHTML('pm-is-html', draft.isHtml !== false, 'HTML Content'),
      checkboxHTML('pm-show-header', !!draft.showInHeader, 'Show In Header'),
      checkboxHTML('pm-show-footer', !!draft.showInFooter, 'Show In Footer'),
      '  </div>',
      fieldHTML('HTML / Content', '<textarea id="pm-content" class="pm-textarea" placeholder="Write HTML or rich content here...">' + escText(draft.content || draft.description || '') + '</textarea>'),
      '  <div class="pm-actions">',
      '    <button type="submit" class="pm-btn">' + (page ? 'Save Changes' : 'Create Page') + '</button>',
      '    <button type="button" class="pm-btn pm-btn-muted" id="pm-reset-form">Reset</button>',
      (page ? '    <button type="button" class="pm-btn pm-btn-danger" id="pm-delete-page">Delete</button>' : ''),
      '  </div>',
      '</form>',
    ].join('');
  }

  function getFilteredPages() {
    if (!searchTerm) return pages;
    var q = searchTerm.toLowerCase();
    return pages.filter(function (p) {
      return [p.name || '', p.slug || '', p.menuLabel || ''].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }

  function getEditingPage() {
    if (!editingId) return null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i]._id === editingId) return pages[i];
    }
    return null;
  }

  function bindPanelEvents() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var closeBtn = document.getElementById('pm-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var body = document.getElementById('pm-body');
        if (!body) return;
        var collapsed = body.style.display === 'none';
        body.style.display = collapsed ? '' : 'none';
        closeBtn.textContent = collapsed ? '−' : '+';
      });
    }

    var refreshBtn = document.getElementById('pm-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        await rerenderPagesAfter(async function () { await fetchPages(); });
      });
    }

    var newBtn = document.getElementById('pm-new-page');
    if (newBtn) {
      newBtn.addEventListener('click', function () { editingId = null; rerenderPages(); });
    }

    var searchInput = document.getElementById('pm-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () { searchTerm = searchInput.value || ''; rerenderPages(); });
    }

    panel.querySelectorAll('[data-edit-id]').forEach(function (row) {
      row.addEventListener('click', function () { editingId = row.getAttribute('data-edit-id'); rerenderPages(); });
    });

    var form = document.getElementById('pm-form');
    if (form) {
      form.addEventListener('submit', async function (e) { e.preventDefault(); await saveForm(); });
    }

    var resetBtn = document.getElementById('pm-reset-form');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () { rerenderPages(); });
    }

    var deleteBtn = document.getElementById('pm-delete-page');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async function () { await deleteCurrentPage(); });
    }
  }

  async function saveForm() {
    var payload = readFormPayload();
    if (!payload.name) return showFormMessage('Page name is required.', true);
    if (!payload.slug) return showFormMessage('Slug is required.', true);

    var pageId = valueOf('pm-page-id');
    setSubmitting(true);
    try {
      if (pageId) {
        await apiPut('/api/additional-page/update-by-id/' + pageId, payload);
        showFormMessage('Page updated successfully.', false);
      } else {
        await apiPost('/api/additional-page/add', payload);
        showFormMessage('Page created successfully.', false);
      }
      await fetchPages();
      var matched = findPageBySlug(payload.slug);
      editingId = matched && matched._id ? matched._id : null;
      rerenderPages();
    } catch (error) {
      console.error('[Pages Widget] save failed:', error);
      showFormMessage(error.message || 'Save failed.', true);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCurrentPage() {
    var pageId = valueOf('pm-page-id');
    var page = getEditingPage();
    if (!pageId || !page) return;
    if (!window.confirm('Delete "' + (page.name || 'this page') + '"?')) return;

    setSubmitting(true);
    try {
      await apiDelete('/api/additional-page/delete-data/' + encodeURIComponent(page.slug || ''));
      editingId = null;
      await fetchPages();
      rerenderPages();
    } catch (error) {
      showFormMessage(error.message || 'Delete failed.', true);
    } finally {
      setSubmitting(false);
    }
  }

  function readFormPayload() {
    var content = valueOf('pm-content');
    return {
      name: valueOf('pm-name').trim(),
      slug: slugify(valueOf('pm-slug')),
      menuLabel: valueOf('pm-menu-label').trim(),
      footerGroup: valueOf('pm-footer-group') || 'policy',
      headerOrder: numberValue(valueOf('pm-header-order'), 99),
      footerOrder: numberValue(valueOf('pm-footer-order'), 99),
      isActive: checkedOf('pm-is-active'),
      isHtml: checkedOf('pm-is-html'),
      showInHeader: checkedOf('pm-show-header'),
      showInFooter: checkedOf('pm-show-footer'),
      content: content,
      description: content,
    };
  }

  function rerenderPages() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.innerHTML = buildPanelHTML();
    bindPanelEvents();
  }

  async function rerenderPagesAfter(work) {
    try { await work(); } catch (e) { console.error('[Pages Widget] action failed:', e); }
    rerenderPages();
  }

  function setSubmitting(disabled) {
    var form = document.getElementById('pm-form');
    if (!form) return;
    form.querySelectorAll('input, textarea, select, button').forEach(function (el) { el.disabled = disabled; });
  }

  function showFormMessage(message, isError) {
    var el = document.getElementById('pm-form-message');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'pm-form-message' + (message ? (isError ? ' pm-msg-error' : ' pm-msg-success') : '');
  }

  function findPageBySlug(slug) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].slug === slug) return pages[i];
    }
    return null;
  }

  /* ─────────────────── REDIRECT URLS PANEL ─────────────────── */

  async function fetchRedirects() {
    var response = await apiGet('/api/redirect-url/get-all-basic');
    var list = response && response.data ? response.data : [];
    redirects = Array.isArray(list) ? list : [];
  }

  function buildRuPanelHTML() {
    return [
      '<div class="pm-shell ru-shell">',
      '  <div class="pm-header">',
      '    <div>',
      '      <div class="pm-title">URL Redirects</div>',
      '      <div class="pm-subtitle">Manage 301 redirects. Changes go live within 60 seconds — no rebuild needed.</div>',
      '    </div>',
      '    <button class="pm-icon-btn" id="ru-close" title="Collapse section">−</button>',
      '  </div>',
      '  <div class="pm-toolbar">',
      '    <span style="font-size:13px;color:#94a3b8;flex:1">' + redirects.length + ' redirect' + (redirects.length !== 1 ? 's' : '') + ' configured</span>',
      '    <button class="pm-btn pm-btn-muted" id="ru-refresh">Refresh</button>',
      '    <button class="pm-btn ru-btn-add" id="ru-new">+ Add Redirect</button>',
      '  </div>',
      '  <div id="ru-body">',
      '    <div class="pm-grid ru-grid">',
      '      <div class="pm-col pm-col-list">',
               buildRuListHTML(),
      '      </div>',
      '      <div class="pm-col pm-col-form">',
               buildRuFormHTML(),
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function buildRuListHTML() {
    var rows = redirects.length
      ? redirects.map(buildRuRowHTML).join('')
      : '<div class="pm-empty">No redirects yet. Click "+ Add Redirect" to create one.</div>';
    return [
      '<div class="pm-section-head">',
      '  <span>All Redirects</span>',
      '  <span class="pm-badge">' + redirects.length + '</span>',
      '</div>',
      '<div class="pm-list">' + rows + '</div>',
    ].join('');
  }

  function buildRuRowHTML(r) {
    var activeClass = r._id === ruEditingId ? ' pm-row-active' : '';
    return [
      '<button class="pm-row' + activeClass + '" data-ru-id="' + escAttr(r._id || '') + '">',
      '  <div class="pm-row-top">',
      '    <span class="pm-row-name">' + esc(r.name || '—') + '</span>',
      '  </div>',
      '  <div class="pm-row-meta ru-url-row">',
      '    <span class="ru-url">' + esc(r.fromUrl || '—') + '</span>',
      '    <span class="ru-arrow">→</span>',
      '    <span class="ru-url">' + esc(r.toUrl || '—') + '</span>',
      '  </div>',
      '</button>',
    ].join('');
  }

  function buildRuFormHTML() {
    var r = null;
    if (ruEditingId) {
      for (var i = 0; i < redirects.length; i++) {
        if (redirects[i]._id === ruEditingId) { r = redirects[i]; break; }
      }
    }
    return [
      '<div class="pm-section-head">',
      '  <span>' + (r ? 'Edit Redirect' : 'New Redirect') + '</span>',
      '  <span class="pm-badge">' + (r ? 'editing' : 'new') + '</span>',
      '</div>',
      '<div id="ru-msg" class="pm-form-message"></div>',
      '<form id="ru-form" class="pm-form">',
      '  <input type="hidden" id="ru-id" value="' + escAttr(r ? r._id : '') + '" />',
      fieldHTML('Label (internal name)', '<input id="ru-name" class="pm-input" value="' + escAttr(r ? r.name || '' : '') + '" placeholder="e.g. Old product page" required />'),
      fieldHTML('From URL', '<input id="ru-from" class="pm-input" value="' + escAttr(r ? r.fromUrl || '' : '') + '" placeholder="/old-path" required />'),
      fieldHTML('To URL',   '<input id="ru-to"   class="pm-input" value="' + escAttr(r ? r.toUrl  || '' : '') + '" placeholder="/new-path" required />'),
      '<p style="font-size:12px;color:#64748b;margin-top:-6px">Both URLs must start with <code style="background:#0f172a;padding:1px 5px;border-radius:4px">/</code></p>',
      '  <div class="pm-actions">',
      '    <button type="submit" class="pm-btn">' + (r ? 'Save Changes' : 'Create Redirect') + '</button>',
      '    <button type="button" class="pm-btn pm-btn-muted" id="ru-reset">Cancel</button>',
      (r ? '    <button type="button" class="pm-btn pm-btn-danger" id="ru-delete">Delete</button>' : ''),
      '  </div>',
      '</form>',
    ].join('');
  }

  function bindRuEvents() {
    var panel = document.getElementById(RU_PANEL_ID);
    if (!panel) return;

    var closeBtn = document.getElementById('ru-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var body = document.getElementById('ru-body');
        if (!body) return;
        var collapsed = body.style.display === 'none';
        body.style.display = collapsed ? '' : 'none';
        closeBtn.textContent = collapsed ? '−' : '+';
      });
    }

    var refreshBtn = document.getElementById('ru-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        try { await fetchRedirects(); } catch (e) { console.error(e); }
        rerenderRu();
      });
    }

    var newBtn = document.getElementById('ru-new');
    if (newBtn) {
      newBtn.addEventListener('click', function () { ruEditingId = null; rerenderRu(); });
    }

    panel.querySelectorAll('[data-ru-id]').forEach(function (row) {
      row.addEventListener('click', function () { ruEditingId = row.getAttribute('data-ru-id'); rerenderRu(); });
    });

    var form = document.getElementById('ru-form');
    if (form) {
      form.addEventListener('submit', async function (e) { e.preventDefault(); await saveRedirect(); });
    }

    var resetBtn = document.getElementById('ru-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () { ruEditingId = null; rerenderRu(); });
    }

    var deleteBtn = document.getElementById('ru-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async function () { await deleteRedirect(); });
    }
  }

  async function saveRedirect() {
    var id   = valueOf('ru-id');
    var name = valueOf('ru-name').trim();
    var from = valueOf('ru-from').trim();
    var to   = valueOf('ru-to').trim();

    if (!name) return showRuMessage('Label is required.', true);
    if (!from || !to) return showRuMessage('Both From URL and To URL are required.', true);
    if (!from.startsWith('/') || !to.startsWith('/')) return showRuMessage('URLs must start with / (e.g. /old-page)', true);

    setRuSubmitting(true);
    try {
      if (id) {
        await apiPut('/api/redirect-url/update/' + id, { name: name, fromUrl: from, toUrl: to });
        showRuMessage('Redirect updated!', false);
      } else {
        await apiPost('/api/redirect-url/add', { name: name, fromUrl: from, toUrl: to });
        showRuMessage('Redirect created!', false);
      }
      await fetchRedirects();
      // Select the saved redirect
      var saved = redirects.find(function (r) { return r.fromUrl === from && r.toUrl === to; });
      ruEditingId = saved ? saved._id : null;
      setTimeout(rerenderRu, 700);
    } catch (error) {
      console.error('[Redirects Widget] save failed:', error);
      showRuMessage(error.message || 'Save failed.', true);
    } finally {
      setRuSubmitting(false);
    }
  }

  async function deleteRedirect() {
    var id = valueOf('ru-id');
    if (!id) return;
    if (!window.confirm('Delete this redirect?')) return;

    setRuSubmitting(true);
    try {
      await apiDelete('/api/redirect-url/delete/' + id);
      ruEditingId = null;
      await fetchRedirects();
      rerenderRu();
    } catch (error) {
      showRuMessage(error.message || 'Delete failed.', true);
    } finally {
      setRuSubmitting(false);
    }
  }

  function rerenderRu() {
    var panel = document.getElementById(RU_PANEL_ID);
    if (!panel) return;
    panel.innerHTML = buildRuPanelHTML();
    bindRuEvents();
  }

  function showRuMessage(msg, isError) {
    var el = document.getElementById('ru-msg');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'pm-form-message' + (msg ? (isError ? ' pm-msg-error' : ' pm-msg-success') : '');
  }

  function setRuSubmitting(disabled) {
    var form = document.getElementById('ru-form');
    if (!form) return;
    form.querySelectorAll('input, button').forEach(function (el) { el.disabled = disabled; });
  }

  /* ─────────────────── Shared helpers ─────────────────── */

  function fieldHTML(label, control) {
    return ['<label class="pm-field">', '  <span class="pm-label">' + label + '</span>', control, '</label>'].join('');
  }

  function checkboxHTML(id, checked, label) {
    return ['<label class="pm-check">', '  <input id="' + id + '" type="checkbox"' + (checked ? ' checked' : '') + ' />', '  <span>' + label + '</span>', '</label>'].join('');
  }

  function optionHTML(value, selected, label) {
    return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + label + '</option>';
  }

  function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function menuSummary(page) {
    var bits = [];
    if (page.showInHeader) bits.push('Header #' + numberValue(page.headerOrder, 99));
    if (page.showInFooter) bits.push('Footer #' + numberValue(page.footerOrder, 99));
    if (page.showInFooter && page.footerGroup) bits.push(capitalize(page.footerGroup));
    if (!bits.length) bits.push('Not in menu');
    return bits.join(' • ');
  }

  function capitalize(value) { value = String(value || ''); return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
  function valueOf(id)       { var el = document.getElementById(id); return el ? el.value || '' : ''; }
  function checkedOf(id)     { var el = document.getElementById(id); return !!(el && el.checked); }
  function numberValue(value, fallback) { var p = Number(value); return Number.isFinite(p) ? p : fallback; }

  function esc(value) {
    return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escText(value)  { return esc(value).replace(/"/g,'&quot;'); }
  function escAttr(value)  { return esc(value).replace(/"/g,'&quot;'); }

  /* ─────────────────── Styles ─────────────────── */

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;

    var style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = [
      '#' + PANEL_ID + ',#' + RU_PANEL_ID + '{position:relative;width:95%;max-width:1150px;margin:28px auto 40px;z-index:1;font-family:Nunito Sans,sans-serif}',
      '#' + PANEL_ID + ' .pm-shell,#' + RU_PANEL_ID + ' .pm-shell{background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.18);overflow:hidden}',
      '#' + RU_PANEL_ID + ' .ru-shell{border-color:rgba(8,145,178,.25)}',
      '.pm-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,#111827,#1f2937)}',
      '.pm-title{font-size:18px;font-weight:800;color:#fff}',
      '.pm-subtitle{font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.45}',
      '.pm-icon-btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}',
      '.pm-toolbar{display:flex;gap:10px;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);background:#0f172a}',
      '.pm-search{flex:1}',
      '.pm-body{max-height:calc(100vh - 180px);overflow:auto}',
      '#ru-body{max-height:calc(100vh - 180px);overflow:auto}',
      '.pm-grid{display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr)}',
      '.ru-grid{grid-template-columns:minmax(280px,380px) minmax(0,1fr)}',
      '.pm-col{padding:18px}',
      '.pm-col-list{border-right:1px solid rgba(255,255,255,.08);background:#0b1220}',
      '.pm-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-weight:700;color:#fff}',
      '.pm-badge{font-size:11px;padding:4px 8px;border-radius:999px;background:#1e293b;color:#cbd5e1}',
      '.pm-list{display:flex;flex-direction:column;gap:8px}',
      '.pm-row{width:100%;text-align:left;border:1px solid rgba(255,255,255,.07);background:#111827;border-radius:12px;padding:12px;cursor:pointer;transition:.2s}',
      '.pm-row:hover,.pm-row-active{border-color:#38bdf8;background:#172033}',
      '.pm-row-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px}',
      '.pm-row-name{font-weight:700;color:#fff;display:block}',
      '.pm-row-meta{font-size:12px;color:#94a3b8;line-height:1.45}',
      '.ru-url-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.ru-url{font-family:monospace;font-size:11px;color:#a5b4fc}',
      '.ru-arrow{color:#475569;font-size:12px}',
      '.pm-status-chip{font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}',
      '.pm-status-on{background:rgba(34,197,94,.15);color:#86efac}',
      '.pm-status-off{background:rgba(248,113,113,.15);color:#fca5a5}',
      '.pm-empty{padding:14px;border:1px dashed rgba(255,255,255,.14);border-radius:12px;color:#94a3b8;font-size:13px}',
      '.pm-form{display:flex;flex-direction:column;gap:14px}',
      '.pm-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.pm-field{display:flex;flex-direction:column;gap:6px}',
      '.pm-label{font-size:12px;font-weight:700;color:#cbd5e1}',
      '.pm-input,.pm-textarea{width:100%;border:1px solid rgba(255,255,255,.12);background:#0f172a;color:#fff;border-radius:10px;padding:10px 12px;font:inherit}',
      '.pm-textarea{min-height:260px;resize:vertical;line-height:1.5}',
      '.pm-input:focus,.pm-textarea:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.12)}',
      '.pm-checks{display:flex;flex-wrap:wrap;gap:12px}',
      '.pm-check{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:#0f172a;border:1px solid rgba(255,255,255,.08)}',
      '.pm-actions{display:flex;flex-wrap:wrap;gap:10px}',
      '.pm-btn{border:none;background:#0284c7;color:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;font-size:13px}',
      '.pm-btn:hover{background:#0369a1}',
      '.pm-btn-muted{background:#334155}',
      '.pm-btn-muted:hover{background:#475569}',
      '.pm-btn-danger{background:#b91c1c}',
      '.pm-btn-danger:hover{background:#991b1b}',
      '.ru-btn-add{background:linear-gradient(135deg,#0891b2,#0e7490)}',
      '.ru-btn-add:hover{opacity:.88}',
      '.pm-form-message{min-height:20px;font-size:12px;font-weight:700}',
      '.pm-msg-success{color:#86efac}',
      '.pm-msg-error{color:#fca5a5}',
      '@media (max-width: 900px){#' + PANEL_ID + ',#' + RU_PANEL_ID + '{width:auto;max-width:none;margin:20px 16px 28px}.pm-grid,.ru-grid{grid-template-columns:1fr}.pm-col-list{border-right:none;border-bottom:1px solid rgba(255,255,255,.08)}.pm-form-grid{grid-template-columns:1fr}}'
    ].join('');

    document.head.appendChild(style);
  }
})();
