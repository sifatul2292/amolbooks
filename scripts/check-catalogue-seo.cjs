// Author, publisher and category pages: SEO head, document routing, client navigation and sitemap.
// Runs from api/src (no build, no database): node scripts/check-catalogue-seo.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = apiRequire('jsdom');
const { load } = require('./check-storefront-seo.cjs');
const { renderCatalogueSeo, cataloguePath } = load('api/src/pages/sitemap/catalogue-seo.utils.ts');
const { CatalogueSeoService } = load('api/src/pages/sitemap/catalogue-seo.service.ts');
const { StorefrontDocumentService, STOREFRONT_SEO_NAVIGATION } = load('api/src/pages/sitemap/storefront-document.service.ts');
const { SitemapService } = load('api/src/pages/sitemap/sitemap.service.ts');

const ORIGIN = 'https://www.amolbooks.com';
// The sources run in a vm context; compare their objects by value, not by realm.
const same = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
const head = (html) => html.match(/<head>([\s\S]*?)<\/head>/)[1];
const meta = (html, name) => (html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`)) || [])[1];
const canonical = (html) => (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const books = [
  { name: 'গুরাবা', slug: 'guraba', images: ['https://apisub.amolbooks.com/api/upload/images/guraba.webp'] },
  { name: 'বই <b>&</b>', slug: '50% / বই' },
  { name: 'তৃতীয়', slug: 'third' },
  { name: 'চতুর্থ', slug: 'fourth' },
];

function renderers() {
  const author = renderCatalogueSeo('author', {
    name: 'সাজিদ হাসান', nameEn: 'Sajid Hasan', slug: 'সাজিদ-হাসান',
    image: 'https://apisub.amolbooks.com/api/upload/images/sajid.webp',
    description: '<p>সাজিদ হাসান একজন <strong>লেখক</strong>।</p>',
  }, books, 4);
  assert.match(author, /<title>সাজিদ হাসান এর বই \(Sajid Hasan\) \| Amolbooks<\/title>/);
  assert.equal(meta(author, 'description'), 'সাজিদ হাসান একজন লেখক।', 'The bio, without tags, is the description');
  assert.equal(meta(author, 'robots'), 'index, follow, max-image-preview:large');
  assert.equal(canonical(author), ORIGIN + '/author-list/author-details/' + encodeURIComponent('সাজিদ-হাসান'));
  assert.equal(meta(author, 'og:image'), 'https://apisub.amolbooks.com/api/upload/images/sajid.webp');
  const [page, breadcrumb] = jsonLd(author);
  assert.equal(page['@type'], 'CollectionPage');
  same(page.about, { '@type': 'Person', name: 'সাজিদ হাসান', alternateName: 'Sajid Hasan',
    description: 'সাজিদ হাসান একজন লেখক।', image: 'https://apisub.amolbooks.com/api/upload/images/sajid.webp' });
  assert.equal(page.mainEntity.numberOfItems, 4);
  assert.equal(page.mainEntity.itemListElement[1].url, ORIGIN + '/product-details/' + encodeURIComponent('50% / বই'));
  same(breadcrumb.itemListElement.map((item) => item.item), [ORIGIN + '/', ORIGIN + '/author-list', canonical(author)]);
  assert.ok(!head(author).includes('<b>'), 'Book names never add tags to the head');
  assert.ok(author.includes('<h2>সাজিদ হাসান এর ৪টি বই</h2>'));
  assert.ok(author.includes('>বই &lt;b&gt;&amp;&lt;/b&gt;</a>'), 'Book names are escaped in the page body');

  const publisher = renderCatalogueSeo('publisher', { name: 'সন্দীপন প্রকাশন', nameEn: 'Sondipon Prokashon', slug: 'সন্দীপন-প্রকাশন' }, books.slice(0, 2), 2);
  assert.equal(canonical(publisher), ORIGIN + '/product-list?publisher=' + encodeURIComponent('সন্দীপন-প্রকাশন'));
  assert.equal(meta(publisher, 'description'), 'সন্দীপন প্রকাশন প্রকাশিত ২টি বই: গুরাবা, বই &amp;। Amolbooks থেকে অনলাইনে অর্ডার করুন।');
  assert.equal(meta(publisher, 'og:image'), books[0].images[0], 'Without a logo the first cover is the share image');
  assert.equal(jsonLd(publisher)[0].about['@type'], 'Organization');
  assert.equal(jsonLd(publisher)[1].itemListElement[1].item, ORIGIN + '/publisher-list');

  const category = renderCatalogueSeo('category', { name: 'শিশু-কিশোর', nameEn: 'Kids and Teens', slug: 'শিশু-কিশোর' }, books, 12);
  assert.match(category, /<title>শিশু-কিশোর বিষয়ের বই \(Kids and Teens\) \| Amolbooks<\/title>/);
  assert.equal(canonical(category), ORIGIN + '/product-list?categories=' + encodeURIComponent('শিশু-কিশোর'));
  assert.match(meta(category, 'description'), /^শিশু-কিশোর বিষয়ের ১২টি বই: গুরাবা, .* ও আরও।/);
  const hidden = renderCatalogueSeo('category', { name: 'গোপন', slug: 'gopon', status: 'draft' }, books);
  assert.equal(meta(hidden, 'robots'), 'noindex, follow', 'A hidden category stays out of search');
  const empty = renderCatalogueSeo('author', { name: 'নতুন লেখক', slug: 'notun' }, []);
  assert.equal(meta(empty, 'robots'), 'noindex, follow', 'An author without published books stays out of search');
  assert.equal(meta(empty, 'og:image'), ORIGIN + '/assets/images/logo/logo.png');
  const unsafe = renderCatalogueSeo('author', { name: '</script><script>alert(1)</script>', slug: 'x"y' }, books);
  assert.ok(!unsafe.includes('<script>alert'), 'Names cannot close the JSON-LD script');
  assert.ok(unsafe.includes('href="' + ORIGIN + '/author-list/author-details/x%22y"'));
  assert.equal(cataloguePath('category', 'a&b'), '/product-list?categories=a%26b');
}

// Mongoose-like models that record their queries.
function model(rows, calls, name) {
  const chain = (result, query) => {
    const step = { select: () => step, sort: (sort) => { query.sort = sort; return step; },
      limit: (limit) => { query.limit = limit; return step; }, lean: async () => result(query) };
    return step;
  };
  return {
    findOne: (filter) => { const query = { name, op: 'findOne', filter }; calls.push(query); return chain(() => rows.find((row) => matches(row, filter)) || null, query); },
    find: (filter) => { const query = { name, op: 'find', filter }; calls.push(query); return chain((q) => rows.filter((row) => matches(row, filter)).slice(0, q.limit || Infinity), query); },
    countDocuments: async (filter) => rows.filter((row) => matches(row, filter)).length,
    aggregate: async (pipeline) => { calls.push({ name, op: 'aggregate', pipeline }); return rows.groups[JSON.stringify(pipeline[pipeline.length - 1].$group._id)] || []; },
  };
}
function matches(row, filter) {
  return Object.entries(filter).every(([key, want]) => {
    if (key === '$or') return want.some((part) => matches(row, part));
    const have = key.split('.').reduce((value, part) => Array.isArray(value) ? value.map((item) => item?.[part]) : value?.[part], row);
    const values = (Array.isArray(have) ? have : [have]).map((value) => value === undefined ? null : value);
    if (want && typeof want === 'object' && !want._bsontype) {
      if (want.$in) return values.some((value) => want.$in.some((option) => String(option) === String(value)));
      if ('$exists' in want) return values.some((value) => value !== null && value !== want.$ne);
    }
    return values.some((value) => String(value) === String(want));
  });
}

async function lookups() {
  const calls = [];
  const nfd = 'সাজিদ-হাসান-ময়'.normalize('NFD');
  const authors = [{ _id: 'a1aaaaaaaaaaaaaaaaaaaaaa', name: 'সাজিদ', slug: nfd, updatedAt: new Date('2026-01-01') }];
  const publishers = [{ _id: 'b1bbbbbbbbbbbbbbbbbbbbbb', name: 'সন্দীপন', slug: 'sondipon', image: 'https://apisub.amolbooks.com/api/upload/images/s.webp' }];
  const categories = [{ _id: 'c1cccccccccccccccccccccc', name: 'শিশু', slug: 'kids', status: 'publish' },
    { _id: 'c2cccccccccccccccccccccc', name: 'গোপন', slug: 'hidden', status: 'draft' }];
  const products = Array.from({ length: 105 }, (_, i) => ({ name: 'বই ' + i, slug: 'b' + i, status: 'publish',
    author: [{ _id: authors[0]._id }], publisher: { _id: publishers[0]._id }, category: [{ _id: categories[0]._id }] }));
  products.push({ name: 'খসড়া', slug: 'draft', status: 'draft', author: [{ _id: authors[0]._id }] });
  products.groups = {
    '"$author._id"': [{ _id: authors[0]._id, updatedAt: new Date('2026-10-01') }, { _id: null }],
    '"$publisher._id"': [{ _id: publishers[0]._id, updatedAt: new Date('2025-01-01') }],
    '"$category._id"': [{ _id: categories[0]._id }, { _id: categories[1]._id }],
  };
  const service = new CatalogueSeoService(model(authors, calls, 'Author'), model(publishers, calls, 'Publisher'),
    model(categories, calls, 'Category'), model(products, calls, 'Product'));

  const author = await service.page('author', nfd.normalize('NFC'));
  assert.ok(author, 'An NFC address finds an NFD slug');
  assert.equal(author.books.length, 100, 'At most 100 books are listed');
  assert.equal(author.total, 105, 'The draft book is not counted');
  same(calls.find((call) => call.name === 'Product').sort, { totalSold: -1, priority: -1, _id: 1 });
  assert.equal(await service.page('author', 'nobody'), null);
  assert.equal(await service.page('author', ''), null);
  calls.length = 0;
  assert.ok(await service.page('publisher', 'wrong-slug', publishers[0]._id), 'The publisher id from the menu links finds it');
  assert.ok(calls[0].filter.$or, 'Id and slug are both tried');
  assert.ok(await service.page('publisher', 'sondipon', 'not-an-id'));
  assert.equal(await service.page('publisher', '', 'not-an-id'), null);

  const entries = await service.sitemapEntries();
  same(entries.map((entry) => entry.url), [
    '/author-list/author-details/' + encodeURIComponent(nfd), '/product-list?publisher=sondipon', '/product-list?categories=kids']);
  assert.equal(entries[0].lastmod.toISOString(), '2026-10-01T00:00:00.000Z', 'Latest of the profile and its books');
  assert.equal(entries[1].image, publishers[0].image);
  const authorPipeline = calls.find((call) => call.op === 'aggregate').pipeline;
  same(authorPipeline[0].$match.status, 'publish');
  same(authorPipeline[1], { $unwind: '$author' });
}

function fakeResponse() {
  return { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; return this; }, status(n) { this.code = n; return this; },
    type() { return this; }, send(s) { this.body = s; return this; } };
}

async function documents() {
  const asked = [];
  const catalogue = { page: async (kind, slug, id) => {
    asked.push([kind, slug, id]);
    if (slug === 'missing' || slug === '') return id === 'b1bbbbbbbbbbbbbbbbbbbbbb' ? { entity: { name: 'আইডি', slug: 'by-id' }, books, total: 4 } : null;
    return { entity: { name: slug, slug }, books, total: 4 };
  } };
  const products = { findAllPublished: async () => books, getAllProducts: async () => ({ data: [] }) };
  const service = new StorefrontDocumentService(products, { findAllForSitemap: async () => [] }, catalogue);
  const send = async (path, query, notFound) => { const res = fakeResponse(); await service.send(path, res, query, notFound); return res; };

  const author = await send('author-list/author-details/সাজিদ-হাসান/', {});
  assert.equal(author.code, 200);
  same(asked.pop(), ['author', 'সাজিদ-হাসান', undefined]);
  assert.match(author.body, /<app-root><div id="amol-seo-fallback"><main><h1>সাজিদ-হাসান এর বই<\/h1>/);
  assert.equal((author.body.match(/<link[^>]*rel="canonical"/g) || []).length, 1, 'The shell keeps one canonical');
  assert.match(author.body, /src="main\.[^"]+\.js"/, 'The storefront app still loads');
  const slashed = await send('author-list/author-details/a/b', {});
  same(asked.pop(), ['author', 'a/b', undefined], 'A slug with an encoded slash stays whole');
  assert.equal(slashed.code, 200);

  let fellBack = 0;
  const unknown = await send('author-list/author-details/missing', {}, () => { fellBack += 1; });
  assert.equal(fellBack, 1, 'An unknown author falls back to the plain storefront');
  assert.equal(unknown.body, undefined, 'Nothing is sent before the fallback');
  const unknownApi = await send('author-list/author-details/missing', {});
  assert.equal(unknownApi.code, 404);
  assert.match(unknownApi.body, /noindex/);

  const publisher = await send('product-list', { publisher: 'সন্দীপন-প্রকাশন', publisherId: 'x' });
  same(asked.pop(), ['publisher', 'সন্দীপন-প্রকাশন', 'x']);
  assert.ok(publisher.body.includes('href="' + ORIGIN + '/product-list?publisher=' + encodeURIComponent('সন্দীপন-প্রকাশন') + '"'));
  const byId = await send('product-list', { publisherId: 'b1bbbbbbbbbbbbbbbbbbbbbb' });
  assert.ok(byId.body.includes('/product-list?publisher=by-id"'), 'A publisherId-only list still gets the publisher canonical');
  const category = await send('product-list', { categories: ['শিশু-কিশোর', 'other'] });
  same(asked.pop(), ['category', 'শিশু-কিশোর', undefined]);
  assert.ok(category.body.includes('<title>শিশু-কিশোর বিষয়ের বই | Amolbooks</title>'));
  asked.length = 0;
  for (const query of [{ publisher: 'missing' }, { searchQuery: 'quran' }, { publisher: { $ne: 1 } }, {}]) {
    const list = await send('product-list', query);
    assert.equal(list.code, 200);
    assert.ok(list.body.includes('<link rel="canonical" href="' + ORIGIN + '/product-list">'), 'Other book lists keep the general page: ' + JSON.stringify(query));
  }
  same(asked, [['publisher', 'missing', '']], 'Only a text publisher is looked up, never a search or an object');
  const categoryPage = await send('category-list', { categories: 'x' });
  assert.ok(categoryPage.body.includes('href="' + ORIGIN + '/category-list"'), 'Only /product-list reads the filter');
}

async function navigation() {
  const dom = new JSDOM('<head><title>Home</title><link rel="canonical" href="https://www.amolbooks.com/"></head>', {
    url: ORIGIN + '/product-list?publisher=a', runScripts: 'outside-only' });
  const w = dom.window, fetched = [];
  w.fetch = (url) => { fetched.push(url); return Promise.resolve({ ok: true, text: async () => '<html><head><title>X</title></head></html>' }); };
  w.eval(STOREFRONT_SEO_NAVIGATION.replace(/^<script>|<\/script>$/g, ''));
  w.history.pushState({}, '', '/product-list?publisher=a&page=2');
  assert.equal(fetched.length, 0, 'Other query changes on the same publisher do not refetch');
  w.history.pushState({}, '', '/product-list?publisher=' + encodeURIComponent('সন্দীপন') + '&publisherId=1');
  assert.equal(fetched.pop(), '/api/storefront-document/product-list?publisher=' + encodeURIComponent('সন্দীপন') + '&publisherId=1');
  w.history.pushState({}, '', '/product-list?categories=kids');
  assert.equal(fetched.pop(), '/api/storefront-document/product-list?categories=kids');
  w.history.pushState({}, '', '/product-list');
  assert.equal(fetched.pop(), '/api/storefront-document/product-list');
  w.history.pushState({}, '', '/author-list/author-details/' + encodeURIComponent('সাজিদ-হাসান'));
  assert.equal(fetched.pop(), '/api/storefront-document/author-list/author-details/' + encodeURIComponent('সাজিদ-হাসান'));
  w.history.pushState({}, '', '/cart?publisher=a');
  assert.equal(fetched.length, 0, 'Pages without their own metadata are not fetched');
  assert.equal(w.document.querySelector('link[rel="canonical"]').href, ORIGIN + '/cart');
  w.close();
}

async function sitemap() {
  const xml = await new SitemapService({ findAllPublished: async () => [] }, { findAllPublished: async () => [] },
    { findAllForSitemap: async () => [] }, { sitemapEntries: async () => [
      { url: '/author-list/author-details/' + encodeURIComponent('সাজিদ-হাসান'), lastmod: new Date('2026-10-01'), name: 'সাজিদ', image: 'https://apisub.amolbooks.com/api/upload/images/s.webp' },
      { url: '/product-list?publisher=' + encodeURIComponent('সন্দীপন'), name: 'সন্দীপন' },
    ] }).generateSitemapXml();
  assert.ok(xml.includes('<loc>' + ORIGIN + '/author-list/author-details/' + encodeURIComponent('সাজিদ-হাসান') + '</loc>'));
  assert.ok(xml.includes('<loc>' + ORIGIN + '/product-list?publisher=' + encodeURIComponent('সন্দীপন') + '</loc>'));
  assert.ok(xml.includes('<lastmod>2026-10-01'));
  assert.ok(xml.includes('<image:loc>https://apisub.amolbooks.com/api/upload/images/s.webp</image:loc>'));
}

(async () => {
  renderers();
  await lookups();
  await documents();
  await navigation();
  await sitemap();
  console.log('PASS: author/publisher/category SEO heads, lookups, document routing, client navigation and sitemap');
})().catch((error) => { console.error(error); process.exitCode = 1; });
