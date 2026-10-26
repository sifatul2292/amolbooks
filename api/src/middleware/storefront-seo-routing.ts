import { NextFunction, Request, Response } from 'express';

const SITE_URL = 'https://www.amolbooks.com';
const STOREFRONT_HOSTS = new Set([
  'www.amolbooks.com',
  'amolbooks.com',
  'apisub.amolbooks.com',
  'localhost',
  '127.0.0.1',
  '[::1]',
]);
const PRIVATE_PATH =
  /^\/(account|cart|checkout|login|registration|complete-registration|reset-password|order-details|order-track|payment)(\/|$)/;
const PAGE_PATH =
  /^\/(product-list|category-list|author-list|publisher-list|blogs|contact-us|offers|activities|all-video|coming-soon|compare|find-book-location|manuscript-submission|sitemap|special-package)\/?$/;
const DETAIL_PATH =
  /^\/(product-details\/[^/]+|special-package-details\/[^/]+|author-list\/author-details\/[^/]+|blogs\/blog-details\/[^/]+|activities\/activities-details\/[^/]+|pages\/[^/]+)\/?$/;

// Keep operational endpoints and assets on their original host. Only storefront
// documents redirect; API clients, admin pages, feeds and uploaded images do not.
export function storefrontSeoRouting(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    !['GET', 'HEAD'].includes(req.method) ||
    !STOREFRONT_HOSTS.has(req.hostname)
  )
    return next();
  const path = req.path;
  const query = req.originalUrl.includes('?')
    ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
    : '';
  if (/^\/(home\/?|index\.html)$/.test(path))
    return res.redirect(301, `${SITE_URL}/${query}`);
  if (
    /^\/(api|upload|invoice|assets|storefront-catalog|storefront-review-upload)(\/|$)/.test(
      path
    ) ||
    /^\/[^/]+\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|eot|json|map|txt|xml)$/i.test(
      path
    )
  )
    return next();

  const knownPage =
    path === '/' ||
    PAGE_PATH.test(path) ||
    DETAIL_PATH.test(path) ||
    PRIVATE_PATH.test(path);
  if (!knownPage) {
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'no-store');
    return res
      .status(404)
      .type('html')
      .send(
        '<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>পাতাটি পাওয়া যায়নি | Amolbooks</title></head><body><h1>পাতাটি পাওয়া যায়নি</h1><a href="https://www.amolbooks.com/">হোমপেজ</a></body></html>'
      );
  }
  if (req.hostname === 'apisub.amolbooks.com') {
    return res.redirect(301, `${SITE_URL}${path}${query}`);
  }
  if (PRIVATE_PATH.test(path)) res.setHeader('X-Robots-Tag', 'noindex, follow');
  return next();
}

export function storefrontSeoHtml(req: Request, html: string): string {
  if (!STOREFRONT_HOSTS.has(req.hostname)) return html;
  const path = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
  const canonical = `${SITE_URL}${path}`
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, (head) => {
    const cleaned = head.replace(
      /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi,
      ''
    );
    return cleaned.replace(
      /<\/head>/i,
      `<link rel="canonical" href="${canonical}"></head>`
    );
  });
}
