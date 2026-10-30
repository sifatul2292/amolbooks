const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../gtm-snippets/mobile-browsing.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const keyboardSource = script.slice(script.indexOf('function keyboard()'), script.indexOf("document.addEventListener('focusin'"));
let hidden;
const context = {
  window: {innerHeight: 852, visualViewport: {height: 852}},
  document: {activeElement: {matches: () => true}, body: {classList: {toggle: (_, value) => hidden = value}}}
};
vm.createContext(context);
vm.runInContext(keyboardSource, context);
context.keyboard(); assert.equal(hidden, false, 'ordinary focus must not hide navigation');
context.window.visualViewport.height = 480;
context.keyboard(); assert.equal(hidden, true, 'software keyboard hides fixed controls');
context.document.activeElement.matches = () => false;
context.keyboard(); assert.equal(hidden, false, 'radio or button focus restores controls');
context.window.visualViewport = undefined;
context.document.activeElement.matches = () => true;
context.keyboard(); assert.equal(hidden, false, 'unsupported viewport keeps navigation available');
assert.match(html, /app-footer \.footer-bottom-copyright \{ margin-bottom: 0 !important; \}/, 'body padding alone clears the bottom nav, so no empty strip under the footer');
assert.match(html, /body\.ab-cart-enhanced:has\(#ab-cart-sticky-checkout:not\(\[hidden\]\)\) \{ padding-bottom:/, 'cart page clears its taller checkout bar');
console.log('Mobile browsing syntax, keyboard visibility and footer spacing checks pass');
