const ORIGIN = 'https://www.amolbooks.com';
const SHOP = 'Amolbooks';

function text(value: any): string {
  return String(value || '').replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|quot|apos|lt|gt);/gi, (_, entity) =>
      ({ nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[entity.toLowerCase()])
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, entity) => {
      const code = /^x/i.test(entity) ? parseInt(entity.slice(1), 16) : Number(entity);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/\s+/g, ' ').trim();
}
function escape(value: any): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function summary(value: string): string {
  if (value.length <= 180) return value;
  const prefix = value.slice(0, 180);
  const sentence = Math.max(prefix.lastIndexOf('।'), prefix.lastIndexOf('. '), prefix.lastIndexOf('! '), prefix.lastIndexOf('? '));
  if (sentence >= 40) return prefix.slice(0, sentence + 1);
  const word = prefix.lastIndexOf(' ');
  return prefix.slice(0, word > 0 ? word : 180).trimEnd() + '।';
}
function validIsbn(value: any): string | undefined {
  const isbn = String(value || '').replace(/[-\s]/g, '');
  if (/^\d{13}$/.test(isbn) && [...isbn].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0) % 10 === 0) return isbn;
  if (/^\d{9}[\dX]$/i.test(isbn) && [...isbn.toUpperCase()].reduce((sum, digit, i) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - i), 0) % 11 === 0) return isbn;
}
function catalogueLink(label: string, kind: string, slug?: string): string {
  if (!slug) return escape(label);
  const path = kind === 'author' ? `/author-list/author-details/${encodeURIComponent(slug)}`
    : `/product-list?${kind}=${encodeURIComponent(slug)}`;
  return `<a href="${ORIGIN}${escape(path)}">${escape(label)}</a>`;
}

// Render only stored book facts and approved review aggregates; never infer edition data.
export function renderProductSeo(book: any, ratings: any[] = [], related: any[] = []): string {
  const name = text(book.name), nameEn = text(book.nameEn);
  const authors = Array.isArray(book.author) ? book.author.filter((author: any) => author?.name) : [];
  const authorText = authors.map((author: any) => text(author.name)).join(', ');
  const categories = Array.isArray(book.category) ? book.category.filter((category: any) => category?.name) : [];
  const publisher = text(book.publisher?.name);
  const customTitle = text(book.seoTitle).replace(/\s*[|–—-]\s*Amolbooks(?:\.com)?\s*$/i, '').trim();
  const english = nameEn && nameEn.toLowerCase() !== name.toLowerCase() ? ` (${nameEn})` : '';
  const title = customTitle && customTitle !== name ? customTitle : `${name}${english}${authorText ? ` — ${authorText}` : ''}`;
  const fullDescription = text(book.description || book.shortDescription || book.seoDescription)
    || `${name}${authorText ? ` — ${authorText}` : ''} বইটি Amolbooks থেকে অর্ডার করুন।`;
  const description = summary(text(book.seoDescription || book.shortDescription) || fullDescription);
  const url = `${ORIGIN}/product-details/${encodeURIComponent(book.slug)}`;
  const images = Array.isArray(book.images) && book.images.length ? book.images : [`${ORIGIN}/assets/images/logo/logo.png`];
  const salePrice = Number(book.salePrice || 0), storedPrice = Number(book.afterDiscountPrice || 0);
  let price = storedPrice > 0 ? storedPrice : salePrice;
  if (!storedPrice && Number(book.discountAmount) > 0) {
    if (Number(book.discountType) === 1) price = Math.max(Math.floor(salePrice - salePrice * Number(book.discountAmount) / 100), 0);
    else if (Number(book.discountType) === 2) price = Math.max(Math.floor(salePrice - Number(book.discountAmount)), 0);
  }
  const inStock = Number(book.quantity || 0) > 0;
  const product: any = {
    '@context': 'https://schema.org', '@type': ['Product', 'Book'], name,
    description: fullDescription, image: images, url,
    category: categories.map((category: any) => text(category.name)).join(', ') || 'Books',
    sku: book.sku || String(book._id || book.slug),
    brand: { '@type': 'Brand', name: publisher || SHOP },
    offers: { '@type': 'Offer', url, priceCurrency: 'BDT', price: price.toFixed(2),
      availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: SHOP } },
  };
  const isbn = validIsbn(book.isbn), edition = text(book.edition), pages = Number(book.totalPages);
  if (isbn) product.isbn = isbn;
  if (publisher) product.publisher = { '@type': 'Organization', name: publisher };
  if (edition) product.bookEdition = edition;
  if (Number.isInteger(pages) && pages > 0) product.numberOfPages = pages;
  const languageCodes = { bangla: 'bn', bengali: 'bn', 'বাংলা': 'bn', english: 'en', 'ইংরেজি': 'en', arabic: 'ar', 'আরবি': 'ar', urdu: 'ur', 'উর্দু': 'ur' };
  const languages = (Array.isArray(book.language) ? book.language : [book.language])
    .map(text).filter(Boolean).map((language: string) => languageCodes[language.toLowerCase()] || language);
  if (languages.length) product.inLanguage = [...new Set(languages)];
  if (authors.length) product.author = authors.map((author: any) => ({ '@type': 'Person', name: text(author.name) }));
  const rating = ratings[0];
  if (rating?.ratingCount > 0 && rating.ratingValue >= 1 && rating.ratingValue <= 5) {
    product.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(rating.ratingValue.toFixed(2)),
      ratingCount: rating.ratingCount, reviewCount: rating.ratingCount, bestRating: 5, worstRating: 1 };
  }
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'হোম', item: ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'বই', item: ORIGIN + '/product-list' },
    { '@type': 'ListItem', position: 3, name, item: url },
  ] };
  const json = (value: any) => JSON.stringify(value).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<title>${escape(title)} | ${SHOP}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
