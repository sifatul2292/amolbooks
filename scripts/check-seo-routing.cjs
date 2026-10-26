const assert = require('node:assert/strict');
const path = require('node:path');
const deps = path.resolve(__dirname, '../api/node_modules');
require(deps + '/reflect-metadata');
const express = require(deps + '/express');
const request = require(deps + '/supertest');
const { storefrontSeoRouting, storefrontSeoHtml } = require('../api/dist/middleware/storefront-seo-routing');
const { SitemapController } = require('../api/dist/pages/sitemap/sitemap.controller');

async function main() {
  const app = express();
  app.use(storefrontSeoRouting);
  app.get('/robots.txt', (_req, res) => new SitemapController(null).getRobots(res));
  app.use((req, res) => res.type('html').send(storefrontSeoHtml(req,
    '<html><head><link rel="canonical" href="https://amolbooks.com/"></head><body>Storefront</body></html>')));
  const get = (url, host = 'www.amolbooks.com') => request(app).get(url).set('Host', host);
  for (const url of ['/', '/product-list?tags=books', '/product-details/book%20name', '/product-details/book.v2', '/author-list/author-details/writer', '/pages/about-us', '/blogs/blog-details/123', '/special-package-details/123']) {
    const response = await get(url, 'apisub.amolbooks.com');
    assert.equal(response.status, 301, url);
    assert.equal(response.headers.location, 'https://www.amolbooks.com' + url);
    assert.equal((await get(url)).status, 200, url);
  }
  for (const url of ['/api/product/get-all', '/api/upload/images/book.webp', '/upload/static/custom-orders.html', '/invoice/order.pdf', '/assets/logo.png', '/main.123.js', '/robots.txt', '/sitemap.xml', '/storefront-catalog/library']) {
    assert.equal((await get(url, 'apisub.amolbooks.com')).status, 200, url + ' stays on its original host');
  }
  assert.equal((await request(app).post('/api/product/get-all').set('Host', 'apisub.amolbooks.com')).status, 200);
  assert.equal((await get('/home/?utm_source=test')).headers.location, 'https://www.amolbooks.com/?utm_source=test');
  assert.equal((await get('/index.html')).status, 301);
  for (const url of ['/unknown-route', '/product-details/book/extra', '/unknown.html']) {
    const response = await get(url);
    assert.equal(response.status, 404);
    assert.equal(response.headers['x-robots-tag'], 'noindex');
    assert.match(response.text, /পাতাটি পাওয়া যায়নি/);
  }
  assert.equal((await get('/dashboard', 'adminsub.amolbooks.com')).status, 200);
  for (const url of ['/login', '/account/orders', '/checkout', '/payment/success']) {
    assert.equal((await get(url)).headers['x-robots-tag'], 'noindex, follow');
  }
  const html = (await get('/product-details/book%20name?utm_source=test')).text;
  assert.match(html, /href="https:\/\/www.amolbooks.com\/product-details\/book%20name"/);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  const robots = (await get('/robots.txt')).text;
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/www.amolbooks.com\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/(?:login|account|checkout)/, 'Google must be able to fetch the noindex response');

  console.log('SEO routing regressions passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
