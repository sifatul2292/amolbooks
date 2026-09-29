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

new vm.Script(source);
assert.match(source, /macrostructure: Long Document/, 'The offer page records the new reading-led structure');
assert.match(source, /var API_BASE = 'https:\/\/apisub\.amolbooks\.com'/, 'Local preview reads the live package catalogue');
assert.match(source, /function hydrateProducts\([\s\S]*?\/api\/product\/get-by-slug\//, 'Each package line hydrates its complete product record');
assert.match(source, /product\.shortDescription \|\| product\.description/, 'Every book renders a real CMS description');
assert.match(source, /product && product\.pdfFile[\s\S]*?একটু পড়ে দেখুন[\s\S]*?openPdfDialog/, 'Available PDF samples open in an in-page reader');
assert.match(source, /function loadProductPdfEngine[\s\S]*?webpackRequire\.e\(158\)[\s\S]*?webpackRequire\(5908\)/, 'The reader reuses the storefront product-page PDF.js engine');
assert.match(source, /function renderPdfPages[\s\S]*?page\.render/, 'PDF pages render to canvases instead of a blocked cross-origin iframe');
assert.match(source, /ab-pdf-dialog-close[\s\S]*?close\.addEventListener\('click', closePdfDialog\)/, 'The PDF reader exposes a working close control');
assert.doesNotMatch(source, /ab-pdf-dialog-frame|createElement\('iframe'/, 'The blocked iframe implementation is removed');
assert.match(source, /আরও দেখুন[\s\S]*?aria-expanded/, 'Long book descriptions have an accessible see-more control');
assert.match(source, /বইগুলোর মোট মূল্য[\s\S]*?অফার মূল্য/, 'The hero separates combined list price from package offer price');
assert.match(source, /amolbooks-notebook-8ddd\.webp[\s\S]*?সাথে ফ্রি নোটবুক/, 'The free notebook uses its real catalogue cover');
assert.match(source, /Object\.assign\(\{\}, detail, product/, 'Package quantities win over hydrated inventory quantities');
assert.match(source, /বইটি দেখুন[\s\S]*?details\.href = path/, 'Every book retains a product-detail route');
assert.match(source, /@media \(min-width: 40rem\)[\s\S]*?@media \(min-width: 60rem\)/, 'The redesign is mobile-first');
assert.match(source, /html\.ab-special-package-page, body\.ab-special-package-page \{ overflow-x: clip; \}/, 'Offer pages cannot scroll horizontally');
assert.match(source, /prefers-reduced-motion: reduce/, 'Interactive motion has a reduced-motion fallback');

console.log('Special-package redesign checks passed');
