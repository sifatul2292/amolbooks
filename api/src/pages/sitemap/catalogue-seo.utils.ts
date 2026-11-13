import { escape, routePart, summary, text } from '../product/product-seo.utils';

const ORIGIN = 'https://www.amolbooks.com';
const SHOP = 'Amolbooks';
const LOGO = `${ORIGIN}/assets/images/logo/logo.png`;

export type CatalogueKind = 'author' | 'publisher' | 'category';

const KINDS = {
  author: {
    list: '/author-list', listName: 'লেখক', type: 'Person',
    heading: (name: string) => `${name} এর বই`,
    count: (name: string, n: string) => `${name} এর ${n}টি বই`,
  },
  publisher: {
    list: '/publisher-list', listName: 'প্রকাশনী', type: 'Organization',
    heading: (name: string) => `${name} এর বই`,
    count: (name: string, n: string) => `${name} প্রকাশিত ${n}টি বই`,
  },
  category: {
    list: '/category-list', listName: 'বিষয়', type: 'Thing',
    heading: (name: string) => `${name} বিষয়ের বই`,
    count: (name: string, n: string) => `${name} বিষয়ের ${n}টি বই`,
  },
};

const bangla = (value: number) => String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
// Inline tags join words (<strong>লেখক</strong>।); block tags separate them.
const plain = (html: any) => text(String(html || '').replace(/<\/?(?:a|b|strong|i|em|u|span)\b[^>]*>/gi, ''));
const bookUrl = (book: any) => `${ORIGIN}/product-details/${routePart(book.slug)}`;

// The storefront's own addresses: the author page, and the book list filtered by publisher or category.
export function cataloguePath(kind: CatalogueKind, slug: string): string {
  if (kind === 'author') return `/author-list/author-details/${routePart(slug)}`;
  return `/product-list?${kind === 'publisher' ? 'publisher' : 'categories'}=${encodeURIComponent(slug)}`;
}

// Author, publisher and category pages: stored names, descriptions and published books only.
// A page without published books (or a hidden category) stays out of search results.
export function renderCatalogueSeo(kind: CatalogueKind, entity: any, books: any[] = [], total = books.length): string {
  const k = KINDS[kind];
  const name = text(entity.name), nameEn = text(entity.nameEn);
  const english = nameEn && nameEn.toLowerCase() !== name.toLowerCase() ? ` (${nameEn})` : '';
  const heading = k.heading(name);
  const title = heading + english;
  const listed = books.filter((book) => book?.slug && book?.name);
  const count = k.count(name, bangla(total));
  const about = plain(entity.description);
  const titles = listed.slice(0, 3).map((book) => text(book.name)).join(', ');
  const fallback = listed.length
    ? `${count}: ${titles}${total > 3 ? ' ও আরও' : ''}। Amolbooks থেকে অনলাইনে অর্ডার করুন।`
    : `${heading} — ${SHOP}`;
  const description = summary(about || fallback);
  const url = ORIGIN + cataloguePath(kind, entity.slug);
  const ownImage = /^https?:\/\//.test(String(entity.image || '')) ? String(entity.image) : '';
  const bookImage = listed.map((book) => Array.isArray(book.images) ? book.images[0] : '').find(Boolean);
  const image = ownImage || bookImage || LOGO;
  const indexed = listed.length > 0 && (kind !== 'category' || !entity.status || entity.status === 'publish');
  const subject: any = { '@type': k.type, name };
  if (english) subject.alternateName = nameEn;
  if (about) subject.description = about;
  if (ownImage) subject[kind === 'publisher' ? 'logo' : 'image'] = ownImage;
  const page = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url, inLanguage: 'bn',
    about: subject,
    mainEntity: { '@type': 'ItemList', numberOfItems: total, itemListElement: listed.slice(0, 50).map((book, index) => (
      { '@type': 'ListItem', position: index + 1, url: bookUrl(book), name: text(book.name) })) },
  };
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'হোম', item: ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: k.listName, item: ORIGIN + k.list },
    { '@type': 'ListItem', position: 3, name, item: url },
  ] };
  const json = (value: any) => JSON.stringify(value).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="bn"><head>
<title>${escape(title)} | ${SHOP}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="${indexed ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="website"><meta property="og:locale" content="bn_BD"><meta property="og:site_name" content="${SHOP}">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(name)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}">
<script type="application/ld+json">${json(page)}</script><script type="application/ld+json">${json(breadcrumb)}</script>
</head><body><main><h1>${escape(heading)}</h1>
<nav aria-label="পথ"><a href="${ORIGIN}/">হোম</a> · <a href="${ORIGIN}${k.list}">${k.listName}</a></nav>
${ownImage ? `<img src="${escape(ownImage)}" alt="${escape(name)}">` : ''}${about ? `<p>${escape(about)}</p>` : ''}
${listed.length ? `<h2>${escape(count)}</h2><ul>${listed.map((book) => `<li><a href="${escape(bookUrl(book))}">${escape(book.name)}</a></li>`).join('')}</ul>` : ''}
</main></body></html>`;
}
