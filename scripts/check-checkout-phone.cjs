// Checkout phone numbers: autofilled "+880 1750-250123" must end up as 01750250123,
// in the checkout box (gtm-snippets/checkout-phone.html) and on the server (order.service.ts).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../api/node_modules/typescript');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('api/src/main.ts');
const snippet = read('gtm-snippets/checkout-phone.html');
const service = read('api/src/pages/sales/order/order.service.ts');

assert.match(main, /'mobile-browsing\.html',[\s\S]*?'checkout-phone\.html',/, 'The API injects the checkout phone snippet');
assert.match(snippet, /setAttribute\('maxlength', '20'\)/, 'The box has room for the whole autofilled number');
assert.match(snippet, /document\.addEventListener\('input', function[\s\S]*?\}, true\);/, 'The number is tidied before the checkout reads it');

// Box: the snippet's own localPhone().
const boxSource = snippet.slice(snippet.indexOf('  function localPhone'), snippet.indexOf('  function isField'));
const box = new Function("var BENGALI = '০১২৩৪৫৬৭৮৯';" + boxSource + '; return localPhone;')();
const boxCases = [
  ['+8801750250123', '01750250123'], ['+880 1750-250123', '01750250123'], ['8801750250123', '01750250123'],
  ['0088 01750 250123', '01750250123'], ['00881750250123', '01750250123'], ['+880 01750250123', '01750250123'],
  ['1750250123', '01750250123'], ['01750250123', '01750250123'], ['017502501239', '01750250123'],
  ['০১৭৫০২৫০১২৩', '01750250123'], ['88', '88'], ['880', '880'], ['8801', '01'], ['0088', '0088'], ['017', '017'], ['', ''],
];
for (const [input, expected] of boxCases) assert.equal(box(input), expected, `box: ${input}`);
// Typing "+880..." key by key while the checkout keeps at most 11 characters.
let typed = '';
for (const key of '+8801750250123') typed = box(typed + key).slice(0, 11);
assert.equal(typed, '01750250123', 'typing the +880 form key by key');

// Server: checkoutLocalPhone() and where it is used.
const start = service.indexOf('  private checkoutLocalPhone(');
const end = service.indexOf('\n  }', start) + 4;
assert.ok(start > 0, 'order.service.ts has checkoutLocalPhone');
const method = service.slice(start, end).replace('private checkoutLocalPhone(phoneNo: any): any', 'function checkoutLocalPhone(phoneNo)');
const server = new Function(ts.transpileModule(method, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText + '; return checkoutLocalPhone;')();
const serverCases = [
  ['+880 1750-250123', '01750250123'], ['+8801750250123', '01750250123'], ['8801750250123', '01750250123'],
  ['0088 01750 250123', '01750250123'], ['01750250123', '01750250123'], ['1750250123', '01750250123'],
  ['০১৭৫০২৫০১২৩', '01750250123'], [' 01750250123 ', '01750250123'],
  // Not recognisable: kept as it came (an already-cut number cannot be repaired).
  ['8801750250', '8801750250'], ['12345', '12345'], [undefined, undefined],
];
for (const [input, expected] of serverCases) assert.equal(server(input), expected, `server: ${input}`);
assert.match(service, /async addOrder\([\s\S]{0,400}addOrderDto\.phoneNo = this\.checkoutLocalPhone\(addOrderDto\.phoneNo\)/, 'Orders store the local number');
assert.match(service, /async addIncompleteOrder\([\s\S]{0,600}incompleteInput\.phoneNo = this\.checkoutLocalPhone\(incompleteInput\.phoneNo\);[\s\S]{0,900}const phoneNo = String\(incompleteInput\.phoneNo \|\| ''\)\.trim\(\);/, 'Incomplete orders store and merge on the local number');
assert.match(service, /async updateIncompleteOrderById\([\s\S]{0,500}incompleteInput\.phoneNo = this\.checkoutLocalPhone\(incompleteInput\.phoneNo\);/, 'Incomplete order updates store the local number');

console.log('Checkout phone checks passed');
