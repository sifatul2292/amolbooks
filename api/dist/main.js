"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const path_1 = require("path");
const fs_1 = require("fs");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const crypto_1 = require("crypto");
const redirect_url_middleware_1 = require("./middleware/redirect-url.middleware");
const storefront_price_script_1 = require("./storefront-price-script");
const storefront_special_package_script_1 = require("./storefront-special-package-script");
const admin_incomplete_order_editor_script_1 = require("./admin-incomplete-order-editor-script");
const storefront_attribution_script_1 = require("./storefront-attribution-script");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    app.use(helmet.default({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false,
    }));
    app.use(compression());
    app.enableCors({
        origin: [
            'http://localhost:4200',
            'http://localhost:42002',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3007',
            'http://localhost:3005',
            'http://localhost:3004',
            'http://localhost:3003',
            'http://localhost:3006',
            'http://localhost:3008',
            'https://www.alambook.com',
            'https://alambook.com',
            'https://admin.alambook.com',
            'https://adminsub.amolbooks.com',
            'https://uisub.amolbooks.com',
            'https://apisub.amolbooks.com',
            'https://amolbooks.com',
            'https://www.amolbooks.com',
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type,Authorization,administrator',
        credentials: true,
    });
    let redirectMiddlewareRef = null;
    app.use((req, res, next) => {
        if (!redirectMiddlewareRef)
            return next();
        return redirectMiddlewareRef.use(req, res, next);
    });
    app.use('/upload/static', express.static((0, path_1.join)(__dirname, '..', 'upload/static')));
    app.use('/upload', express.static((0, path_1.join)(__dirname, '..', 'upload')));
    const storefrontIndexPath = (0, path_1.join)(__dirname, '..', '..', 'ui', 'dist', 'angular-ui', 'browser', 'index.html');
    const storefrontPriceScriptFileName = 'storefront-price-english-digits.js';
    const storefrontPriceScriptVersion = (0, crypto_1.createHash)('sha256')
        .update(storefront_price_script_1.STOREFRONT_PRICE_SCRIPT)
        .digest('hex')
        .slice(0, 12);
    const storefrontPriceScriptTag = `<script src="/${storefrontPriceScriptFileName}?v=${storefrontPriceScriptVersion}" defer></script>`;
    const storefrontSpecialPackageScriptFileName = 'storefront-special-package.js';
    const storefrontSpecialPackageScriptVersion = (0, crypto_1.createHash)('sha256')
        .update(storefront_special_package_script_1.STOREFRONT_SPECIAL_PACKAGE_SCRIPT)
        .digest('hex')
        .slice(0, 12);
    const storefrontSpecialPackageScriptTag = `<script src="/${storefrontSpecialPackageScriptFileName}?v=${storefrontSpecialPackageScriptVersion}" defer></script>`;
    const storefrontAttributionScriptFileName = 'storefront-attribution.js';
    const storefrontAttributionScriptVersion = (0, crypto_1.createHash)('sha256')
        .update(storefront_attribution_script_1.STOREFRONT_ATTRIBUTION_SCRIPT)
        .digest('hex')
        .slice(0, 12);
    const storefrontAttributionScriptTag = `<script src="/${storefrontAttributionScriptFileName}?v=${storefrontAttributionScriptVersion}" defer></script>`;
    const storefrontGtmLoaderUrl = 'https://server.amolbooks.com/tagioo-loader/gtm.js?id=GTM-NNZV54QJ';
    const storefrontGtmNoscriptUrl = 'https://server.amolbooks.com/tagioo-loader/ns.html?id=GTM-NNZV54QJ';
    const legacyStapeGtmLoaderUrlPattern = /https:\/\/load\.server\.amolbooks\.com\/2kpblypwe\.js\?8=[^'"\s<]+/g;
    const legacyStapeGtmNoscriptUrlPattern = /https:\/\/load\.server\.amolbooks\.com\/ns\.html\?id=GTM-NNZV54QJ/g;
    const legacyStorefrontViewItemMirrorCode = 'var ec=obj.ecommerce||{},items=toItems(ec),val=cartVal(items);';
    const storefrontViewItemMirrorMarker = 'var finalViewValue=Number((((ec.detail||{}).custom_data)||{}).value);';
    const storefrontViewItemMirrorCode = `${legacyStorefrontViewItemMirrorCode}
    if(obj.event==='view_item'){
      ${storefrontViewItemMirrorMarker}
      if(isFinite(finalViewValue)&&finalViewValue>=0){
        val=finalViewValue;
        if(items[0])items[0].price=finalViewValue;
      }
    }`;
    const legacyStorefrontStapePushCode = `function _pushStape(obj){
    try{
      var s=stapeOf(obj);s.__stape=true;`;
    const legacyStorefrontStapeDuplicateGuardMarker = "var _lastStapeSignature='',_lastStapeAt=0;";
    const legacyStorefrontStapeGuardCode = `${legacyStorefrontStapeDuplicateGuardMarker}
  function _pushStape(obj){
    try{
      var s=stapeOf(obj);s.__stape=true;
      var firstItem=((s.ecommerce||{}).items||[])[0]||{};
      var signature=String(s.event||'')+'|'+String(firstItem.item_id||'')+'|'+String((s.ecommerce||{}).transaction_id||'')+'|'+String((s.ecommerce||{}).value||'');
      var now=Date.now();
      if(signature&&signature===_lastStapeSignature&&now-_lastStapeAt<750)return;
      _lastStapeSignature=signature;
      _lastStapeAt=now;`;
    const storefrontStapeDuplicateGuardMarker = 'window.__amolStapeDedupWindowMs=5000;';
    const storefrontStapePushCode = `${storefrontStapeDuplicateGuardMarker}
  function _pushStape(obj){
    try{
      var s=stapeOf(obj);s.__stape=true;
      var sec=s.ecommerce||{},mirrorItems=sec.items||[];
      var itemSignature=mirrorItems.map(function(item){return String(item.item_id||'')+':'+String(item.quantity||1);}).join(',');
      var signature=String(s.event||'')+'|'+itemSignature+'|'+String(sec.transaction_id||'')+'|'+String(sec.value||'');
      var now=Date.now();
      var dedupCache=window.__amolStapeDedupCache=window.__amolStapeDedupCache||{};
      if(signature&&dedupCache[signature]&&now-dedupCache[signature]<window.__amolStapeDedupWindowMs)return;
      dedupCache[signature]=now;
      Object.keys(dedupCache).forEach(function(key){if(now-dedupCache[key]>60000)delete dedupCache[key];});
      if(!s.event_id){
        s.event_id=sec.transaction_id
          ?'order_'+String(sec.transaction_id)
          :'amol_'+String(s.event||'event')+'_'+now+'_'+Math.random().toString(36).slice(2,8);
      }`;
    const legacyStorefrontCartValueCode = 'function cartVal(items){return items.reduce(function(s,i){return s+(i.price||0)*(i.quantity||1);},0);}';
    const storefrontFinalPriceMarker = 'function finalTrackingPrice(p){';
    const storefrontFinalPriceHelpers = `${legacyStorefrontCartValueCode}
  var _trackingPriceById={};
  ${storefrontFinalPriceMarker}
    if(!p)return 0;
    var explicit=Number(p.afterDiscountPrice);
    if(p.afterDiscountPrice!=null&&isFinite(explicit)&&explicit>=0)return explicit;
    var sale=Number(p.salePrice!=null?p.salePrice:p.regularPrice)||0;
    var discount=Number(p.discountAmount)||0;
    var type=Number(p.discountType)||0;
    if(type===1)return Math.max(0,Math.floor(sale-(sale*discount/100)));
    if(type===2)return Math.max(0,Math.floor(sale-discount));
    return Math.max(0,Math.floor(sale));
  }
  function rememberTrackingProduct(p){
    if(!p||p._id==null)return;
    if(p.afterDiscountPrice==null&&p.salePrice==null&&p.regularPrice==null)return;
    _trackingPriceById[String(p._id)]=finalTrackingPrice(p);
  }
  function applyTrackingPrices(items){
    return items.map(function(item){
      var id=String(item.item_id||'');
      if(id&&Object.prototype.hasOwnProperty.call(_trackingPriceById,id)){
        item.price=_trackingPriceById[id];
      }
      return item;
    });
  }`;
    const storefrontCartCheckoutMirrorMarker = "if(obj.event==='add_to_cart'||obj.event==='begin_checkout')items=applyTrackingPrices(items);";
    const storefrontCartCheckoutMirrorCode = `var ec=obj.ecommerce||{},items=toItems(ec);${storefrontCartCheckoutMirrorMarker}var val=cartVal(items);`;
    const storefrontProductResponseCacheMarker = 'if(Array.isArray(d.data))d.data.forEach(rememberTrackingProduct);';
    const legacyStorefrontBeginCheckoutCode = `function pushBeginCheckout(){
    if(_checkoutFired)return;
    var items=getCartItems();
    if(!items.length)return;
    _checkoutFired=true;
    var val=cartVal(items);
    var dl=window.dataLayer;
    dl.push({ecommerce:null});
    dl.push({event:'begin_checkout_stape',ecommerce:{currency:'BDT',value:val,items:items},__stape:true});
  }`;
    const storefrontBeginCheckoutMarker = 'var _checkoutPriceRetryCount=0;';
    const storefrontBeginCheckoutCode = `${storefrontBeginCheckoutMarker}
  function pushBeginCheckout(){
    if(_checkoutFired)return;
    var items=getCartItems();
    if(!items.length)return;
    var val=cartVal(items);
    if(!(val>0)){
      if(_checkoutPriceRetryCount++<40)setTimeout(pushBeginCheckout,150);
      return;
    }
    _checkoutPriceRetryCount=0;
    _checkoutFired=true;
    var dl=window.dataLayer;
    dl.push({ecommerce:null});
    dl.push({event:'begin_checkout_stape',ecommerce:{currency:'BDT',value:val,items:items},__stape:true});
  }`;
    const legacyStorefrontSuccessfulResponseCode = 'if(!d||!d.success)return;';
    const storefrontSuccessfulResponseCode = `${legacyStorefrontSuccessfulResponseCode}
        ${storefrontProductResponseCacheMarker}
        else if(d.data&&typeof d.data==='object'){
          rememberTrackingProduct(d.data);
          if(d.data.product&&typeof d.data.product==='object')rememberTrackingProduct(d.data.product);
        }`;
    const legacyStorefrontAddToCartPriceCode = 'atcItem.price=atcP.salePrice||atcP.regularPrice||0;';
    const storefrontAddToCartPriceCode = 'rememberTrackingProduct(atcP);atcItem.price=finalTrackingPrice(atcP);';
    const legacyStorefrontLoggedInCartPriceCode = "items.push({item_id:String(p._id||''),item_name:p.name||'',price:p.salePrice||p.regularPrice||0,quantity:i.selectedQty||1});";
    const storefrontLoggedInCartPriceCode = "rememberTrackingProduct(p);items.push({item_id:String(p._id||''),item_name:p.name||'',price:finalTrackingPrice(p),quantity:i.selectedQty||1});";
    const legacyStorefrontGuestProductMapCode = 'd.data.forEach(function(p){if(p&&p._id)prodMap[String(p._id)]=p;});';
    const storefrontGuestProductMapCode = 'd.data.forEach(function(p){if(p&&p._id){rememberTrackingProduct(p);prodMap[String(p._id)]=p;}});';
    const legacyStorefrontGuestCartPriceCode = "items2.push({item_id:id,item_name:p?p.name||'':'',price:p?p.salePrice||p.regularPrice||0:0,quantity:i.selectedQty||1});";
    const storefrontGuestCartPriceCode = "items2.push({item_id:id,item_name:p?p.name||'':'',price:p?finalTrackingPrice(p):0,quantity:i.selectedQty||1});";
    const legacyStorefrontGtmBootstrapCode = `window.addEventListener('load', function () { setTimeout(function () {
    function loadGtm() {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
      var s = document.createElement('script');
      s.async = true;
      s.src = '${storefrontGtmLoaderUrl}';
      document.head.appendChild(s);
    }
    var normalizer = document.createElement('script');
    normalizer.src = 'dl-normalize.js';
    normalizer.defer = true;
    normalizer.onload = loadGtm;
    document.head.appendChild(normalizer);
  }, 10000); });`;
    const storefrontGtmBootstrapMarker = 'window.__amolGtmBootstrapScheduled=true;';
    const storefrontGtmBootstrapCode = `(function(){
    if(window.__amolGtmBootstrapScheduled)return;
    ${storefrontGtmBootstrapMarker}
    function loadGtm(){
      if(window.__amolGtmLoading||window.__amolGtmReady)return;
      window.__amolGtmLoading=true;
      window.dataLayer=window.dataLayer||[];
      var normalizer=document.createElement('script');
      normalizer.src='dl-normalize.js';
      normalizer.defer=true;
      var containerStarted=false;
      var loadContainer=function(){
        if(containerStarted)return;
        containerStarted=true;
        window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
        var s=document.createElement('script');
        s.async=true;
        s.src='${storefrontGtmLoaderUrl}';
        s.onload=function(){
          window.__amolGtmReady=true;
          window.__amolGtmLoading=false;
          window.dispatchEvent(new CustomEvent('amol-gtm-ready'));
        };
        s.onerror=function(){window.__amolGtmLoading=false;};
        document.head.appendChild(s);
      };
      normalizer.onload=loadContainer;
      // The normalizer improves the data model but must never become a single
      // point of failure for GA4/Meta. A missing or blocked optional asset used
      // to prevent the Tagioo container from loading at all.
      normalizer.onerror=loadContainer;
      document.head.appendChild(normalizer);
      setTimeout(loadContainer,1500);
    }
    if(window.location.pathname.indexOf('order-success')!==-1){
      loadGtm();
    }else{
      // Deferred until after first paint, but no longer on a 10s timer. That
      // timer meant the single DOM-Ready page_view landed on whichever route
      // the visitor had already navigated to, not the page they arrived on —
      // and a visitor who left inside 10s was never counted at all. Load at
      // window load, or at the first interaction if that happens sooner.
      var started=false;
      var start=function(){if(started)return;started=true;loadGtm();};
      if(document.readyState==='complete'){start();}
      else{window.addEventListener('load',start);}
      var wake=['pointerdown','keydown','touchstart'];
      for(var w=0;w<wake.length;w++){
        window.addEventListener(wake[w],start,{once:true,passive:true});
      }
    }
  })();`;
    const storefrontPendingPurchaseHelperMarker = 'window.__amolFlushPendingPurchase=function(){';
    const legacyStorefrontPendingPurchasePushCode = `var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({ecommerce:null});
      window.dataLayer.push(payload);
      sessionStorage.removeItem('_pendingPurchase');`;
    const storefrontServerAuthoritativePurchaseMarker = 'window.__amolPurchaseDeliveredServerSide=true;';
    const storefrontPendingPurchaseClearCode = `var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));
      ${storefrontServerAuthoritativePurchaseMarker}
      sessionStorage.removeItem('_pendingPurchase');`;
    const storefrontStablePurchaseEventMarker = 'window.__amolPurchaseUsesStableEventId=true;';
    const storefrontPendingPurchasePushCode = `var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));
      ${storefrontStablePurchaseEventMarker}
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({ecommerce:null});
      window.dataLayer.push(payload);
      sessionStorage.removeItem('_pendingPurchase');`;
    const storefrontPurchaseExternalIdHelperMarker = 'window.__amolEnsurePurchaseExternalId=function(payload){';
    const storefrontPurchaseExternalIdHelper = `
  window.__amolEnsurePurchaseExternalId=function(payload){
    if(!payload||typeof payload!=='object')return payload;
    var transactionId=payload.ecommerce&&payload.ecommerce.transaction_id;
    if(transactionId&&!payload.event_id)payload.event_id='order_'+String(transactionId);
    payload.user_data=payload.user_data||{};
    if(payload.user_data.customer_id)return payload;
    try{
      var key='amol_analytics_anonymous_id';
      var id=localStorage.getItem(key);
      if(!id){
        id=window.crypto&&typeof window.crypto.randomUUID==='function'
          ?window.crypto.randomUUID()
          :'anon-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
        localStorage.setItem(key,id);
      }
      payload.user_data.customer_id=id;
    }catch(e){}
    return payload;
  };
`;
    const storefrontPendingPurchaseHelper = `
${storefrontPurchaseExternalIdHelper}
  window.__amolFlushPendingPurchase=function(){
    if(!window.__amolGtmReady)return false;
    var raw;
    try{raw=sessionStorage.getItem('_pendingPurchase');}catch(e){return false;}
    if(!raw)return true;
    try{
      ${storefrontPendingPurchasePushCode}
      return true;
    }catch(e){return false;}
  };
  window.addEventListener('amol-gtm-ready',function(){window.__amolFlushPendingPurchase();});

`;
    const storefrontHistoryPurchaseCode = "var _pp=sessionStorage.getItem('_pendingPurchase');\n          if(_pp){try{var _pd=JSON.parse(_pp);window.dataLayer.push({ecommerce:null});window.dataLayer.push(_pd);sessionStorage.removeItem('_pendingPurchase');}catch(e){}}";
    const storefrontDOMContentPurchaseCode = "var _pp2=sessionStorage.getItem('_pendingPurchase');\n      if(_pp2){try{var _pd2=JSON.parse(_pp2);window.dataLayer.push({ecommerce:null});window.dataLayer.push(_pd2);sessionStorage.removeItem('_pendingPurchase');}catch(e){}}";
    const storefrontHistoryMarker = '  /* ── history.pushState: SPA nav ── */';
    const adminIncompleteOrderEditorScriptFileName = 'incomplete-order-editor.js';
    const legacyStorefrontPriceScriptTagPattern = /\s*<script src="\/storefront-price-english-digits\.js(?:\?v=[^"]*)?" defer><\/script>/g;
    const legacyStorefrontSpecialPackageScriptTagPattern = /\s*<script src="\/storefront-special-package\.js(?:\?v=[^"]*)?" defer><\/script>/g;
    const legacyStorefrontAttributionScriptTagPattern = /\s*<script src="\/storefront-attribution\.js(?:\?v=[^"]*)?" defer><\/script>/g;
    const staticAssetPattern = /\.(js|css|map|json|xml|txt|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$/i;
    function replaceStorefrontTrackingLoader(indexHtml) {
        const trackingHtml = indexHtml
            .replace(legacyStapeGtmLoaderUrlPattern, storefrontGtmLoaderUrl)
            .replace(legacyStapeGtmNoscriptUrlPattern, storefrontGtmNoscriptUrl)
            .replace('<!-- GTM/Stape loads after first paint. -->', '<!-- GTM/Tagioo loads after first paint. -->');
        let patchedTrackingHtml = trackingHtml;
        if (!patchedTrackingHtml.includes(storefrontStapeDuplicateGuardMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.includes(legacyStorefrontStapeDuplicateGuardMarker)
                ? patchedTrackingHtml.replace(legacyStorefrontStapeGuardCode, storefrontStapePushCode)
                : patchedTrackingHtml.replace(legacyStorefrontStapePushCode, storefrontStapePushCode);
        }
        if (!patchedTrackingHtml.includes(storefrontViewItemMirrorMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontViewItemMirrorCode, storefrontViewItemMirrorCode);
        }
        if (!patchedTrackingHtml.includes(storefrontFinalPriceMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontCartValueCode, storefrontFinalPriceHelpers);
        }
        if (!patchedTrackingHtml.includes(storefrontCartCheckoutMirrorMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontViewItemMirrorCode, storefrontCartCheckoutMirrorCode);
        }
        if (!patchedTrackingHtml.includes(storefrontProductResponseCacheMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontSuccessfulResponseCode, storefrontSuccessfulResponseCode);
        }
        if (!patchedTrackingHtml.includes(storefrontBeginCheckoutMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontBeginCheckoutCode, storefrontBeginCheckoutCode);
        }
        patchedTrackingHtml = patchedTrackingHtml
            .replace(legacyStorefrontAddToCartPriceCode, storefrontAddToCartPriceCode)
            .replace(legacyStorefrontLoggedInCartPriceCode, storefrontLoggedInCartPriceCode)
            .replace(legacyStorefrontGuestProductMapCode, storefrontGuestProductMapCode)
            .replace(legacyStorefrontGuestCartPriceCode, storefrontGuestCartPriceCode);
        if (!patchedTrackingHtml.includes(storefrontGtmBootstrapMarker)) {
            patchedTrackingHtml = patchedTrackingHtml.replace(legacyStorefrontGtmBootstrapCode, storefrontGtmBootstrapCode);
        }
        if (!patchedTrackingHtml.includes(storefrontPendingPurchaseHelperMarker)) {
            patchedTrackingHtml = patchedTrackingHtml
                .replace(storefrontHistoryMarker, storefrontPendingPurchaseHelper + storefrontHistoryMarker)
                .replace(storefrontHistoryPurchaseCode, 'window.__amolFlushPendingPurchase();')
                .replace(storefrontDOMContentPurchaseCode, 'window.__amolFlushPendingPurchase();');
        }
        if (!patchedTrackingHtml.includes(storefrontPurchaseExternalIdHelperMarker)) {
            patchedTrackingHtml = patchedTrackingHtml
                .replace(storefrontPendingPurchaseHelperMarker, storefrontPurchaseExternalIdHelper +
                storefrontPendingPurchaseHelperMarker)
                .replace('var payload=JSON.parse(raw);', 'var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));');
        }
        if (!patchedTrackingHtml.includes(storefrontStablePurchaseEventMarker)) {
            patchedTrackingHtml = patchedTrackingHtml
                .replace(storefrontPendingPurchaseClearCode, storefrontPendingPurchasePushCode)
                .replace(legacyStorefrontPendingPurchasePushCode, storefrontPendingPurchasePushCode);
        }
        return patchedTrackingHtml;
    }
    function installStaticStorefrontPatch() {
        try {
            const storefrontScriptPath = (0, path_1.join)(__dirname, '..', '..', 'ui', 'dist', 'angular-ui', 'browser', storefrontPriceScriptFileName);
            (0, fs_1.writeFileSync)(storefrontScriptPath, storefront_price_script_1.STOREFRONT_PRICE_SCRIPT, 'utf8');
            const storefrontSpecialPackageScriptPath = (0, path_1.join)(__dirname, '..', '..', 'ui', 'dist', 'angular-ui', 'browser', storefrontSpecialPackageScriptFileName);
            (0, fs_1.writeFileSync)(storefrontSpecialPackageScriptPath, storefront_special_package_script_1.STOREFRONT_SPECIAL_PACKAGE_SCRIPT, 'utf8');
            const storefrontAttributionScriptPath = (0, path_1.join)(__dirname, '..', '..', 'ui', 'dist', 'angular-ui', 'browser', storefrontAttributionScriptFileName);
            (0, fs_1.writeFileSync)(storefrontAttributionScriptPath, storefront_attribution_script_1.STOREFRONT_ATTRIBUTION_SCRIPT, 'utf8');
            const indexHtml = (0, fs_1.readFileSync)(storefrontIndexPath, 'utf8');
            const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
                .replace(legacyStorefrontPriceScriptTagPattern, '')
                .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
                .replace(legacyStorefrontAttributionScriptTagPattern, '');
            const storefrontPatchScriptTags = storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
            const patchedHtml = cleanedHtml.includes('</body>')
                ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
                : `${cleanedHtml}${storefrontPatchScriptTags}`;
            if (patchedHtml !== indexHtml) {
                (0, fs_1.writeFileSync)(storefrontIndexPath, patchedHtml, 'utf8');
            }
            logger.log('Static storefront patch installed');
        }
        catch (error) {
            logger.warn(`Static storefront patch skipped: ${error.message}`);
        }
    }
    function sendStorefrontIndex(res) {
        try {
            const indexHtml = (0, fs_1.readFileSync)(storefrontIndexPath, 'utf8');
            const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
                .replace(legacyStorefrontPriceScriptTagPattern, '')
                .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
                .replace(legacyStorefrontAttributionScriptTagPattern, '');
            const storefrontPatchScriptTags = storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
            const html = cleanedHtml.includes('</body>')
                ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
                : `${cleanedHtml}${storefrontPatchScriptTags}`;
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.type('html').send(html);
        }
        catch (error) {
            res.sendFile(storefrontIndexPath);
        }
    }
    installStaticStorefrontPatch();
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.get(`/${storefrontAttributionScriptFileName}`, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.type('application/javascript').send(storefront_attribution_script_1.STOREFRONT_ATTRIBUTION_SCRIPT);
    });
    httpAdapter.get(`/${storefrontPriceScriptFileName}`, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.type('application/javascript').send(storefront_price_script_1.STOREFRONT_PRICE_SCRIPT);
    });
    httpAdapter.get(`/${storefrontSpecialPackageScriptFileName}`, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res
            .type('application/javascript')
            .send(storefront_special_package_script_1.STOREFRONT_SPECIAL_PACKAGE_SCRIPT);
    });
    httpAdapter.get(`/${adminIncompleteOrderEditorScriptFileName}`, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res
            .type('application/javascript')
            .send(admin_incomplete_order_editor_script_1.ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT);
    });
    httpAdapter.use((req, res, next) => {
        const accept = String(req.headers.accept || '');
        const path = req.path || '';
        if (req.method !== 'GET' ||
            !accept.includes('text/html') ||
            path.startsWith('/api') ||
            path.startsWith('/upload') ||
            path.startsWith('/invoice') ||
            path === '/storefront-price-english-digits.js' ||
            path === '/storefront-special-package.js' ||
            path === '/storefront-attribution.js' ||
            path === '/incomplete-order-editor.js' ||
            staticAssetPattern.test(path)) {
            return next();
        }
        return sendStorefrontIndex(res);
    });
    app.enableVersioning({
        type: common_1.VersioningType.URI,
    });
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT || 3000;
    await app.init();
    redirectMiddlewareRef = app.get(redirect_url_middleware_1.RedirectUrlMiddleware);
    httpAdapter.use((_req, res) => {
        if (!res.headersSent) {
            sendStorefrontIndex(res);
        }
    });
    await app.listen(port);
    logger.log(`Application is running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map