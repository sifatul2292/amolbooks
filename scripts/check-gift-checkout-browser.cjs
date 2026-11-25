// Run with Node 20+ and Playwright on NODE_PATH. All network traffic is answered locally.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const ts = require('../api/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const ORIGIN = process.env.GIFT_TEST_LOCAL === '1' ? 'http://localhost:3002' : 'https://gift.amolbooks.test';
const assets = path.join(root, 'ui/dist/angular-ui/browser');
const sourceHtml = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
function runtimeScript(file, name) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'api/src', file), 'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports[name];
}
const productScript = runtimeScript('storefront-product-sections-script.ts', 'STOREFRONT_PRODUCT_SECTIONS_SCRIPT');
const priceScript = runtimeScript('storefront-price-script.ts', 'STOREFRONT_PRICE_SCRIPT');
const snippets = ['gift-checkout.html', 'package-free-delivery.html', 'cart-page-navigation.html', 'checkout-payment.html', 'checkout-sticky-confirm.html', 'order-success-summary.html'].map(file => fs.readFileSync(path.join(root, 'gtm-snippets', file), 'utf8')).join('\n');
const bundleTags = [...sourceHtml.matchAll(/<script src="((?:runtime|polyfills|main)\.[^"]+)"[^>]*><\/script>/g)].map(match => match[0]).join('');
const stylesheet = sourceHtml.match(/<link rel="stylesheet" href="styles[^"]+">/)[0];
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/">' + stylesheet + snippets + '</head><body><app-root></app-root>' + bundleTags + '<script>' + productScript + '</script><script>' + priceScript + '</script></body></html>';
const book = { _id:'000000000000000000000001', name:'উপহারের বই', nameEn:'Gift book', slug:'gift-fixture', salePrice:200, discountType:2, discountAmount:20, quantity:10, trackQuantity:true, images:['/assets/images/placeholder/test.png'], weight:200 };
let orderBody, gatewayBody, orderRequestCount=0;
const requested = new Set();
const errors = [];
async function checkDesktopCart(page,width) {
  const gift=page.locator('app-cart-information .ab-gift-cart-buttons [data-ab-gift-start]');
  assert.equal(await gift.isVisible(),true,'Desktop Gift Order is visible');
  assert.equal(await gift.innerText(),'Gift Order','Normal checkout never relabels the gift link');
  const boxes=await page.locator('app-cart-information .ab-gift-cart-buttons').evaluate(el=>[...el.children].map(node=>{const r=node.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height};}));
  assert.ok(boxes[0].width>=120&&boxes[1].width>=120&&boxes[0].height>=44&&boxes[1].height>=44,'Both actions have usable hit areas');
  assert.ok(boxes[0].right<=boxes[1].x&&Math.abs(boxes[0].y-boxes[1].y)<2,'Gift and regular checkout are side by side, without overlap');
  assert.equal(await page.locator('app-cart-information .section-left > .select-items-area:visible').count(),1,'One visible cart header');
  const productBoxes=await page.locator('app-cart-information .cart-card:not(.ab-cart-gift-row)').first().evaluate(row=>({text:row.querySelector('.cart-text-info').getBoundingClientRect().toJSON(),quantity:row.querySelector('.quantity-area').getBoundingClientRect().toJSON()}));
  assert.ok(productBoxes.text.right<=productBoxes.quantity.x,'Quantity controls never cover the book title or price');

  if(width===1113)await page.screenshot({path:path.join(root,'tmp/gift-checkout/cart-1113.png'),fullPage:true});
}
async function main() {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const context = await browser.newContext({ viewport:{ width:375, height:900 } });
    await context.addInitScript(() => {
      localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify([{ product:'000000000000000000000001', selectedQty:1, cartType:0 }]));
    });
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const p = decodeURIComponent(url.pathname);
      if (p === '/api/storefront-assets/delivery-zone-core.js') return route.fulfill({ path:path.join(root,'gtm-snippets/delivery-zone-core.js'), contentType:'application/javascript' });
      if (p === '/api/storefront-assets/eps-pay-with.png') return route.fulfill({ path:path.join(root,'gtm-snippets/assets/eps-pay-with.png'), contentType:'image/png' });
      if (p.startsWith('/api/')) {
        requested.add(p);
        let data = [];
        if (/payment\/eps\/status\//.test(p)) data = {paymentStatus:'paid',paidAmount:270,paidWith:'bKash'};
        else if (p === '/api/order/000000000000000000000020') data = { ...orderBody,_id:'000000000000000000000020',orderId:'FIXTURE',paymentStatus:'paid',giftWrapCharge:30,deliveryCharge:60,grandTotal:270,orderedItems:[{name:book.name,quantity:1,unitPrice:180}] };
        else if (/payment\/eps\/config/.test(p)) data = { enabled:true };
        else if (/product\/get-products-by-ids|product\/get-by-ids/.test(p)) data = [book];
        else if (/product\/get-by-slug/.test(p)) data = book;
        else if (/shipping-charge/.test(p)) data = { deliveryInDhaka:60, deliveryOutsideDhaka:100 };
        else if (/order-offer/.test(p)) data = { giftEnabled:false, discountAmount:0, discountType:0 };
        else if (/setting/.test(p)) data = { incompleteOrder:{ isEnableIncompleteOrder:false } };
        else if (/shop-information/.test(p)) data = { siteName:'Amol Books', phones:[], emails:[], addresses:[] };
        else if (/division/.test(p)) data = [{ _id:'000000000000000000000010', name:'Dhaka >ঢাকা' }];
        else if (/area/.test(p)) data = [{ _id:'000000000000000000000011', name:'ঢাকা' }];
        else if (/zone/.test(p)) data = [];
        else if (/add-order-by-/.test(p)) { orderRequestCount++; orderBody = request.postDataJSON(); data = { _id:'000000000000000000000020', orderId:'FIXTURE' }; }
        else if (/payment\/init-ssl/.test(p)) { gatewayBody = request.postDataJSON(); data = { sessionkey:'fixture', GatewayPageURL:ORIGIN + '/fixture-gateway' }; }
        return route.fulfill({ contentType:'application/json', body:JSON.stringify({ success:true, data, count:Array.isArray(data) ? data.length : 1 }) });
      }
      if (url.origin === ORIGIN) {
        if (/^\/(?:cart|checkout(?:\/order-success\/[a-f0-9]{24})?)\/?$/.test(p)) return route.fulfill({ contentType:'text/html; charset=utf-8', body:html });
        if (p === '/fixture-gateway') return route.fulfill({ contentType:'text/html', body:'<h1>Payment gateway fixture</h1>' });
        const file = path.join(assets, p);
        if (file.startsWith(assets + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          const ext = path.extname(file);
          const mime = { '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.ttf':'font/ttf', '.json':'application/json' }[ext];
          return route.fulfill({ path:file, contentType:mime });
        }
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    if(process.env.GIFT_TEST_LOCAL==='1'){
      await page.setViewportSize({width:1113,height:1035});
      await page.goto(ORIGIN+'/cart');
      await page.locator('.cart-card.ab-live-cart-page-item').first().waitFor();
      for(const width of [768,1024,1113,1440]){
        await page.setViewportSize({width,height:1035});
        await page.waitForTimeout(150);
        await checkDesktopCart(page,width);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await page.setViewportSize({width:1113,height:1035});
      await page.locator('.cart-card:not(.ab-cart-gift-row) [data-ab-cart-op="plus"]').first().click();
      await page.waitForFunction(()=>document.querySelector('#ab-cart-summary-inline').textContent.includes('360'));
      await page.locator('.cart-card:not(.ab-cart-gift-row) [data-ab-cart-op="minus"]').first().click();
      await page.waitForFunction(()=>document.querySelector('#ab-cart-summary-inline').textContent.includes('180'));
      await page.locator('.ab-gift-cart-buttons button.order').click();
      await page.waitForURL(ORIGIN+'/checkout');
      assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(),true);
      await page.goto(ORIGIN+'/cart');
      await page.locator('.ab-gift-cart-buttons [data-ab-gift-start]').click();
      await page.waitForURL('**/checkout?gift=1');
      await page.locator('#ab-gift-sender').waitFor();
      assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(),false);
      assert.deepEqual(errors,[]);
      console.log('Local cart checks passed: generated rows, one header, desktop gift/normal actions, quantity totals and 768/1024/1113/1440px layouts.');
      return;
    }
    await page.goto(ORIGIN + '/checkout?gift=1');
    await page.locator('#ab-gift-sender').waitFor();
    await page.waitForTimeout(1500);
    await page.locator('#ab-gift-confirm-bar [data-ab-gift-confirm]').click();
    assert.equal(orderBody, undefined, 'Missing sender details block placement');
    console.log('Fixture API paths:', [...requested].join(', '));
    if (errors.length) console.log('Fixture errors:', errors);
    assert.equal(await page.locator('input[formcontrolname="name"]').count(), 1);
    assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(), false, 'Gift checkout hides COD');
    assert.equal(await page.locator('input[value="online_payment"]').isChecked(), true);
    // Repeated Angular total reads must not rescan an unchanged address on every keystroke.
    await page.evaluate(()=>{const original=window.AbDeliveryZone.detect;window.giftAddressScans=0;window.AbDeliveryZone.detect=function(text){window.giftAddressScans++;return original(text);};});
    const typedAddress='dsfsdfsjssdfsdjfsdfsdsf sdfgdfgsdfsdfgsdfgsdfg';
    await page.locator('[data-ab-gift-recipient="address"]').pressSequentially(typedAddress,{delay:10});
    const scansAfterAddress=await page.evaluate(()=>window.giftAddressScans);
    assert.ok(scansAfterAddress<=typedAddress.length+1,'Each address value is detected at most once');
    await page.locator('[data-ab-gift-field="message"]').pressSequentially('Happy birthday to you!',{delay:10});
    assert.equal(await page.evaluate(()=>window.giftAddressScans),scansAfterAddress,'Editing the message reuses the detected location');
    assert.equal(await page.locator('[data-ab-gift-recipient="address"]').inputValue(),typedAddress,'Typing preserves every character');
    assert.equal(await page.locator('#ab-gift-remaining').innerText(),'98 Character(s) Remaining');
    await page.locator('[data-ab-gift-field="senderName"]').fill('Gift Sender');
    await page.locator('[data-ab-gift-field="senderPhone"]').fill('01700000001');
    await page.locator('[data-ab-gift-field="message"]').fill('ঈদের শুভেচ্ছা');
    await page.locator('[data-ab-gift-recipient="name"]').fill('Gift Recipient');
    await page.locator('[data-ab-gift-recipient="phoneNo"]').fill('01700000002');
    await page.locator('[data-ab-gift-recipient="address"]').fill('House 1, Mirpur, Dhaka');
    assert.equal(await page.locator('[data-ab-gift-location],[data-ab-gift-recipient="alternativePhoneNo"],[data-ab-gift-recipient="country"],[data-ab-gift-field="occasion"],[data-ab-gift-field="occasionDate"]').count(),0,'Removed fields do not appear');
    await page.locator('[data-ab-gift-wrap]:visible').check();
    assert.ok((await page.locator('[data-ab-gift-wrap]:visible').evaluate(input=>getComputedStyle(input).backgroundImage)).includes('svg'),'Selected checkbox has a tick mark');
    await page.locator('.summery-list .ab-gift-fee').first().waitFor({ state:'attached' });
    assert.equal(await page.locator('.summery-list .ab-gift-fee').count(), 2, 'Mobile and desktop summaries include wrapping');
    await page.waitForFunction(() => [...document.querySelectorAll('.summery-list')].every(node=>node.textContent.includes('270')));
    for (const selected of [false,true,false,true]) {
      await page.locator('[data-ab-gift-wrap]:visible').setChecked(selected);
      await page.waitForFunction(amount => [...document.querySelectorAll('.ab-gift-roko-summary [data-ab-gift-sum="total"]')].every(node=>node.textContent.includes(amount)), selected ? '270' : '240');
      assert.equal(await page.locator('.summery-list .ab-gift-fee').count(), selected ? 2 : 0, 'Wrapping is added once and fully removed');
      assert.equal(await page.locator('.ab-gift-roko-summary:visible [data-ab-gift-wrap-row]').isVisible(),selected,'Separate wrapping-charge row follows selection');
      if(selected)assert.equal(await page.locator('.ab-gift-roko-summary:visible [data-ab-gift-sum="wrap"]').innerText(),'৳30');
    }
    await page.reload();
    await page.locator('#ab-gift-recipient').waitFor();
    assert.equal(await page.locator('[data-ab-gift-recipient="name"]').inputValue(), 'Gift Recipient', 'Recipient survives reload');
    assert.equal(await page.locator('[data-ab-gift-wrap]:visible').isChecked(), true, 'Wrapping survives reload');
    await page.waitForFunction(() => { const nodes=[...document.querySelectorAll('.ab-gift-roko-summary [data-ab-gift-sum="total"]')]; return nodes.length===4&&nodes.every(n=>n.textContent.includes('270')); });
    const totals = await page.locator('.ab-gift-roko-summary').allTextContents();
    assert.ok(totals.every(text=>text.includes('270')), '180 books + 60 delivery + 30 wrap');
    await page.locator('[data-ab-gift-recipient="address"]').fill('House 1, Feni');
    await page.waitForFunction(() => { const nodes=[...document.querySelectorAll('.ab-gift-roko-summary')]; return nodes.length===2&&nodes.every(node=>node.textContent.includes('310')); });
    assert.ok((await page.locator('.ab-gift-roko-summary').allTextContents()).every(text=>text.includes('310')), 'Changing delivery area retains wrap fee');
    await page.locator('[data-ab-gift-recipient="address"]').fill('House 1, Mirpur, Dhaka');
    await page.waitForFunction(()=>document.querySelector('.ab-gift-roko-summary [data-ab-gift-sum="total"]').textContent==='৳270');
    fs.mkdirSync(path.join(root, 'tmp/gift-checkout'), { recursive:true });
    for (const width of [320,375,414,768,1440]) {
      await page.setViewportSize({ width, height:1100 });
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
      assert.equal(await page.getByRole('heading',{name:'Payment Method',exact:true}).filter({visible:true}).count(),1,'One payment heading; recipient delivery choices stay hidden');
      await page.evaluate(() => scrollTo(0,0));
      if (width === 375 || width === 1440) await page.screenshot({ path:path.join(root, `tmp/gift-checkout/checkout-${width}.png`), fullPage:true });
    }
    await page.setViewportSize({ width:375, height:900 });
    assert.equal(await page.locator('.ab-gift-summary-action:visible button').innerText(),'অর্ডার করুন');
    assert.equal(await page.locator('.ab-gift-roko-summary:visible').evaluate(section=>section.nextElementSibling.classList.contains('ab-gift-summary-action')),true,'Order button is directly underneath the summary');
    await page.locator('.ab-gift-summary-action:visible [data-ab-gift-confirm]').evaluate(button=>{button.click();button.click();});
    await page.waitForURL('**/fixture-gateway');
    assert.equal(orderRequestCount,1,'A double click creates one gift order');
    assert.equal(orderBody.isGiftOrder, true);
    assert.equal(orderBody.giftWrap, true);
    assert.equal(orderBody.gift.senderName, 'Gift Sender');
    assert.equal(orderBody.gift.recipientAlternativePhone, undefined);
    assert.equal(orderBody.gift.occasionDate, undefined);
    assert.equal(orderBody.gift.occasion, undefined);
    assert.equal(orderBody.deliveryLocation, undefined, 'API detects district from the recipient address');
    assert.equal(orderBody.name, 'Gift Recipient');
    assert.equal(orderBody.paymentType, 'online_payment');
    assert.equal(orderBody.grandTotal, 270);
    assert.equal(gatewayBody.total_amount, orderBody.grandTotal);
    console.log('Order / gateway total:', orderBody.grandTotal, gatewayBody.total_amount);
    await page.goto(ORIGIN + '/checkout');
    await page.locator('.payment-method-area').waitFor();
    assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(), true, 'Ordinary checkout retains COD');
    assert.equal(await page.locator('input[value="cash_on_delivery"]').isChecked(), true, 'Ordinary checkout retains its default COD selection');
    assert.equal(await page.locator('#ab-gift-sender').count(), 0);
    assert.equal(await page.locator('[data-ab-gift-wrap]').count(),0,'Wrapping is unavailable in ordinary checkout');
    await page.waitForFunction(()=>{const rows=[...document.querySelectorAll('.summery-list')];return rows.length===2&&rows.every(row=>row.textContent.includes('240'));});
    assert.equal(await page.locator('.ab-gift-fee').count(), 0,'Saved gift wrapping adds no charge in ordinary checkout');
    await page.goto(ORIGIN + '/cart');
    await page.locator('.ab-gift-cart-buttons').waitFor({state:'attached'});
    assert.equal(await page.locator('#ab-gift-cart').count(), 0, 'No unwanted cart card');
    assert.equal(await page.locator('[data-ab-gift-wrap]').count(), 0, 'Gift wrap is checkout-only');
    await page.waitForFunction(() => document.querySelector('#ab-cart-sticky-checkout [data-ab-cart-sticky-checkout]')?.textContent==='অর্ডার করতে এগিয়ে যান');
    for (const width of [320,375,414,768,1024,1113,1440]) {
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Cart fits ${width}`);
      if(width>=768){
        await checkDesktopCart(page,width);
      }

    }
    await page.setViewportSize({width:1113,height:1035});
    await page.locator('app-cart-information .cart-card:not(.ab-cart-gift-row) [data-ab-cart-op="plus"]').first().click();
    await page.waitForFunction(()=>document.querySelector('#ab-cart-summary-inline').textContent.includes('360'));
    await page.locator('app-cart-information .cart-card:not(.ab-cart-gift-row) [data-ab-cart-op="minus"]').first().click();
    await page.waitForFunction(()=>document.querySelector('#ab-cart-summary-inline').textContent.includes('180'));
    await page.locator('app-cart-information .ab-gift-cart-buttons button.order').click();
    await page.waitForURL(ORIGIN + '/checkout');
    assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(),true,'Desktop regular action keeps COD checkout');
    await page.goto(ORIGIN + '/cart');
    await page.locator('app-cart-information .ab-gift-cart-buttons [data-ab-gift-start]').click();
    await page.waitForURL('**/checkout?gift=1');
    await page.locator('#ab-gift-sender').waitFor();
    assert.equal(await page.locator('input[value="cash_on_delivery"]').isVisible(),false,'Desktop gift action opens online-only checkout');
    await page.goto(ORIGIN + '/cart');
    await page.setViewportSize({width:375,height:900});
    await page.screenshot({ path:path.join(root,'tmp/gift-checkout/cart-375.png'), fullPage:true });
    await page.locator('#ab-cart-sticky-checkout [data-ab-gift-start]').click();
    await page.waitForURL('**/checkout?gift=1');
    await page.locator('#ab-gift-sender').waitFor();
    assert.equal(await page.locator('[data-ab-gift-wrap]:visible').isChecked(), true, 'Gift wrapping choice is retained only for gift checkout');
    assert.match(await page.locator('.ab-gift-wrap:visible').innerText(),/গিফট কভারে মুড়িয়ে দিন[\s\S]*৳৩০[\s\S]*কভারে মুড়িয়ে প্রাপকের কাছে/,'The wrap option explains the physical gift cover and fee');
    assert.equal(await page.locator('[data-ab-gift-recipient="name"]').inputValue(), 'Gift Recipient', 'Recipient draft survives navigation');
    assert.equal(await page.locator('[data-ab-gift-field="senderName"]').inputValue(), 'Gift Sender', 'Draft survives payment retry');
    await page.goto(ORIGIN + '/checkout/order-success/000000000000000000000020?payment=paid');
    await page.locator('.ab-order-summary').waitFor();
    await page.locator('.ab-eps-paid[data-state="paid"]').waitFor();
    assert.ok((await page.locator('.ab-order-summary').innerText()).includes('গিফট র‍্যাপ'));
    assert.equal(await page.locator('.ab-os-total strong').innerText(),'৳২৭০');
    assert.equal(await page.locator('.ab-os-pay').count(),0,'Paid gift has no pay-on-delivery instruction');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('amol_gift_checkout_v1')),null,'Success clears the gift draft');
    await page.screenshot({path:path.join(root,'tmp/gift-checkout/thank-you-375.png'),fullPage:true});
    assert.deepEqual(errors, [], 'No JavaScript errors during the complete gift flow');
    console.log('Gift browser checks passed: real Angular lazy checkout, gift/COD states, wrapping, payment handoff, cart entry and responsive layouts.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); if (errors.length) console.error(errors); process.exitCode = 1; });
