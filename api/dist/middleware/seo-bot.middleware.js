"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoBotMiddleware = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("../pages/product/product.service");
const seo_page_service_1 = require("../pages/seo-page/seo-page.service");
const BOT_UA_REGEX = /facebookexternalhit|facebot|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|redditbot|WhatsApp|TelegramBot|Discordbot|Slackbot|vkShare|W3C_Validator|pinterest|Applebot/i;
const DEFAULT_IMAGE = 'https://www.amolbooks.com/assets/images/logo/logo.png';
const SHOP_NAME = 'Amolbooks';
const SITE_URL = 'https://www.amolbooks.com';
function normalizeMetaText(value, maxLength = 300) {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength
        ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
        : normalized;
}
function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
function buildOgHtml(opts) {
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
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${url}">Visit ${SHOP_NAME}</a>
</body>
</html>`;
}
function buildPageNamePattern(pathname) {
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
let SeoBotMiddleware = class SeoBotMiddleware {
    constructor(productService, seoPageService) {
        this.productService = productService;
        this.seoPageService = seoPageService;
    }
    async use(req, res, next) {
        try {
            const ua = req.headers['user-agent'] || '';
            if (!BOT_UA_REGEX.test(ua)) {
                return next();
            }
            const slugMatch = req.path.match(/^\/product-details\/([^/?#]+)/);
            if (slugMatch) {
                const slug = decodeURIComponent(slugMatch[1]);
                const result = await this.productService.getProductBySlug(slug, 'name slug images salePrice seoTitle seoDescription seoKeywords');
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
            const pattern = buildPageNamePattern(req.path);
            const seoResult = await this.seoPageService.getSeoPageByPattern(pattern, 'name image pageName seoDescription keyWord');
            if (seoResult.success && seoResult.data) {
                const s = seoResult.data;
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
        }
        catch (err) {
            return next();
        }
    }
};
SeoBotMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_service_1.ProductService,
        seo_page_service_1.SeoPageService])
], SeoBotMiddleware);
exports.SeoBotMiddleware = SeoBotMiddleware;
//# sourceMappingURL=seo-bot.middleware.js.map