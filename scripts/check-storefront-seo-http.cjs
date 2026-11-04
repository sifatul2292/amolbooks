// Run after npm run build in api/. Uses an isolated Nest app without a database.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const apiRequire = createRequire(path.join(root, 'api/package.json'));
const { NestFactory } = apiRequire('@nestjs/core');
const { Module: NestModule, VersioningType } = apiRequire('@nestjs/common');
const { SitemapController } = require('../api/dist/pages/sitemap/sitemap.controller');
const { SitemapService } = require('../api/dist/pages/sitemap/sitemap.service');
const { StorefrontDocumentService } = require('../api/dist/pages/sitemap/storefront-document.service');
const seen = [];
const products = {
  findAllPublished: async () => [{name:'Test book', slug:'50% / book'}],
  getAllProducts: async query => {
    assert.equal(query.filter.status, 'publish');
    assert.equal(query.pagination.pageSize, 2);
    return { data: [{ images: ['https://apisub.amolbooks.com/api/upload/images/cover-test.webp'] }] };
  },
  getProductOgHtml: async (slug, res) => {
    seen.push(slug);
    res.status(slug === '50% / book' ? 200 : 404).send('<html><head><title>Test</title><meta name="robots" content="noindex"></head><body><h1>Test</h1></body></html>');
  },
};
const lookups = [];
const catalogue = {
  page: async (kind, slug, id) => {
    lookups.push([kind, slug, id]);
    if (slug !== 'সন্দীপন প্রকাশন' && slug !== 'আরিফ-আজাদ') return null;
    return { entity: { name: slug, slug }, books: [{ name: 'Test book', slug: '50% / book' }], total: 1 };
  },
};
class TestModule {}
NestModule({controllers:[SitemapController], providers:[
  {provide:SitemapService, useValue:{}},
  {provide:StorefrontDocumentService, useValue:new StorefrontDocumentService(products,{},catalogue)},
]})(TestModule);
async function main() {
  const app = await NestFactory.create(TestModule, {logger:false});
  try {
    app.setGlobalPrefix('api');
    app.enableVersioning({type:VersioningType.URI});
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const home = await fetch(base+'/api/storefront-document/');
    assert.equal(home.status, 200);
    const homeHtml = await home.text();
    assert.match(homeHtml, /<app-root><div id="amol-seo-fallback"><main>/);
    assert.match(homeHtml, /rel="preload" as="image"[^>]*storefront-images\/320\/cover-test.webp/);
    products.getAllProducts = async () => { throw new Error('Unavailable'); };
    const withoutHints = await fetch(base+'/api/storefront-document/');
    assert.equal(withoutHints.status, 200, 'Image hints must fail open');
    const book = await fetch(base+'/api/storefront-document/product-details/50%25%20%2F%20book');
    assert.equal(book.status, 200);
    assert.equal(seen[0], '50% / book');
    const missing = await fetch(base+'/api/storefront-document/product-details/missing');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), 'no-store');
    const publisher = await fetch(base+'/api/storefront-document/product-list?publisher='+encodeURIComponent('সন্দীপন প্রকাশন')+'&publisherId=abc');
    assert.equal(publisher.status, 200);
    assert.deepEqual(lookups.pop(), ['publisher', 'সন্দীপন প্রকাশন', 'abc'], 'The query string reaches the document service');
    assert.ok((await publisher.text()).includes('rel="canonical" href="https://www.amolbooks.com/product-list?publisher='+encodeURIComponent('সন্দীপন প্রকাশন')+'"'));
    const author = await fetch(base+'/api/storefront-document/author-list/author-details/'+encodeURIComponent('আরিফ-আজাদ'));
    assert.equal(author.status, 200);
    assert.deepEqual(lookups.pop(), ['author', 'আরিফ-আজাদ', undefined]);
    const unknownAuthor = await fetch(base+'/api/storefront-document/author-list/author-details/nobody');
    assert.equal(unknownAuthor.status, 404);
    assert.match(await unknownAuthor.text(), /noindex/);
    console.log('PASS: real Nest prefix/versioning, root route, encoded percent/slash, missing-book HTTP status, publisher query and author pages');
  } finally { await app.close(); }
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
