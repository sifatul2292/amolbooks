// Checks data/new-books/<set>/books.json before scripts/import-books.cjs adds the books.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'data/new-books');
// The shop's categories (admin → Category); a book must use one of these names.
const CATEGORIES = new Set([
  'আদব, আখলাক', 'ইসলামী সাহিত্য', 'আধুনিক ফিতনা', 'ইসলামে নারী', 'ইসলামি আমল ও আমলের সহায়িকা',
  'বিয়ে ও সংসার', 'ইসলামি আদর্শ ও মতবাদ', 'কুরআন বিষয়ক আলোচনা', 'বিনিয়োগ ও অর্থনীতি', 'প্রোডাক্টিভিটি',
  'আত্মশুদ্ধি ও অনুপ্রেরণা', 'ইসলামি ইতিহাস ও ঐতিহ্য', 'দোয়া, দরূদ ও যিকর', 'সীরাতে রাসূল (সা.)', 'আল হাদিস', 'কুরআন শেখা',
].map((n) => n.normalize('NFD')));
// New categories the importer may create (data/categories.json).
for (const c of JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'data/categories.json'), 'utf8'))) {
  assert.match(String(c.nameEn), /^[\x20-\x7e]+$/, `category ${c.name}: English name`);
  CATEGORIES.add(c.name.normalize('NFD'));
}