${book.seoKeywords ? `<meta name="keywords" content="${escape(book.seoKeywords)}">` : ''}
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="book"><meta property="og:locale" content="bn_BD"><meta property="og:site_name" content="${SHOP}">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(images[0])}"><meta property="og:image:alt" content="${escape(name)} বইয়ের প্রচ্ছদ">
<meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="BDT">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(images[0])}"><meta name="twitter:image:alt" content="${escape(name)} বইয়ের প্রচ্ছদ">
<script type="application/ld+json">${json(product)}</script><script type="application/ld+json">${json(breadcrumb)}</script>
</head><body><main><article><h1>${escape(name)}</h1>
<nav aria-label="বইয়ের পথ"><a href="${ORIGIN}/">হোম</a> · <a href="${ORIGIN}/product-list">সব বই</a></nav>
${authors.length ? `<p>লেখক: ${authors.map((author: any) => catalogueLink(text(author.name), 'author', author.slug)).join(', ')}</p>` : ''}
${publisher ? `<p>প্রকাশনী: ${catalogueLink(publisher, 'publisher', book.publisher?.slug)}</p>` : ''}
${categories.length ? `<p>বিষয়: ${categories.map((category: any) => catalogueLink(text(category.name), 'categories', category.slug)).join(', ')}</p>` : ''}
<img src="${escape(images[0])}" alt="${escape(name)} বইয়ের প্রচ্ছদ"><p>${escape(fullDescription)}</p>
<p>মূল্য: ৳${price} — ${inStock ? 'স্টকে আছে' : 'স্টক আউট'}</p>
${isbn ? `<p>ISBN: ${escape(isbn)}</p>` : ''}${edition ? `<p>সংস্করণ: ${escape(edition)}</p>` : ''}
${product.numberOfPages ? `<p>পৃষ্ঠা: ${pages}</p>` : ''}${languages.length ? `<p>ভাষা: ${languages.map(escape).join(', ')}</p>` : ''}
${product.aggregateRating ? `<p>রেটিং: ${product.aggregateRating.ratingValue}/5 (${product.aggregateRating.ratingCount}টি অনুমোদিত রিভিউ)</p>` : ''}
<a href="${escape(url)}">Amolbooks থেকে বইটি দেখুন ও অর্ডার করুন</a>
${related.length ? `<nav aria-label="সম্পর্কিত বই"><h2>সম্পর্কিত বই</h2><ul>${related.filter(book => book.slug && book.name).map(book => `<li><a href="${ORIGIN}/product-details/${escape(encodeURIComponent(book.slug))}">${escape(book.name)}</a></li>`).join('')}</ul></nav>` : ''}
</article></main></body></html>`;
}
