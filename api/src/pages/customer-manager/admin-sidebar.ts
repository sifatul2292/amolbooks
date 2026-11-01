// One menu for every custom admin page (orders, customer manager, staff
// performance, book gift offers, profit dashboard, WooCommerce import).
// Add or move a menu item here only; pages receive it when they are served.
const ADMIN_DASHBOARD = 'https://adminsub.amolbooks.com/dashboard';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  id?: string;
  sub?: boolean;
  hideForSalesman?: boolean;
}

interface NavSection {
  label: string;
  hideForSalesman?: boolean;
  items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    label: 'Sales',
    items: [
      { label: 'Orders (Angular)', href: ADMIN_DASHBOARD, icon: 'fa-list-ul' },
      { label: 'Amolbooks Orders', href: 'custom-orders.html', icon: 'fa-sliders-h', id: 'navOrders' },
      { label: 'Incomplete Order', href: 'custom-orders.html?view=incomplete', icon: 'fa-clock', id: 'navIncompleteOrders', sub: true },
      { label: 'Import WooCommerce', href: 'import-woo-orders.html', icon: 'fa-file-import', hideForSalesman: true },
      { label: 'Customer Manager', href: 'customer-manager.html', icon: 'fa-address-book', id: 'navCustomerManager' },
      { label: 'Staff Performance', href: 'staff-performance.html', icon: 'fa-trophy', id: 'navStaffPerformance' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock Management', href: 'custom-orders.html?view=stock', icon: 'fa-boxes-stacked', id: 'navStock' },
      { label: 'Book Gift Offers', href: 'book-gift-offers.html', icon: 'fa-gift', id: 'navBookGiftOffers', hideForSalesman: true },
    ],
  },
  {
    label: 'Analytics',
    hideForSalesman: true,
    items: [
      { label: 'Customer & Bundle Insights', href: 'custom-orders.html?view=insights', icon: 'fa-users', id: 'navInsights', hideForSalesman: true },
      { label: 'Profit Dashboard', href: 'profit-dashboard.html', icon: 'fa-chart-line', hideForSalesman: true },
    ],
  },
  {
    label: 'Navigation',
    hideForSalesman: true,
    items: [
      { label: 'Back to Admin', href: ADMIN_DASHBOARD, icon: 'fa-arrow-left', hideForSalesman: true },
    ],
  },
];

const html = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * Menu items. 'orders' uses custom-orders.html's own sidebar classes (its
 * script marks the active view); 'shared' is for the injected sidebar.
 */
export function renderAdminNav(kind: 'orders' | 'shared', active = ''): string {
  return ADMIN_NAV.map((section, index) => {
    const hidden = section.hideForSalesman ? ' data-salesman-hidden' : '';
    const label =
      kind === 'orders'
        ? `<div class="nav-label"${index ? ' style="margin-top:8px"' : ''}${hidden}>${section.label}</div>`
        : `<div class="ab-sb-label"${hidden}>${section.label}</div>`;
    const items = section.items.map((item) => {
      const current = kind === 'shared' && item.href === active;
      const classes =
        kind === 'orders'
          ? 'nav-item' + (item.sub ? ' nav-subitem' : '')
          : 'ab-sb-item' + (item.sub ? ' ab-sb-sub' : '') + (current ? ' active' : '');
      return (
        `<a href="${html(item.href)}" class="${classes}"` +
        (item.id ? ` id="${item.id}"` : '') +
        (item.hideForSalesman ? ' data-salesman-hidden' : '') +
        (current ? ' aria-current="page"' : '') +
        `><i class="fas ${item.icon}"></i> ${html(item.label)}</a>`
      );
    });
    return label + items.join('');
  }).join('');
}

export interface SharedSidebarPage {
  /** Menu href to highlight. */
  active: string;
  /** Keeps the page's own menu button working (it toggles `.open` on this id). */
  asideId: string;
  /** Below this width the menu slides in; matches the page's own breakpoint. */
  breakpoint: number;
  /** Selector whose left margin makes room for the menu on wide screens. */
  offset: string;
  /** True when the page has no menu button of its own. */
  addMenuButton: boolean;
}

