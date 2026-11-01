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
vm.runInContext(fn('searchKey') + fn('matchSearchAuthors'), context);
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
assert.match(script, /app-header \.ab-header-search-results \.ab-search-add,\n    #ab-sticky-commerce \.ab-sticky-search-results \.ab-search-add \{/, 'styles for both search boxes');
new Function(script);

console.log('search authors: Bengali/English author matches above books; price, add button and tracking wired');
