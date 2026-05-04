import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../pages/product/product.service';
import { SeoPageService } from '../pages/seo-page/seo-page.service';

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|redditbot|WhatsApp|TelegramBot|Discordbot|Slackbot|vkShare|W3C_Validator|pinterest|Applebot/i;

const DEFAULT_IMAGE = 'https://amolbooks.com/assets/images/logo.png';
const SHOP_NAME = 'Amolbooks';
const SITE_URL = 'https://amolbooks.com';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildOgHtml(opts: {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url: string;
  type?: string;
  price?: string;
}): string {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const keywords = escapeHtml(opts.keywords || '');
  const image = escapeHtml(opts.image || DEFAULT_IMAGE);
  const url = escapeHtml(opts.url);
  const type = opts.type || 'website';

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title} | ${SHOP_NAME}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${SHOP_NAME}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${url}">
  ${opts.price ? `<meta property="product:price:amount" content="${escapeHtml(opts.price)}">` : ''}
  ${opts.price ? `<meta property="product:price:currency" content="BDT">` : ''}

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <link rel="canonical" href="${url}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${url}">Visit ${SHOP_NAME}</a>
</body>
</html>`;
}

function pathToPageName(pathname: string): string {
  // "/" → "home", "/about-us" → "about-us", "/some/nested" → "some/nested"
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  return clean || 'home';
}

@Injectable()
export class SeoBotMiddleware implements NestMiddleware {
  constructor(
    private readonly productService: ProductService,
    private readonly seoPageService: SeoPageService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const ua = req.headers['user-agent'] || '';
      if (!BOT_UA_REGEX.test(ua)) {
        return next();
      }

      // Handle /product-details/:slug
      const slugMatch = req.path.match(/^\/product-details\/([^/?#]+)/);
      if (slugMatch) {
        const slug = decodeURIComponent(slugMatch[1]);
        const result = await this.productService.getProductBySlug(
          slug,
          'name slug images salePrice seoTitle seoDescription seoKeywords',
        );
        if (result.success && result.data) {
          const p = result.data;
          const html = buildOgHtml({
            title: p.seoTitle || p.name || SHOP_NAME,
            description: p.seoDescription || `${p.name || ''} — ${SHOP_NAME}`,
            keywords: p.seoKeywords,
            image: p.images && p.images.length ? p.images[0] : undefined,
            url: `${SITE_URL}/product-details/${p.slug}`,
            type: 'product',
            price: p.salePrice ? String(p.salePrice) : undefined,
          });
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          return res.status(200).send(html);
        }
        return next();
      }

      // Handle all other bot requests using SeoPage data
      const pageName = pathToPageName(req.path);
      const seoResult = await this.seoPageService.getSeoPageByPage(
        pageName,
        'name image pageName seoDescription keyWord',
      );

      if (seoResult.success && seoResult.data) {
        const s = seoResult.data as any;
        const pageUrl = `${SITE_URL}${req.path === '/' ? '' : req.path}`;
        const html = buildOgHtml({
          title: s.name || SHOP_NAME,
          description: s.seoDescription || `${s.name || SHOP_NAME} — অনলাইন বইঘর`,
          keywords: s.keyWord,
          image: s.image || undefined,
          url: pageUrl,
          type: 'website',
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(html);
      }

      return next();
    } catch (err) {
      return next();
    }
  }
}
