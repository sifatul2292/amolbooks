const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'gtm-snippets/homepage-redesign.html');
const html = fs.readFileSync(file, 'utf8');
const tokens = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

new vm.Script(script);

const pricingSource = script.slice(script.indexOf('function number'), script.indexOf('function authorName'));
const pricing = new Function(pricingSource + '; return { finalPrice: finalPrice, discountPercent: discountPercent };')();
assert.equal(pricing.finalPrice({ salePrice: 100, discountType: 2, discountAmount: 150 }), 0);
assert.equal(pricing.discountPercent({ salePrice: 100, discountType: 2, discountAmount: 150 }), 99);
assert.equal(pricing.finalPrice({ salePrice: 100, discountType: 1, discountAmount: 140 }), 0);
const ratingSource = script.slice(script.indexOf('function ratingHtml'), script.indexOf('function indexProducts'));
const ratingHtml = new Function('number', 'escapeHtml', ratingSource + '; return ratingHtml;')(
  (value) => Math.max(0, Number(value) || 0),
  String
);
assert.equal(ratingHtml({ ratingTotal: 0, ratingCount: 0 }), '');
assert.match(ratingHtml({ ratingTotal: 8, ratingCount: 40 }), /width:100%/);

const shelfSource = script.slice(script.indexOf('function categoryNames'), script.indexOf('function isCombo'));
const shelvesConfig = new Function(script.match(/var shelves = \[[\s\S]*?\n  \];/)[0] + '; return shelves;')();
const comboShelf = shelvesConfig.find((shelf) => shelf.id === 'combo');
const isComboByName = (product) => comboShelf.words.some((word) => String(product.name || '').indexOf(word) !== -1);
const productsForShelf = new Function('number', 'shelves', 'isCombo', 'OWN_PUBLISHER_SLUG', shelfSource + '; return productsForShelf;')(
  (value) => Math.max(0, Number(value) || 0),
  shelvesConfig,
  isComboByName,
  'আমল-বুকস'
);
const ownPublisher = { name: 'আমল বুকস', slug: 'আমল-বুকস' };
const otherPublisher = { name: 'অন্য প্রকাশনী', slug: 'other' };
// Bundles: Amol Books first, then the owner's picks in order, then automatic matches.
assert.deepEqual(
  productsForShelf([
    { name: 'স্বয়ংক্রিয় কম্বো', slug: 'automatic', publisher: otherPublisher },
    { name: 'জীবন ও চরিত্র গঠন বান্ডেল', slug: 'Jibon', publisher: otherPublisher },
    { name: 'পড়ো কালেকশন', slug: 'Poro Collection', publisher: otherPublisher },
    { name: 'জীবন পাল্টে দেওয়ার মত ৪ টি বই', slug: 'Jibonpaltano4books', publisher: ownPublisher },
    { name: 'প্রোডাক্টিভ মুসলিম + দ্য বারাকাহ ইফেক্ট', slug: 'productive-barakah', publisher: ownPublisher }
  ], comboShelf).map((product) => product.slug),
  ['productive-barakah', 'Jibonpaltano4books', 'Poro Collection', 'Jibon', 'automatic']
);
assert.equal(isComboByName({ name: 'মুসলিম মাইন্ডসেট' }), false, 'A title ending in "সেট" is not a set');
assert.equal(isComboByName({ name: 'মহিমান্বিত কুরআন (৬ খণ্ড সেট)' }), true);
// Topic shelves: picks, plus any Amol Books title tagged with the topic; Amol Books first;
// other tagged books only fill gaps; bundles and off-topic Amol Books titles stay out.
const businessShelf = shelvesConfig.find((shelf) => shelf.id === 'business');
const businessTopic = [{ name: businessShelf.categories[0] }];
assert.deepEqual(
  productsForShelf([
    { name: 'সম্পদ গড়ার কৌশল', slug: 'sompodgorarkoushol', publisher: otherPublisher, category: businessTopic },
    { name: 'নতুন বই', slug: 'new-own', publisher: ownPublisher, category: businessTopic },
    { name: 'প্রোডাক্টিভ মুসলিম', slug: 'productive muslim', publisher: ownPublisher, category: [{ name: 'প্রোডাক্টিভিটি' }] },
    { name: 'অন্য বই', slug: 'filler', publisher: otherPublisher, category: businessTopic },
    { name: 'ব্যবসা কম্বো', slug: 'bundle', publisher: ownPublisher, category: businessTopic },
    { name: 'মাইন্ডম্যাপ', slug: 'islami-orthonity-o-uddokta-47', publisher: ownPublisher, category: [] }
  ], businessShelf).map((product) => product.slug),
  ['islami-orthonity-o-uddokta-47', 'new-own', 'sompodgorarkoushol', 'filler']
);
assert.equal(productsForShelf(Array.from({ length: 20 }, (_, index) => ({ name: 'বই ' + index, slug: 'pick-' + index, publisher: otherPublisher, category: businessTopic })), businessShelf).length, 12, 'Shelves show 12 books, so every row is full (6 or 4 across, 2 rows on phones)');
const historyShelf = shelvesConfig.find((shelf) => shelf.id === 'history');
const historyBooks = historyShelf.picks.map((slug, index) => ({ name: 'ইতিহাস ' + index, slug, publisher: otherPublisher, category: [] }));
assert.equal(productsForShelf(historyBooks, historyShelf).length, 24, 'The history shelf shows up to 24 books (full rows)');
shelvesConfig.forEach((shelf) => {
  const size = shelf.size || 12;
  assert.equal(size % 12, 0, 'Shelf size fills whole rows: ' + shelf.id);
  if (shelf.id !== 'popular') assert.ok(shelf.picks.length + (shelf.packages || []).length >= size, 'Enough picks to fill the shelf: ' + shelf.id);
});
assert.equal(businessShelf.packages, undefined, 'The bundle is shown in the combo shelf only (owner, 2026-11-09)');
assert.ok(historyShelf.picks.slice(0, 18).includes('Shikorer Shondhane'), 'শিকড়ের সন্ধানে is on the history shelf');
shelvesConfig.filter((shelf) => shelf.id !== 'popular').forEach((shelf) => {
  assert.ok(Array.isArray(shelf.picks) && shelf.picks.length >= 9, 'Shelf has hand-picked books: ' + shelf.id);
  assert.equal(new Set(shelf.picks).size, shelf.picks.length, 'Shelf picks are listed once: ' + shelf.id);
});
// Special packages lead their shelf as package cards (owner, 2026-11-09).
assert.deepEqual(comboShelf.packages, ['6abe2123b1f44997b7ca5950'], 'সফল উদ্যোক্তা বান্ডেল leads the combo shelf');
const packageSource = script.slice(script.indexOf('function packagesForShelf'), script.indexOf('var PACKAGE_BUTTON_WORDS'));
const packageHelpers = new Function('PACKAGE_OFFERS', 'shelfPackages', 'number', 'finalPrice', 'money', 'escapeHtml', 'responsiveImage',
  packageSource + '; return { packagesForShelf: packagesForShelf, packageRegularPrice: packageRegularPrice, packageCard: packageCard };')(
  { p1: 'ফ্রি ডেলিভারি + ফ্রি নোটবুক' },
  [{ _id: 'p1', name: 'বান্ডেল', salePrice: 929, discountType: 2, discountAmount: null, products: [
    { name: 'ক', salePrice: 470, quantity: 1, images: ['a.webp'] },
    { name: 'খ', salePrice: 500, quantity: 1, images: ['b.webp'] },
    { name: 'গ', salePrice: 600, quantity: 1, images: ['c.webp'] }
  ] }],
  (value) => Math.max(0, Number(value) || 0),
  (item) => pricing.finalPrice(item),
  (value) => '৳' + Math.round(value).toLocaleString('en-US'),
  (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])),
  (book) => 'src="' + book.images[0] + '"'
);
const shelfPackage = packageHelpers.packagesForShelf({ packages: ['p1', 'missing'] });
assert.equal(shelfPackage.length, 1, 'A package that did not load is skipped');
assert.equal(packageHelpers.packageRegularPrice(shelfPackage[0]), 1570);
const packageHtml = packageHelpers.packageCard(shelfPackage[0], 'ab-home-combo');
assert.match(packageHtml, /href="\/special-package-details\/p1"/);
assert.match(packageHtml, /৳929<\/span><s>৳1,570<\/s>/);
assert.match(packageHtml, /41% ছাড়/);
assert.match(packageHtml, /<p class="ab-home-author ab-home-pack-offer" title="ক \+ খ \+ গ">ফ্রি ডেলিভারি \+ ফ্রি নোটবুক<\/p>/);
assert.match(html, /var PACKAGE_OFFERS = \{ '6abe2123b1f44997b7ca5950': 'ফ্রি ডেলিভারি \+ ফ্রি নোটবুক' \}/, 'Only the package with the free-delivery offer says so');
assert.equal((packageHtml.match(/ab-home-pack-cover--/g) || []).length, 3, 'The three covers are fanned out');
assert.match(packageHtml, /class="ab-add-cart-button ab-add-package-button" type="button" data-package-id="p1"/);
assert.doesNotMatch(packageHtml, /data-product-id/, 'The product add-to-cart code must not pick up the package button');
assert.match(html, /bridge\.addSpecialPackageToCart\(id, button\)/, 'Packages are added with the shop-wide package cart code');
assert.match(html, /Promise\.all\(\[fetchProducts\(\), fetchShelfPackages\(\)\]\)/);
assert.match(html, /PACKAGE_WAIT_MS = 1500/, 'A slow package request cannot hold the homepage up');

