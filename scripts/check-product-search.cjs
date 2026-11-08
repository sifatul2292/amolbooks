// Spelling-tolerant book search (product-search.util.ts + ProductService.getAllProducts, and the
// header dropdown's author/publisher matching in storefront-product-sections-script.ts).
// Uses a throwaway database on the local mongod (never the app database). Needs `api/dist`
// (npm run build, or the dev server's watch build).
// `--live` also copies the live public catalogue (published books, names only, read-only) into
// the throwaway database and runs the owner's examples against it.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const { ProductService } = require('../api/dist/pages/product/product.service');
const { UtilsService } = require('../api/dist/shared/utils/utils.service');
const search = require('../api/dist/pages/product/product-search.util');
const { STOREFRONT_PRODUCT_SECTIONS_SCRIPT } = require('../api/dist/storefront-product-sections-script');

const live = process.argv.includes('--live');
const uri = 'mongodb://127.0.0.1:27017/amol_product_search_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_product_search_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
let connection;

(async () => {
  // 1. Folding: letters people mix up count as one.
  const { foldSearchText: fold, rankSearch, prepareCandidates, editDistance } = search;
  const same = [
    ['আত্মার ঔষুধ', 'আত্মার ওষুধ'],
    ['ইসলামী', 'ইসলামি'],
    ['রূপ', 'রুপ'],
    ['শিক্ষা', 'সিখা'],
    ['পাওয়া', 'পাওয়া'], // য় precomposed / decomposed
    ['বড়', 'বর'],
    ['কাইয়্যিম', 'কাইয়িম'],
    ['কোরআন', 'কুরআন'],
    ['কোরানের', 'কুরআনের'],
    ['দোয়া', 'দুআ'],
    ['নামায', 'নামাজ'],
    ['Koran', 'quran'],
    ['৫০০', '500'],
  ];
  for (const [a, b] of same) assert.equal(fold(a), fold(b), a + ' = ' + b);
  assert.equal(fold('  আধুনিক — ফিতনা!! '), 'আধুনিক ফিতনা');
  assert.equal(editDistance([...'abc'], [...'acb'], 2), 1, 'A swap is one typo');
  assert.equal(editDistance([...'abcdef'], [...'uvwxyz'], 1), 2, 'Stops early above the limit');

  // 2. Ranking on prepared candidates (already in the requested order).
  const books = [
    { _id: 'a', name: 'আত্মার ওষুধ', author: { name: 'আল্লামা ইবনুল কাইয়্যিম জাওযিয়্যাহ রহ' } },
    { _id: 'b', name: 'আধুনিক ফিতনা', author: { name: 'শাইখ হাফিজ ইবনে হুজাইফা হাফি.' } },
    { _id: 'c', name: 'ফিতনার যুগে করণীয়', category: [{ name: 'আকিদা' }] },
    { _id: 'd', name: 'দ্য বারাকাহ ইফেক্ট', nameEn: 'The Barakah Effect', publisher: { name: 'গার্ডিয়ান' } },
    { _id: 'e', name: 'কুরআনের গল্প', seoKeywords: 'quran story' },
    { _id: 'f', name: 'আধুনিক বিজ্ঞান', translatorName: 'মাসুদ শরীফ' },
  ];
  const prepared = prepareCandidates(books);
  const ids = (query) => rankSearch(prepared, query);
  assert.deepEqual(ids('আত্মার ঔষুধ'), ['a'], 'Owner example 1: ঔষুধ finds ওষুধ');
  assert.deepEqual(ids('আধুনিল ফিতনা'), ['b'], 'Owner example 2: one wrong letter');
  assert.deepEqual(ids('আধুনিক ফিতনা'), ['b']);
  assert.deepEqual(ids('ফিতনা আধুনিক'), ['b'], 'Word order does not matter');
  assert.deepEqual(ids('আত্মারওষুধ'), ['a'], 'Missing space');
  assert.deepEqual(ids('আধুনিক'), ['b', 'f'], 'Strong matches keep the requested order');
  assert.deepEqual(ids('ফিতনা'), ['b', 'c'], 'Prefix of a longer word (ফিতনার) is a strong match');
  assert.deepEqual(ids('ইবনুল কায়িম'), ['a'], 'Author name, other spelling');
  assert.deepEqual(ids('ইবনুল কাইয়িম ওষুধ'), ['a'], 'Words from title and author together');
  assert.deepEqual(ids('barakah effect'), ['d'], 'English name');
  assert.deepEqual(ids('barakha efect'), ['d'], 'English typos');
  assert.deepEqual(ids('কোরআনের গল্প'), ['e'], 'Quran spelling');
  assert.deepEqual(ids('মাসুদ সরিফ'), ['f'], 'Translator, other spelling');
  assert.deepEqual(ids('আকিদা'), ['c'], 'Category');
  assert.deepEqual(ids('গার্ডিয়ান'), ['d'], 'Publisher');
  assert.deepEqual(ids('আধুনিল ফিতনা বই'), ['b'], 'Three words: one unknown word is allowed');
  assert.deepEqual(ids('xyzqwe'), [], 'Nothing close');
  assert.deepEqual(ids('ফিতন'), ['b', 'c'], 'A word still being typed');
  assert.deepEqual(ids('বারাকা ইফেক্ত'), ['d'], 'Close spelling of every word');
  assert.deepEqual(ids('কলম'), [], 'Short words must match exactly');
  assert.deepEqual(ids(''), []);

  // 2b. Banglish (owner, 2026-11-08): Latin spellings of Bengali titles and names.
  assert.equal(search.romanizeBengali('সম্পদ ও রিজিকের গোপন রহস্য'), 'sompod o rijiker gopon rohos');
  assert.equal(search.romanizeBengali('আধুনিক ফিতনা'), 'adhunik fitna');
  assert.equal(search.romanizeBengali('বিশ্ব নামাজ ২০২৫'), 'bish namaj 2025');
  for (const [a, b] of [['rohossho', 'rohosso'], ['shompod', 'sampad'], ['rizik', 'rijik'], ['ow', 'o'], ['valo', 'bhalo'], ['quran', 'kuran']]) {
    assert.equal(fold(a), fold(b), a + ' = ' + b);
  }
  const banglish = prepareCandidates(books.concat([
    { _id: 'g', name: 'সম্পদ ও রিজিকের গোপন রহস্য', nameEn: 'Secrets of Wealth and Provision (Rizq)', author: { name: 'শাইখ ড. রাতিব আন-নাবুলুসি' } },
  ]));
  const bids = (query) => rankSearch(banglish, query);
  assert.deepEqual(bids('sompod ow rijiker rohosso'), ['g'], 'Owner example 3: Banglish title');
  assert.deepEqual(bids('shompod o rizik er gopon rohossho'), ['g'], 'Other Banglish spellings');
  assert.deepEqual(bids('sampad rizik'), ['g']);
  assert.deepEqual(bids('rijiker'), ['g']);
  assert.deepEqual(bids('secrets of wealth'), ['g'], 'English name still works');
  assert.deepEqual(bids('nabulsi'), ['g'], 'Banglish author, close spelling');
  assert.deepEqual(bids('atmar oshudh'), ['a']);
  assert.deepEqual(bids('adhunik fitna'), ['b']);
  assert.deepEqual(bids('barakah effect'), ['d']);
  assert.deepEqual(bids('masud sorif'), ['f'], 'Banglish translator');
  assert.deepEqual(bids('আধুনিক ফিতনা'), ['b'], 'Bengali unchanged');

  // 3. The dropdown folds letters exactly like the API, and suggests authors with close spellings.
  new vm.Script(STOREFRONT_PRODUCT_SECTIONS_SCRIPT, { filename: 'storefront-product-sections.js' });
  const grab = (name) => {
    const start = STOREFRONT_PRODUCT_SECTIONS_SCRIPT.indexOf('function ' + name + '(');
    assert.ok(start !== -1, name + ' exists');
    let depth = 0;
    for (let i = STOREFRONT_PRODUCT_SECTIONS_SCRIPT.indexOf('{', start); i < STOREFRONT_PRODUCT_SECTIONS_SCRIPT.length; i++) {
      const char = STOREFRONT_PRODUCT_SECTIONS_SCRIPT[i];
      if (char === '{') depth++;
      if (char === '}' && --depth === 0) return STOREFRONT_PRODUCT_SECTIONS_SCRIPT.slice(start, i + 1);
    }
    throw new Error('Unbalanced ' + name);
  };
  const client = vm.createContext({});
  const romanTables = STOREFRONT_PRODUCT_SECTIONS_SCRIPT.slice(
    STOREFRONT_PRODUCT_SECTIONS_SCRIPT.indexOf('var SEARCH_ROMAN_CONSONANTS'),
    STOREFRONT_PRODUCT_SECTIONS_SCRIPT.indexOf('function searchRoman('),
  );
  vm.runInContext(romanTables + ['searchKey', 'searchLatin', 'searchRoman', 'searchTypos', 'searchWordClose', 'matchSearchNames'].map(grab).join('\n'), client);
  for (const text of ['সম্পদ ও রিজিকের গোপন রহস্য', 'শাইখ ড. রাতিব আন-নাবুলুসি', 'আত্মার ওষুধ', 'বিশ্ব নামাজ ২০২৫', 'বড় দুঃখ চাঁদ', 'ব্যবসা স্বাধীন', 'মুসলমান সরকার']) {
    assert.equal(client.searchRoman(text), search.romanizeBengali(text), 'Dropdown and API romanize "' + text + '" alike');
  }
  for (const text of same.flat().concat(['আধুনিক — ফিতনা!!', 'প্রোডাক্টিভ মুসলিম', 'আল্লাহ', 'Productive Muslim 2', 'sompod ow rijiker rohossho', 'Shaykh Dr. Ratib an-Nabulsi', 'phul vai zakat'])) {
    assert.equal(client.searchKey(text), fold(text), 'Dropdown and API fold "' + text + '" alike');
  }
  const authors = [
    { name: 'আল্লামা ইবনুল কাইয়্যিম জাওযিয়্যাহ রহ', slug: 'ibnul' },
    { name: 'শাইখ হাফিজ ইবনে হুজাইফা হাফি.', slug: 'huzaifa' },
    { name: 'আরিফ আজাদ', slug: 'arif' },
    { name: 'আরিফুল ইসলাম', slug: 'ariful' },
  ];
  const names = (query) => client.matchSearchNames(authors, query, 3).map((author) => author.slug);
  assert.deepEqual(names('ইবনুল কায়িম'), ['ibnul']);
  assert.deepEqual(names('হুজায়ফা'), ['huzaifa']);
  assert.deepEqual(names('arif azad'), ['arif'], 'Banglish author name');
  assert.deepEqual(names('আরিফ আযাদ'), ['arif']);
  assert.deepEqual(names('আরিফ'), ['arif', 'ariful'], 'Exact prefix matches first');
  assert.deepEqual(names('আরিফ আজাদ'), ['arif']);
  assert.deepEqual(names('xyz'), []);

  // 4. ProductService.getAllProducts on a throwaway database.
  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Product = connection.model('Product', new mongoose.Schema({}, { strict: false }));
  const make = (name, priority, extra = {}) => ({ _id: new mongoose.Types.ObjectId(), name, priority, status: 'publish', salePrice: 100 + priority, ...extra });
  const docs = [
    make('আত্মার ওষুধ', 5, { author: { name: 'আল্লামা ইবনুল কাইয়্যিম জাওযিয়্যাহ রহ' } }),
    make('আধুনিক ফিতনা', 9),
    make('আধুনিক বিজ্ঞান', 7),
    make('আধুনিক অর্থনীতি', 3, { status: 'draft' }),
    make('ফিতনার যুগে করণীয়', 1),
  ];
  await Product.collection.insertMany(docs);
  const service = Object.create(ProductService.prototype);
  Object.assign(service, {
    productModel: Product,
    utilsService: new UtilsService(Product),
    cacheManager: { get: async () => null, set: async () => {} },
    logger: { log() {}, warn() {}, error() {} },
    searchCandidateCache: new Map(),
  });
  const run = async (q, sort = { priority: -1 }, pageSize = 10) =>
    service.getAllProducts(
      { filter: { status: 'publish' }, pagination: { pageSize, currentPage: 0 }, sort, select: { name: 1, salePrice: 1 } },
      q,
    );
  let result = await run('আত্মার ঔষুধ');
  assert.deepEqual(result.data.map((p) => p.name), ['আত্মার ওষুধ']);
  assert.equal(result.count, 1);
  assert.deepEqual(Object.keys(result.data[0]).sort(), ['_id', 'name', 'salePrice'], 'No helper field in the answer');
  result = await run('আধুনিল ফিতনা');
  assert.deepEqual(result.data.map((p) => p.name), ['আধুনিক ফিতনা']);
  result = await run('আধুনিক');
  assert.deepEqual(result.data.map((p) => p.name), ['আধুনিক ফিতনা', 'আধুনিক বিজ্ঞান'], 'Drafts stay hidden; requested sort kept');
  result = await run('আধুনিক', { salePrice: 1 });
  assert.deepEqual(result.data.map((p) => p.name), ['আধুনিক বিজ্ঞান', 'আধুনিক ফিতনা'], 'Another sort (price) is kept too');
  result = await run('আধুনিক', { priority: -1 }, 1);
  assert.equal(result.count, 2, 'Count covers every match');
  assert.deepEqual(result.data.map((p) => p.name), ['আধুনিক ফিতনা']);
  result = await run('ইবনুল কায়িম');
  assert.deepEqual(result.data.map((p) => p.name), ['আত্মার ওষুধ'], 'Author with another spelling');
  result = await run('xyzqwe');
  assert.deepEqual(result.data, []);
  assert.equal(service.searchCandidateCache.size, 2, 'Candidates cached per filter and sort (two sorts used)');
  // If the tolerant search cannot run, the old exact search still answers.
  service.searchCandidateCache = null;
  result = await run('আধুনিক ফিতনা');
  assert.deepEqual(result.data.map((p) => p.name), ['আধুনিক ফিতনা'], 'Exact search fallback');
  result = await run('আধুনিল ফিতনা');
  assert.deepEqual(result.data, [], 'Fallback is the old exact search');
  service.searchCandidateCache = new Map();
  // No search text: unchanged listing.
  result = await service.getAllProducts({ filter: { status: 'publish' }, pagination: { pageSize: 10, currentPage: 0 }, sort: { priority: -1 }, select: { name: 1 } });
  assert.equal(result.count, 4);

  if (live) {
    const response = await fetch('https://apisub.amolbooks.com/api/product/get-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { status: 'publish' },
        pagination: { pageSize: 3000, currentPage: 0 },
        select: { name: 1, nameEn: 1, seoKeywords: 1, translatorName: 1, 'category.name': 1, 'publisher.name': 1, 'author.name': 1, priority: 1, totalSold: 1, status: 1 },
      }),
    });
    const catalogue = (await response.json()).data;
    await Product.deleteMany({});
    await Product.collection.insertMany(catalogue.map((p) => ({ ...p, _id: new mongoose.Types.ObjectId(p._id), status: 'publish' })));
    service.searchCandidateCache = new Map();
    for (const [q, expected] of [['আত্মার ঔষুধ', 'আত্মার ওষুধ'], ['আধুনিল ফিতনা', 'আধুনিক ফিতনা'], ['প্রডাক্টিভ মুসলিম', 'প্রোডাক্টিভ মুসলিম'],
      ['sompod ow rijiker rohosso', 'সম্পদ ও রিজিকের গোপন রহস্য'], ['atmar oshudh', 'আত্মার ওষুধ'], ['adhunik fitna', 'আধুনিক ফিতনা']]) {
      result = await run(q, { priority: -1, totalSold: -1 }, 8);
      assert.equal(result.data[0] && result.data[0].name, expected, q + ' (live catalogue)');
      console.log('live catalogue:', q, '→', result.data.map((p) => p.name).join(' | '));
    }
  }

  await connection.dropDatabase();
  await connection.close();
  console.log('Product search: letter folding, Quran/dua spellings, close spellings, word order, missing spaces, every searchable field, Banglish titles/authors, requested sort kept, drafts hidden, counts, exact-search fallback and the dropdown author/publisher matching pass' + (live ? ' (and the live catalogue examples)' : ''));
})().catch(async (error) => {
  console.error(error);
  if (connection && connection.readyState === 1) {
    await connection.dropDatabase();
    await connection.close();
  }
  process.exitCode = 1;
});
