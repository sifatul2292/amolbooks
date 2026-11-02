// Fills in publishers' English names, logos and descriptions from data/publisher-profiles
// (publishers.json + images/), like Rokomari's publisher pages. The English name lets the
// storefront search find a publisher ("sondipon" finds সন্দীপন প্রকাশন); the logo and description
// show on the publisher's book list (gtm-snippets/publisher-banner.html) and in search.
// Only empty fields are written; logos are copied into api/upload/images (never over an existing file).
//
// On the VPS, from /home/amolbooks:
//   node scripts/import-publisher-profiles.cjs            dry run, shows what would change
//   node scripts/import-publisher-profiles.cjs --apply    writes to the database
// Options: --env <file> (default api/.env), --upload-dir <dir> (default api/upload/images),
//          --image-base <url> (default https://apisub.amolbooks.com/api/upload/images/)
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'api/package.json'));
// The driver comes with mongoose; use mongoose's copy if npm did not hoist it.
let driver;
try { driver = req('mongodb'); } catch (_error) { driver = req('mongoose').mongo; }
const { MongoClient, ObjectId } = driver;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const APPLY = args.includes('--apply');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
const UPLOAD_DIR = path.resolve(root, option('--upload-dir', 'api/upload/images'));
const IMAGE_BASE = option('--image-base', 'https://apisub.amolbooks.com/api/upload/images/').replace(/\/?$/, '/');
const DATA_DIR = path.join(root, 'data/publisher-profiles');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
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

const isEmptyText = (html) => !String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

(async () => {
  const profiles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'publishers.json'), 'utf8'));
  const env = readEnv(ENV_FILE);
  const client = new MongoClient(mongoUri(env), { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const publishers = client.db(env.DB_NAME).collection('publishers');

  const plan = [];
  for (const profile of profiles) {
    // A publisher created by scripts/import-books.cjs (no id here yet) is found by its name.
    const query = profile.id ? { _id: new ObjectId(profile.id) } : { name: profile.name };
    const publisher = await publishers.findOne(query, { projection: { name: 1, nameEn: 1, image: 1, description: 1 } });
    if (!publisher) { console.log(`missing   ${profile.id || ''} ${profile.name} (not in database)`); continue; }
    const set = {};
    let copy = null;
    if (profile.nameEn && !String(publisher.nameEn || '').trim()) set.nameEn = profile.nameEn;
    if (profile.image && !publisher.image && /^https?:\/\//.test(profile.image)) {
      set.image = profile.image; // a logo already on the server
    } else if (profile.image && !publisher.image) {
      const source = path.join(DATA_DIR, 'images', profile.image);
      const target = path.join(UPLOAD_DIR, profile.image);
      if (!fs.existsSync(source)) throw new Error(`image file missing: ${source}`);
      if (fs.existsSync(target) && !fs.readFileSync(target).equals(fs.readFileSync(source))) {
        throw new Error(`${target} already exists with other content; not overwriting`);
      }
      if (!fs.existsSync(target)) copy = { source, target };
      set.image = IMAGE_BASE + profile.image;
    }
    if (profile.description && isEmptyText(publisher.description)) set.description = profile.description;
    if (!Object.keys(set).length) { console.log(`unchanged ${publisher.name}`); continue; }
    plan.push({ id: publisher._id, name: publisher.name, set, copy });
    console.log(`${APPLY ? 'update' : 'would set'} ${publisher.name}: ${Object.keys(set).join(' + ')}`);
  }

  if (APPLY) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    for (const item of plan) {
      if (item.copy && !fs.existsSync(item.copy.target)) fs.copyFileSync(item.copy.source, item.copy.target, fs.constants.COPYFILE_EXCL);
      await publishers.updateOne({ _id: item.id }, { $set: { ...item.set, updatedAt: new Date() } });
    }
  }
  console.log(`\n${plan.length} publisher(s) ${APPLY ? 'updated' : 'would be updated (dry run; add --apply to write)'}`);
  await client.close();
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
