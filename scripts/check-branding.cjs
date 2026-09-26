const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.locator('body').evaluate((body) => {
      const test = document.createElement('p');
      test.id = 'brand-check';
      test.textContent = 'Alambook, Alambooks, Alam Book, আলম বুক, আলম বুকস, alambook.com, alambooks@gmail.com';
      body.appendChild(test);
    });
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator('#brand-check').textContent(),
      'Amol Books, Amol Books, Amol Books, আমল বুকস, আমল বুকস, alambook.com, alambooks@gmail.com',
    );
    console.log('PASS: visible legacy names replaced; functional URL/email preserved.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
