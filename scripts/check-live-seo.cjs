// Read-only production routing checks. Requires Node 18+.
// Usage: node scripts/check-live-seo.cjs [storefront-origin] [--all]
const assert = require('node:assert/strict');

const origin = new URL(process.argv.find((arg) => /^https?:/.test(arg)) || 'https://www.amolbooks.com').origin;
const canonicalOrigin = 'https://www.amolbooks.com';
const slug = 'tinii-amar-rob-2-98';
const productPath = `/product-details/${slug}`;
const failures = [];
let sitemapUrls = [];

async function check(label, path, verify, userAgent = 'Googlebot') {
  try {
    const response = await fetch(`${origin}${path}`, {
      headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, `HTTP ${response.status}`);
    await verify(await response.text(), response);
    console.log(`PASS ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`FAIL ${label}: ${error.message}`);
  }
}

async function main() {
  await check('robots advertises storefront sitemap', '/robots.txt', (body) => {
    assert.ok(body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`), 'Incorrect sitemap host');
    assert.ok(!body.includes('apisub.amolbooks.com'), 'API host remains in robots.txt');
  });
  await check('sitemap contains canonical book URL', '/sitemap.xml', (body, response) => {
    assert.match(response.headers.get('content-type') || '', /xml/);
    const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
    assert.ok(urls.length > 0, 'No sitemap URLs');
    sitemapUrls = urls;
    assert.ok(urls.every((url) => !/%(?![a-f0-9]{2})/i.test(url.pathname)), 'Malformed percent encoding in sitemap');
    assert.ok(urls.every((url) => url.origin === canonicalOrigin), 'Non-storefront sitemap URLs');
    assert.ok(urls.some((url) => url.pathname === productPath), 'Book missing from sitemap');
    assert.ok(!urls.some((url) => /^\/(cart|checkout|login|registration|reset-password)(\/|$)/.test(url.pathname)), 'Private pages in sitemap');
  });
  await check('Googlebot receives book metadata and structured data', productPath, (body) => {
    assert.match(body, /<title>[^<]*তিনিই আমার রব/, 'Book title missing');
    assert.ok(body.includes(`<link rel="canonical" href="${canonicalOrigin}${productPath}">`), 'Wrong canonical URL');
    assert.match(body, /<h1>[^<]*তিনিই আমার রব/, 'Book heading missing');
    assert.ok(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(body), 'Book is noindex');
    const schemas = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const product = schemas.find((schema) => [].concat(schema['@type']).includes('Product'));
    assert.ok(product, 'Product structured data missing');
    assert.equal(product.offers.priceCurrency, 'BDT');
    assert.equal(product.offers.url, `${canonicalOrigin}${productPath}`);
  });
  for (const pathname of ['/', '/product-list', '/offers']) {
    await check(`visitor HTML: ${pathname}`, pathname, (body, response) => {
      assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), 'Unexpected noindex header');
      assert.ok(body.includes(`<link rel="canonical" href="${canonicalOrigin}${pathname}">`), 'Wrong canonical URL');
      assert.match(body, /<h1[ >]/, 'Server-rendered content missing');
      if (pathname !== '/offers') assert.match(body, /<a href="https:\/\/www\.amolbooks\.com\/product-details\//, 'Crawlable book links missing');
      assert.match(body, /src="main\.[^"]+\.js"/, 'Interactive storefront bundle missing');
    }, 'Mozilla/5.0');
  }
  if (process.argv.includes('--all')) {
    for (const url of sitemapUrls) {
      if (!/\/(product-details|special-package-details)\//.test(url.pathname)) continue;
      await check(`catalogue: ${url.pathname}`, url.pathname, (body, response) => {
        assert.ok(body.includes(`<link rel="canonical" href="${url.href}">`), 'Wrong detail canonical');
        assert.match(body, /<h1[ >]/, 'Detail content missing');
        assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), 'Unexpected noindex header');
        assert.ok(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(body), 'Unexpected noindex meta');
      }, 'Mozilla/5.0');
    }
  }
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
