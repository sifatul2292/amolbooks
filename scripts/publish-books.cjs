// Publishes the books scripts/import-books.cjs added as drafts from data/new-books/<set>/books.json,
// once the owner has reviewed them. Only a draft whose name matches its book in books.json changes;
// anything already published, hidden or not found is reported and left alone. A book without a
// cover stays a draft unless --include-no-cover is given.
// Uses the API's own mongoose schema (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/publish-books.cjs sondipon            dry run, shows what would be published
//   node scripts/publish-books.cjs sondipon --apply    writes to the database
// Options: --env <file> (default api/.env), --include-no-cover
// The shop caches its book lists for up to 5 minutes, so the books appear within that time.
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
const SET = args.find((arg, index) => !arg.startsWith('--') && !(index > 0 && args[index - 1] === '--env'));
const APPLY = args.includes('--apply');
const WITHOUT_COVER = args.includes('--include-no-cover');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
if (!SET || !/^[a-z0-9-]+$/.test(SET)) {
  console.error('usage: node scripts/publish-books.cjs <set> [--apply] [--include-no-cover]');
  process.exit(1);
}

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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Bengali letters like য় can be stored as one or two code points; compare in one form.
const same = (value) => String(value || '').normalize('NFD').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const { books } = JSON.parse(fs.readFileSync(path.join(root, 'data/new-books', SET, 'books.json'), 'utf8'));
  await mongoose.connect(mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const Product = mongoose.model('Product', ProductSchema);

  const ready = [];
  const noCover = [];
  const skipped = [];
  for (const book of books) {
    // The importer adds "-2", "-3" … to a slug that was already taken.
    const found = (await Product.find({ slug: new RegExp('^' + escapeRegex(book.slug) + '(-\\d+)?$') })
      .select('name slug status images')
      .lean()).find((product) => same(product.name) === same(book.name));
    if (!found) skipped.push(`${book.name} (not in the shop: not imported yet, or renamed in admin)`);
    else if (found.status !== 'draft') skipped.push(`${found.name} (${found.status === 'publish' ? 'already published' : found.status})`);
    else if (!(found.images || []).length && !WITHOUT_COVER) noCover.push(found);
    else ready.push(found);
  }

  for (const product of ready) console.log(`${APPLY ? 'publish' : 'would publish'}  ${product.name}${(product.images || []).length ? '' : ' (no cover)'}`);
  for (const product of noCover) console.log(`keep draft     ${product.name} (no cover yet: add one in admin and publish it there, or re-run with --include-no-cover)`);
  for (const line of skipped) console.log(`skip           ${line}`);

  if (APPLY && ready.length) {
    await Product.updateMany(
      { _id: { $in: ready.map((product) => product._id) }, status: 'draft' },
      { $set: { status: 'publish' } },
    );
  }
  console.log(`\n${ready.length} book(s) ${APPLY ? 'published' : 'would be published (dry run; add --apply to write)'}; ${noCover.length} kept as draft for a missing cover; ${skipped.length} skipped`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
