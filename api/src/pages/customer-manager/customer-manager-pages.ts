import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

// Tracked custom-page source; runtime uploads and compiled admin stay untouched.
export function customerManagerPages(root: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    if (req.path === '/upload/static/customer-manager.html') {
      try {
        res.setHeader('Cache-Control', 'no-store');
        return res
          .type('html')
          .send(
            readFileSync(
              join(root, 'gtm-snippets/customer-manager.html'),
              'utf8',
            ),
          );
      } catch (_error) {
        return res.status(503).send('Customer Manager page is unavailable.');
      }
    }
    if (req.path === '/upload/static/custom-orders.html') {
      try {
        let page = readFileSync(
          join(root, 'api/upload/static/custom-orders.html'),
          'utf8',
        );
        const link =
          '<a href="customer-manager.html" class="nav-item" id="navCustomerManager"><i class="fas fa-users"></i> Customer Manager</a>';
        if (!page.includes('id="navCustomerManager"')) {
          page = page.replace(
            /(<div class="nav-label"[^>]*>Inventory<\/div>)/i,
            link + '$1',
          );
          if (!page.includes('id="navCustomerManager"'))
            page = page.replace('</nav>', link + '</nav>');
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
