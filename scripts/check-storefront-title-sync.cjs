const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = apiRequire('jsdom');
const { load } = require('./check-storefront-seo.cjs');
const { STOREFRONT_SEO_NAVIGATION } = load('api/src/pages/sitemap/storefront-document.service.ts');
const tick = () => new Promise(setImmediate);

async function main() {
  const dom = new JSDOM('<head><title>Home | Amolbooks</title></head>', {
    url: 'https://www.amolbooks.com/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window, sent = [], pending = [];
  w.fetch = (url, options) => {
    if (String(url).startsWith('/api/storefront-document')) {
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    }
    sent.push({ url, body: options?.body, transport: 'fetch' });
    return Promise.resolve({ ok: true });
  };
  w.navigator.sendBeacon = (url, body) => { sent.push({ url, body, transport: 'beacon' }); return true; };
  w.eval(STOREFRONT_SEO_NAVIGATION.replace(/^<script>|<\/script>$/g, ''));
  try {
    w.document.title = 'Old Angular homepage';
    assert.equal(w.document.title, 'Home | Amolbooks');
    w.document.querySelector('title').textContent = 'Direct DOM overwrite';
    assert.equal(w.document.title, 'Home | Amolbooks', 'Analytics reads the authoritative title synchronously');
    await tick();
    assert.equal(w.document.querySelector('title').textContent, 'Home | Amolbooks');
    assert.equal(sent.length, 0, 'Title changes never emit page views');
    const collect = (pathname, title, event = 'page_view') => 'https://www.google-analytics.com/g/collect?' + new URLSearchParams({ en: event, dl: 'https://www.amolbooks.com' + pathname, dt: title });
    await w.fetch(collect('/', 'Wrong title'), { method: 'POST' });
    assert.equal(new URL(sent[0].url).searchParams.get('dt'), 'Home | Amolbooks');

    w.history.pushState({}, '', '/product-details/book');
    w.document.title = 'Angular book';
    const request = w.fetch(collect('/product-details/book', 'Angular book'), { method: 'POST', keepalive: true });
    assert.equal(sent.length, 1, 'Page view waits for pending route metadata');
    pending[0].resolve({ ok: true, text: async () => '<head><title>Book: Author | Amolbooks</title></head>' });
    await request;
    assert.equal(sent.length, 2, 'Exactly one existing page view was sent');
    assert.equal(new URL(sent[1].url).searchParams.get('dt'), 'Book: Author | Amolbooks');
    w.document.title = 'Late Angular book';
    assert.equal(w.document.title, 'Book: Author | Amolbooks');
    assert.equal(w.document.querySelectorAll('title').length, 1);

    w.history.pushState({}, '', '/product-details/500%20words%2075%25');
    assert.equal(w.navigator.sendBeacon(collect('/product-details/500 words 75%', 'Wrong'), ''), true);
    pending[1].resolve({ ok: true, text: async () => '<head><title>500 words 75% | Amolbooks</title></head>' });
    await tick();
    assert.equal(sent.length, 3);
    assert.equal(sent[2].transport, 'beacon');
    assert.equal(new URL(sent[2].url).searchParams.get('dt'), '500 words 75% | Amolbooks');

    w.history.replaceState({}, '', '/');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    pending[2].resolve({ ok: true, text: async () => '<head><title>Home | Amolbooks</title></head>' });
    await tick();
    w.document.title = 'Old homepage';
    assert.equal(w.document.title, 'Home | Amolbooks');
    const body = new URLSearchParams({ en: 'page_view', dl: w.location.href, dt: 'Wrong' }).toString();
    await w.fetch('https://server.amolbooks.com/g/collect', { method: 'POST', body });
    assert.equal(new URLSearchParams(sent[3].body).get('dt'), 'Home | Amolbooks');
    await w.fetch(collect('/', 'Unchanged', 'purchase'));
    assert.equal(new URL(sent[4].url).searchParams.get('dt'), 'Unchanged', 'Purchase events are untouched');
    await w.fetch('https://example.com/g/collect?en=page_view&dt=Unchanged');
    assert.equal(sent[5].url, 'https://example.com/g/collect?en=page_view&dt=Unchanged');

    w.history.pushState({}, '', '/offers');
    const failed = w.fetch(collect('/offers', 'Original on failure'));
    pending[3].reject(new Error('Metadata unavailable'));
    await failed;
    assert.equal(new URL(sent[6].url).searchParams.get('dt'), 'Original on failure', 'Failed metadata does not drop the event');
    w.history.pushState({}, '', '/cart');
    w.document.title = 'Cart';
    assert.equal(w.document.title, 'Cart', 'Unmanaged routes retain Angular titles');
    w.history.pushState({}, '', '/blogs');
    const delayed = w.fetch(collect('/blogs', 'Title if metadata times out'));
    await delayed;
    assert.equal(new URL(sent[7].url).searchParams.get('dt'), 'Title if metadata times out');
    pending[4].resolve({ ok: true, text: async () => '<head><title>Blog | Amolbooks</title></head>' });
    await tick();
    assert.equal(sent.length, 8, 'Late metadata does not resend a timed-out page view');
    const batch = 'en=page_view&dt=Original\nen=scroll';
    await w.fetch(collect('/blogs', 'Original'), { method: 'POST', body: batch });
    assert.equal(sent[8].body, batch, 'Batched analytics payloads are not reserialized');
    await tick();
    console.log('PASS: stable reload/route titles, direct DOM correction, one GA4 request, encoded paths, fetch/beacon, metadata failure and unmanaged routes');
  } finally { dom.window.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
