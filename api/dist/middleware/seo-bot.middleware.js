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
const BOT_UA_REGEX = /facebookexternalhit|facebot|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|redditbot|WhatsApp|TelegramBot|Discordbot|Slackbot|vkShare|W3C_Validator|pinterest|Applebot/i;
function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
function buildOgHtml(product) {
    const shopName = 'Amolbooks';
    const title = escapeHtml(product.seoTitle || product.name || shopName);
    const description = escapeHtml(product.seoDescription || `${product.name || ''} — ${shopName}`);
    const keywords = escapeHtml(product.seoKeywords || '');
    const image = product.images && product.images.length
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
let SeoBotMiddleware = class SeoBotMiddleware {
    constructor(productService) {
        this.productService = productService;
    }
    async use(req, res, next) {
        try {
            const ua = req.headers['user-agent'] || '';
            if (!BOT_UA_REGEX.test(ua)) {
                return next();
            }
            const slugMatch = req.path.match(/^\/product-details\/([^/?#]+)/);
            if (!slugMatch) {
                return next();
            }
            const slug = decodeURIComponent(slugMatch[1]);
            const result = await this.productService.getProductBySlug(slug, 'name slug images salePrice seoTitle seoDescription seoKeywords');
            if (!result.success || !result.data) {
                return next();
            }
            const html = buildOgHtml(result.data);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.status(200).send(html);
        }
        catch (err) {
            return next();
        }
    }
};
SeoBotMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], SeoBotMiddleware);
exports.SeoBotMiddleware = SeoBotMiddleware;
//# sourceMappingURL=seo-bot.middleware.js.map