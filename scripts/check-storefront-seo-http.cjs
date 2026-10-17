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
  getProductOgHtml: async (slug, res) => {
    seen.push(slug);
    res.status(slug === '50% / book' ? 200 : 404).send('<html><head><title>Test</title><meta name="robots" content="noindex"></head><body><h1>Test</h1></body></html>');
  },
};
class TestModule {}
NestModule({controllers:[SitemapController], providers:[
  {provide:SitemapService, useValue:{}},
  {provide:StorefrontDocumentService, useValue:new StorefrontDocumentService(products,{})},
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
    assert.match(await home.text(), /<app-root><div id="amol-seo-fallback"><main>/);
    const book = await fetch(base+'/api/storefront-document/product-details/50%25%20%2F%20book');
    assert.equal(book.status, 200);
    assert.equal(seen[0], '50% / book');
    const missing = await fetch(base+'/api/storefront-document/product-details/missing');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), 'no-store');
    console.log('PASS: real Nest prefix/versioning, root route, encoded percent/slash and missing-book HTTP status');
  } finally { await app.close(); }
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