let total = 0;
for (const set of fs.readdirSync(base)) {
  const dir = path.join(base, set);
  const { publisher, books } = JSON.parse(fs.readFileSync(path.join(dir, 'books.json'), 'utf8'));
  const images = new Set(fs.readdirSync(path.join(dir, 'images')));
  assert.ok(publisher && books.length, `${set}: publisher and books`);
  const seen = { name: new Set(), slug: new Set(), image: new Set() };
  for (const b of books) {
    const where = `${set}: ${b.name}`;
    for (const key of ['name', 'slug']) {
      const value = String(b[key]).normalize('NFD').toLowerCase();
      assert.ok(!seen[key].has(value), `${where}: ${key} is unique`);
      seen[key].add(value);
    }
    assert.match(b.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${where}: slug`);
    assert.match(String(b.nameEn), /^[\x20-\x7e]+$/, `${where}: English name`);
    assert.ok(Number.isInteger(b.mrp) && b.mrp > 0, `${where}: cover price`);
    assert.ok(b.discountPercent >= 0 && b.discountPercent < 50, `${where}: discount`);
    if (b.discountAmount !== undefined) assert.ok(Number.isInteger(b.discountAmount) && b.discountAmount >= 0 && b.discountAmount < b.mrp / 2, `${where}: discount in Taka`);
    assert.ok(Number.isInteger(b.quantity) && b.quantity >= 0, `${where}: quantity`);
    assert.ok(b.categories.length >= 1 && b.categories.length <= 2, `${where}: one or two categories`);
    for (const c of b.categories) assert.ok(CATEGORIES.has(c.normalize('NFD')), `${where}: category "${c}" exists`);
    assert.ok(b.authors.length <= 3, `${where}: at most three authors`);
    for (const a of b.authors) assert.ok(a.name && a.nameEn, `${where}: author ${a.name} has an English name`);
    if (b.image) {
      assert.ok(images.has(b.image), `${where}: images/${b.image} exists`);
      assert.ok(!seen.image.has(b.image), `${where}: cover not shared`);
      seen.image.add(b.image);
    }
    if (b.description) {
      // Readable HTML only: paragraphs and "•" lists, no escaped tags or leftover info lines.
      assert.doesNotMatch(b.description.replace(/<\/?(?:p|ul|li)>/g, ''), /[<>]|&lt;|&gt;|&nbsp;/, `${where}: description is plain paragraphs/lists`);
      assert.doesNotMatch(b.description, /<(?:p|li)>(?:অনুবাদক?|সম্পাদনা|সম্পাদক|(?:মোট )?পৃষ্[ঠট]া|কভার|সাইজ)\s*[:ঃ-]/, `${where}: no translator/page/cover lines`);
    }
    if (b.binding) assert.ok(['পেপারব্যাক', 'হার্ডকভার'].includes(b.binding), `${where}: binding`);
    if (b.publisher) {
      // An imprint (e.g. আতফাল): the importer links it, or creates it from data/publisher-profiles.
      const profiles = JSON.parse(fs.readFileSync(path.join(root, 'data/publisher-profiles/publishers.json'), 'utf8'));
      assert.ok(profiles.some((p) => p.name === b.publisher), `${where}: publisher ${b.publisher} has a profile`);
    }
  }
  for (const file of images) {
    assert.ok(seen.image.has(file), `${set}: images/${file} is used`);
    assert.ok(fs.statSync(path.join(dir, 'images', file)).size < 150e3, `${set}: images/${file} is small (fast to load)`);
  }
  // Sample pages ("একটু পড়ে দেখুন"): compressed, one per book.
  const pdfDir = path.join(dir, 'pdfs');
  const pdfs = new Set(fs.existsSync(pdfDir) ? fs.readdirSync(pdfDir) : []);
  const usedPdfs = new Set();
  for (const b of books.filter((x) => x.pdf)) {
    assert.ok(pdfs.has(b.pdf), `${set}: ${b.name}: pdfs/${b.pdf} exists`);
    assert.ok(!usedPdfs.has(b.pdf), `${set}: ${b.name}: sample PDF not shared`);
    usedPdfs.add(b.pdf);
    assert.equal(fs.readFileSync(path.join(pdfDir, b.pdf)).subarray(0, 4).toString(), '%PDF', `${set}: ${b.name}: sample is a PDF`);
    assert.ok(fs.statSync(path.join(pdfDir, b.pdf)).size < 2.5e6, `${set}: ${b.name}: sample PDF is compressed`);
  }
  for (const file of pdfs) assert.ok(usedPdfs.has(file), `${set}: pdfs/${file} is used`);
  // New authors' photo, bio and English name (applied only when the importer creates the author).
  const profilesFile = path.join(dir, 'authors.json');
  if (fs.existsSync(profilesFile)) {
    const bookAuthors = new Set(books.flatMap((b) => b.authors.map((a) => a.name.normalize('NFD'))));
    const photos = new Set(fs.existsSync(path.join(dir, 'author-images')) ? fs.readdirSync(path.join(dir, 'author-images')) : []);
    const usedPhotos = new Set();
    for (const p of JSON.parse(fs.readFileSync(profilesFile, 'utf8'))) {
      assert.ok(bookAuthors.has(p.name.normalize('NFD')), `${set}: author profile ${p.name} belongs to a book`);
      assert.match(String(p.nameEn), /^[\x20-\x7e]+$/, `${set}: author ${p.name}: English name`);
      if (p.image) { assert.ok(photos.has(p.image), `${set}: author-images/${p.image} exists`); usedPhotos.add(p.image); }
      if (p.description) assert.doesNotMatch(p.description.replace(/<\/?p>/g, ''), /[<>]/, `${set}: author ${p.name}: bio is plain paragraphs`);
    }
    for (const file of photos) assert.ok(usedPhotos.has(file), `${set}: author-images/${file} is used`);
  }
  total += books.length;
}

const importer = fs.readFileSync(path.join(__dirname, 'import-books.cjs'), 'utf8');
assert.match(importer, /const APPLY = args\.includes\('--apply'\)/, 'dry run unless --apply');
assert.match(importer, /status: 'draft'/, 'books are added as draft');
assert.match(importer, /plan\.skipped\.push/, 'books already in the shop are skipped');
assert.match(importer, /normalize\('NFD'\)/, 'names compared in one Unicode form');
assert.match(importer, /pdfFile: book\.pdf \? FILE_BASE \+ book\.pdf : null/, 'sample PDF linked as pdfFile');
assert.match(importer, /const profileOf = /, 'new authors get photo/bio from authors.json');
assert.match(importer, /realSlug\(seen\)/, 'duplicate author names link the record with a real slug');
assert.match(importer, /publisherFor\(book\.publisher \|\| publisherName\)/, 'a book can name its own publisher (imprint)');
assert.match(importer, /newCategoryList\.find/, 'only categories listed in data/categories.json are created');

console.log(`new books: ${total} checked`);
