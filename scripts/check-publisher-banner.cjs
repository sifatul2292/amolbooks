// Publisher profiles (data/publisher-profiles) and the banner on the publisher's book list.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'data/publisher-profiles');
const profiles = JSON.parse(fs.readFileSync(path.join(dir, 'publishers.json'), 'utf8'));
const images = new Set(fs.readdirSync(path.join(dir, 'images')));
const used = new Set();
assert.equal(new Set(profiles.map((p) => p.id)).size, profiles.length, 'one entry per publisher');
for (const p of profiles) {
  if (p.id === null) {
    // Not in the shop yet: a new-books set creates it (scripts/import-books.cjs).
    const sets = fs.readdirSync(path.join(root, 'data/new-books'));
    const named = sets.some((set) => JSON.parse(fs.readFileSync(path.join(root, 'data/new-books', set, 'books.json'), 'utf8')).books.some((b) => b.publisher === p.name));
    assert.ok(named, `${p.name}: a new publisher is used by a book`);
  } else {
    assert.match(p.id, /^[a-f0-9]{24}$/, `${p.name}: database id`);
  }
  if (p.nameEn) assert.match(p.nameEn, /^[\x20-\x7e]+$/, `${p.name}: English name`);
  if (p.image && !/^https:\/\//.test(p.image)) {
    assert.ok(images.has(p.image), `${p.name}: images/${p.image} exists`);
    assert.ok(fs.statSync(path.join(dir, 'images', p.image)).size < 40e3, `${p.name}: logo is small`);
    used.add(p.image);
  }
  assert.ok(p.description, `${p.name}: description`);
  assert.doesNotMatch(p.description.replace(/<\/?p>/g, ''), /[<>]/, `${p.name}: description is plain paragraphs`);
}
for (const file of images) assert.ok(used.has(file), `images/${file} is used`);

const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/publisher-banner.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
assert.match(main, /'author-books-grid\.html',\n\s+'publisher-banner\.html',/, 'snippet is injected');
assert.doesNotMatch(snippet, /innerHTML|insertAdjacentHTML|document\.write/, 'description is rebuilt from text, never inserted as HTML');
assert.match(snippet, /ALLOWED = \{ P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, UL: 1, OL: 1, LI: 1 \}/);
assert.match(snippet, /location\.pathname !== '\/product-list'/, 'only on the book list');
assert.match(snippet, /query\.get\('publisherId'\)/, 'for the publisher in the link');
assert.match(snippet, /\/\^https\?:\\\/\\\/\/\.test\(String\(publisher\.image/, 'logo only from an http(s) URL');
assert.match(fs.readFileSync(path.join(root, 'api/src/schema/publisher.schema.ts'), 'utf8'), /description: \{/, 'publisher schema has a description');
assert.match(fs.readFileSync(path.join(root, 'scripts/import-publisher-profiles.cjs'), 'utf8'), /isEmptyText\(publisher\.description\)/, 'importer fills empty fields only');
console.log(`publisher banner: ${profiles.length} profiles checked`);
