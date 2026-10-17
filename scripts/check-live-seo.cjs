// Read-only production routing checks. Requires Node 18+.
// Usage: node scripts/check-live-seo.cjs [storefront-origin]
const assert = require('node:assert/strict');

const origin = new URL(process.argv[2] || 'https://www.amolbooks.com').origin;
const canonicalOrigin = 'https://www.amolbooks.com';
const slug = 'tinii-amar-rob-2-98';
const productPath = `/product-details/${slug}`;
const failures = [];

async function check(label, path, verify) {
  try {
    const response = await fetch(`${origin}${path}`, {
      headers: { 'User-Agent': 'Googlebot', Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' },
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
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
