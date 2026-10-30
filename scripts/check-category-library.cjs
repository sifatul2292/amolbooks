const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('../api/node_modules/typescript');
const result={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../api/src/storefront-product-sections-script.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,result);
const source=result.exports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
function helper(name){const start=source.indexOf('  function '+name+'(');return source.slice(start,source.indexOf('\n  function ',start+1));}
(async()=>{
 for(const host of ['localhost','amolbooks.com','www.amolbooks.com','legacy.example']){
  let call;const ctx={isLocalPreviewHost:()=>host==='localhost',location:{hostname:host},window:{location:{origin:'https://'+host}},CATALOG_API_BASE:'https://api.example',fetchJsonWithRetry:(...args)=>{call=args;return Promise.resolve({success:true,data:[]});}};
  vm.createContext(ctx);vm.runInContext(helper('categoryLibraryProducts'),ctx);await ctx.categoryLibraryProducts();
  assert.equal(call[0],host==='legacy.example'?'/product/get-all':'/library');
 }
 let response=null,active=null;
 const classes=new Set();const native={parentNode:{insertBefore(node){active=node;}},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)}};
 const retry={onclick:null};const shelves={innerHTML:'',textContent:'',querySelector:()=>retry};
 const publisher={innerHTML:''};
 const library={setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},querySelector(s){if(s==='.ab-library-shelves')return shelves;if(s==='.ab-publisher-products')return publisher;if(s==='.ab-library-shelves .ab-library-grid')return shelves.innerHTML.includes('ab-library-grid')?{}:null;return null;}};
 const ctx={CATEGORY_LIBRARY_ID:'ab-category-library',currentSlug:'book',currentProduct:null,categoryLibraryVersion:0,categoryLibrarySeen:{},document:{querySelector:s=>s.endsWith('app-best-selling-book')?native:null,getElementById:()=>active,createElement:()=>library},removeCategoryLibrary(){active=null;ctx.categoryLibraryVersion++;},categoryLibraryProducts:async()=>response,publisherProducts:async()=>[],publisherShelfHtml:()=>'',recentShelfProducts:()=>[],recentShelfHtml:()=>'',categoryShelvesHtml:books=>books.length?'<div class="ab-library-grid">Real books</div>':'',fallbackLibraryHtml:()=>''};
 vm.createContext(ctx);vm.runInContext(helper('mountCategoryLibrary'),ctx);
 ctx.mountCategoryLibrary({slug:'book'});await new Promise(setImmediate);
 assert.match(shelves.innerHTML,/লোড করা যায়নি/);
 assert.equal(classes.has('ab-category-library-source'),false,'Network failure retains native recommendations');
 assert.equal(typeof retry.onclick,'function');
 response={success:true,data:[{slug:'other'}]};retry.onclick();await new Promise(setImmediate);
 assert.match(shelves.innerHTML,/Real books/);assert.equal(classes.has('ab-category-library-source'),true);
 shelves.innerHTML='<button>Retry</button>';ctx.mountCategoryLibrary({slug:'book'});
 assert.equal(classes.has('ab-category-library-source'),false,'Repeated mounts preserve fallback while failed');
 // A failed shelf request (the live nginx answers page-load bursts with 404) retries before giving up.
 {
  let attempts=0;const replies=[null,null,{success:true,data:[1]}];
  const rctx={SHELF_RETRY_DELAYS_MS:[1,1,1],window:{setTimeout:fn=>setImmediate(fn)},fetchJson:async()=>{attempts++;return replies.shift();}};
  vm.createContext(rctx);vm.runInContext(helper('fetchJsonWithRetry'),rctx);
  assert.deepEqual(await rctx.fetchJsonWithRetry('/x'),{success:true,data:[1]});assert.equal(attempts,3);
  attempts=0;rctx.fetchJson=async()=>{attempts++;return null;};
  assert.equal(await rctx.fetchJsonWithRetry('/x'),null);assert.equal(attempts,4,'gives up after three retries');
 }
 // Publisher shelf comes from the library (whole in-stock catalogue, same order) without its own request.
 {
  let requested=0;const pctx={CATALOG_API_BASE:'https://api.example',fetchJsonWithRetry:async()=>{requested++;return {data:[{_id:'r1',slug:'r1',publisher:{_id:'p1'}}]};}};
  vm.createContext(pctx);vm.runInContext(helper('publisherIdOf')+helper('publisherProducts'),pctx);
  const current={_id:'c',slug:'c',publisher:[{_id:'p1'}]};
  const library={count:4,data:[{_id:'a',slug:'a',publisher:{_id:'p1'}},{_id:'c',slug:'c',publisher:{_id:'p1'}},{_id:'b',slug:'b',publisher:{_id:'p2'}},{_id:'d',slug:'d',publisher:[{_id:'p1'}]}]};
  assert.deepEqual((await pctx.publisherProducts(current,library)).map(p=>p._id),['a','d']);assert.equal(requested,0);
  assert.deepEqual((await pctx.publisherProducts(current,Object.assign({},library,{count:500}))).map(p=>p._id),['r1'],'partial library falls back to the publisher request');
  assert.deepEqual((await pctx.publisherProducts(current,null)).map(p=>p._id),['r1']);assert.equal(requested,2);
 }
 // Recently viewed: the app's stored products, newest first, without the current book, with library prices.
 {
  const store={recentViewedProducts:JSON.stringify([{_id:'c',slug:'c'},{_id:'a',slug:'a',salePrice:100},{_id:'x',slug:'x'},{_id:'a',slug:'a'}])};
  const lctx={nativeRecentlyViewedStorageKey:'recentViewedProducts',recentlyViewedStorageKey:'ab-recently-viewed-products',localStorage:{getItem:k=>store[k]||null}};
  vm.createContext(lctx);vm.runInContext(helper('recentShelfProducts'),lctx);
  const library={data:[{_id:'a',slug:'a',salePrice:90},{_id:'b',slug:'b'}]};
  const list=lctx.recentShelfProducts({_id:'c',slug:'c'},library);
  assert.deepEqual(Array.from(list,p=>p._id),['a','x']);assert.equal(list[0].salePrice,90,'library price wins over the stored copy');
  delete store.recentViewedProducts;store['ab-recently-viewed-products']=JSON.stringify(['b','missing','c']);
  assert.deepEqual(Array.from(lctx.recentShelfProducts({_id:'c',slug:'c'},library),p=>p._id),['b'],'falls back to saved IDs found in the library');
 }
 console.log('Category library host routing, failed requests, retry, publisher-from-library, recently viewed and native fallback checks pass');
})().catch(error=>{console.error(error);process.exitCode=1;});