// Picks outside the 180 best sellers are fetched by slug after the shelves show.
const addShelfPicks = new Function('shelves', 'API_BASE', 'CATALOGUE_SELECT', 'fetch',
  script.slice(script.indexOf('function addShelfPicks'), script.indexOf('function withRetries')).replace(/\/\*[\s\S]*$/, '') + '; return addShelfPicks;');
(async () => {
  const requests = [];
  const okFetch = async (url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ data: [{ slug: 'b' }, { slug: 'zzz' }] }) };
  };
  const merged = await addShelfPicks([{ picks: ['a', 'b'] }, { picks: ['b', 'c'] }], '', {}, okFetch)({ data: [{ slug: 'a' }] });
  assert.deepEqual(requests[0].filter.slug.$in, ['b', 'c']);
  assert.deepEqual(merged.data.map((product) => product.slug), ['a', 'b']);
  assert.equal(merged.shelfPicks, true);
  await assert.rejects(addShelfPicks([{ picks: ['b'] }], '', {}, async () => ({ ok: false }))({ data: [{ slug: 'a' }] }), 'A failed fetch is retried by the caller');
  let called = false;
  const complete = await addShelfPicks([{ picks: ['a'] }], '', {}, async () => { called = true; })({ data: [{ slug: 'a' }] });
  assert.equal(called, false, 'No extra request when every pick is already loaded');
  assert.equal(complete.data.length, 1);
  assert.equal(complete.shelfPicks, true);
})().catch((error) => { console.error(error); process.exit(1); });

