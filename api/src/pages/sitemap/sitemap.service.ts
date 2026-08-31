// src/sitemap/sitemap.service.ts
import { Injectable } from '@nestjs/common';
import { SitemapStream, streamToPromise } from 'sitemap';
import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service';

const SITE_URL = 'https://www.amolbooks.com';

export const SEO_LANDING_PAGES = [
  {
    path: '/islamic-books',
    title: 'ইসলামিক বই অনলাইনে কিনুন',
    description:
      'বাংলা ইসলামিক বই, কুরআন শিক্ষা, হাদিস, দোয়া, সীরাত ও আত্মশুদ্ধির নির্বাচিত বই Amolbooks থেকে সহজে অর্ডার করুন।',
    terms: ['ইসলাম', 'ইসলামিক', 'Islamic', 'কুরআন', 'হাদিস', 'দোয়া', 'সীরাত'],
  },
  {
    path: '/quran-books',
    title: 'কুরআন শেখার বই',
    description:
      'কুরআন পড়া, বুঝা, তাফসির, আরবি শেখা ও কুরআনের শব্দভাণ্ডার শেখার জন্য জনপ্রিয় বাংলা বই সংগ্রহ করুন।',
    terms: ['কুরআন', 'Quran', 'তাফসির', 'আরবি', 'শব্দ'],
  },
  {
    path: '/hadith-books',
    title: 'হাদিসের বই',
    description:
      'সহিহ হাদিস, নববী আদর্শ, শামায়েলে তিরমিজি ও দৈনন্দিন আমলের হাদিসভিত্তিক বই এক জায়গায় দেখুন।',
    terms: ['হাদিস', 'Hadith', 'নববী', 'শামায়েল', 'সুন্নাহ'],
  },
  {
    path: '/dua-books',
    title: 'দোয়া ও আমলের বই',
    description:
      'দৈনন্দিন দোয়া, সকাল-সন্ধ্যার আমল, যিকির, নামাজ ও আত্মশুদ্ধির বই Amolbooks থেকে অর্ডার করুন।',
    terms: ['দোয়া', 'Dua', 'আমল', 'যিকির', 'নামাজ'],
  },
  {
    path: '/bengali-islamic-books',
    title: 'বাংলা ইসলামিক বই',
    description:
      'বাংলা ভাষায় প্রকাশিত জনপ্রিয় ইসলামিক বই, পরিবার, শিশু, আত্মউন্নয়ন, অর্থনীতি ও ইতিহাসের বই খুঁজুন।',
    terms: ['বাংলা', 'ইসলামিক', 'পরিবার', 'শিশু', 'আত্মউন্নয়ন'],
  },
  {
    path: '/best-islamic-books-bangladesh',
    title: 'বাংলাদেশে জনপ্রিয় ইসলামিক বই',
    description:
      'বাংলাদেশের পাঠকদের কাছে জনপ্রিয় ইসলামিক বই, বেস্টসেলার ও নতুন প্রকাশিত বইয়ের নির্বাচিত সংগ্রহ।',
    terms: ['জনপ্রিয়', 'বেস্টসেলার', 'বাংলাদেশ', 'ইসলামিক', 'নতুন'],
  },
];

function escapeHtml(str: any): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function stripHtml(str: any): string {
  return String(str || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteImageUrl(url?: string): string {
  if (!url) return `${SITE_URL}/assets/images/logo/logo.png`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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

function firstCatalogName(value: any): string {
  if (Array.isArray(value)) return value[0]?.name || value[0]?.nameEn || '';
  return value?.name || value?.nameEn || '';
}

function collectUniqueCatalogUrls(products: any[], field: string, queryKey: string) {
  const seen = new Set<string>();
  return products.flatMap((product: any) => {
    const items = Array.isArray(product?.[field])
      ? product[field]
      : product?.[field]
        ? [product[field]]
        : [];
    return items
      .filter((item: any) => item?.slug && item?.name)
      .map((item: any) => ({
        url: `/product-list?${queryKey}=${encodeURIComponent(item.slug)}`,
        name: item.name,
        updatedAt: product.updatedAt,
      }))
      .filter((item: any) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });
  });
}

@Injectable()
export class SitemapService {
  constructor(
    private readonly productService: ProductService,
    private readonly blogService: BlogService,
  ) {}

  async generateSitemapXml(): Promise<string> {
    const smStream = new SitemapStream({ hostname: SITE_URL });

    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/pages/about-us', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/pages/contact-us', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/category-list', changefreq: 'weekly', priority: 0.8 });
    SEO_LANDING_PAGES.forEach((page) =>
      smStream.write({ url: page.path, changefreq: 'weekly', priority: 0.95 }),
    );

    const products = await this.productService.findAllPublished();
    products.forEach((product) =>
      smStream.write({
        url: `/product-details/${encodeURIComponent(product.slug || '')}`,
        lastmod: product.updatedAt,
        changefreq: 'weekly',
        priority: 0.8,
      }),
    );

    [
      ...collectUniqueCatalogUrls(products, 'category', 'categories'),
      ...collectUniqueCatalogUrls(products, 'subCategory', 'subCategory'),
      ...collectUniqueCatalogUrls(products, 'author', 'author'),
      ...collectUniqueCatalogUrls(products, 'publisher', 'publisher'),
    ].forEach((entry) =>
      smStream.write({
        url: entry.url,
        lastmod: entry.updatedAt,
        changefreq: 'weekly',
        priority: 0.75,
      }),
    );

    const blogs = await this.blogService.findAllPublished();
    blogs.forEach((blog) =>
      smStream.write({
        url: `/blogs/blog-details/${encodeURIComponent(blog.slug || '')}`,
        lastmod: blog.updatedAt,
        changefreq: 'weekly',
        priority: 0.7,
      }),
    );

    smStream.end();
    const xml = await streamToPromise(smStream);
    return xml.toString(); // Return as plain string
  }

  async generateFbFeedXml(): Promise<string> {
    return this.productService.getMetaFeedXml();
  }

  generateRobotsTxt(): string {
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

  async generateSeoLandingPageHtml(path: string): Promise<string | null> {
    const page = SEO_LANDING_PAGES.find((item) => item.path === path);
    if (!page) return null;
    const products = await this.productService.findPublishedForSeoLanding(page.terms, 18);
    const canonical = `${SITE_URL}${page.path}`;
    const cards = products
      .map((product: any) => {
        const price = finalPrice(product);
        const author = firstCatalogName(product.author);
        const category = firstCatalogName(product.category);
        const description = stripHtml(
          product.seoDescription || product.shortDescription || product.description || product.name,
        ).slice(0, 170);
        return `<article class="book-card">
          <a href="/product-details/${encodeURIComponent(product.slug || '')}">
            <img src="${escapeHtml(absoluteImageUrl(product.images?.[0]))}" alt="${escapeHtml(product.name)} বইয়ের কভার" loading="lazy">
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
      itemListElement: products.map((product: any, index: number) => ({
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
}
