// Adds new books from data/new-books/<set>/books.json (+ covers in images/, sample PDFs in pdfs/) as products.
// Books already in the shop (same name, English name or slug) are skipped, never changed.
// Missing authors are created, with photo/bio/English name from authors.json (+ author-images/) when
// listed there; existing authors are only linked. A category missing from the shop is created only if
// data/categories.json lists it (e.g. শিশু-কিশোর); any other category must exist. A book may name its
// own publisher (an imprint, e.g. আতফাল); a publisher missing from the shop is created from its
// entry in data/publisher-profiles (English name, logo, description).
// Uses the API's own mongoose schemas (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/import-books.cjs sondipon            dry run, shows what would be added
//   node scripts/import-books.cjs sondipon --apply    writes to the database
// Options: --env <file> (default api/.env), --upload-dir <dir> (default api/upload/images),
//          --image-base <url> (default https://apisub.amolbooks.com/api/upload/images/),
//          --files-dir <dir> (default api/upload/files), --file-base <url> (default https://apisub.amolbooks.com/api/upload/files/)
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'api/package.json'));
const mongoose = req('mongoose');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SET = args.find((arg, index) => !arg.startsWith('--') && !(index > 0 && args[index - 1].startsWith('--')));
const APPLY = args.includes('--apply');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
const UPLOAD_DIR = path.resolve(root, option('--upload-dir', 'api/upload/images'));
const IMAGE_BASE = option('--image-base', 'https://apisub.amolbooks.com/api/upload/images/').replace(/\/?$/, '/');
const FILES_DIR = path.resolve(root, option('--files-dir', 'api/upload/files'));
const FILE_BASE = option('--file-base', 'https://apisub.amolbooks.com/api/upload/files/').replace(/\/?$/, '/');
if (!SET || !/^[a-z0-9-]+$/.test(SET)) {
  console.error('usage: node scripts/import-books.cjs <set> [--apply]');
  process.exit(1);
}
const DATA_DIR = path.join(root, 'data/new-books', SET);

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

// Same database the API uses with PRODUCTION_BUILD=true (api/src/config/configuration.ts).
function mongoUri(env) {
  for (const key of ['DB_USERNAME', 'DB_PASSWORD', 'DB_PORT', 'DB_NAME', 'AUTH_SOURCE']) {
    if (!env[key]) throw new Error(`${key} missing in ${ENV_FILE}`);
  }
  if (String(env.PRODUCTION_BUILD).toLowerCase() !== 'true') {
    throw new Error(`PRODUCTION_BUILD is not true in ${ENV_FILE}; refusing to guess the database`);
  }
  const user = encodeURIComponent(env.DB_USERNAME);
  const pass = encodeURIComponent(env.DB_PASSWORD);
  return `mongodb://${user}:${pass}@127.0.0.1:${env.DB_PORT}/${env.DB_NAME}?authSource=${env.AUTH_SOURCE}`;
}

