const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const snippet = fs.readFileSync(require('node:path').join(__dirname, '../gtm-snippets/blog-reading.html'), 'utf8');
const script = snippet.match(/<script>([\s\S]*?)<\/script>/)[1];
const callbacks = [];
function element() {
  return { children: [], attributes: [{name: '_ngcontent-fixture'}],
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this[name] = value; },
    querySelector() { return this.children.flatMap(item => item.children).find(a => a.href === '/blogs') || null; }
  };
}
const menu = element();
const header = element();
const document = {querySelector: selector => selector === 'app-header' ? header : menu, createElement: element};
const context = vm.createContext({window: {}, document, MutationObserver: class {
  constructor(callback) { callbacks.push(callback); }
  observe() {}
}});
vm.runInContext(script, context);
assert.equal(menu.children.length, 1);
assert.equal(menu.children[0].children[0].href, '/blogs');
assert.equal(menu.children[0].children[0].textContent, 'ব্লগ');
assert.equal(menu.children[0]['_ngcontent-fixture'], '');
callbacks[0]();
vm.runInContext(script, context);
assert.equal(menu.children.length, 1, 'repeat execution must not duplicate Blog');
menu.children = [];
callbacks[0]();
assert.equal(menu.children.length, 1, 'restore Blog after a header redraw');
console.log('Blog menu duplicate/redraw checks pass');
