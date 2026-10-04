const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../api/node_modules/typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(require.resolve('../api/src/storefront-special-package-script.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exportsContext = { exports: {} };
vm.runInNewContext(compiled, exportsContext);
const source = exportsContext.exports.STOREFRONT_SPECIAL_PACKAGE_SCRIPT;
const productSectionsCompiled = ts.transpileModule(
  fs.readFileSync(require.resolve('../api/src/storefront-product-sections-script.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const productSectionsContext = { exports: {} };
vm.runInNewContext(productSectionsCompiled, productSectionsContext);
const productSectionsSource = productSectionsContext.exports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
const mainSource = fs.readFileSync(require.resolve('../api/src/main.ts'), 'utf8');

new vm.Script(source);
new vm.Script(productSectionsSource);
assert.match(source, /macrostructure: Stat-Led/, 'The offer page records the saving-led structure');
assert.match(source, /PUBLISHED_API_BASE = 'https:\/\/apisub\.amolbooks\.com'[\s\S]*?location\.origin[\s\S]*?PUBLISHED_API_BASE/, 'Local preview reads the live package catalogue through its same-origin proxy');
assert.match(mainSource, /app\.use\([\s\S]*?'\/api\/special-package'[\s\S]*?POST'[\s\S]*?'\/get-all'[\s\S]*?\['GET', 'HEAD'\]/, 'The local package proxy permits only the detail and package-list reads');
assert.match(source, /function hydrateProducts\([\s\S]*?\/api\/product\/get-by-slug\//, 'Each package line hydrates its complete product record');
assert.match(source, /product\.shortDescription \|\| product\.description/, 'Every book renders a real CMS description');
assert.match(source, /product && product\.pdfFile[\s\S]*?একটু পড়ে দেখুন[\s\S]*?openPdfDialog/, 'Available PDF samples open in an in-page reader');
assert.match(source, /function loadProductPdfEngine[\s\S]*?webpackRequire\.e\(158\)[\s\S]*?webpackRequire\(5908\)/, 'The reader reuses the storefront product-page PDF.js engine');
assert.match(source, /function renderPdfPages[\s\S]*?page\.render/, 'PDF pages render to canvases instead of a blocked cross-origin iframe');
assert.match(source, /ab-pdf-dialog-close[\s\S]*?close\.addEventListener\('click', closePdfDialog\)/, 'The PDF reader exposes a working close control');
assert.doesNotMatch(source, /ab-pdf-dialog-frame|createElement\('iframe'/, 'The blocked iframe implementation is removed');
assert.match(source, /আরও দেখুন[\s\S]*?aria-expanded/, 'Long book descriptions have an accessible see-more control');
assert.match(source, /বইগুলোর মোট মূল্য[\s\S]*?অফার মূল্য/, 'The hero separates combined list price from package offer price');
assert.match(source, /এই প্যাকেজে মোট সাশ্রয়/, 'The hero leads with the real computed package saving');
assert.match(source, /function runPackagePurchase[\s\S]*?bridge\.addSpecialPackageToCart\(id, source\)/, 'Hero Add to Cart uses the shared product-page commerce bridge');
assert.match(source, /bridge\.addSpecialPackageToCart\(id, null\)[\s\S]*?bridge\.goToCheckout\(\)/, 'Buy Now adds the package before using the shared checkout route');
assert.match(source, /'Add to Cart'[\s\S]*?'Buy Now'/, 'Package purchase actions use the requested English labels');
assert.match(productSectionsSource, /function addSpecialPackageToCart[\s\S]*?specialPackage: packageId[\s\S]*?cartType: 1/, 'The shared commerce bridge persists a valid package cart entry');
assert.match(productSectionsSource, /__abCommerceBridge[\s\S]*?addSpecialPackageToCart[\s\S]*?goToCheckout/, 'The package page reuses the product-page cart and checkout pipeline');
assert.match(productSectionsSource, /specialPackage: specialPackage && specialPackage\._id \|\| specialPackage[\s\S]*?filter\(function \(item\) \{ return cartEntryKey\(item\); \}\)/, 'Authenticated cart refresh preserves package entries');
assert.match(productSectionsSource, /function fetchCartProducts[\s\S]*?\/special-package\/[\s\S]*?packageAsCartProduct/, 'Cart hydration loads package details alongside normal products');
assert.match(productSectionsSource, /function syncGuestCartUi[\s\S]*?fetchCartProducts\(items\)/, 'The visible cart renderer includes package-type entries');
assert.match(source, /amolbooks-notebook-8ddd\.webp[\s\S]*?সাথে ফ্রি নোটবুক/, 'The free notebook uses its real catalogue cover');
assert.match(source, /Object\.assign\(\{\}, detail, product/, 'Package quantities win over hydrated inventory quantities');
assert.match(source, /বইটি দেখুন[\s\S]*?details\.href = path/, 'Every book retains a product-detail route');
assert.match(source, /function loadRelatedOffers[\s\S]*?\/api\/special-package\/get-all/, 'Related offers load from the real package catalogue');
assert.match(source, /function renderRelatedOffers[\s\S]*?আপনার জন্য আরও অফার[\s\S]*?অফারটি দেখুন/, 'Related offers render as a discoverable package shelf');
assert.match(source, /String\(item\._id\) !== String\(id\)/, 'The related-offer shelf excludes the current package');
assert.match(source, /@media \(min-width: 40rem\)[\s\S]*?@media \(min-width: 60rem\)/, 'The redesign is mobile-first');
assert.match(source, /html\.ab-special-package-page, body\.ab-special-package-page \{ overflow-x: clip; \}/, 'Offer pages cannot scroll horizontally');
assert.match(source, /prefers-reduced-motion: reduce/, 'Interactive motion has a reduced-motion fallback');
assert.match(productSectionsSource, /@media \(max-width: 767px\)[\s\S]*?app-offers app-special-package[\s\S]*?\.swiper-wrapper[\s\S]*?display: grid !important/, 'Mobile offers render as a stacked list');
assert.match(productSectionsSource, /app-offers app-special-package[\s\S]*?\.swiper-slide[\s\S]*?width: 100% !important[\s\S]*?margin: 0 !important/, 'Every mobile offer occupies its own full-width row');
assert.match(productSectionsSource, /\.swiper-slide-duplicate,[\s\S]*?\.swiper-button-prev,[\s\S]*?\.swiper-button-next[\s\S]*?display: none !important/, 'Mobile offer carousel duplicates and controls are removed');

console.log('Special-package redesign checks passed');