const clean = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const slugOf = (value) => clean(value).replace(/\s+/g, '-');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (value) => new RegExp('^\\s*' + escapeRegex(clean(value)) + '\\s*$', 'i');
// Bengali letters like য় can be stored as one or two code points; compare in one form.
const same = (value) => String(value || '').normalize('NFD').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const { books, publisher: publisherName } = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'books.json'), 'utf8'));
  const profilesFile = path.join(DATA_DIR, 'authors.json');
  const profiles = fs.existsSync(profilesFile) ? JSON.parse(fs.readFileSync(profilesFile, 'utf8')) : [];
  const env = readEnv(ENV_FILE);
  await mongoose.connect(mongoUri(env), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const { AuthorSchema } = require(path.join(root, 'api/dist/schema/author.schema'));
  const Product = mongoose.model('Product', ProductSchema);
  const Author = mongoose.model('Author', AuthorSchema);
  const db = mongoose.connection.db;

  const { PublisherSchema } = require(path.join(root, 'api/dist/schema/publisher.schema'));
  const Publisher = mongoose.model('Publisher', PublisherSchema);
  const publisherProfiles = JSON.parse(fs.readFileSync(path.join(root, 'data/publisher-profiles/publishers.json'), 'utf8'));
  const publisherByName = new Map();
  for (const p of await Publisher.find({}).select('name slug image').lean()) {
    if (!publisherByName.has(same(p.name))) publisherByName.set(same(p.name), p);
  }
  const newPublishers = new Map();
  function publisherFor(name) {
    const key = same(name);
    if (publisherByName.has(key)) return publisherByName.get(key);
    if (!newPublishers.has(key)) {
      const profile = publisherProfiles.find((p) => same(p.name) === key);
      if (!profile) throw new Error(`publisher "${name}" not found and not in data/publisher-profiles; add it in admin first`);
      const logo = profile.image && !/^https?:\/\//.test(profile.image) ? path.join(root, 'data/publisher-profiles/images', profile.image) : null;
      if (logo && !fs.existsSync(logo)) throw new Error(`${name}: logo missing ${logo}`);
      newPublishers.set(key, {
        _id: new mongoose.Types.ObjectId(), name: clean(profile.name), slug: slugOf(profile.name), nameEn: profile.nameEn || null,
        image: logo ? IMAGE_BASE + profile.image : profile.image || null, description: profile.description || null,
        logo: logo ? { source: logo, target: path.join(UPLOAD_DIR, profile.image) } : null,
      });
    }
    return newPublishers.get(key);
  }
  publisherFor(publisherName);
  const { CategorySchema } = require(path.join(root, 'api/dist/schema/category.schema'));
  const Category = mongoose.model('Category', CategorySchema);
  const categories = await Category.find({}).select('name slug').lean();
  const categoryByName = new Map(categories.map((c) => [clean(c.name), c]));
  const newCategoryList = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
  const newCategories = new Map();

  const plan = { products: [], authors: new Map(), skipped: [] };
  const authorByName = new Map();
  // Same name twice (live has duplicates, e.g. one with slug "--10"): link the one with a real slug.
  const realSlug = (a) => /[^\d\s-]/.test(String(a.slug || ''));
  for (const a of await Author.find({}).select('name nameEn slug').lean()) {
    const seen = authorByName.get(same(a.name));
    if (!seen || (!realSlug(seen) && realSlug(a))) authorByName.set(same(a.name), a);
  }
  const findAuthor = (name) => authorByName.get(same(name)) || null;
  const profileOf = (name) => profiles.find((p) => same(p.name) === same(name)) || null;
  // Same check as the admin's add product: name or English name.
  const productByName = new Map();
  for (const p of await Product.find({}).select('name nameEn status').lean()) {
    for (const n of [p.name, p.nameEn]) if (n && !productByName.has(same(n))) productByName.set(same(n), p);
  }

  for (const book of books) {
    const existing = productByName.get(same(book.name)) || (book.nameEn ? productByName.get(same(book.nameEn)) : null);
    if (existing) {
      plan.skipped.push(`${book.name} (already in the shop as "${existing.name}", ${existing.status})`);
      continue;
    }
    const category = (book.categories || []).map((name) => {
      let found = categoryByName.get(clean(name)) || newCategories.get(clean(name));
      if (!found) {
        const listed = newCategoryList.find((c) => clean(c.name) === clean(name));
        if (!listed) throw new Error(`${book.name}: category "${name}" not found (add it in admin or to data/categories.json)`);
        found = { _id: new mongoose.Types.ObjectId(), name: clean(listed.name), nameEn: listed.nameEn || null, slug: listed.slug || slugOf(listed.name), status: 'publish' };
        newCategories.set(clean(name), found);
      }
      return { _id: found._id, name: found.name, slug: found.slug };
    });
    const author = [];
    for (const person of book.authors || []) {
      let found = findAuthor(person.name);
      if (!found) {
        const key = same(person.name);
        if (!plan.authors.has(key)) {
          const profile = profileOf(person.name) || {};
          const photo = profile.image ? path.join(DATA_DIR, 'author-images', profile.image) : null;
          if (photo && !fs.existsSync(photo)) throw new Error(`${person.name}: author image missing ${photo}`);
          plan.authors.set(key, {
            _id: new mongoose.Types.ObjectId(), name: clean(person.name), nameEn: profile.nameEn || person.nameEn || null, slug: slugOf(person.name),
            image: photo ? IMAGE_BASE + profile.image : null, description: profile.description || null,
            photo: photo ? { source: photo, target: path.join(UPLOAD_DIR, profile.image) } : null,
          });
        }
        found = plan.authors.get(key);
      }
      author.push({ _id: found._id, name: found.name, nameEn: found.nameEn || null, slug: found.slug });
    }
    // No cover (only a watermarked one was found): add it in admin before publishing.
    const source = book.image ? path.join(DATA_DIR, 'images', book.image) : null;
    if (source && !fs.existsSync(source)) throw new Error(`${book.name}: image missing ${source}`);
    // Sample pages ("একটু পড়ে দেখুন"), compressed; the product page shows them from pdfFile.
    const sample = book.pdf ? path.join(DATA_DIR, 'pdfs', book.pdf) : null;
    if (sample && !fs.existsSync(sample)) throw new Error(`${book.name}: sample PDF missing ${sample}`);
    // An exact Taka discount (e.g. to match another shop's price) wins over the percentage.
    const discountAmount = Number.isInteger(book.discountAmount) ? book.discountAmount : Math.round(book.mrp * book.discountPercent / 100);
    plan.products.push({
      image: source ? { source, target: path.join(UPLOAD_DIR, book.image) } : null,
      pdf: sample ? { source: sample, target: path.join(FILES_DIR, book.pdf) } : null,
      doc: {
        name: clean(book.name),
        nameEn: book.nameEn || null,
        slug: book.slug,
        description: book.description || null,
        shortDescription: book.description || null,
        seoTitle: clean(book.name),
        seoDescription: String(book.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) || null,
        costPrice: 0,
        salePrice: book.mrp,
        discountType: 2,
        discountAmount,
        afterDiscountPrice: book.mrp - discountAmount,
        images: book.image ? [IMAGE_BASE + book.image] : [],
        pdfFile: book.pdf ? FILE_BASE + book.pdf : null,
        quantity: book.quantity,
        trackQuantity: true,
        isFacebookCatalog: false,
        isPreOrder: false,
        status: 'draft',
        totalPages: book.pages || null,
        edition: book.edition || null,
        editionEn: book.edition || null,
        currentVersion: book.binding || null,
        currentVersionEn: book.binding === 'হার্ডকভার' ? 'hardcover' : book.binding === 'পেপারব্যাক' ? 'paperback' : null,
        language: ['Bangla'],
        country: 'Bangladesh',
        translatorName: book.translators && book.translators.length ? book.translators : [''],
        translatorNameEn: [''],
        weight: book.weight || null,
        publisher: (({ _id, name, slug, image }) => ({ _id, name, slug, image: image || null }))(publisherFor(book.publisher || publisherName)),
        author,
        category,
      },
    });
  }

  for (const c of newCategories.values()) console.log(`${APPLY ? 'add' : 'would add'} category ${c.name}${c.nameEn ? ' (' + c.nameEn + ')' : ''}`);
  for (const p of newPublishers.values()) console.log(`${APPLY ? 'add' : 'would add'} publisher ${p.name}${p.nameEn ? ' (' + p.nameEn + ')' : ''}${p.image ? ', logo' : ''}${p.description ? ', description' : ''}`);
  for (const author of plan.authors.values()) console.log(`${APPLY ? 'add' : 'would add'} author  ${author.name}${author.nameEn ? ' (' + author.nameEn + ')' : ''}${author.image ? ', photo' : ''}${author.description ? ', bio' : ''}`);
  for (const item of plan.products) console.log(`${APPLY ? 'add' : 'would add'} book    ${item.doc.name} — ৳${item.doc.salePrice} - ${item.doc.discountAmount} = ৳${item.doc.afterDiscountPrice}, ${item.doc.quantity} in stock, ${item.doc.category.map((c) => c.name).join(' / ')}${item.image ? '' : ' (no cover yet)'}${item.pdf ? ', sample PDF' : ''}`);
  for (const line of plan.skipped) console.log(`skip         ${line}`);

  if (APPLY) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(FILES_DIR, { recursive: true });
    for (const category of newCategories.values()) {
      if (await Category.exists({ slug: category.slug })) throw new Error(`category slug ${category.slug} is taken`);
      await new Category(category).save();
    }
    for (const { logo, ...publisher } of newPublishers.values()) {
      if (await Publisher.exists({ slug: publisher.slug })) throw new Error(`publisher slug ${publisher.slug} is taken`);
      if (logo && !fs.existsSync(logo.target)) fs.copyFileSync(logo.source, logo.target, fs.constants.COPYFILE_EXCL);
      await new Publisher(publisher).save();
    }
    for (const { photo, ...author } of plan.authors.values()) {
      let slug = author.slug;
      for (let n = 2; await Author.exists({ slug }); n++) slug = `${author.slug}-${n}`;
      if (photo && !fs.existsSync(photo.target)) fs.copyFileSync(photo.source, photo.target, fs.constants.COPYFILE_EXCL);
      await new Author({ ...author, slug }).save();
      if (slug !== author.slug) {
        for (const item of plan.products) item.doc.author.forEach((a) => { if (String(a._id) === String(author._id)) a.slug = slug; });
      }
    }
    for (const item of plan.products) {
      let slug = item.doc.slug;
      for (let n = 2; await Product.exists({ slug }); n++) slug = `${item.doc.slug}-${n}`;
      if (item.image && !fs.existsSync(item.image.target)) fs.copyFileSync(item.image.source, item.image.target, fs.constants.COPYFILE_EXCL);
      if (item.pdf && !fs.existsSync(item.pdf.target)) fs.copyFileSync(item.pdf.source, item.pdf.target, fs.constants.COPYFILE_EXCL);
      await new Product({ ...item.doc, slug }).save();
    }
  }
  console.log(`\n${plan.products.length} book(s), ${plan.authors.size} author(s), ${newPublishers.size} publisher(s) and ${newCategories.size} categor${newCategories.size === 1 ? 'y' : 'ies'} ${APPLY ? 'added (as draft)' : 'would be added as draft (dry run; add --apply to write)'}; ${plan.skipped.length} skipped`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
