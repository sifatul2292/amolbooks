const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../api/node_modules/typescript');
const exportsContext = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../api/src/storefront-special-package-script.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,exportsContext);
const source=exportsContext.exports.STOREFRONT_SPECIAL_PACKAGE_SCRIPT;
function helper(name) {const start=source.indexOf('  function '+name+'(');return source.slice(start,source.indexOf('\n  function ',start+1));}
let requests=0;
const context={API_BASE:'http://localhost:3000',productCache:{},fetch:async()=>{requests++;return {ok:true,json:async()=>({success:true,data:{quantity:9999,description:'Book details',pdfFile:'sample.pdf',salePrice:470}})}}};
vm.createContext(context);
vm.runInContext(['effectivePrice','packageListPrice','packagePrice','mergePackageBook','hydrateProducts'].map(helper).join('\n'),context);
(async()=>{
 const book={slug:'book',quantity:1,salePrice:470,discountType:2,discountAmount:176};
 const bundle={products:[book],discountType:2,discountAmount:0};
 for(let visit=0;visit<3;visit++){
  const result=await context.hydrateProducts(bundle);
  assert.equal(result.products[0].quantity,1,'Cached catalogue stock cannot replace bundle quantity');
  assert.equal(context.packageListPrice(result),470);
  assert.equal(context.packagePrice(result),294);
  assert.equal(result.products[0].description,'Book details');
  assert.equal(result.products[0].pdfFile,'sample.pdf');
 }
 const two=await context.hydrateProducts({...bundle,products:[{...book,quantity:2,selectedVariation:{salePrice:500,discountType:2,discountAmount:100},hasVariations:true}]});
 assert.equal(two.products[0].quantity,2);
 assert.equal(context.packagePrice(two),800,'Package-selected variation and copies survive cached hydration');
 assert.equal(requests,1,'Repeat visits exercise the cache');
 console.log('Package first-load, cached-price, quantity and variation regression checks pass');
})().catch(error=>{console.error(error);process.exitCode=1;});
