// Links authors to existing books that have none. Reads data/book-authors/<set>.json:
//   { "items": [ { "productId": "...", "name": "...", "authors": [ { "name": "...", "nameEn": "..." } ] } ] }
// An author already in the shop (same name, any Unicode form of য় etc.) is linked; a missing one is
// created (name, English name, slug from the name). A book that already has an author keeps it.
// Uses the API's own mongoose schemas (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/set-book-authors.cjs 2026-11-13            dry run: shows what would change
//   node scripts/set-book-authors.cjs 2026-11-13 --apply    writes (old values backed up in api/backup/db/)
// Options: --env <file> (default api/.env).
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
if (!SET || !/^[a-z0-9-]+$/.test(SET)) {
  console.error('usage: node scripts/set-book-authors.cjs <set> [--apply]');
  process.exit(1);
}
const DATA_FILE = path.join(root, 'data/book-authors', `${SET}.json`);

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
// Bengali letters like য় can be stored as one or two code points; compare in one form.
const same = (value) => String(value || '').normalize('NFD').replace(/\s+/g, ' ').trim().toLowerCase();
// ( ) in an address break the shop's page router; keep them out of new slugs.
const safeSlug = (value) => slugOf(value).replace(/[()[\]{}?#%/\\;]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const { items } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  for (const item of items) {
    if (!/^[a-f0-9]{24}$/.test(item.productId)) throw new Error(`${item.name}: bad productId ${item.productId}`);
    if (!Array.isArray(item.authors) || !item.authors.length || item.authors.some((a) => !clean(a.name))) {
      throw new Error(`${item.name}: authors missing`);
    }
  }

  // MONGO_URI_OVERRIDE: local testing against a dev database only.
  await mongoose.connect(process.env.MONGO_URI_OVERRIDE || mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const { AuthorSchema } = require(path.join(root, 'api/dist/schema/author.schema'));
  const Product = mongoose.model('Product', ProductSchema);
  const Author = mongoose.model('Author', AuthorSchema);

  // Same name twice (live has duplicates, e.g. one with slug "--10"): link the one with a real slug.
  const realSlug = (a) => /[^\d\s-]/.test(String(a.slug || ''));
  const byName = new Map();
  for (const a of await Author.find({}).select('name nameEn slug').lean()) {
    const seen = byName.get(same(a.name));
    if (!seen || (!realSlug(seen) && realSlug(a))) byName.set(same(a.name), a);
  }

  const created = new Map();
  const plan = []; const kept = []; const notFound = [];
  for (const item of items) {
    const product = await Product.findById(item.productId).select('name slug status author').lean();
    if (!product) { notFound.push(item); continue; }
    if ((product.author || []).some((a) => a && a._id)) {
      kept.push(`${product.name}: already has ${(product.author || []).map((a) => a.name).join(', ')}`);
      continue;
    }
    const author = item.authors.map((person) => {
      const key = same(person.name);
      let found = byName.get(key) || created.get(key);
      if (!found) {
        found = { _id: new mongoose.Types.ObjectId(), name: clean(person.name), nameEn: clean(person.nameEn) || null, slug: safeSlug(person.name), isNew: true };
        created.set(key, found);
      }
      return { _id: found._id, name: found.name, nameEn: found.nameEn || null, slug: found.slug };
    });
    plan.push({ product, author });
  }

  for (const a of created.values()) console.log(`${APPLY ? 'add' : 'would add'} author  ${a.name}${a.nameEn ? ` (${a.nameEn})` : ''}  /author-list/author-details/${a.slug}`);
  for (const { product, author } of plan) {
    console.log(`${APPLY ? 'link' : 'would link'}  ${product.name} [${product.status}] -> ${author.map((a) => a.name).join(', ')}`);
  }
  for (const line of kept) console.log(`keep   ${line}`);
  for (const item of notFound) console.log(`skip   ${item.name}: product ${item.productId} not found`);
  console.log(`\n${plan.length} book(s) ${APPLY ? 'linked' : 'would be linked (dry run; add --apply to write)'}; ${created.size} new author(s); ${kept.length} kept; ${notFound.length} not found`);

  if (APPLY && plan.length) {
    const backupDir = path.join(root, 'api/backup/db');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `product-authors-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(plan.map(({ product }) => ({ _id: product._id, author: product.author ?? null })), null, 2));
    console.log(`backup: ${path.relative(root, backup)}`);
    for (const a of created.values()) {
      let slug = a.slug;
      for (let n = 2; await Author.exists({ slug }); n++) slug = `${a.slug}-${n}`;
      await new Author({ _id: a._id, name: a.name, nameEn: a.nameEn, slug }).save();
      a.slug = slug;
    }
    for (const { product, author } of plan) {
      const fixed = author.map((x) => {
        const made = [...created.values()].find((a) => String(a._id) === String(x._id));
        return made ? { ...x, slug: made.slug } : x;
      });
      await Product.updateOne({ _id: product._id }, { $set: { author: fixed } }, { timestamps: false });
    }
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
