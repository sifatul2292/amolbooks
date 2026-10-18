const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const snippet = fs.readFileSync(require('node:path').join(__dirname, '../gtm-snippets/product-review-video.html'), 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
      await page.goto('https://www.amolbooks.com/product-details/fixture');
      await page.setContent(snippet);
      for (const [input, expected] of [
        ['https://youtu.be/DkzXILgLH10?si=iGYh-WtNkwyd5Yt4', 'https://www.youtube.com/embed/DkzXILgLH10'],
        ['https://www.youtube.com/watch?v=DkzXILgLH10&feature=shared', 'https://www.youtube.com/embed/DkzXILgLH10'],
        ['https://www.youtube.com/shorts/DkzXILgLH10', 'https://www.youtube.com/embed/DkzXILgLH10'],
        ['https://www.youtube.com/live/DkzXILgLH10', 'https://www.youtube.com/embed/DkzXILgLH10'],
        ['https://www.youtube-nocookie.com/embed/DkzXILgLH10?start=5', 'https://www.youtube-nocookie.com/embed/DkzXILgLH10?start=5'],
        ['https://youtube.com.evil.example/watch?v=DkzXILgLH10', 'https://youtube.com.evil.example/watch?v=DkzXILgLH10'],
        ['https://www.youtube.com/watch?v=bad', 'https://www.youtube.com/watch?v=bad'],
        ['https://example.com/player', 'https://example.com/player'],
      ]) {
        await page.evaluate(src => {
          document.body.innerHTML = '<iframe id="review"></iframe>';
          document.querySelector('iframe').src = src;
        }, input);
        await page.waitForFunction(expected => document.querySelector('#review').getAttribute('src') === expected, expected);
        assert.equal(await page.locator('#review').getAttribute('src'), expected);
        if (expected.includes('/embed/')) assert.equal(await page.locator('#review').getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
      }
      await page.evaluate(() => {
        history.pushState({}, '', '/cart');
        document.querySelector('iframe').src = 'https://youtu.be/DkzXILgLH10';
      });
      await page.waitForTimeout(30);
      assert.equal(await page.locator('iframe').getAttribute('src'), 'https://youtu.be/DkzXILgLH10', 'Other routes remain untouched');
      await page.evaluate(() => {
        history.pushState({}, '', '/product-details/next');
        document.querySelector('iframe').src = 'https://www.youtube.com/watch?v=DkzXILgLH10';
      });
      await page.waitForFunction(() => document.querySelector('iframe').src.endsWith('/embed/DkzXILgLH10'));
      await page.close();
    }
    assert.match(fs.readFileSync(require('node:path').join(__dirname, '../api/src/main.ts'), 'utf8'), /'product-review-video\.html'/);
    console.log('Product review video: desktop/mobile, dynamic src, SPA routes and unrelated frames passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
