// Run with Node 20+ and Playwright on NODE_PATH; no database or external requests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {once}=require('node:events');
const {chromium}=require('playwright');
const {fixture,start}=require('./dev-gift-order-panel.cjs');
(async()=>{
 process.env.PORT='0';
 const order=await fixture();
 assert.equal(order.grandTotal,405);assert.equal(order.giftWrapCharge,30);
 const server=await start();if(!server.listening)await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/upload/static/custom-orders.html');
  await page.locator('#productsModal.open #ab-admin-gift-detail').waitFor();
  assert.equal(await page.locator('.ab-admin-gift-badge').innerText(),'Gift Order');
  assert.equal(await page.locator('#modalCustomerName').innerText(),'Demo Gift Recipient');
  const details=await page.locator('#ab-admin-gift-detail').innerText();
  for(const text of ['Demo Gift Sender','01700000001','শুভ জন্মদিন','Wrap in a gift cover · ৳30'])assert.ok(details.includes(text),text);
  assert.equal(await page.locator('#ab-admin-gift-wrap span').innerText(),'৳30');
  assert.equal(await page.locator('#ab-admin-gift-discount span').innerText(),'−৳185');
  assert.equal(await page.locator('#modalGrandTotal').innerText(),'৳405');
  assert.equal(await page.locator('#modalPaymentType').innerText(),'Online Payment (EPS)');
  const folder=path.join(__dirname,'../tmp/gift-checkout');fs.mkdirSync(folder,{recursive:true});
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(folder,'order-panel-1440.png')});
  await page.setViewportSize({width:481,height:900});
  await page.screenshot({path:path.join(folder,'order-panel-481.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile panel fits');
  const update=await context.request.put(origin+'/api/order/update/'+order._id,{data:{giftWrap:false}});assert.equal(update.status(),405);
  await page.evaluate(order=>{
   window.AmolGiftOrderAdmin.render({...order,gift:{senderName:'<img src=x onerror=alert(1)>'}});
  },order);
  assert.equal(await page.locator('#ab-admin-gift-detail img').count(),0,'Gift text is never interpreted as HTML');
  await page.evaluate(()=>window.AmolGiftOrderAdmin.render({isGiftOrder:false,subTotal:315,deliveryCharge:60,grandTotal:375}));
  assert.equal(await page.locator('#ab-admin-gift-detail,#ab-admin-gift-wrap,#ab-admin-gift-discount').count(),0,'Regular order clears gift details and fee');
  assert.deepEqual(errors,[]);
  console.log('Gift panel checks passed: actual order calculator/schema, projected fields, badge, sender/recipient/message, separate wrapping fee, discount/total, mobile layout and read-only demo.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
