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
  let call;const ctx={isLocalPreviewHost:()=>host==='localhost',location:{hostname:host},window:{location:{origin:'https://'+host}},CATALOG_API_BASE:'https://api.example',fetchJson:(...args)=>{call=args;return Promise.resolve({success:true,data:[]});}};
  vm.createContext(ctx);vm.runInContext(helper('categoryLibraryProducts'),ctx);await ctx.categoryLibraryProducts();
  assert.equal(call[0],host==='legacy.example'?'/product/get-all':'/library');
 }
 let response=null,active=null;
 const classes=new Set();const native={parentNode:{insertBefore(node){active=node;}},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)}};
 const retry={onclick:null};const shelves={innerHTML:'',textContent:'',querySelector:()=>retry};
 const publisher={innerHTML:''};
 const library={setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},querySelector(s){if(s==='.ab-library-shelves')return shelves;if(s==='.ab-publisher-products')return publisher;if(s==='.ab-library-shelves .ab-library-grid')return shelves.innerHTML.includes('ab-library-grid')?{}:null;return null;}};
 const ctx={CATEGORY_LIBRARY_ID:'ab-category-library',currentSlug:'book',currentProduct:null,categoryLibraryVersion:0,categoryLibrarySeen:{},document:{querySelector:s=>s.endsWith('app-best-selling-book')?native:null,getElementById:()=>active,createElement:()=>library},removeCategoryLibrary(){active=null;ctx.categoryLibraryVersion++;},categoryLibraryProducts:async()=>response,publisherProducts:async()=>[],publisherShelfHtml:()=>'',categoryShelvesHtml:books=>books.length?'<div class="ab-library-grid">Real books</div>':'',fallbackLibraryHtml:()=>''};
 vm.createContext(ctx);vm.runInContext(helper('mountCategoryLibrary'),ctx);
 ctx.mountCategoryLibrary({slug:'book'});await new Promise(setImmediate);
 assert.match(shelves.innerHTML,/লোড করা যায়নি/);
 assert.equal(classes.has('ab-category-library-source'),false,'Network failure retains native recommendations');
 assert.equal(typeof retry.onclick,'function');
 response={success:true,data:[{slug:'other'}]};retry.onclick();await new Promise(setImmediate);
 assert.match(shelves.innerHTML,/Real books/);assert.equal(classes.has('ab-category-library-source'),true);
 shelves.innerHTML='<button>Retry</button>';ctx.mountCategoryLibrary({slug:'book'});
 assert.equal(classes.has('ab-category-library-source'),false,'Repeated mounts preserve fallback while failed');
 console.log('Category library host routing, failed requests, retry and native fallback checks pass');
})().catch(error=>{console.error(error);process.exitCode=1;});
