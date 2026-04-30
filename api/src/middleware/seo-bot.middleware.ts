import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../pages/product/product.service';

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|redditbot|WhatsApp|TelegramBot|Discordbot|Slackbot|vkShare|W3C_Validator|pinterest|Applebot/i;

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildOgHtml(product: any): string {
  const shopName = 'Amolbooks';
  const title = escapeHtml(product.seoTitle || product.name || shopName);
  const description = escapeHtml(
    product.seoDescription || `${product.name || ''} — ${shopName}`,
  );
  const keywords = escapeHtml(product.seoKeywords || '');
  const image =
    product.images && product.images.length
      ? product.images[0]
      : 'https://amolbooks.com/assets/images/logo.png';
  const url = `https://amolbooks.com/product-details/${product.slug}`;
  const price = product.salePrice ? `${product.salePrice}` : '';

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title} | ${shopName}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${shopName}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(url)}">
  ${price ? `<meta property="product:price:amount" content="${escapeHtml(price)}">` : ''}
  ${price ? `<meta property="product:price:currency" content="BDT">` : ''}

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <link rel="canonical" href="${escapeHtml(url)}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${escapeHtml(url)}">View Product</a>
</body>
</html>`;
}

@Injectable()
export class SeoBotMiddleware implements NestMiddleware {
  constructor(private readonly productService: ProductService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const ua = req.headers['user-agent'] || '';
      if (!BOT_UA_REGEX.test(ua)) {
        return next();
      }

      // Match /product-details/:slug
      const slugMatch = req.path.match(/^\/product-details\/([^/?#]+)/);
      if (!slugMatch) {
        return next();
      }

      const slug = decodeURIComponent(slugMatch[1]);
      const result = await this.productService.getProductBySlug(
        slug,
        'name slug images salePrice seoTitle seoDescription seoKeywords',
      );

      if (!result.success || !result.data) {
        return next();
      }

      const html = buildOgHtml(result.data);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(html);
    } catch (err) {
      // On any error, fall through to the regular handler
      return next();
    }
  }
}
