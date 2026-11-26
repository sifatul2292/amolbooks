// Real Angular shell/cart, local API fixtures; no orders, payments or external writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const ts=require('../api/node_modules/typescript');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'ui/dist/angular-ui/browser');
const config=JSON.parse(fs.readFileSync(path.join(root,'gtm-snippets/assets/abdullah-jahangir-books.v1.json')));
const origin='https://collection.amolbooks.test',url=origin+'/product-list?collection=abdullah-jahangir';
const ids=['6af586ca7c9ee7a9c7e699f9','6af586ca7c9ee7a9c7e69a02','6af586ca7c9ee7a9c7e69a05','6af586ca7c9ee7a9c7e69a0b','6af586ca7c9ee7a9c7e69a2c','6af586ca7c9ee7a9c7e69a29'];
const prices=[[550,209],[540,162],[360,136],[550,165],[540,205],[480,139]];
const weights=[820,780,740,850,820,670];
const shipping={deliveryInDhaka:60,deliveryOutsideDhaka:75,insideDhakaRules:[{fromGram:0,toGram:1000,cost:60},{fromGram:1001,toGram:2000,cost:80},{fromGram:2001,toGram:3000,cost:100},{fromGram:3001,toGram:4000,cost:120},{fromGram:4001,toGram:5000,cost:140}],outsideDhakaRules:[{fromGram:0,toGram:1000,cost:75},{fromGram:1001,toGram:2000,cost:95},{fromGram:2001,toGram:3000,cost:115},{fromGram:3001,toGram:4000,cost:135},{fromGram:4001,toGram:5000,cost:155}]};
const books=config.books.map((b,i)=>({...b,weight:weights[i],_id:ids[i],salePrice:prices[i][0],discountType:2,discountAmount:prices[i][1],quantity:20,trackQuantity:true,status:'publish',author:[{name:config.author}],totalPages:720,currentVersion:'হার্ডকভার',publisher:{name:'আস-সুন্নাহ পাবলিকেশন্স'},pdfFile:origin+'/fixture-sample/'+b.slug+'.pdf',images:['/fixture-cover/'+b.slug+'.svg']}));
const other={_id:'000000000000000000000001',slug:'other-book',name:'Existing book',salePrice:100,discountAmount:0,quantity:20,status:'publish',images:[]};
function runtime(file,key){const ctx={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'api/src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);return ctx.exports[key];}
const source=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const snippets=['abdullah-jahangir-books.html','gift-checkout.html','package-free-delivery.html','cart-page-navigation.html'].map(f=>fs.readFileSync(path.join(root,'gtm-snippets',f),'utf8')).join('\n');
const tags=[...source.matchAll(/<script src="((?:runtime|polyfills|main)\.[^"]+)"[^>]*><\/script>/g)].map(m=>m[0]).join('');
const stylesheet=source.match(/<link rel="stylesheet" href="styles[^"]+">/)[0];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/">'+stylesheet+snippets+'</head><body><app-root></app-root>'+tags+'<script>'+runtime('storefront-product-sections-script.ts','STOREFRONT_PRODUCT_SECTIONS_SCRIPT')+'</script><script>'+runtime('storefront-special-package-script.ts','STOREFRONT_SPECIAL_PACKAGE_SCRIPT')+'</script><script>'+runtime('storefront-price-script.ts','STOREFRONT_PRICE_SCRIPT')+'</script></body></html>';
function samplePdf(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Contents 4 0 R /Resources << >> >>','<< /Length 0 >>\nstream\n\nendstream'];
 let body='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}const start=Buffer.byteLength(body);body+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';return Buffer.from(body);
}
async function setup(browser,options={}){
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),errors=[],posts=[];
 let account=(options.existing||[]).map(item=>({_id:'cart-'+item.product,product:books.find(b=>b._id===item.product)||other,selectedQty:item.selectedQty,cartType:0,collectionSource:item.collectionSource}));
 const state={failLoad:!!options.failLoad,failAddAt:options.failAddAt||0,failDelete:!!options.failDelete,attempts:0,stock:options.stock||{}};
 await context.addInitScript(({existing,auth})=>{if(!localStorage.getItem('Amolbooks_USER_CART_1'))localStorage.setItem('Amolbooks_USER_CART_1',JSON.stringify(existing));if(auth)window.__abCartAuthorization='Bearer fixture';},{existing:options.auth?[]:options.existing||[],auth:!!options.auth});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=decodeURIComponent(u.pathname);
  if(p==='/api/storefront-assets/delivery-zone-core.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'gtm-snippets/delivery-zone-core.js'),'utf8')});
  if(p==='/api/storefront-assets/abdullah-jahangir-books.v1.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(config)});
  if(p.startsWith('/api/')){
   let data=[];
   if(p.includes('/product/get-by-slug/')){
    const slug=p.split('/').pop(),book=books.find(b=>b.slug===slug);
    if(state.failLoad&&slug===books[0].slug)return route.fulfill({status:503,body:'unavailable'});
    data=book?{...book,weight:options.missingWeight&&slug===books[0].slug?null:book.weight,quantity:state.stock[slug]===undefined?20:state.stock[slug]}:other;
   }else if(p.includes('/product/get-products-by-ids')||p.includes('/product/get-all'))data=[...books,other];
   else if(p==='/api/cart/get-local-cart-items')data=req.postDataJSON().map(item=>({...item,product:books.find(book=>book._id===item.product)||other}));
   else if(p==='/api/cart/get-carts-by-user')data=account;
   else if(p==='/api/cart/add-to-cart'){
    state.attempts++;const body=req.postDataJSON();posts.push(body);
    if(state.attempts===state.failAddAt)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});
    const book=books.find(b=>b._id===body.product);assert.ok(book,'Only the selected catalogue books are added');
    const existing=account.find(row=>row.product._id===body.product);if(existing)existing.selectedQty++;else account.push({_id:'cart-'+book._id,product:book,selectedQty:1,cartType:0,collectionSource:body.collectionSource});data={};
   }else if(p.startsWith('/api/cart/delete/')){
    if(state.failDelete)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});
    account=account.filter(row=>row._id!==p.split('/').pop());data={};
   }else if(p.startsWith('/api/cart/update/')){
    const row=account.find(item=>item._id===p.split('/').pop());assert.ok(row);row.collectionSource=req.postDataJSON().collectionSource;data={};
   }else if(p.includes('/setting'))data={incompleteOrder:{isEnableIncompleteOrder:false}};
   else if(p.includes('/shipping-charge')){if(options.failShipping)return route.fulfill({status:503,body:'unavailable'});data=shipping;}
   else if(p.includes('/order-offer'))data={giftEnabled:true,giftMinAmount:799,giftProduct:{_id:'000000000000000000000090',slug:'fixture-notebook',name:'Amol Notebook',image:'/fixture-cover/notebook.svg'},discountType:0,discountAmount:0};
   else if(p.includes('/shop-information'))data={siteName:'Amol Books',phones:[],emails:[],addresses:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data,count:Array.isArray(data)?data.length:1})});
  }
  if(u.origin===origin||options.local&&u.origin==='http://localhost:3002'){
   if(/^\/(?:product-list|cart|checkout|product-details\/[^/]+)$/.test(p))return route.fulfill({contentType:'text/html',body:html});
   if(p.startsWith('/fixture-sample/'))return route.fulfill({contentType:'application/pdf',body:samplePdf()});
   if(p.startsWith('/fixture-cover/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="126" height="176"><rect width="126" height="176" fill="#175c36"/></svg>'});
   const file=path.join(assets,p);if(file.startsWith(assets+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
  }
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(options.local?'http://localhost:3002/product-list?collection=abdullah-jahangir':url);
 return {page,context,errors,posts,state,account:()=>account};
}
async function ready(page){await page.locator('.aj-book').last().waitFor();assert.equal(await page.locator('.aj-book').count(),6);}
async function select(page,indices){for(const input of await page.locator('[data-aj-select]').all())if(await input.isChecked())await input.uncheck();for(const i of indices)await page.locator('[data-aj-select="'+books[i].slug+'"]').check();}
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  let t=await setup(browser,{existing:[{product:other._id,selectedQty:2},{product:ids[0],selectedQty:2}]});await ready(t.page);
  assert.equal(await t.page.locator('app-header').count(),1);assert.equal(await t.page.locator('app-footer').count(),1);
  assert.equal(await t.page.locator('.aj-hero-price,[data-aj-full-delivery]').count(),0,'Hero price and delivery blocks are removed');
  assert.equal(await t.page.locator('#aj-choose .aj-heading h2').innerText(),'আপনার পছন্দ অনুযায়ী বেছে নিন');
  await t.page.waitForFunction(()=>document.querySelector('[data-aj-selected-delivery]').textContent.includes('৳১৪০'));
  assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/৪.৬৮ কেজি.*৫ কেজির/);
  assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/৳১৪০.*৳১৫৫/);
  assert.equal(await t.page.locator('.aj-review').count(),6);
  assert.equal(await t.page.locator('.aj-review-book img').count(),6);
  assert.equal(await t.page.locator('#aj-reviews-title').innerText(),'পাঠকরা কী বলছেন');
  assert.equal(await t.page.locator('.aj-review a').count(),0);
  assert.doesNotMatch(await t.page.locator('.aj-reviews').innerText(),/Wafilife|Rokomari|ওয়াফিলাইফ|রকমারি|উৎসের বইয়ের রেটিং|তথ্য দেখা|উৎসে রিভিউ/);
  assert.deepEqual(await t.page.locator('.aj-review-name').allTextContents(),config.books.map(b=>b.review.author));
  for(const b of config.books){assert.ok(b.review.excerpt.split(/\s+/).length<=25);assert.ok(/^https:\/\/www\.(wafilife|rokomari)\.com\//.test(b.review.url));}

  assert.equal(await t.page.locator('.aj-author-details').evaluate(el=>el.open),false,'Long bio is collapsed');
  assert.equal(await t.page.locator('.aj-preview').count(),6);
  assert.equal(await t.page.locator('.aj-book-meta').count(),6);
  for(let i=0;i<6;i++){await t.page.locator('.aj-preview').nth(i).click();await t.page.locator('#ab-pdf-dialog .ab-pdf-page canvas').first().waitFor();assert.ok((await t.page.locator('.ab-pdf-dialog-title').innerText()).includes(books[i].name));await t.page.locator('.ab-pdf-dialog-close').click();await t.page.locator('#ab-pdf-dialog.is-open').waitFor({state:'hidden'});assert.equal(await t.page.locator('.aj-preview').nth(i).evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');}
  assert.equal(await t.page.locator('[data-aj-select]:checked').count(),6);assert.equal(await t.page.locator('.aj-receipt [data-aj-total]').innerText(),'৳২,০০৪');
  await select(t.page,[]);assert.equal(await t.page.locator('.aj-receipt [data-aj-buy]').isEnabled(),false);
  await select(t.page,[0,5]);assert.equal(await t.page.locator('.aj-receipt [data-aj-total]').innerText(),'৳৬৮২');
  assert.equal(await t.page.locator('[data-aj-select-all]').evaluate(el=>el.indeterminate),true);
  assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/১.৪৯ কেজি/);
  assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/৳৮০.*৳৯৫/);
  await t.page.reload();await ready(t.page);assert.equal(await t.page.locator('[data-aj-select]:checked').count(),2,'Choice survives details/reload');
  assert.equal(await t.page.locator('app-product-list > :not(#ab-jahangir-books):visible').count(),0,'Only the six-book landing content is visible');
  await t.page.locator('[data-aj-custom]').click();assert.equal(await t.page.locator('[data-aj-select]:checked').count(),2,'Custom choice does not reset selected books');
  await t.page.locator('[data-aj-select-all]').check();assert.equal(await t.page.locator('[data-aj-select]:checked').count(),6);
  for(const width of [320,375,414,768,1024,1440]){
   await t.page.setViewportSize({width,height:1050});await t.page.waitForTimeout(100);
   assert.equal(await t.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No overflow at '+width);
   assert.equal(await t.page.locator('.aj-book').count(),6);
   assert.equal(await t.page.locator('.aj-receipt [data-aj-add]').isVisible(),true);
   assert.equal(await t.page.locator('.aj-receipt [data-aj-buy]').isVisible(),true);
   if(width<768){assert.equal(await t.page.locator('.aj-content').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))<=32,true,'No oversized gap below the receipt');}
   if(width===375){assert.ok(await t.page.locator('.aj-covers img').first().evaluate(el=>el.getBoundingClientRect().width)>92,'Larger mobile hero covers');await t.page.locator('.aj-preview').first().click();await t.page.locator('#ab-pdf-dialog .ab-pdf-page canvas').first().waitFor();assert.equal(await t.page.evaluate(()=>Number(getComputedStyle(document.querySelector('#ab-pdf-dialog')).zIndex)>Number(getComputedStyle(document.querySelector('.aj-mobile-buy')).zIndex)),true,'Reader covers the mobile purchase bar');await t.page.locator('.ab-pdf-dialog-close').click();}
  }
  await t.page.evaluate(()=>{window.ajRoot=document.querySelector('#ab-jahangir-books');window.ajGrid=document.querySelector('.aj-grid');});
  for(let y=0;y<2400;y+=350){await t.page.evaluate(y=>window.scrollTo(0,y),y);await t.page.waitForTimeout(60);assert.equal(await t.page.evaluate(()=>window.ajRoot===document.querySelector('#ab-jahangir-books')&&window.ajGrid===document.querySelector('.aj-grid')),true,'Scrolling retains the mounted book cards');}
  await t.page.setViewportSize({width:1440,height:1050});await select(t.page,[0,5]);
  await t.page.locator('.aj-receipt [data-aj-add]').click();await t.page.waitForFunction(()=>document.querySelector('.aj-status').textContent.includes('যোগ হয়েছে'));assert.equal(t.page.url(),url);
  const decorated=await t.page.evaluate(()=>window.AmolBookSelection.decorateOrder({cartData:JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')).map(row=>({product:row.product,selectedQty:row.selectedQty}))}));assert.equal(decorated.cartData.find(row=>row.product===ids[5])?.collectionSource,'abdullah-jahangir');
  await t.page.locator('.aj-receipt [data-aj-buy]').evaluate(button=>{button.click();button.click();});await t.page.waitForURL(origin+'/checkout');
  const stored=await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')));
  assert.equal(stored.length,3);assert.equal(stored.find(b=>b.product===ids[5]).collectionSource,'abdullah-jahangir');assert.equal(stored.find(b=>b.product===other._id).collectionSource,undefined);assert.equal(stored.find(b=>b.product===ids[0]).selectedQty,2,'Existing selected book is not duplicated');assert.equal(stored.find(b=>b.product===other._id).selectedQty,2,'Unrelated cart items are retained');assert.equal(stored.find(b=>b.product===ids[5]).selectedQty,1);await t.page.locator('#ab-collection-delivery').waitFor();assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/ওজনের তথ্য সম্পূর্ণ পাওয়া যায়নি/,'Unknown unrelated weights are not estimated');assert.deepEqual(t.errors,[]);await t.context.close();
  t=await setup(browser);await ready(t.page);await select(t.page,[0]);await t.page.locator('[data-aj-full-buy]').click();await t.page.waitForURL(origin+'/checkout');
  await t.page.locator('#ab-collection-delivery').waitFor();assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/৪.৬৮ কেজি/);assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/৳১৪০/);

  await t.page.getByText('ঢাকা সিটির বাইরে ১৫৫ টাকা',{exact:true}).click();
  await t.page.waitForFunction(()=>document.querySelector('#ab-collection-delivery').textContent.includes('৳৭৫'));
  assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/৳১৫৫/);
  for(const width of [375,1440]){await t.page.setViewportSize({width,height:900});await t.page.waitForTimeout(150);assert.equal(await t.page.locator('#ab-collection-delivery').count(),1);assert.equal(await t.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Checkout weight note fits '+width);}
  assert.equal(await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')).length),6,'All six added together');await t.page.goto(origin+'/cart');await t.page.locator('app-cart-information .cart-card').first().waitFor();assert.equal(await t.page.locator('#ab-collection-delivery').count(),0,'Weight note is removed outside checkout');assert.equal(await t.page.locator('.ab-cart-gift-row').count(),0,'Collection cart has no free notebook');assert.equal(await t.page.locator('#ab-cart-offer-progress').count(),0,'Collection cart has no notebook progress offer');await t.context.close();
  t=await setup(browser);await ready(t.page);await t.page.setViewportSize({width:375,height:900});await select(t.page,[2]);await t.page.locator('.aj-mobile-buy [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');
  const single=await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')));assert.equal(single.length,1);assert.equal(single[0].product,ids[2]);await t.context.close();
  t=await setup(browser);await ready(t.page);t.state.stock[books[0].slug]=0;await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForFunction(()=>document.querySelector('.aj-status').textContent.includes('স্টক পরিবর্তন'));assert.equal(t.page.url(),url);assert.equal(await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')).length),0,'Stock is rechecked before adding anything');await t.context.close();
  t=await setup(browser,{auth:true,failAddAt:3});await ready(t.page);await t.page.locator('.aj-receipt [data-aj-buy]').click();
  await t.page.waitForFunction(()=>document.querySelector('.aj-status').textContent.includes('আবার চেষ্টা'));
  assert.equal(t.account().length,2,'A partial server failure stays visible and preserves successful adds');assert.equal(t.page.url(),url);
  await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');assert.equal(t.account().length,6);assert.ok(t.account().every(row=>row.selectedQty===1&&row.collectionSource==='abdullah-jahangir'),'Retry never duplicates successful lines');assert.equal(t.posts.length,7);assert.deepEqual(t.errors,[]);await t.context.close();
  t=await setup(browser,{auth:true,existing:[{product:ids[0],selectedQty:2}]});await ready(t.page);await select(t.page,[0]);await t.page.locator('[data-aj-add]').click();await t.page.waitForFunction(()=>document.querySelector('.aj-status').textContent.includes('যোগ হয়েছে'));assert.equal(t.account()[0].selectedQty,2);assert.equal(t.account()[0].collectionSource,'abdullah-jahangir');await t.context.close();

  // A return from checkout replaces this collection's previous selection only.
  for(const auth of [false,true]){
   t=await setup(browser,{auth,existing:[{product:other._id,selectedQty:2}]});await ready(t.page);await select(t.page,[0,1]);await t.page.locator('[data-aj-add]').click();await t.page.waitForFunction(()=>document.querySelector('[data-aj-add]').textContent.includes('✓'));assert.equal(await t.page.locator('.aj-receipt .aj-cart-link').getAttribute('href'),'/cart');
   await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');await t.page.goBack();await ready(t.page);await select(t.page,[2,4]);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');
   const changed=auth?t.account():await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')));
   assert.deepEqual(changed.map(row=>row.product._id||row.product).sort(),[other._id,ids[2],ids[4]].sort(),'Second checkout uses the new selection (auth='+auth+')');assert.equal(changed.find(row=>(row.product._id||row.product)===other._id).selectedQty,2,'Unrelated quantities stay intact');
   // Normal cart edits remain authoritative when returning to the collection.
   if(auth){t.account().splice(t.account().findIndex(row=>row.product._id===ids[2]),1);t.account().find(row=>row.product._id===ids[4]).selectedQty=3;}
   else await t.page.evaluate(({removed,kept})=>{const items=JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')).filter(row=>row.product!==removed);items.find(row=>row.product===kept).selectedQty=3;localStorage.setItem('Amolbooks_USER_CART_1',JSON.stringify(items));},{removed:ids[2],kept:ids[4]});
   await t.page.goBack();await ready(t.page);await t.page.waitForFunction(slug=>!document.querySelector('[data-aj-select="'+slug+'"]').checked,books[2].slug);assert.equal(await t.page.locator('[data-aj-select="'+books[4].slug+'"]').isChecked(),true);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');
   const edited=auth?t.account():await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')));assert.equal(edited.find(row=>(row.product._id||row.product)===ids[4]).selectedQty,3,'Cart-page quantities survive returning through the landing page');assert.ok(!edited.some(row=>(row.product._id||row.product)===ids[2]));await t.context.close();
  }
  // The localhost mirror and actual cart stepper/removal controls stay in sync too.
  t=await setup(browser,{local:true,existing:[{product:other._id,selectedQty:2}]});await ready(t.page);await select(t.page,[0,1]);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL('http://localhost:3002/checkout');await t.page.goBack();await ready(t.page);await select(t.page,[2,4]);await t.page.locator('[data-aj-add]').click();await t.page.waitForFunction(()=>document.querySelector('[data-aj-add]').textContent.includes('✓'));
  await t.page.goto('http://localhost:3002/cart');const removed=t.page.locator('.cart-card[data-product-id="'+ids[2]+'"]');await removed.locator('[data-ab-cart-op="remove"]').click();await removed.waitFor({state:'detached'});
  const kept=t.page.locator('.cart-card[data-product-id="'+ids[4]+'"]');for(const quantity of [2,3]){await kept.locator('[data-ab-cart-op="plus"]').click();await t.page.waitForFunction(({id,quantity})=>document.querySelector('.cart-card[data-product-id="'+id+'"] .quantity input').value===String(quantity),{id:ids[4],quantity});}
  await t.page.goto('http://localhost:3002/product-list?collection=abdullah-jahangir');await ready(t.page);await t.page.waitForFunction(slug=>!document.querySelector('[data-aj-select="'+slug+'"]').checked,books[2].slug);assert.equal(await t.page.locator('[data-aj-select="'+books[4].slug+'"]').isChecked(),true);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL('http://localhost:3002/checkout');
  const localCart=await t.page.evaluate(()=>JSON.parse(localStorage.getItem('Amolbooks_USER_CART_1')));assert.deepEqual(localCart.map(row=>row.product).sort(),[ids[4],other._id].sort());assert.equal(localCart.find(row=>row.product===ids[4]).selectedQty,3);await t.context.close();
  // A failed removal blocks checkout and can be retried without losing the new choice.
  t=await setup(browser,{auth:true,failDelete:true,existing:[{product:ids[0],selectedQty:1,collectionSource:'abdullah-jahangir'}]});await ready(t.page);await select(t.page,[1]);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForFunction(()=>document.querySelector('.aj-status').textContent.includes('আবার চেষ্টা'));assert.equal(t.page.url(),url);t.state.failDelete=false;await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');assert.deepEqual(t.account().map(row=>row.product._id),[ids[1]]);await t.context.close();
  t=await setup(browser,{stock:{[books[0].slug]:0}});await ready(t.page);assert.equal(await t.page.locator('[data-aj-full-buy]').isEnabled(),false);assert.equal(await t.page.locator('[data-aj-select="'+books[0].slug+'"]').isEnabled(),false);assert.equal(await t.page.locator('[data-aj-select]:checked').count(),5);await t.context.close();
  t=await setup(browser,{existing:[{product:ids[0],selectedQty:2}]});await ready(t.page);await select(t.page,[0,5]);await t.page.locator('.aj-receipt [data-aj-buy]').click();await t.page.waitForURL(origin+'/checkout');await t.page.locator('#ab-collection-delivery').waitFor();assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/২.৩১ কেজি/,'Checkout uses actual cart quantities');assert.match(await t.page.locator('#ab-collection-delivery').innerText(),/৳১০০/);await t.context.close();
  t=await setup(browser,{missingWeight:true});await ready(t.page);assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/ওজনের তথ্য সম্পূর্ণ পাওয়া যায়নি/);await t.context.close();
  t=await setup(browser,{failShipping:true});await ready(t.page);assert.equal(await t.page.locator('[data-aj-full-buy]').isEnabled(),true,'Delivery estimate failure does not block purchase');assert.match(await t.page.locator('[data-aj-selected-delivery]').innerText(),/৪.৬৮ কেজি/);await t.context.close();
  t=await setup(browser,{failLoad:true});await t.page.locator('[data-aj-retry]').waitFor();assert.equal(await t.page.locator('[data-aj-buy]').count(),0);t.state.failLoad=false;await t.page.locator('[data-aj-retry]').click();await ready(t.page);
  await t.page.goto(origin+'/product-list');assert.equal(await t.page.locator('#ab-jahangir-books').count(),0,'Ordinary catalogue is untouched');await t.context.close();
  console.log('Six-book collection passed: six catalogue titles, reader quotes/reviewer names without retailer details, simplified hero and revised heading, weight/slab estimates, checkout weight/zone/quantity/fallback, native shell, selection/totals, one/two/all, responsive layouts, all six PDF readers/close controls, both purchase actions/visible confirmation, checkout-back selection replacement, cart edit preservation, guest/auth cart, notebook exclusion, deduplication, failure retry, stock, scroll stability, loading and route cleanup.');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
