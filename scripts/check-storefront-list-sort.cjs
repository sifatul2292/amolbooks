// Checks the curated book-list sort (api/src/storefront-list-sort.ts, used by the /storefront-catalog
// proxy in main.ts) and the curation data. Needs a built api/dist: node scripts/check-storefront-list-sort.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { curatedListRequest, CURATED_LIST_SORT } = require(path.join(root, 'api/dist/storefront-list-sort'));
const list = (extra = {}) => ({ filter: { status: 'publish' }, select: { name: 1 }, sort: { createdAt: -1 }, pagination: { pageSize: 24, currentPage: 0 }, ...extra });

// Shop lists (all books, category/publisher/author filters) get the curated order.
assert.deepEqual(curatedListRequest(list()).sort, { priority: -1, createdAt: -1 });
assert.deepEqual(curatedListRequest(list({ filter: { status: 'publish', 'publisher.slug': 'x' } })).sort, CURATED_LIST_SORT);
// The request body is not changed in place.
const original = list(); curatedListRequest(original); assert.deepEqual(original.sort, { createdAt: -1 });
// Left alone: searches, best-selling tag view, other sorts, non-published filters, odd bodies.
assert.deepEqual(curatedListRequest(list(), 'রাহে').sort, { createdAt: -1 });
assert.deepEqual(curatedListRequest(list({ sort: { totalSold: -1 } })).sort, { totalSold: -1 });
assert.deepEqual(curatedListRequest(list({ sort: { createdAt: 1 } })).sort, { createdAt: 1 });
assert.deepEqual(curatedListRequest(list({ sort: { createdAt: -1, salePrice: 1 } })).sort, { createdAt: -1, salePrice: 1 });
assert.deepEqual(curatedListRequest(list({ filter: {} })).sort, { createdAt: -1 });
assert.deepEqual(curatedListRequest(list({ filter: null })).sort, { createdAt: -1 });
assert.equal(curatedListRequest(null), null);
assert.deepEqual(curatedListRequest({}), {});
assert.equal(curatedListRequest(list(), '   ').sort.priority, -1, 'blank search is not a search');

// main.ts sends the rewritten body upstream only for /product/get-all.
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
assert.match(main, /req\.path === '\/product\/get-all'\s*\?\s*curatedListRequest\(req\.body \|\| \{\}, req\.query\?\.q as string\)/);

// Curation data: unique slugs, a reason for each position.
const { books } = JSON.parse(fs.readFileSync(path.join(root, 'data/curation/all-books-order.json'), 'utf8'));
assert.ok(books.length > 0);
assert.equal(new Set(books.map((b) => b.slug)).size, books.length, 'slugs are unique');
for (const b of books) assert.ok(b.slug && b.name && (b.amolbooksSold > 0 || b.rokomariRank > 0), `${b.name}: has a sales signal`);

const script = fs.readFileSync(path.join(root, 'scripts/curate-product-order.cjs'), 'utf8');
assert.match(script, /const APPLY = args\.includes\('--apply'\)/, 'dry run unless --apply');
assert.match(script, /product-priority-\$\{stamp\}\.json/, 'old priorities are backed up');
// The owner's own priorities (1 or more) are never changed; curation writes values between 0 and 1 only.
assert.match(script, /const isPin = \(value\) => typeof value === 'number' && value >= 1;/);
assert.match(script, /if \(!RESTORE && isPin\(current\)\) continue;/, 'pins are skipped');
assert.match(script, /\(listed\.length - i\) \/ \(listed\.length \+ 1\)/, 'curated values stay below 1');
assert.match(script, /isCurated\(p\.priority\) \? null : p\.priority/, 'only earlier curation values are cleared');
console.log(`storefront list sort: ok (${books.length} curated books)`);
