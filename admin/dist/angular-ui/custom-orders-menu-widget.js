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
  ];

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
        window.open(pageUrl, '_blank');
      }, true);
      newEl.appendChild(span);
      newEl.id = item.id + '-wrap';
    } else {
      newEl.innerHTML = buildLinkHTML(afterEl.innerHTML, item);
      newEl.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        window.open(pageUrl, '_blank');
      }, true);
    }
    if (afterEl.nextSibling) {
      parentContainer.insertBefore(newEl, afterEl.nextSibling);
    } else {
      parentContainer.appendChild(newEl);
    }
  }

  function tryInject() {
    var anyMissing = ITEMS.some(function (item) {
      return !document.getElementById(item.id) && !document.getElementById(item.id + '-wrap');
    });
    if (!anyMissing) return;

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
    ITEMS.forEach(function (item) {
      injectItem(item, targetEl, parentContainer);
    });
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWatcher);
  } else {
    startWatcher();
  }

  [500, 1000, 2000, 3000, 5000].forEach(function (delay) {
    setTimeout(tryInject, delay);
  });
})();
