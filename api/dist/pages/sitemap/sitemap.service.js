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
exports.SitemapService = exports.SEO_LANDING_PAGES = void 0;
const common_1 = require("@nestjs/common");
const sitemap_1 = require("sitemap");
const product_service_1 = require("../product/product.service");
const blog_service_1 = require("../blog/blog/blog.service");
const SITE_URL = 'https://www.amolbooks.com';
exports.SEO_LANDING_PAGES = [
    {
        path: '/islamic-books',
        title: 'ইসলামিক বই অনলাইনে কিনুন',
        description: 'বাংলা ইসলামিক বই, কুরআন শিক্ষা, হাদিস, দোয়া, সীরাত ও আত্মশুদ্ধির নির্বাচিত বই Amolbooks থেকে সহজে অর্ডার করুন।',
        terms: ['ইসলাম', 'ইসলামিক', 'Islamic', 'কুরআন', 'হাদিস', 'দোয়া', 'সীরাত'],
    },
    {
        path: '/quran-books',
        title: 'কুরআন শেখার বই',
        description: 'কুরআন পড়া, বুঝা, তাফসির, আরবি শেখা ও কুরআনের শব্দভাণ্ডার শেখার জন্য জনপ্রিয় বাংলা বই সংগ্রহ করুন।',
        terms: ['কুরআন', 'Quran', 'তাফসির', 'আরবি', 'শব্দ'],
    },
    {
        path: '/hadith-books',
        title: 'হাদিসের বই',
        description: 'সহিহ হাদিস, নববী আদর্শ, শামায়েলে তিরমিজি ও দৈনন্দিন আমলের হাদিসভিত্তিক বই এক জায়গায় দেখুন।',
        terms: ['হাদিস', 'Hadith', 'নববী', 'শামায়েল', 'সুন্নাহ'],
    },
    {
        path: '/dua-books',
        title: 'দোয়া ও আমলের বই',
        description: 'দৈনন্দিন দোয়া, সকাল-সন্ধ্যার আমল, যিকির, নামাজ ও আত্মশুদ্ধির বই Amolbooks থেকে অর্ডার করুন।',
        terms: ['দোয়া', 'Dua', 'আমল', 'যিকির', 'নামাজ'],
    },
    {
        path: '/bengali-islamic-books',
        title: 'বাংলা ইসলামিক বই',
        description: 'বাংলা ভাষায় প্রকাশিত জনপ্রিয় ইসলামিক বই, পরিবার, শিশু, আত্মউন্নয়ন, অর্থনীতি ও ইতিহাসের বই খুঁজুন।',
        terms: ['বাংলা', 'ইসলামিক', 'পরিবার', 'শিশু', 'আত্মউন্নয়ন'],
    },
    {
        path: '/best-islamic-books-bangladesh',
        title: 'বাংলাদেশে জনপ্রিয় ইসলামিক বই',
        description: 'বাংলাদেশের পাঠকদের কাছে জনপ্রিয় ইসলামিক বই, বেস্টসেলার ও নতুন প্রকাশিত বইয়ের নির্বাচিত সংগ্রহ।',
        terms: ['জনপ্রিয়', 'বেস্টসেলার', 'বাংলাদেশ', 'ইসলামিক', 'নতুন'],
    },
];
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
function stripHtml(str) {
    return String(str || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function absoluteImageUrl(url) {
    if (!url)
        return `${SITE_URL}/assets/images/logo/logo.png`;
    if (/^https?:\/\//i.test(url))
        return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
function finalPrice(product) {
    const explicit = Number(product === null || product === void 0 ? void 0 : product.afterDiscountPrice);
    if ((product === null || product === void 0 ? void 0 : product.afterDiscountPrice) != null && isFinite(explicit) && explicit > 0) {
        return Math.floor(explicit);
    }
    const sale = Number((product === null || product === void 0 ? void 0 : product.salePrice) || 0);
    const discount = Number((product === null || product === void 0 ? void 0 : product.discountAmount) || 0);
    const type = Number((product === null || product === void 0 ? void 0 : product.discountType) || 0);
    if (type === 1 && discount > 0)
        return Math.max(0, Math.floor(sale - sale * discount / 100));
    if (type === 2 && discount > 0)
        return Math.max(0, Math.floor(sale - discount));
    return Math.max(0, Math.floor(sale));
}
function firstCatalogName(value) {
    var _a, _b;
    if (Array.isArray(value))
        return ((_a = value[0]) === null || _a === void 0 ? void 0 : _a.name) || ((_b = value[0]) === null || _b === void 0 ? void 0 : _b.nameEn) || '';
    return (value === null || value === void 0 ? void 0 : value.name) || (value === null || value === void 0 ? void 0 : value.nameEn) || '';
}
function collectUniqueCatalogUrls(products, field, queryKey) {
    const seen = new Set();
    return products.flatMap((product) => {
        const items = Array.isArray(product === null || product === void 0 ? void 0 : product[field])
            ? product[field]
            : (product === null || product === void 0 ? void 0 : product[field])
                ? [product[field]]
                : [];
        return items
            .filter((item) => (item === null || item === void 0 ? void 0 : item.slug) && (item === null || item === void 0 ? void 0 : item.name))
            .map((item) => ({
            url: `/product-list?${queryKey}=${encodeURIComponent(item.slug)}`,
            name: item.name,
            updatedAt: product.updatedAt,
        }))
            .filter((item) => {
            if (seen.has(item.url))
                return false;
            seen.add(item.url);
            return true;
        });
    });
}
let SitemapService = class SitemapService {
    constructor(productService, blogService) {
        this.productService = productService;
        this.blogService = blogService;
    }
    async generateSitemapXml() {
        const smStream = new sitemap_1.SitemapStream({ hostname: SITE_URL });
        smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
        smStream.write({ url: '/pages/about-us', changefreq: 'monthly', priority: 0.7 });
        smStream.write({ url: '/pages/contact-us', changefreq: 'monthly', priority: 0.7 });
        smStream.write({ url: '/category-list', changefreq: 'weekly', priority: 0.8 });
        exports.SEO_LANDING_PAGES.forEach((page) => smStream.write({ url: page.path, changefreq: 'weekly', priority: 0.95 }));
        const products = await this.productService.findAllPublished();
        products.forEach((product) => smStream.write({
            url: `/product-details/${encodeURIComponent(product.slug || '')}`,
            lastmod: product.updatedAt,
            changefreq: 'weekly',
            priority: 0.8,
        }));
        [
            ...collectUniqueCatalogUrls(products, 'category', 'categories'),
            ...collectUniqueCatalogUrls(products, 'subCategory', 'subCategory'),
            ...collectUniqueCatalogUrls(products, 'author', 'author'),
            ...collectUniqueCatalogUrls(products, 'publisher', 'publisher'),
        ].forEach((entry) => smStream.write({
            url: entry.url,
            lastmod: entry.updatedAt,
            changefreq: 'weekly',
            priority: 0.75,
        }));
        const blogs = await this.blogService.findAllPublished();
        blogs.forEach((blog) => smStream.write({
            url: `/blogs/blog-details/${encodeURIComponent(blog.slug || '')}`,
            lastmod: blog.updatedAt,
            changefreq: 'weekly',
            priority: 0.7,
        }));
        smStream.end();
        const xml = await (0, sitemap_1.streamToPromise)(smStream);
        return xml.toString();
    }
    async generateFbFeedXml() {
        return this.productService.getMetaFeedXml();
    }
    generateRobotsTxt() {
        return [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            'Disallow: /admin/',
            'Disallow: /private/',
            `Sitemap: ${SITE_URL}/sitemap.xml`,
            '',
        ].join('\n');
    }
    async generateSeoLandingPageHtml(path) {
        const page = exports.SEO_LANDING_PAGES.find((item) => item.path === path);
        if (!page)
            return null;
        const products = await this.productService.findPublishedForSeoLanding(page.terms, 18);
        const canonical = `${SITE_URL}${page.path}`;
        const cards = products
            .map((product) => {
            var _a;
            const price = finalPrice(product);
            const author = firstCatalogName(product.author);
            const category = firstCatalogName(product.category);
            const description = stripHtml(product.seoDescription || product.shortDescription || product.description || product.name).slice(0, 170);
            return `<article class="book-card">
          <a href="/product-details/${encodeURIComponent(product.slug || '')}">
            <img src="${escapeHtml(absoluteImageUrl((_a = product.images) === null || _a === void 0 ? void 0 : _a[0]))}" alt="${escapeHtml(product.name)} বইয়ের কভার" loading="lazy">
            <h2>${escapeHtml(product.name)}</h2>
          </a>
          <p>${escapeHtml([author, category].filter(Boolean).join(' · '))}</p>
          <p>${escapeHtml(description)}</p>
          ${price ? `<strong>৳${price}</strong>` : ''}
        </article>`;
        })
            .join('\n');
        const itemList = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: page.title,
            itemListElement: products.map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${SITE_URL}/product-details/${encodeURIComponent(product.slug || '')}`,
                name: product.name,
            })),
        };
        const breadcrumb = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: page.title, item: canonical },
            ],
        };
        return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | Amolbooks</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Amolbooks">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${SITE_URL}/assets/images/logo/logo.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(itemList)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <style>
    body{margin:0;font-family:Hind Siliguri,SolaimanLipi,Arial,sans-serif;color:#202124;background:#fff}
    main{max-width:1120px;margin:auto;padding:32px 18px 48px}
    .hero{padding:28px 0 22px;border-bottom:1px solid #e8eaed}
    h1{font-size:clamp(30px,5vw,48px);line-height:1.2;margin:0 0 12px;color:#0b6b43}
    .hero p{font-size:19px;line-height:1.75;max-width:780px;margin:0;color:#3c4043}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;margin-top:28px}
    .book-card{border:1px solid #e8eaed;border-radius:8px;padding:14px;background:#fff}
    .book-card img{width:100%;aspect-ratio:3/4;object-fit:contain;background:#f8f5f0}
    .book-card a{text-decoration:none;color:inherit}
    h2{font-size:18px;line-height:1.45;margin:12px 0 8px}
    .book-card p{font-size:14px;line-height:1.55;color:#5f6368;margin:0 0 8px}
    strong{color:#d93025;font-size:18px}
    nav{margin-top:30px;display:flex;gap:14px;flex-wrap:wrap}
    nav a{color:#0b8043;font-weight:700}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>${escapeHtml(page.title)}</h1>
      <p>${escapeHtml(page.description)}</p>
    </section>
    <section class="grid">${cards}</section>
    <nav>
      <a href="/">হোম</a>
      <a href="/category-list">সব ক্যাটাগরি</a>
      <a href="/product-list?categories=islami-sahitto">ইসলামী সাহিত্য</a>
      <a href="/product-list">সব বই</a>
    </nav>
  </main>
</body>
</html>`;
    }
};
SitemapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_service_1.ProductService,
        blog_service_1.BlogService])
], SitemapService);
exports.SitemapService = SitemapService;
//# sourceMappingURL=sitemap.service.js.map