const recommendationSource = script.slice(script.indexOf('function isCombo'), script.indexOf('function quizHtml'));
const recommendationHelpers = new Function(
  'shelves',
  'categoryNames',
  'number',
  recommendationSource + '; return { isCombo: isCombo, recommendProducts: recommendProducts, recommendationTitle: recommendationTitle };'
)(
  [{}, { words: ['কম্বো', 'সেট', 'প্যাকেজ', 'খণ্ড সেট', 'দুই খণ্ড', 'তিন খণ্ড', 'একত্রে'] }],
  (product) => product.categories || [],
  (value) => Math.max(0, Number(value) || 0)
);
const recommendationFixture = [
  { name: 'কুরআন ১', categories: ['কুরআন শেখা'], totalSold: 7 },
  { name: 'কুরআন ২', categories: ['কুরআন শেখা'], totalSold: 9 },
  { name: 'কুরআন ৩', categories: ['কুরআন শেখা'], totalSold: 8 },
  { name: 'কুরআন ৪', categories: ['কুরআন শেখা'], totalSold: 6 },
  { name: 'সীরাত কম্বো', categories: ['সীরাতে রাসূল (সা.)'], totalSold: 10 },
  { name: 'সীরাত প্রথম খণ্ড', categories: ['সীরাতে রাসূল (সা.)'], totalSold: 5 }
];
assert.deepEqual(
  recommendationHelpers.recommendProducts(recommendationFixture, 'কুরআন শেখা', 'new', 'three').map((product) => product.name),
  ['কুরআন ২', 'কুরআন ৩', 'কুরআন ১']
);
assert.deepEqual(recommendationHelpers.recommendProducts(recommendationFixture, 'কুরআন শেখা', 'new', 'one').map((product) => product.name), ['কুরআন ২']);
const sparseRecommendations = recommendationHelpers.recommendProducts(recommendationFixture, 'সীরাতে রাসূল (সা.)', 'new', 'three');
assert.equal(sparseRecommendations.length, 1);
assert.equal(recommendationHelpers.recommendationTitle(sparseRecommendations.length), 'আপনার জন্য এই ১টি বই');
assert.equal(recommendationHelpers.recommendationTitle(0), 'এই বিষয়ে কোনো বই পাওয়া যায়নি');
assert.equal(recommendationHelpers.isCombo({ name: 'সীরাত প্রথম খণ্ড' }), false);
assert.equal(recommendationHelpers.isCombo({ name: 'সীরাত দুই খণ্ড' }), true);

function normalizedTokens(source) {
  const match = source.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(match, 'Expected a :root token block');
  return match[1].replace(/\s+/g, ' ').trim();
}

