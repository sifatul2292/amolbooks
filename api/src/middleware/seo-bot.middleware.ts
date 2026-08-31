import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../pages/product/product.service';
import { SeoPageService } from '../pages/seo-page/seo-page.service';

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|redditbot|WhatsApp|TelegramBot|Discordbot|Slackbot|vkShare|W3C_Validator|pinterest|Applebot/i;

const DEFAULT_IMAGE =
  'https://www.amolbooks.com/assets/images/logo/logo.png';
const SHOP_NAME = 'Amolbooks';
const SITE_URL = 'https://www.amolbooks.com';

function normalizeMetaText(value: string, maxLength = 300): string {
  const normalized = stripHtml(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function safeJsonLd(data: any): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function absoluteImageUrl(image?: string): string {
  if (!image) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  return `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

function firstCatalogName(value: any): string {
  if (Array.isArray(value)) return value[0]?.name || value[0]?.nameEn || '';
  return value?.name || value?.nameEn || '';
}

function firstCatalogSlug(value: any): string {
  if (Array.isArray(value)) return value[0]?.slug || '';
  return value?.slug || '';
}

function finalPrice(product: any): number {
  const explicit = Number(product?.afterDiscountPrice);
  if (product?.afterDiscountPrice != null && isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const sale = Number(product?.salePrice || 0);
  const discount = Number(product?.discountAmount || 0);
  const type = Number(product?.discountType || 0);
  if (type === 1 && discount > 0) return Math.max(0, Math.floor(sale - sale * discount / 100));
  if (type === 2 && discount > 0) return Math.max(0, Math.floor(sale - discount));
  return Math.max(0, Math.floor(sale));
}

function buildOgHtml(opts: {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url: string;
  type?: string;
  price?: string;
  jsonLd?: any[];
  bodyHtml?: string;
}): string {
  const title = escapeHtml(normalizeMetaText(opts.title, 120));
  const description = escapeHtml(normalizeMetaText(opts.description));
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
  ${(opts.jsonLd || []).map((item) => `<script type="application/ld+json">${safeJsonLd(item)}</script>`).join('\n  ')}
</head>
<body>
  ${opts.bodyHtml || `<h1>${title}</h1><p>${description}</p><a href="${url}">Visit ${SHOP_NAME}</a>`}
</body>
</html>`;
}

// Build a regex that matches common variations of a pageName.
// "/" → matches home, home_page, homepage, home-page
// "/about-us" → matches about-us, about_us
function buildPageNamePattern(pathname: string): RegExp {
  if (pathname === '/' || pathname === '') {
    return /^(home|home_page|homepage|home-page|\/)$/i;
  }
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const dash = clean.replace(/_/g, '-');
  const under = clean.replace(/-/g, '_');
  const joined = clean.replace(/[-_]/g, '');
  const variants = [...new Set([clean, dash, under, joined])];
  return new RegExp(`^(${variants.join('|')})$`, 'i');
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
          'name nameEn slug images sku isbn salePrice afterDiscountPrice discountAmount discountType quantity seoTitle seoDescription seoKeywords shortDescription description author category publisher',
        );
        if (result.success && result.data) {
          const p = result.data;
          const author = firstCatalogName(p.author);
          const category = firstCatalogName(p.category);
          const categorySlug = firstCatalogSlug(p.category);
          const publisher = firstCatalogName(p.publisher) || 'Amolbooks';
          const price = finalPrice(p);
          const titleParts = [p.seoTitle || p.name || SHOP_NAME];
          if (author && !titleParts[0].includes(author)) titleParts.push(author);
          const productTitle = titleParts.join(' - ');
          const description = normalizeMetaText(
            p.seoDescription ||
              p.shortDescription ||
              p.description ||
              `${p.name || 'ইসলামিক বই'}${author ? ` - ${author}` : ''}${category ? `, ${category}` : ''}। Amolbooks থেকে অনলাইনে অর্ডার করুন।`,
            300,
          );
          const productUrl = `${SITE_URL}/product-details/${p.slug}`;
          const image = absoluteImageUrl(
            p.images && p.images.length ? p.images[0] : undefined,
          );
          const productJsonLd: any = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name || p.seoTitle || SHOP_NAME,
            image: p.images && p.images.length ? p.images.map(absoluteImageUrl) : [DEFAULT_IMAGE],
            description,
            sku: p.sku || p._id || p.slug,
            brand: { '@type': 'Brand', name: publisher },
            offers: {
              '@type': 'Offer',
              url: productUrl,
              priceCurrency: 'BDT',
              price: price || p.salePrice || 0,
              availability:
                Number(p.quantity || 0) > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/NewCondition',
            },
          };
          if (p.isbn) productJsonLd.isbn = p.isbn;
          if (author) productJsonLd.author = { '@type': 'Person', name: author };
          const breadcrumbItems: any[] = [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          ];
          if (category) {
            breadcrumbItems.push({
              '@type': 'ListItem',
              position: 2,
              name: category,
              item: `${SITE_URL}/product-list?categories=${encodeURIComponent(categorySlug || category)}`,
            });
          }
          breadcrumbItems.push({
            '@type': 'ListItem',
            position: breadcrumbItems.length + 1,
            name: p.name || productTitle,
            item: productUrl,
          });
          const breadcrumbJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems,
          };
          const bodyHtml = `
  <main>
    <article>
      <h1>${escapeHtml(p.name || productTitle)}</h1>
      <img src="${escapeHtml(image)}" alt="${escapeHtml(p.name || productTitle)} বইয়ের কভার">
      <p>${escapeHtml(description)}</p>
      ${author ? `<p>লেখক: ${escapeHtml(author)}</p>` : ''}
      ${category ? `<p>ক্যাটাগরি: ${escapeHtml(category)}</p>` : ''}
      ${price ? `<p>মূল্য: ৳${escapeHtml(String(price))}</p>` : ''}
      <p>${Number(p.quantity || 0) > 0 ? 'স্টকে আছে' : 'স্টক শেষ'}</p>
      <a href="${escapeHtml(productUrl)}">Amolbooks এ বইটি দেখুন</a>
    </article>
  </main>`;
          const html = buildOgHtml({
            title: productTitle,
            description,
            keywords: p.seoKeywords,
            image,
            url: productUrl,
            type: 'product',
            price: price ? String(price) : undefined,
            jsonLd: [productJsonLd, breadcrumbJsonLd],
            bodyHtml,
          });
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          return res.status(200).send(html);
        }
        return next();
      }

      // Handle all other bot requests using SeoPage data
      const pattern = buildPageNamePattern(req.path);
      const seoResult = await this.seoPageService.getSeoPageByPattern(
        pattern,
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
