// Run after npm run build in api/. Browser part uses Playwright with routed fixtures (no network, nothing sent to Meta).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

const root = join(__dirname, '..');
const sha = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
const exact = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
// The compiled storefront's stand-ins (hashed without lowercasing, as it does).
const placeholders = {
  ph: exact('8801700000000'), em: exact('noemail@gmail.com'), ct: exact('global'), fn: exact('Mr'),
  ln: exact('Unknown'), ge: exact('m'), st: exact('bd'), zp: exact('1200'), db: exact('19970216'),
  country: exact('bd'), external_id: exact(String(Date.now())),
};

(async () => {
  const snippet = readFileSync(join(root, 'gtm-snippets/meta-match-data.html'), 'utf8');
  const commerce = readFileSync(join(root, 'gtm-snippets/commerce-events.html'), 'utf8');
  const main = readFileSync(join(root, 'api/src/main.ts'), 'utf8');
  assert.match(main, /const storefrontSnippetFiles = \[\s*'meta-match-data\.html',/, 'Meta match data is injected first');
  assert.match(commerce, /function trackShipping\(\) \{[\s\S]*?rememberCustomer\(\);[\s\S]*?function trackPayment\(\) \{[\s\S]*?rememberCustomer\(\);/, 'Checkout hands typed details to the Meta helper');
  assert.match(main, /host==='apisub\.amolbooks\.com'\)&&\/\^\\\/api\\\/\(\?:gtag\|gtm\)\\\/\//, 'Local preview blocks the live API Meta calls');

  // Server: the compiled Meta handler strips stand-ins and empty click IDs; real values stay.
  const { GtmService } = require('../api/dist/pages/gtm/gtm.service');
  const { UtilsService } = require('../api/dist/shared/utils/utils.service');
  const utils = new UtilsService({});
  const sent = [];
  const service = new GtmService(
    { findOne: () => ({ select: async () => ({ analytics: { facebookPixelId: '1294682478263474', facebookPixelAccessToken: 'EAA' + 'x'.repeat(150) } }) }) },
    { trackFbConversionEventClient: async (pixel, token, payload) => { sent.push(payload); return {}; } },
    Object.assign(utils, { isValidFacebookPixelId: () => true, isValidFacebookAccessTokenFormat: () => true }),
    { capture: () => {} },
  );
  const req = { headers: { 'cf-connecting-ip': '2001:db8::7', 'x-forwarded-for': '198.51.100.9, 203.0.113.5', 'user-agent': 'Test' }, socket: { remoteAddress: '127.0.0.1' }, hostname: 'apisub.amolbooks.com' };
  await service.trackThemeViewContent(req, { event_name: 'ViewContent', user_data: Object.assign({}, placeholders, { fbc: '', fbp: '' }) });
  let userData = sent.pop().data[0].user_data;
  for (const key of ['ph', 'em', 'ct', 'fn', 'ln', 'ge', 'st', 'zp', 'db', 'fbc', 'fbp']) assert.equal(userData[key], undefined, `server drops stand-in ${key}`);
  assert.equal(userData.country, sha('bd'), 'server keeps country bd');
  assert.equal(userData.client_ip_address, '2001:db8::7', "server prefers Cloudflare's IPv6 address");
  await service.trackThemeAddToCart(req, { event_name: 'AddToCart', user_data: { ph: sha('8801712345678'), ge: exact('m'), fbc: 'fb.1.1.abc' } });
  userData = sent.pop().data[0].user_data;
  assert.equal(userData.ph, sha('8801712345678'), 'server keeps a real phone');
  assert.equal(userData.ge, exact('m'), 'server keeps gender for known customers');
  assert.equal(userData.fbc, 'fb.1.1.abc');
  assert.equal(utils.getClientIp({ headers: { 'x-forwarded-for': '198.51.100.9' }, socket: {} }), '198.51.100.9', 'forwarded address still used without Cloudflare');

  // Browser.
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const captured = [];
    await context.route('https://apisub.amolbooks.com/**', (route) => {
      captured.push({ url: route.request().url(), body: route.request().postData() });
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' });
    });
    await context.route('https://www.amolbooks.com/**', (route) => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8">' + snippet + '<script>window.__fbcAtParse = document.cookie;</script></head><body></body></html>',
    }));
    const page = await context.newPage();
    const post = (path, body) => page.evaluate(({ path, body }) => new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://apisub.amolbooks.com/api/' + path);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onloadend = resolve;
      xhr.send(JSON.stringify(body));
    }), { path, body });
    const lastBody = () => JSON.parse(captured[captured.length - 1].body);

    // 1. Click ID is written before any other script runs.
    await page.goto('https://www.amolbooks.com/product-details/x?fbclid=IwAR_click_1');
    assert.match(await page.evaluate(() => window.__fbcAtParse), /_fbc=fb\.1\.\d{13}\.IwAR_click_1/, '_fbc exists while the head is still parsing');
    const fbcCookie = (await context.cookies('https://www.amolbooks.com')).find((cookie) => cookie.name === '_fbc');
    assert.equal(fbcCookie.domain, '.amolbooks.com', '_fbc is shared with apisub/server subdomains');
    const firstFbc = decodeURIComponent(fbcCookie.value);
    await page.goto('https://www.amolbooks.com/product-details/y?fbclid=IwAR_click_1');
    assert.equal(decodeURIComponent((await context.cookies('https://www.amolbooks.com')).find((c) => c.name === '_fbc').value), firstFbc, 'Same click keeps its original timestamp');
    await context.addCookies([{ name: '_fbp', value: 'fb.1.1700000000000.123', domain: '.amolbooks.com', path: '/' }]);

    // 2. Stand-ins replaced; one stable external ID; click/browser IDs and country added.
    await post('gtag/track-theme-view-content', { event_name: 'ViewContent', user_data: Object.assign({}, placeholders, { fbc: '' }) });
    let body = lastBody();
    const anonymousId = await page.evaluate(() => localStorage.getItem('amol_analytics_anonymous_id'));
    assert.ok(anonymousId, 'anonymous ID is created');
    for (const key of ['ph', 'em', 'ct', 'fn', 'ln', 'ge', 'st', 'zp', 'db']) assert.equal(body.user_data[key], undefined, `browser drops stand-in ${key}`);
    assert.equal(body.user_data.external_id, anonymousId, 'external_id is the stable anonymous ID used by Purchase');
    assert.equal(body.user_data.fbc, firstFbc);
    assert.equal(body.user_data.fbp, 'fb.1.1700000000000.123');
    assert.equal(body.user_data.country, sha('bd'));
    assert.deepEqual(await page.evaluate(() => window.dataLayer.find((entry) => entry.user_data).user_data), { customer_id: anonymousId }, 'GTM tags get the same external ID');

    // 3. Known customer: hashed like the server's Purchase event, then reused.
    const saved = await page.evaluate(() => window.__amolRememberMetaCustomer({ name: 'রহিম উদ্দিন আহমেদ', phone: '০১৭১২-৩৪৫৬৭৮', email: ' Test@Example.com ' }));
    assert.equal(saved.ph, sha('8801712345678'), 'Bengali-digit phone normalises to 8801…');
    assert.equal(saved.em, sha('test@example.com'));
    assert.equal(saved.fn, sha('রহিম'));
    assert.equal(saved.ln, sha('উদ্দিনআহমেদ'), 'last name matches the server (remaining words joined)');
    assert.doesNotMatch(await page.evaluate(() => localStorage.getItem('ab_meta_customer')), /রহিম|1712|example/, 'only hashes are stored');
    await page.goto('https://www.amolbooks.com/cart');
    await post('gtag/track-theme-add-to-cart', { event_name: 'AddToCart', user_data: Object.assign({}, placeholders) });
    body = lastBody();
    assert.equal(body.user_data.ph, sha('8801712345678'));
    assert.equal(body.user_data.em, sha('test@example.com'));
    assert.equal(body.user_data.fn, sha('রহিম'));
    assert.equal(body.user_data.external_id, anonymousId, 'external ID stays the same across pages');

    // 4. Real (logged-in) values are never overwritten; gender kept for them.
    await post('gtag/track-theme-initial-checkout', { event_name: 'InitiateCheckout', user_data: { ph: sha('8801998887777'), fn: sha('karim'), ge: exact('m'), external_id: 'x' } });
    body = lastBody();
    assert.equal(body.user_data.ph, sha('8801998887777'));
    assert.equal(body.user_data.fn, sha('karim'));
    assert.equal(body.user_data.ge, exact('m'));

    // 5. No cookie: the saved first click still supplies fbc.
    await context.clearCookies();
    await page.evaluate(() => localStorage.setItem('amol_attribution_v1', JSON.stringify({ lastTouch: { fbclid: 'IwAR_saved', capturedAt: new Date(Date.now() - 86400000).toISOString() } })));
    await page.goto('https://www.amolbooks.com/');
    await post('gtag/track-theme-page-view', { event_name: 'PageView', user_data: {} });
    assert.match(lastBody().user_data.fbc, /^fb\.1\.\d{13}\.IwAR_saved$/);

    // 6. Other requests are untouched.
    await post('product/get-all', { filter: { status: 'publish' } });
    assert.deepEqual(lastBody(), { filter: { status: 'publish' } });
  } finally {
    await browser.close();
  }
  console.log('PASS: Meta events carry the real click ID, one external ID, saved customer hashes and country; stand-in values are removed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
