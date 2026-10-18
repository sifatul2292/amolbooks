// Read-only catalogue audit. Node 18+. Redirect stdout to save the report.
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
async function main() {
  const xml = await (await read('https://www.amolbooks.com/sitemap.xml')).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(url => url.includes('/product-details/'));
  const previous = process.argv[2] ? JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8')) : { products: [] };
  const products = previous.products, unreadable = [];
  const completed = new Set(products.map(book => book.url));
  for (const url of urls) {
    if (completed.has(url)) continue;
    await new Promise(resolve => setTimeout(resolve, 850));
    const slug = new URL(url).pathname.slice('/product-details/'.length);
    try {
    const payload = await (await read('https://apisub.amolbooks.com/api/product/get-by-slug/' + slug)).json();
    const p = payload.data;
    if (!payload.success || !p?.name) throw new Error('Missing product: ' + url);
    const missing = ['isbn', 'edition', 'totalPages'].filter(key => !p[key]);
    if (!p.publisher?.name) missing.push('publisher');
    if (!p.author?.length) missing.push('author');
    if (!p.language?.length) missing.push('language');
    products.push({ url, name: p.name, publisher: p.publisher?.name || null,
      edition: p.edition || null, pages: p.totalPages || null, isbn: p.isbn || null,
      language: p.language, missing, multipleIsbnsRequireEditionCheck: /[,;]/.test(p.isbn || '') });
    } catch (error) { unreadable.push({ url, error: error.message }); }
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), count: products.length, unreadable,
    note: 'Stored catalogue values only. Missing identifiers and edition differences require book/imprint verification; no database writes.',
    products }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
