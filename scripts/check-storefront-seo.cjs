const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'api/package.json'));
const ts = apiRequire('typescript');
function load(file) {
  const filename = path.join(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;
  const context = { exports: {}, __dirname: path.dirname(filename), require: (name) => {
    if (name.includes('product.service') || name.includes('special-package.service') || name.includes('blog.service')) return {};
    return apiRequire(name);
  }};
  vm.runInNewContext(output, context, { filename });
  return context.exports;
}
const { StorefrontDocumentService, STOREFRONT_SEO_NAVIGATION } = load('api/src/pages/sitemap/storefront-document.service.ts');
const { SitemapService } = load('api/src/pages/sitemap/sitemap.service.ts');
const books = [{ name: 'বই <unsafe> $&', slug: '500 shobder kuraner 75%' }, { name: 'কুরআন', slug: 'quraner-shounorjo/' }];
const offers = [{ _id: '6a0d86a34bce4a2c973790bd', name: 'প্যাকেজ' }];
const receivedSlugs = [];
const products = {
  findAllPublished: async () => books,
  getProductOgHtml: async (slug, res) => {
    receivedSlugs.push(slug);
    const book = books.find((item) => item.slug === slug);
    if (!book) return res.status(404).send('<html><head><meta name="robots" content="noindex"></head><body>Missing</body></html>');
    res.status(200).send(`<html><head><title>Book title</title><link rel="canonical" href="https://www.amolbooks.com/product-details/${encodeURIComponent(slug)}"><script type="application/ld+json">{"@type":"Product"}</script></head><body><h1>Book $&</h1></body></html>`);
  },
};
const packages = {
  findAllForSitemap: async () => offers,
  getSpecialPackageOgHtml: async (id, res) => res.status(200).send(`<html><head><title>Package</title><link rel="canonical" href="https://www.amolbooks.com/special-package-details/${id}"></head><body><h1>Package</h1></body></html>`),
};
const service = new StorefrontDocumentService(products, packages);
async function render(urlPath) {
  const res = { code: 200, headers: {}, setHeader(k,v) { this.headers[k] = v; return this; }, status(n) { this.code=n; return this; }, type() { return this; }, send(s) { this.body=s; return this; } };
  await service.send(urlPath, res);
  return res;
}
async function main() {
  const home = await render('');
  assert.equal(home.code, 200);
  assert.equal((home.body.match(/<link[^>]*rel="canonical"/g) || []).length, 1);
  assert.ok(home.body.includes('href="https://www.amolbooks.com/"'));
  assert.ok(home.body.includes('/500%20shobder%20kuraner%2075%25'));
  assert.ok(home.body.includes('/quraner-shounorjo%2F'));
  assert.ok(home.body.includes('বই &lt;unsafe&gt; $&'));
  assert.match(home.body, /<app-root><main>/);
  assert.match(home.body, /src="main\.[^"]+\.js"/);
  for (const book of books) {
    const result = await render('product-details/' + book.slug);
    assert.equal(result.code, 200);
    assert.equal((result.body.match(/<link[^>]*rel="canonical"/g) || []).length, 1);
    assert.ok(result.body.includes('/product-details/' + encodeURIComponent(book.slug)));
    assert.ok(result.body.includes('<h1>Book $&</h1>'));
    assert.match(result.body, /application\/ld\+json/);
  }
  assert.deepEqual(receivedSlugs, books.map((book) => book.slug));
  assert.equal((await render('product-details/' + books[0].slug + '/')).code, 200);
  assert.equal((await render('product-details/' + books[1].slug)).code, 200);
  const missing = await render('product-details/missing');
  assert.equal(missing.code, 404);
  assert.match(missing.body, /noindex/);
  assert.equal(missing.headers['Cache-Control'], 'no-store');
  assert.equal((await render('unknown')).code, 404);
  assert.ok((await render('offers')).body.includes('/special-package-details/' + offers[0]._id));
  const pkg = await render('special-package-details/' + offers[0]._id);
  assert.match(pkg.body, /<app-root><h1>Package<\/h1>/);
  const pkgWithSlash = await render('special-package-details/' + offers[0]._id + '/');
  assert.ok(pkgWithSlash.body.includes('href="https://www.amolbooks.com/special-package-details/' + offers[0]._id + '"'));
  const sitemap = await new SitemapService(products, {findAllPublished: async () => []}, packages).generateSitemapXml();
  assert.ok(sitemap.includes('/500%20shobder%20kuraner%2075%25'));
  assert.ok(sitemap.includes('/quraner-shounorjo%2F'));
  const { JSDOM } = apiRequire('jsdom');
  const dom = new JSDOM(home.body, {url:'https://www.amolbooks.com/', runScripts:'outside-only'});
  const pending = [];
  dom.window.fetch = (url) => new Promise((resolve) => pending.push({url, resolve}));
  dom.window.eval(STOREFRONT_SEO_NAVIGATION.replace(/^<script>|<\/script>$/g, ''));
  dom.window.history.pushState({}, '', '/product-details/first');
  dom.window.history.pushState({}, '', '/product-details/second');
  assert.equal(pending.length, 2);
  pending[1].resolve({ok:true, text:async()=>'<html><head><title>Second</title><link rel="canonical" href="https://www.amolbooks.com/product-details/second"><script type="application/ld+json">{"@type":"Product","name":"Second"}</script></head></html>'});
  await new Promise(setImmediate);
  pending[0].resolve({ok:true, text:async()=>'<html><head><title>Stale first</title></head></html>'});
  await new Promise(setImmediate);
  assert.equal(dom.window.document.title, 'Second');
  assert.equal(dom.window.document.querySelector('link[rel="canonical"]').href, 'https://www.amolbooks.com/product-details/second');
  assert.equal(dom.window.document.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.match(dom.window.document.querySelector('script[type="application/ld+json"]').textContent, /Second/);
  dom.window.history.pushState({}, '', '/cart');
  assert.equal(dom.window.document.querySelectorAll('script[type="application/ld+json"]').length, 0);
  assert.equal(pending.length, 2);
  dom.window.close();
  console.log('PASS: shell bootstrap, encoded slugs, escaped links, packages, 404s, SPA canonical/schema refresh and stale-response race');
}
module.exports = { service, load };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode=1; });
