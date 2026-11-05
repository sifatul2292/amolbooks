import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  renderAdminNav,
  SharedSidebarPage,
  withSharedSidebar,
} from './admin-sidebar';

// Custom admin pages, each served with the one shared sidebar. Tracked sources
// only; runtime uploads and the compiled admin stay untouched.
const PAGES: Record<string, { file: string; sidebar: SharedSidebarPage }> = {
  '/upload/static/customer-manager.html': {
    file: 'gtm-snippets/customer-manager.html',
    sidebar: { active: 'customer-manager.html', asideId: 'navigation', breakpoint: 768, offset: '.main', addMenuButton: false },
  },
  '/upload/static/staff-performance.html': {
    file: 'gtm-snippets/staff-performance.html',
    sidebar: { active: 'staff-performance.html', asideId: 'navigation', breakpoint: 900, offset: '.workspace', addMenuButton: false },
  },
  '/upload/static/search-insights.html': {
    file: 'gtm-snippets/search-insights.html',
    sidebar: { active: 'search-insights.html', asideId: 'navigation', breakpoint: 900, offset: '.workspace', addMenuButton: false },
  },
  '/upload/static/book-gift-offers.html': {
    file: 'gtm-snippets/book-gift-offers.html',
    sidebar: { active: 'book-gift-offers.html', asideId: 'navigation', breakpoint: 768, offset: 'body', addMenuButton: true },
  },
  '/upload/static/profit-dashboard.html': {
    file: 'api/upload/static/profit-dashboard.html',
    sidebar: { active: 'profit-dashboard.html', asideId: 'sidebar', breakpoint: 992, offset: '.main', addMenuButton: false },
  },
  '/upload/static/import-woo-orders.html': {
    file: 'api/upload/static/import-woo-orders.html',
    sidebar: { active: 'import-woo-orders.html', asideId: 'sidebar', breakpoint: 700, offset: '.main', addMenuButton: true },
  },
};

export function customerManagerPages(root: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const config = PAGES[req.path];
    if (config) {
      let page: string;
      try {
        page = readFileSync(join(root, config.file), 'utf8');
      } catch (_error) {
        return config.file.startsWith('api/upload/')
          ? next()
          : res.status(503).send('This page is unavailable.');
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.type('html').send(withSharedSidebar(page, config.sidebar));
    }
    if (req.path === '/upload/static/custom-orders.html') {
      try {
        let page = readFileSync(
          join(root, 'api/upload/static/custom-orders.html'),
          'utf8',
        );
        // Keep the page's own sidebar (snapshot widget, view switching) but
        // replace its menu items with the shared menu.
        page = page.replace(
          /<nav class="sidebar-nav">[\s\S]*?<\/nav>/,
          () => `<nav class="sidebar-nav">${renderAdminNav('orders')}</nav>`,
        );
        // "Sent by" / note-author labels on the order rows.
        try {
          const attribution = readFileSync(
            join(root, 'gtm-snippets', 'staff-attribution.html'),
            'utf8',
          );
          const end = page.lastIndexOf('</body>');
          if (end !== -1 && !page.includes('id="ab-staff-attribution"')) {
            page = page.slice(0, end) + attribution + page.slice(end);
          }
        } catch (_error) {
          // The order page still works without the labels.
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.type('html').send(page);
      } catch (_error) {
        return next();
      }
    }
    return next();
  };
}
