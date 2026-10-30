const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('../api/node_modules/typescript');
const { chromium } = require('playwright');
const root = require('node:path').join(__dirname, '..');
const file = 'api/src/storefront-product-sections-script.ts';
function helper(source) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {} }; vm.runInNewContext(compiled, context);
  const script = context.exports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
  const start = script.indexOf('  function repairCheckoutDeliveryPlacement()');
  return script.slice(start, script.indexOf('\n  function ', start + 1));
}
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://fixture.amolbooks.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<app-checkout><div class="section-left"><div class="payment-method-area"><div class="payment-method-top">ডেলিভারি চার্জ</div><div class="radio-box-area"><input type="radio" checked></div><div class="confirm-order"></div></div><div class="summery-area">Total</div></div></app-checkout>' }));
    const before = helper(execFileSync('git', ['show', 'HEAD:' + file], { cwd: root, encoding: 'utf8' }));
    const after = helper(fs.readFileSync(root + '/' + file, 'utf8'));
    for (const [source, baseline] of [[before, true], [after, false]]) {
      await page.goto('https://fixture.amolbooks.test/checkout');
      await page.evaluate(source => { window.eval(source); repairCheckoutDeliveryPlacement(); }, source);
      const mutations = await page.evaluate(() => {
        const observer = new MutationObserver(() => {});
        observer.observe(document.querySelector('app-checkout'), { childList: true, subtree: true });
        for (let i = 0; i < 20; i++) repairCheckoutDeliveryPlacement();
        return observer.takeRecords().length;
      });
      if (baseline) assert.ok(mutations > 0, 'Baseline reproduces repeated DOM moves');
      else {
        assert.equal(mutations, 0, 'Settled mobile checkout performs no DOM moves');
        assert.equal(await page.locator('input').isChecked(), true);
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.evaluate(() => repairCheckoutDeliveryPlacement());
        assert.equal(await page.locator('.payment-method-area > .payment-method-top + .radio-box-area + .confirm-order').count(), 1);
        assert.equal(await page.evaluate(() => {
          const observer = new MutationObserver(() => {});
          observer.observe(document.querySelector('app-checkout'), { childList: true, subtree: true });
          for (let i = 0; i < 20; i++) repairCheckoutDeliveryPlacement();
          return observer.takeRecords().length;
        }), 0, 'Settled desktop checkout also performs no DOM moves');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => repairCheckoutDeliveryPlacement());
        assert.equal(await page.locator('#ab-checkout-delivery-card input').isChecked(), true);
      }
    }
  } finally { await browser.close(); }

  console.log('Delivery controls: baseline churn reproduced, stable mobile/desktop placement and selection retained.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
