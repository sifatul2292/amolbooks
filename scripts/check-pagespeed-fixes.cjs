const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('../api/node_modules/express');
const sharp = require('../api/node_modules/sharp');
const { storefrontImages } = require('../api/dist/storefront-images');
const { chromium } = require('playwright');

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'amol-images-'));
  const app = express();
  app.use('/api/storefront-images', storefrontImages(directory));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    await sharp({ create: { width: 750, height: 1000, channels: 3, background: '#175c36' } }).png().toFile(path.join(directory, '--cover.png'));
    await Promise.all(Array.from({length: 8}, (_, i) => fs.copyFile(path.join(directory, '--cover.png'), path.join(directory, 'cover-' + i + '.png'))));
    const burst = await Promise.all(Array.from({length: 8}, (_, i) => fetch(origin + '/api/storefront-images/640/cover-' + i + '.png')));
    assert.ok(burst.every(response => response.status === 200), 'A normal shelf burst should queue behind four workers, not fall back to oversized originals');
    await Promise.all(burst.map(response => response.arrayBuffer()));
    const response = await fetch(origin + '/api/storefront-images/320/--cover.png');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /max-age=86400/);
    const data = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(data).metadata();
    assert.equal(metadata.width, 320);
    assert.equal(metadata.format, 'webp');
    assert.ok(data.length < (await fs.stat(path.join(directory, '--cover.png'))).size);
    const again = await fetch(origin + '/api/storefront-images/320/--cover.png');
    assert.deepEqual(Buffer.from(await again.arrayBuffer()), data);
    for (const suffix of ['999/--cover.png', '320/%2e%2e%2fsecret.png', '320/secret.svg']) {
      assert.equal((await fetch(origin + '/api/storefront-images/' + suffix)).status, 400);
    }
    assert.equal((await fetch(origin + '/api/storefront-images/320/missing.png')).status, 404);
    await sharp({ create: { width: 80, height: 100, channels: 3, background: '#fff' } }).png().toFile(path.join(directory, '--cover.png'));
    const changed = await fetch(origin + '/api/storefront-images/320/--cover.png');
    assert.equal((await sharp(Buffer.from(await changed.arrayBuffer())).metadata()).width, 80, 'Source updates invalidate cache and small images are not enlarged');

    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const snippet = await fs.readFile(path.join(__dirname, '../gtm-snippets/pagespeed-accessibility.html'), 'utf8');
    await page.setContent('<html><head>' + snippet + '</head><body><app-header><button class="search-icon"></button></app-header><app-home>Books</app-home><div class="side-nav-middle"><a>Home</a><a>About Us</a></div><ul><li><a><span><img></span>Category</a></li></ul><div class="footer-social"><a href="+880 1893-058682"></a><a href="https://www.facebook.com/amolbooksbd"></a><a href=""></a></div></body></html>');
    await page.waitForFunction(() => document.querySelector('.search-icon').hasAttribute('aria-label'));
    assert.equal(await page.locator('.search-icon').getAttribute('aria-label'), 'বই খুঁজুন');
    assert.equal(await page.locator('.side-nav-middle a').first().getAttribute('href'), '/');
    assert.equal(await page.locator('img').getAttribute('alt'), '');
    assert.equal(await page.locator('.footer-social a').first().getAttribute('href'), 'tel:+8801893058682');
    assert.equal(await page.locator('app-home').getAttribute('role'), 'main');
    await page.locator('.footer-social a').last().evaluate(link => link.setAttribute('href', 'https://www.youtube.com/@amolbooks'));
    await page.waitForFunction(() => document.querySelector('.footer-social a:last-child').getAttribute('aria-label') === 'Amol Books YouTube');
    assert.equal(await page.locator('.footer-social a').last().getAttribute('aria-hidden'), null, 'An initially empty social link becomes accessible after Angular hydrates href');
    await page.evaluate(() => {
      const button = document.createElement('button'); button.className = 'search-icon'; document.querySelector('app-header').appendChild(button);
    });
    await page.waitForFunction(() => [...document.querySelectorAll('.search-icon')].every(button => button.hasAttribute('aria-label')));
    const home = await fs.readFile(path.join(__dirname, '../gtm-snippets/homepage-redesign.html'), 'utf8');
    const helper = home.match(/  function responsiveImage\(product\) \{[\s\S]*?\n  function imageUrl\(product\) \{[\s\S]*?\n  \}/)[0];
    const render = new Function('location', 'localHost', 'escapeHtml', helper + ';return responsiveImage;')({origin}, true, value => String(value));
    assert.match(render({ images: ['upload/images/--cover.png'] }), /320w.*640w/);
    assert.doesNotMatch(render({ images: ['https://example.com/photo.png'] }), /srcset/);
    await page.route('**/api/storefront-images/**', route => route.fulfill({ status: 503, body: '' }));
    await page.route('https://apisub.amolbooks.com/api/upload/images/--cover.png', route => route.fulfill({ status: 200, contentType: 'image/webp', body: data }));
    await page.setContent('<img id="cover" ' + render({ images: ['upload/images/--cover.png'] }) + '><script>document.querySelector("img").addEventListener("error", function(){window.fallbackRan=true;});</script>');
    await page.waitForFunction(() => { const image = document.querySelector('img'); return image.complete && image.naturalWidth > 0; });
    assert.equal(await page.evaluate(() => !!window.fallbackRan), false, 'Original-image recovery must run before the legacy dummy-image listener');
    assert.match(home, /sameOriginCatalogue \? fetch\(API_BASE \+ '\/library'/);
    assert.match(home, /priority \? 'eager' : 'lazy'/);
    console.log('PageSpeed checks passed: resized WebP, bounded cache, source invalidation, path validation, responsive markup, first-cover priority, accessible controls and SPA updates.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
