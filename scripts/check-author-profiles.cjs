// Checks data/author-profiles before scripts/import-author-profiles.cjs writes it to the database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '../data/author-profiles');
const profiles = JSON.parse(fs.readFileSync(path.join(dir, 'authors.json'), 'utf8'));
const files = new Set(fs.readdirSync(path.join(dir, 'images')));
const used = new Set();

assert.ok(profiles.length > 0, 'authors.json has entries');
assert.equal(new Set(profiles.map((p) => p.id)).size, profiles.length, 'one entry per author id');
for (const p of profiles) {
  assert.match(p.id, /^[0-9a-f]{24}$/, `${p.name}: id is an ObjectId`);
  assert.ok(p.image || p.description || p.nameEn, `${p.name}: has an image, a description or an English name`);
  if (p.nameEn) assert.match(p.nameEn, /^[A-Za-z][A-Za-z .'-]+$/, `${p.name}: English name is plain Latin text`);
  if (p.image && !/^https:\/\/apisub\.amolbooks\.com\/api\/upload\/images\//.test(p.image)) {
    assert.match(p.image, /^author-[a-z0-9-]+\.webp$/, `${p.name}: image file name`);
    assert.ok(files.has(p.image), `${p.name}: images/${p.image} exists`);
    used.add(p.image);
  }
  if (p.description) {
    assert.match(p.description, /^<p>[\s\S]+<\/p>$/, `${p.name}: description is wrapped in <p>`);
    assert.doesNotMatch(p.description.replace(/<\/?p>|<br\s*\/?>/g, ''), /<|>/, `${p.name}: only <p> and <br> tags`);
    assert.doesNotMatch(p.description, /rokomari|wafilife|রকমারি|ওয়াফিলাইফ/i, `${p.name}: no shop names`);
  }
}
for (const file of files) assert.ok(used.has(file), `images/${file} is used`);

const importer = fs.readFileSync(path.resolve(__dirname, 'import-author-profiles.cjs'), 'utf8');
assert.match(importer, /const APPLY = args\.includes\('--apply'\)/, 'importer is a dry run unless --apply');
assert.match(importer, /if \(profile\.description && isEmptyText\(author\.description\)\)/, 'importer keeps existing descriptions');
assert.match(importer, /!author\.image/, 'importer keeps existing images');
assert.match(importer, /if \(profile\.nameEn && !String\(author\.nameEn \|\| ''\)\.trim\(\)\)/, 'importer keeps existing English names');

console.log(`author profiles: ${profiles.length} authors, ${profiles.filter((p) => p.image).length} photos, ${profiles.filter((p) => p.description).length} bios, ${profiles.filter((p) => p.nameEn).length} English names`);
