// Search suggestions show matching authors (Bengali or English name) above the books, Rokomari-style.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'api/src/storefront-product-sections-script.ts'), 'utf8');
// The TS file holds the script in a template literal; evaluate it to get the real script text.
const script = vm.runInNewContext(source.slice(source.indexOf('`'), source.lastIndexOf('`') + 1));
const fn = (name) => {
  const start = script.indexOf('  function ' + name + '(');
  assert.ok(start !== -1, name + ' exists');
  const end = script.indexOf('\n  }\n', start);
  return script.slice(start, end + 4);
};
const context = vm.createContext({});
// The Banglish tables (SEARCH_ROMAN_*) sit just before searchRoman.
const romanTables = script.slice(script.indexOf('  var SEARCH_ROMAN_CONSONANTS'), script.indexOf('  function searchRoman('));
vm.runInContext(romanTables + fn('searchKey') + fn('searchLatin') + fn('searchRoman') + fn('searchTypos') + fn('searchWordClose') + fn('matchSearchNames') + fn('matchSearchAuthors') + fn('matchSearchPublishers'), context);
const match = (authors, query) => Array.from(context.matchSearchAuthors(authors, query), (a) => a.slug);

const profiles = JSON.parse(fs.readFileSync(path.join(root, 'data/author-profiles/authors.json'), 'utf8'));
const authors = profiles.map((p) => ({ _id: p.id, name: p.name, nameEn: p.nameEn, slug: p.name.replace(/\s+/g, '-'), image: p.image || null }));
const slug = (name) => name.replace(/\s+/g, '-');

assert.deepEqual(match(authors, 'arif'), [slug('আরিফ আজাদ')], 'English name finds the Bengali author');
assert.deepEqual(match(authors, 'Arif Azad'), [slug('আরিফ আজাদ')], 'case and full name');
assert.deepEqual(match(authors, 'আরিফ'), [slug('আরিফ আজাদ')], 'Bengali name');
assert.deepEqual(match(authors, 'আজাদ'), [slug('আরিফ আজাদ')], 'any word of the name');
assert.deepEqual(match(authors, 'রিফ'), [], 'not from the middle of a word');
assert.ok(match(authors, 'bukhari').includes(slug('ইমাম মুহাম্মদ ইবনে ইসমাইল বোখারী (র)')), 'English transliteration');
assert.ok(match(authors, 'ইমাম').length <= 3, 'at most three authors');
const nawawi = match(authors, 'nawawi');
assert.equal(new Set(nawawi.map((s) => s.normalize('NFC'))).size, nawawi.length, 'duplicate records with the same name are shown once');
assert.ok(nawawi.length >= 1);
assert.deepEqual(match(authors, 'zzqx'), []);
assert.deepEqual(match(authors, '   '), []);
// Prefix match ranks first; same-name duplicates collapse.
assert.deepEqual(match([
  { name: 'মুহাম্মাদ আলী', slug: 'b' },
  { name: 'আলী হাম্মুদা', slug: 'a' },
  { name: 'আলী হাম্মুদা', slug: 'a2' },
], 'আলী'), ['a', 'b']);
// য় written as one or two code points still matches.
assert.deepEqual(match([{ name: 'ইয়াসমিন মুজাহিদ', slug: 'y' }], 'ইয়াসমিন'), ['y']);

// Publishers: Bengali name, English name (data/publisher-profiles) or an English slug.
const publisherNames = JSON.parse(fs.readFileSync(path.join(root, 'data/publisher-profiles/publishers.json'), 'utf8')).filter((p) => p.nameEn);
assert.equal(new Set(publisherNames.map((p) => p.id)).size, publisherNames.length, 'one entry per publisher');
for (const p of publisherNames) assert.match(p.nameEn, /^[\x20-\x7e]+$/, p.name + ': English name');
const publishers = publisherNames.map((p) => ({ _id: p.id, name: p.name, nameEn: p.nameEn, slug: p.name.replace(/\s+/g, '-') }))
  .concat([{ _id: 'x', name: 'Ihdah Publication', slug: 'ihdah-publication' }, { _id: 'y', name: 'সত্যায়ন প্রকাশন', slug: 'sottayon-prokashon' }]);
