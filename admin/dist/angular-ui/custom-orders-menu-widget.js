/**
 * Custom Orders + Redirect URLs Menu Widget
 * Injects sidebar links into the Angular admin sidebar under Sales.
 * Drop this file in /admin/dist/angular-ui/ and include it in index.html.
 */
(function () {
  'use strict';

  var BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/upload/static'
    : 'https://apisub.amolbooks.com/upload/static';

  var STYLE_ID = 'co-sidebar-style';
  var injectTimer = null;

  var ITEMS = [
    {
      id: 'co-sidebar-link',
      label: 'Custom Orders',
      url: BASE_URL + '/custom-orders.html',
      badgeText: 'NEW',
      badgeColor: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    },
    {
      id: 'ru-sidebar-link',
      label: 'Redirect URLs',
      url: BASE_URL + '/redirect-urls.html',
      badgeText: 'SEO',
      badgeColor: 'linear-gradient(135deg,#0891b2,#0e7490)',
    },
    {
      id: 'hs-sidebar-link',
      label: 'Homepage Sections',
      url: BASE_URL + '/homepage-sections.html',
      badgeText: 'HOME',
      badgeColor: 'linear-gradient(135deg,#16a34a,#15803d)',
    },
  ];

  /* ── Inject CSS once ── */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    var css = '';
    ITEMS.forEach(function (item) {
      css += [
        '#' + item.id + ', #' + item.id + '-wrap {',
        '  display: flex !important;',
        '  align-items: center;',
        '  gap: 6px;',
        '  cursor: pointer;',
        '  transition: background .15s, color .15s;',
        '}',
        '#' + item.id + ':hover, #' + item.id + '-wrap:hover {',
        '  color: #a78bfa !important;',
        '  background: rgba(124,58,237,.12) !important;',
        '}',
        '.' + item.id + '-badge {',
        '  font-size: 9px;',
        '  font-weight: 800;',
        '  background: ' + item.badgeColor + ';',
        '  color: #fff;',
        '  padding: 2px 6px;',
        '  border-radius: 10px;',
        '  letter-spacing: .04em;',
        '  text-transform: uppercase;',
        '  line-height: 1.4;',
        '  flex-shrink: 0;',
        '}',
      ].join('\n');
    });
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Build inner HTML for an item, cloning structure from a sibling ── */
  function buildLinkHTML(originalHTML, item) {
    var tmp = document.createElement('div');
    tmp.innerHTML = originalHTML;

    var walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim()) textNodes.push(node);
    }
    if (textNodes.length) {
      textNodes[textNodes.length - 1].nodeValue = item.label;
    } else {
      tmp.appendChild(document.createTextNode(item.label));
    }

    var badge = document.createElement('span');
    badge.className = item.id + '-badge';
    badge.textContent = item.badgeText;
    tmp.appendChild(badge);

    return tmp.innerHTML;
  }

  /* ── Inject a single sidebar item after a reference element ── */
  function injectItem(item, afterEl, parentContainer) {
    if (document.getElementById(item.id) || document.getElementById(item.id + '-wrap')) return;

    var tagName = afterEl.tagName.toLowerCase();
    var newEl = document.createElement(tagName);
    newEl.id = item.id;

    if (afterEl.className) newEl.className = afterEl.className;
    newEl.style.cssText = afterEl.style.cssText;
    newEl.style.cursor = 'pointer';

    var pageUrl = item.url;
    var innerA = afterEl.querySelector('a');

    if (innerA && tagName !== 'a') {
      var span = document.createElement('span');
      span.id = item.id;
      span.style.cssText = innerA.style.cssText;
      span.style.cursor = 'pointer';
      span.className = innerA.className;
      span.innerHTML = buildLinkHTML(innerA.innerHTML, item);
      span.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        window.location.href = pageUrl;
      }, true);
      newEl.appendChild(span);
      newEl.id = item.id + '-wrap';
    } else {
      newEl.innerHTML = buildLinkHTML(afterEl.innerHTML, item);
      newEl.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        window.location.href = pageUrl;
      }, true);
    }

    if (afterEl.nextSibling) {
      parentContainer.insertBefore(newEl, afterEl.nextSibling);
    } else {
      parentContainer.appendChild(newEl);
    }
  }

  /* ── Try to inject all sidebar links ── */
  function tryInject() {
    // Check if any item is already missing (prevents duplicate full-runs)
    var anyMissing = ITEMS.some(function (item) {
      return !document.getElementById(item.id) && !document.getElementById(item.id + '-wrap');
    });
    if (!anyMissing) return;

    // Find the "Orders List" anchor to use as our insertion point
    var allLinks = document.querySelectorAll(
      'mat-nav-list a, mat-list-item a, .mat-list-item a, ' +
      '[class*="sidebar"] a, [class*="nav"] a, ' +
      'a[routerlink], a[routerLink], a[ng-reflect-router-link]'
    );

    var targetEl = null;
    allLinks.forEach(function (el) {
      var text = (el.textContent || el.innerText || '').trim();
      if (!targetEl && (text === 'Orders List' || text.includes('Orders List'))) {
        targetEl = el;
      }
    });

    if (!targetEl) {
      var allLi = document.querySelectorAll('li, mat-list-item, .menu-item, [class*="menu-item"]');
      allLi.forEach(function (el) {
        var text = (el.textContent || '').trim();
        if (!targetEl && text.startsWith('Orders List')) targetEl = el;
      });
    }

    if (!targetEl) return;

    var parentContainer = targetEl.parentElement;
    if (!parentContainer) return;

    injectStyles();

    // Insert items in reverse order so they both end up right after "Orders List"
    // (each insertion goes to nextSibling of Orders List, pushing the previous one down)
    var reversedItems = ITEMS.slice().reverse();
    reversedItems.forEach(function (item) {
      injectItem(item, targetEl, parentContainer);
    });
  }

  /* ── Watch for Angular to render the sidebar ── */
  function startWatcher() {
    tryInject();

    var observer = new MutationObserver(function () {
      var anyMissing = ITEMS.some(function (item) {
        return !document.getElementById(item.id) && !document.getElementById(item.id + '-wrap');
      });
      if (anyMissing) {
        clearTimeout(injectTimer);
        injectTimer = setTimeout(tryInject, 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ── Bootstrap ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWatcher);
  } else {
    startWatcher();
  }

  [500, 1000, 2000, 3000, 5000].forEach(function (delay) {
    setTimeout(tryInject, delay);
  });
})();
