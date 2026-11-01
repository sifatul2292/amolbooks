// Author page shows every book by the author in a grid (gtm-snippets/author-books-grid.html).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = req('jsdom');

const root = path.resolve(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/author-books-grid.html'), 'utf8');
const script = snippet.match(/<script>([\s\S]*?)<\/script>/)[1];
const css = snippet.match(/<style id="amol-author-books-grid">([\s\S]*?)<\/style>/)[1];

const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const list = main.slice(main.indexOf('const storefrontSnippetFiles = ['), main.indexOf('];', main.indexOf('const storefrontSnippetFiles = [')));
assert.ok(list.includes("'author-books-grid.html'"), 'main.ts injects the snippet');
assert.ok(list.indexOf("'catalogue-local-requests.html'") < list.indexOf("'author-books-grid.html'"), 'runs after the catalogue rewrite');

assert.match(css, /app-author-details \.kids-book-main\.carousel \.swiper-wrapper \{[^}]*display:grid!important[^}]*transform:none!important/, 'carousel becomes a grid');
assert.match(css, /swiper-slide-duplicate/, 'loop copies hidden');
assert.match(css, /\.see-more-btn/, '"আরও দেখুন" hidden');
assert.doesNotMatch(css.replace(/app-author-details[^{]*\{[^}]*\}/g, '').replace(/@media[^{]*\{\s*\}/g, ''), /\{/, 'every rule is scoped to app-author-details');

function page(url) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url, runScripts: 'outside-only' });
  const sent = [];
  class FakeXHR {
    open(method, target) { this.target = target; }
    send(body) { sent.push({ target: this.target, body }); }
  }
  dom.window.XMLHttpRequest = FakeXHR;
  dom.window.eval(script);
  const post = (target, body) => {
    const xhr = new dom.window.XMLHttpRequest();
    xhr.open('POST', target);
    xhr.send(typeof body === 'string' ? body : JSON.stringify(body));
    return JSON.parse(sent[sent.length - 1].body);
  };
  return { post, window: dom.window };
}
const authorQuery = { filter: { 'author._id': '6a2fa9df417f5dcb771dbcc3' }, sort: { createdAt: -1 }, pagination: { pageSize: 10, currentPage: 0 }, select: { name: 1 } };

const author = page('https://www.amolbooks.com/author-list/author-details/%E0%A6%86%E0%A6%B0%E0%A6%BF%E0%A6%AB-%E0%A6%86%E0%A6%9C%E0%A6%BE%E0%A6%A6');
for (const target of ['https://apisub.amolbooks.com/api/product/get-all', 'https://www.amolbooks.com/storefront-catalog/product/get-all']) {
  const body = author.post(target, authorQuery);
  assert.equal(body.pagination.pageSize, 500, 'author page asks for every book: ' + target);
  assert.equal(body.pagination.currentPage, 0);
  assert.deepEqual(body.filter, authorQuery.filter, 'filter unchanged');
}
assert.equal(author.post('https://apisub.amolbooks.com/api/product/get-all', { filter: { status: 'publish' }, pagination: { pageSize: 10, currentPage: 0 } }).pagination.pageSize, 10, 'other product lists untouched');
assert.equal(author.post('https://apisub.amolbooks.com/api/product/get-all', { ...authorQuery, pagination: { pageSize: 20, currentPage: 1 } }).pagination.pageSize, 20, 'other page sizes untouched');
assert.equal(author.post('https://apisub.amolbooks.com/api/author/get-all/', authorQuery).pagination.pageSize, 10, 'other endpoints untouched');

const product = page('https://www.amolbooks.com/product-details/Jobab');
assert.equal(product.post('https://apisub.amolbooks.com/api/product/get-all', authorQuery).pagination.pageSize, 10, 'only on author pages');

author.window.eval(script);
assert.equal(author.post('https://apisub.amolbooks.com/api/product/get-all', authorQuery).pagination.pageSize, 500, 'running twice changes nothing');

console.log('author books grid: grid CSS scoped to author page; author page loads every book; other requests untouched');