const pmatch = (query) => Array.from(context.matchSearchPublishers(publishers, query), (p) => p.name.normalize('NFC'));
assert.deepEqual(pmatch('sondipon'), ['সন্দীপন প্রকাশন'.normalize('NFC')], 'English name finds the Bengali publisher');
assert.deepEqual(pmatch('সন্দীপন'), ['সন্দীপন প্রকাশন'.normalize('NFC')], 'Bengali name');
assert.ok(pmatch('sottayon').includes('সত্যায়ন প্রকাশন'.normalize('NFC')), 'English slug');
assert.deepEqual(pmatch('ihdah'), ['Ihdah Publication']);
assert.ok(pmatch('prokashon').length <= 2, 'at most two publishers');
assert.match(fn('searchPublisherHtml'), /\/product-list\?publisher=' \+ encodeURIComponent\(publisher\.slug/, 'opens the book list of that publisher, like the publisher cards');
assert.match(fn('searchPublisherHtml'), /প্রকাশনী/);
assert.match(fn('searchStickyProducts'), /'publisher\._id': publisher\._id/, 'matched publishers bring their books');
assert.match(fn('searchPublisherList'), /CATALOG_API_BASE/, 'publishers come from the catalogue (published data)');
assert.match(fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8'), /req\.method === 'POST' && req\.path === '\/publisher\/get-all'/, 'local catalogue proxy allows the publisher list');
assert.ok(fn('renderSearchProducts').indexOf('publishers.map(searchPublisherHtml)') < fn('renderSearchProducts').indexOf('products.map(stickySearchProductHtml)'), 'publishers above books');

// Wiring: authors render above books, books get old/new price and an add button, adds are tracked off product pages.
const render = fn('renderSearchProducts');
assert.ok(render.indexOf('authors.map(searchAuthorHtml)') < render.indexOf('products.map(stickySearchProductHtml)'), 'authors first');
assert.match(fn('searchAuthorHtml'), /\/author-list\/author-details\//);
assert.match(fn('searchAuthorHtml'), /লেখক/);
const book = fn('stickySearchProductHtml');
assert.match(book, /sale > price \? '<s>'/, 'old price struck through when discounted');
assert.match(book, /class="ab-search-add" data-product-id=/, 'add button');
assert.match(book, /স্টক শেষ/, 'sold-out books get no add button');
assert.match(fn('searchStickyProducts'), /'author\._id': author\._id/, 'matched authors bring their books');
assert.match(fn('searchAuthorList'), /select: \{ name: 1, nameEn: 1, slug: 1, image: 1 \}/);
assert.match(fn('handleSearchAddTap'), /if \(!isProductPage\(\)\) pushAddToCartTracking\(productId\)/, 'add_to_cart once, also off product pages');
assert.match(fn('pushProductPageAddToCartTracking'), /if \(!isProductPage\(\)\) return;\s+pushAddToCartTracking\(productId\);/);
assert.match(script, /if \(handleCheckoutCtaTap\(event\) \|\| handleMenuTap\(event\)\) return;\n    if \(handleSearchAddTap\(event\)\) return;/, 'click hook');
// The header dropdown sits inside app-header: the header-button fast tap must leave its add buttons alone.
const menuContext = vm.createContext({ claimed: 0 });
vm.runInContext(fn('handleMenuTap') +
  '; function isStationaryTap() { return true; } function wasFastCartTap() { return false; }' +
  ' function markFastCartTap() {} function preventCartEvent() { claimed += 1; }', menuContext);
const searchAdd = { closest: (selector) => (selector.split(',').some((s) => ['.ab-search-add', 'app-header button'].includes(s.trim())) ? searchAdd : null), click() {} };
for (const type of ['pointerup', 'click']) {
  assert.equal(menuContext.handleMenuTap({ type, target: searchAdd }), false, `${type} on a header search add is not a menu tap`);
}
assert.equal(menuContext.claimed, 0, 'the add click is not swallowed');
assert.match(script, /app-header \.ab-header-search-results \.ab-search-add,\n    #ab-sticky-commerce \.ab-sticky-search-results \.ab-search-add \{/, 'styles for both search boxes');
new Function(script);

console.log('search authors: Bengali/English author matches above books; price, add button and tracking wired');