// Same look as custom-orders.html's sidebar; every rule is scoped to .ab-sb so
// page styles do not leak in either direction.
function sidebarCss(page: SharedSidebarPage): string {
  return `
.ab-sb{position:fixed;top:0;left:0;bottom:0;z-index:300;width:240px;display:flex;flex-direction:column;margin:0;padding:0;overflow-y:auto;background:linear-gradient(180deg,#13111e 0%,#1a1730 100%);border-right:1px solid rgba(255,255,255,.06);transition:transform .25s cubic-bezier(.4,0,.2,1);font-family:Inter,'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased;box-sizing:border-box;text-align:left;line-height:normal}
.ab-sb *{box-sizing:border-box}
.ab-sb-logo{display:flex;align-items:center;gap:12px;margin:0;padding:22px 20px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
.ab-sb-logo-icon{width:40px;height:40px;flex-shrink:0;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:18px}
.ab-sb-logo strong{display:block;font-size:15px;font-weight:800;color:#fff;letter-spacing:-.01em;line-height:normal}
.ab-sb-logo small{display:block;margin-top:1px;font-size:10px;font-weight:500;color:#64748b;line-height:normal}
.ab-sb-nav{display:block;flex:1;margin:0;padding:16px 0}
.ab-sb-label{margin:0;padding:10px 20px 5px;font-size:9.5px;font-weight:700;letter-spacing:.1em;line-height:normal;text-transform:uppercase;color:#475569}
.ab-sb-item + .ab-sb-label{margin-top:8px}
.ab-sb-item{display:flex;align-items:center;gap:10px;margin:0;padding:10px 20px;font-size:13px;font-weight:600;line-height:normal;color:#94a3b8;text-decoration:none;cursor:pointer;background:none;border:0;border-left:3px solid transparent;border-radius:0;transition:all .15s}
.ab-sb-item:hover{background:rgba(255,255,255,.04);color:#cbd5e1}
.ab-sb-item.active{background:rgba(124,58,237,.15);color:#a78bfa;border-left-color:#7c3aed}
.ab-sb-item i{width:17px;text-align:center;font-size:13px;opacity:.85}
.ab-sb-item.ab-sb-sub{padding-left:36px;font-size:12.5px}
.ab-sb-footer{margin:0;padding:16px 20px;border-top:1px solid rgba(255,255,255,.06)}
.ab-sb-footer a{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#64748b;text-decoration:none}
.ab-sb-footer a:hover{color:#94a3b8}
.ab-sb.ab-sb-salesman [data-salesman-hidden]{display:none!important}
.ab-sb-overlay{display:none;position:fixed;inset:0;z-index:299;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
.ab-sb-fab{display:none;position:fixed;left:12px;bottom:12px;z-index:298;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:12px;background:#13111e;color:#fff;font-size:18px;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer}
@media (max-width:${page.breakpoint}px){.ab-sb{transform:translateX(-100%)}.ab-sb.open{transform:none;box-shadow:20px 0 60px rgba(20,20,38,.4)}.ab-sb.open + .ab-sb-overlay{display:block}.ab-sb-fab{display:flex}}
@media (min-width:${page.breakpoint + 1}px){${page.offset}{margin-left:240px}}
`;
}

const SIDEBAR_SCRIPT = `<script>
(function () {
  var sb = document.querySelector('.ab-sb');
  if (!sb) return;
  var last = null;
  function role() {
    try {
      var token = localStorage.getItem('co_admin_token') || localStorage.getItem('profit_admin_token') || '';
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role || '';
    } catch (_) {
      return '';
    }
  }
  // Pages sign in without reloading, so keep the Sales Man view in step with the token.
  function applyRole() {
    var current = role();
    if (current === last) return;
    last = current;
    sb.classList.toggle('ab-sb-salesman', current === 'salesman');
  }
  applyRole();
  setInterval(applyRole, 1500);
  window.addEventListener('storage', applyRole);
  document.addEventListener('click', function (event) {
    var target = event.target.closest && event.target.closest('[data-ab-sb-open],[data-ab-sb-close]');
    if (!target) return;
    sb.classList.toggle('open', target.hasAttribute('data-ab-sb-open'));
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') sb.classList.remove('open');
  });
})();
</script>`;

function sharedAside(page: SharedSidebarPage): string {
  return (
    `<aside class="ab-sb" id="${page.asideId}" aria-label="Admin navigation">` +
    '<div class="ab-sb-logo"><span class="ab-sb-logo-icon">📚</span><span><strong>Amolbooks</strong><small>Order Management</small></span></div>' +
    `<nav class="ab-sb-nav">${renderAdminNav('shared', page.active)}</nav>` +
    `<div class="ab-sb-footer" data-salesman-hidden><a href="${ADMIN_DASHBOARD}"><i class="fas fa-home"></i> Return to Dashboard</a></div>` +
    '</aside><div class="ab-sb-overlay" data-ab-sb-close></div>' +
    (page.addMenuButton
      ? '<button type="button" class="ab-sb-fab" aria-label="Open navigation" data-ab-sb-open><i class="fas fa-bars"></i></button>'
      : '')
  );
}

export const SIDEBAR_MARKER = '<!-- AB_ADMIN_SIDEBAR -->';
const FONT_AWESOME =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">';
// The orders page's sidebar font.
const INTER =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">';

/** Puts the shared sidebar into a page: at the marker, over its old sidebar, or after <body>. */
export function withSharedSidebar(page: string, config: SharedSidebarPage): string {
  const aside = sharedAside(config);
  const oldAside = /<aside\b[^>]*\bclass="sidebar"[^>]*>[\s\S]*?<\/aside>/;
  if (page.includes(SIDEBAR_MARKER)) page = page.replace(SIDEBAR_MARKER, () => aside);
  else if (oldAside.test(page)) page = page.replace(oldAside, () => aside);
  else page = page.replace(/<body\b[^>]*>/, (body) => body + aside);
  const head =
    (page.includes('font-awesome') ? '' : FONT_AWESOME) +
    (page.includes('family=Inter') ? '' : INTER) +
    `<style id="ab-sb-style">${sidebarCss(config)}</style>`;
  page = page.replace('</head>', () => head + '</head>');
  const end = page.lastIndexOf('</body>');
  return end === -1
    ? page + SIDEBAR_SCRIPT
    : page.slice(0, end) + SIDEBAR_SCRIPT + page.slice(end);
}
