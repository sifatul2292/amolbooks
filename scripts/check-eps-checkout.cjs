// Browser fixtures only: no application database, real order, or payment is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/checkout-payment.html'), 'utf8');
const id = '507f1f77bcf86cd799439011';

(async () => {
  let enabled = true;
  let state = 'failed';
  let retryCalls = 0;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/api/payment/eps/config') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, data: { enabled } }));
    }
    if (url.pathname === '/api/payment/eps/status/' + id) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, data: {
        orderId: 'EPS-FIXTURE', paymentStatus: state === 'paid' ? 'paid' : 'unpaid',
        paymentGatewayStatus: state, amount: 375, paidAmount: state === 'paid' ? 375 : null, paidWith: 'bKash',
      } }));
    }
    if (url.pathname === '/api/payment/eps/retry/' + id && req.method === 'POST') {
      retryCalls++;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, data: { GatewayPageURL: 'https://pg.fixture.test/payment' } }));
    }
    if (url.pathname === '/api/storefront-assets/eps-pay-with.png') {
      res.setHeader('Content-Type', 'image/png');
      return res.end(fs.readFileSync(path.join(root, 'gtm-snippets/assets/eps-pay-with.png')));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
      snippet + '</head><body><app-checkout><mat-radio-group formcontrolname="paymentMethod">' +
      '<mat-radio-button><input type="radio" value="online_payment"><div class="method-data">Old payment logo</div>' +
      '</mat-radio-button></mat-radio-group></app-checkout>' +
      '<div class="order-success-card"><div class="success-content">Order saved</div></div>' +
      '<div class="payment-success-main"></div></body></html>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://pg.fixture.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>EPS fixture payment page</h1>' }));
      await page.goto(origin + '/checkout');
      await page.locator('.ab-eps-brand').waitFor();
      assert.equal(await page.locator('.ab-eps-brand').evaluate((image) => image.complete && image.naturalWidth > 0), true);
      assert.equal(await page.locator('.ab-eps-title').innerText(), 'অনলাইন পেমেন্ট');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'checkout has no horizontal overflow');

      state = 'paid';
      await page.goto(origin + '/checkout/order-success/' + id + '?payment=paid');
      await page.locator('.ab-eps-paid[data-state="paid"]').waitFor();
      assert.match(await page.locator('.ab-eps-paid').innerText(), /375.*bKash/);
      for (const result of ['failed', 'cancelled', 'review', 'pending']) {
        state = result;
        await page.goto(origin + '/payment/fail?order=' + id + '&state=' + result);
        await page.locator('.ab-eps-result-box[data-state="' + result + '"]').waitFor();
        await page.getByText('অর্ডার নম্বর: EPS-FIXTURE', { exact: false }).waitFor();
        assert.equal(await page.locator('[data-ab-eps-retry]').count(), ['failed', 'cancelled'].includes(result) ? 1 : 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      state = 'failed';
      await page.goto(origin + '/payment/fail?order=' + id + '&state=failed');
      await page.locator('[data-ab-eps-retry]').click();
      await page.getByRole('heading', { name: 'EPS fixture payment page' }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    assert.equal(retryCalls, 2, 'retry starts exactly one new payment per click');
    enabled = false;
    const page = await browser.newPage();
    await page.goto(origin + '/checkout');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.ab-eps-label').count(), 0, 'disabled integration leaves checkout untouched');
    console.log('EPS checkout browser checks passed (375px and 1440px, paid/fail/cancel/review/pending/retry/off)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
