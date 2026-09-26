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
const productsForShelf = new Function('number', shelfSource + '; return productsForShelf;')(
  (value) => Math.max(0, Number(value) || 0)
);
const manualComboShelf = {
  id: 'combo',
  words: ['কম্বো'],
  manualSlugs: ['Jibonpaltano4books', 'Jibon', 'Poro Collection']
};
const manualComboProducts = [
  { name: 'স্বয়ংক্রিয় কম্বো', slug: 'automatic' },
  { name: 'জীবন ও চরিত্র গঠন বান্ডেল', slug: 'Jibon' },
  { name: 'পড়ো কালেকশন', slug: 'Poro Collection' },
  { name: 'জীবন পাল্টে দেওয়ার মত ৪ টি বই', slug: 'Jibonpaltano4books' }
];
assert.deepEqual(
  productsForShelf(manualComboProducts, manualComboShelf).map((product) => product.slug),
  ['Jibonpaltano4books', 'Jibon', 'Poro Collection', 'automatic']
);

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
  'আপনার বই দেখুন',
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
assert.match(html, /manualSlugs: \['Jibonpaltano4books', 'Jibon', 'Poro Collection'\]/);
assert.match(html, /index === 4 \? goalsHtml/);
assert.match(html, /index === 6 \? authorsHtml/);
assert.match(html, /index === 8 \? publishersHtml/);
assert.match(html, /class="ab-home-name-list"/);
assert.match(html, /publisher: 1/);
assert.match(html, /grid-auto-columns:\s*clamp\(8\.75rem, 38vw, 10rem\)/);
assert.match(html, /app-header \.logo img/);
assert.match(html, /@media \(min-width: 75rem\)[\s\S]*?\.ab-home-grid \{ grid-template-columns: repeat\(6, minmax\(0, 1fr\)\); \}/);
assert.match(html, /@media \(min-width: 67rem\)[\s\S]*?app-header \.header-main-content/);
assert.doesNotMatch(html, /body\.ab-home-redesign app-header/);
assert.match(html, /app-header \.logo img \{[^}]*max-width: 8rem[^}]*max-height: 5rem/);
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
assert.match(main, /publisher: 1, ratingCount: 1, ratingTotal: 1, reviewTotal: 1/);
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

console.log('Homepage redesign checks passed');