assert.equal(normalizedTokens(tokens), normalizedTokens(html), 'Portable and inline design tokens must stay aligned');
assert.match(html, /Hallmark · macrostructure: Catalogue/);
assert.match(html, /body\.ab-home-redesign app-home \{ display: none !important; \}/);
assert.doesNotMatch(html, /body\.ab-home-redesign app-header\s*\{[^}]*display:\s*none/);
assert.doesNotMatch(html, /আমল বুকসের নির্বাচিত সংগ্রহ|পছন্দের বই, সহজে খুঁজুন|পাঠকের পছন্দ/);
[
  'জনপ্রিয়তার শীর্ষে',
  'বেস্টসেলার বুক কম্বো',
  'ব্যক্তিত্ব ও আত্মোন্নয়ন',
  'অর্থ, ব্যবসা ও সম্পদ গঠন',
  'কুরআন ও তাফসির',
  'হাদিস ও সীরাত',
  'নামাজ, দুআ ও যিকির',
  'আত্মশুদ্ধি, আদব ও আখলাক',
  'ইসলামি জীবন ও পরিবার',
  'ইতিহাস, জীবনী ও মনীষী',
  'জনপ্রিয় লেখক',
  'জনপ্রিয় প্রকাশনী',
  'একটু পড়ে দেখুন',
  'হাদিস জানতে',
  'পরিবার সুন্দর করতে',
  'নারীদের জন্য',
  'আদব ও চরিত্র গড়তে',
  'ইসলামি সাহিত্য পড়তে',
  'ফিতনা থেকে বাঁচতে'
].forEach((copy) => assert.ok(html.includes(copy), `Missing homepage copy: ${copy}`));
[
  'আপনার জন্য কোন বই (বিশেষ ছাড়)?',
  'কী বিষয়ে পড়তে চান?',
  'আপনি কেমন পাঠক?',
  'কী চান?',
  'আমার জন্য বই খুঁজুন →',
  'বুক ফাইন্ডার · ১ মিনিট',
  'হাদিস',
  'নামাজ ও দুআ',
  'ইতিহাস',
  'আদব ও চরিত্র',
  'ইসলামি সাহিত্য',
  'বিয়ে ও সংসার',
  '১ টি বই'
].forEach((copy) => assert.ok(html.includes(copy), `Missing quiz copy: ${copy}`));
assert.equal((html.match(/<fieldset>/g) || []).length, 3, 'Quiz must ask exactly three questions');
assert.match(html, /class="ab-book-quiz-results" aria-live="polite"/);
assert.match(html, /ab_home_quiz_complete/);
assert.match(html, /recommendProducts\(products, topic, reader, quantity\)/);
assert.match(html, /result_count: recommendations\.length/);
assert.match(html, /index === 1 \? quizHtml\(\)/);
assert.match(html, /picks: \['productive-barakah', 'Jibonpaltano4books', 'Poro Collection'/);
assert.match(html, /index === 4 \? goalsHtml/);
assert.match(html, /index === 6 \? authorsHtml/);
assert.match(html, /index === 8 \? publishersHtml/);
assert.match(html, /class="ab-home-name-list ab-home-name-list--media"/);
assert.match(html, /showEntityImages\(root\)/, 'Author photos and publisher logos are filled in after render');
assert.match(html, /filter: \{ slug: \{ \$in: slugs \} \}/, 'Pictures are fetched by slug (the list API does not cast _id)');
assert.match(html, /return withRetries\(function \(\) \{\s*return fetch\(API_BASE \+ '\/' \+ kind \+ '\/get-all'/, 'Author photos and publisher logos are retried when the API refuses a request');
assert.match(html, /if \(found\[0\] && found\[1\]\) \{\s*try \{ sessionStorage\.setItem\(ENTITY_IMAGE_CACHE/, 'A failed picture request is not remembered for the session');
assert.match(html, /ab_home_quiz_start/, 'Quiz starts are tracked next to completions');
assert.match(html, /slug === OWN_PUBLISHER_SLUG \? ownLogo\(\)/, 'Our own publisher card shows the store logo');
assert.match(html, /publisher: 1/);
assert.match(html, /grid-auto-columns:\s*clamp\(8\.75rem, 38vw, 10rem\)/);
assert.match(html, /app-header \.logo img/);
assert.match(html, /@media \(min-width: 75rem\)[\s\S]*?\.ab-home-grid \{ grid-template-columns: repeat\(6, minmax\(0, 1fr\)\); \}/);
assert.match(html, /@media \(min-width: 67rem\)[\s\S]*?app-header \.header-main-content/);
assert.doesNotMatch(html, /body\.ab-home-redesign app-header/);
assert.match(html, /app-header \.logo img \{[^}]*width: 4rem !important; height: 5rem !important;/, 'Logo box is fixed so the late logo swap does not move the header');
assert.match(html, /app-header \.logo img \{[^}]*margin-block: 0\.5rem !important/);
assert.match(html, /id = 'ab-header-ticker'/);
assert.match(html, /বিশেষ অফার/);
assert.match(html, /৳৭৯৯\+ অর্ডারে ৭২ পৃষ্ঠার নোটবুক ফ্রি/);
assert.match(html, /var offerGap = '(?:\\u00a0){8}•(?:\\u00a0){8}'/);
assert.match(html, /var deliveryGap = '(?:\\u00a0){4}•(?:\\u00a0){4}'/);
assert.match(html, /'৳৭৯৯\+ অর্ডারে ৭২ পৃষ্ঠার নোটবুক ফ্রি' \+ offerGap \+ 'ঢাকায় ডেলিভারি ৳৬০' \+ deliveryGap \+ 'ঢাকার বাইরে ৳৭৫'/);
assert.match(html, /padding-inline: 1\.5rem 6rem/);
assert.match(html, /@keyframes ab-header-ticker-scroll/);
assert.match(html, /prefers-reduced-motion[\s\S]*?\.ab-header-ticker-track \{ animation: none; \}/);
assert.doesNotMatch(html, /আপনার জন্য বই সাজানো হচ্ছে|mountLoading|LOADING_ID/);
assert.match(html, /function decorateCovers\(\)/);
assert.match(html, /link\.closest\('\.ab-sticky-search-item'\)/);
assert.match(html, /link\.closest\('app-bought-together, \.bought-together-section'\)/);
assert.match(html, /link\.closest\('#ab-cart-offer-progress'\)/);
assert.match(html, /if \(badge\) badge\.remove\(\)/);
assert.match(html, /function ratingHtml\(product\)/);
assert.match(html, /ratingCount/);
assert.match(html, /grid-template-rows:\s*repeat\(2, auto\)/);
assert.match(html, /grid-auto-flow:\s*column/);
assert.match(main, /publisher:\s*1,\s*ratingCount:\s*1,\s*ratingTotal:\s*1,\s*reviewTotal:\s*1/);
assert.match(html, /return shelfHtml \+ \(index === 1 \? quizHtml\(\) : ''\) \+ \(index === 4 \? goalsHtml : ''\) \+ \(index === 6 \? authorsHtml : ''\) \+ \(index === 8 \? publishersHtml : ''\)/);
assert.match(html, /nativeHome\.parentNode\.insertBefore\(root, nativeHome\)/);
assert.match(html, /\/product\/get-all/);
assert.match(html, /\/storefront-catalog/);
assert.match(html, /class="ab-add-cart-button"/);
assert.match(html, /home\) === 'legacy'|get\('home'\) === 'legacy'/);
assert.match(html, /view_item_list/);
assert.match(html, /ecommerce:\s*\{/);
assert.match(html, /items:\s*items/);
assert.match(html, /amol-cart-added/);
assert.match(html, /requestSerial/);
assert.match(html, /failedRoute/);
assert.match(html, /pendingCarts\[id\]/);
assert.match(html, /window\.addEventListener\('click',[\s\S]*?\}, true\);/);
assert.match(html, /prefers-reduced-motion/);
assert.ok(main.includes("'homepage-redesign.html'"), 'The API must inject the homepage preview');
// The app's own home stays hidden until the redesign mounts, with a timed reveal and a cleanup on failure.
assert.match(html, /html\.ab-home-pending app-home \{\s*visibility: hidden;\s*animation: ab-home-reveal 0s linear 6s forwards;/);
assert.match(html, /\/\/ Set while the head parses[^\n]*\n\s*if \(wantsRedesign\(\)\) setPending\(true\);/);
assert.match(html, /function cleanup\(\) \{[\s\S]*?setPending\(false\);[\s\S]*?\n  \}/);
assert.match(html, /cataloguePromise = withRetries\(requestCatalogue, \[700, 2000\]\)/);
assert.match(html, /shelfPicksPromise = withRetries\(function \(\) \{ return addShelfPicks\(result\); \}, \[700, 2000\]\)/);
assert.match(html, /render\(products\);\s*if \(!result\.shelfPicks\) \{\s*loadShelfPicks\(result\)\.then[\s\S]*?upgradeShelves\(full\.data\)/, 'Late picks never hold up the first render');

console.log('Homepage redesign checks passed');
