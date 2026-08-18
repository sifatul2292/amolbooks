import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as express from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { createHash } from 'crypto';
import { RedirectUrlMiddleware } from './middleware/redirect-url.middleware';
import { STOREFRONT_PRICE_SCRIPT } from './storefront-price-script';
import { STOREFRONT_SPECIAL_PACKAGE_SCRIPT } from './storefront-special-package-script';
import { ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT } from './admin-incomplete-order-editor-script';
import { STOREFRONT_ATTRIBUTION_SCRIPT } from './storefront-attribution-script';
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: true });

  // Security headers
  app.use(helmet.default({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // Gzip compression
  app.use(compression());

  // Allow Cors
  app.enableCors({
    // origin: '*',
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

  // Lazy reference: populated after app.init(). Safe because server only
  // starts listening after init completes, so the ref is always set on first request.
  let redirectMiddlewareRef: RedirectUrlMiddleware | null = null;

  // Register BEFORE init so this slot is early in the Express stack —
  // before ServeStatic (registered during module init) and NestJS Router.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!redirectMiddlewareRef) return next();
    return redirectMiddlewareRef.use(req, res, next);
  });

  app.use(
    '/upload/static',
    express.static(join(__dirname, '..', 'upload/static')),
  );
  // Serve all upload assets (files/images/invoice) at /upload — front-end and
  // admin reference this prefix without the global 'api' prefix. Registered
  // before init() so it wins over ServeStatic (/api/upload) and the SPA fallback.
  app.use('/upload', express.static(join(__dirname, '..', 'upload')));

  const storefrontIndexPath = join(
    __dirname,
    '..',
    '..',
    'ui',
    'dist',
    'angular-ui',
    'browser',
    'index.html',
  );
  const storefrontPriceScriptFileName = 'storefront-price-english-digits.js';
  const storefrontPriceScriptVersion = createHash('sha256')
    .update(STOREFRONT_PRICE_SCRIPT)
    .digest('hex')
    .slice(0, 12);
  const storefrontPriceScriptTag =
    `<script src="/${storefrontPriceScriptFileName}?v=${storefrontPriceScriptVersion}" defer></script>`;
  const storefrontSpecialPackageScriptFileName =
    'storefront-special-package.js';
  const storefrontSpecialPackageScriptVersion = createHash('sha256')
    .update(STOREFRONT_SPECIAL_PACKAGE_SCRIPT)
    .digest('hex')
    .slice(0, 12);
  const storefrontSpecialPackageScriptTag =
    `<script src="/${storefrontSpecialPackageScriptFileName}?v=${storefrontSpecialPackageScriptVersion}" defer></script>`;
  const storefrontAttributionScriptFileName = 'storefront-attribution.js';
  const storefrontAttributionScriptVersion = createHash('sha256')
    .update(STOREFRONT_ATTRIBUTION_SCRIPT)
    .digest('hex')
    .slice(0, 12);
  const storefrontAttributionScriptTag =
    `<script src="/${storefrontAttributionScriptFileName}?v=${storefrontAttributionScriptVersion}" defer></script>`;
  const storefrontGtmLoaderUrl =
    'https://server.amolbooks.com/tagioo-loader/gtm.js?id=GTM-NNZV54QJ';
  const storefrontGtmNoscriptUrl =
    'https://server.amolbooks.com/tagioo-loader/ns.html?id=GTM-NNZV54QJ';
  const legacyStapeGtmLoaderUrlPattern =
    /https:\/\/load\.server\.amolbooks\.com\/2kpblypwe\.js\?8=[^'"\s<]+/g;
  const legacyStapeGtmNoscriptUrlPattern =
    /https:\/\/load\.server\.amolbooks\.com\/ns\.html\?id=GTM-NNZV54QJ/g;
  const legacyStorefrontViewItemMirrorCode =
    'var ec=obj.ecommerce||{},items=toItems(ec),val=cartVal(items);';
  const storefrontViewItemMirrorMarker =
    'var finalViewValue=Number((((ec.detail||{}).custom_data)||{}).value);';
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
  const storefrontStapeDuplicateGuardMarker =
    "var _lastStapeSignature='',_lastStapeAt=0;";
  const storefrontStapePushCode = `${storefrontStapeDuplicateGuardMarker}
  function _pushStape(obj){
    try{
      var s=stapeOf(obj);s.__stape=true;
      var firstItem=((s.ecommerce||{}).items||[])[0]||{};
      var signature=String(s.event||'')+'|'+String(firstItem.item_id||'')+'|'+String((s.ecommerce||{}).transaction_id||'')+'|'+String((s.ecommerce||{}).value||'');
      var now=Date.now();
      if(signature&&signature===_lastStapeSignature&&now-_lastStapeAt<750)return;
      _lastStapeSignature=signature;
      _lastStapeAt=now;`;
  const legacyStorefrontCartValueCode =
    'function cartVal(items){return items.reduce(function(s,i){return s+(i.price||0)*(i.quantity||1);},0);}';
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
  const storefrontCartCheckoutMirrorMarker =
    "if(obj.event==='add_to_cart'||obj.event==='begin_checkout')items=applyTrackingPrices(items);";
  const storefrontCartCheckoutMirrorCode =
    `var ec=obj.ecommerce||{},items=toItems(ec);${storefrontCartCheckoutMirrorMarker}var val=cartVal(items);`;
  const storefrontProductResponseCacheMarker =
    'if(Array.isArray(d.data))d.data.forEach(rememberTrackingProduct);';
  const legacyStorefrontSuccessfulResponseCode =
    'if(!d||!d.success)return;';
  const storefrontSuccessfulResponseCode = `${legacyStorefrontSuccessfulResponseCode}
        ${storefrontProductResponseCacheMarker}
        else if(d.data&&typeof d.data==='object'){
          rememberTrackingProduct(d.data);
          if(d.data.product&&typeof d.data.product==='object')rememberTrackingProduct(d.data.product);
        }`;
  const legacyStorefrontAddToCartPriceCode =
    'atcItem.price=atcP.salePrice||atcP.regularPrice||0;';
  const storefrontAddToCartPriceCode =
    'rememberTrackingProduct(atcP);atcItem.price=finalTrackingPrice(atcP);';
  const legacyStorefrontLoggedInCartPriceCode =
    "items.push({item_id:String(p._id||''),item_name:p.name||'',price:p.salePrice||p.regularPrice||0,quantity:i.selectedQty||1});";
  const storefrontLoggedInCartPriceCode =
    "rememberTrackingProduct(p);items.push({item_id:String(p._id||''),item_name:p.name||'',price:finalTrackingPrice(p),quantity:i.selectedQty||1});";
  const legacyStorefrontGuestProductMapCode =
    'd.data.forEach(function(p){if(p&&p._id)prodMap[String(p._id)]=p;});';
  const storefrontGuestProductMapCode =
    'd.data.forEach(function(p){if(p&&p._id){rememberTrackingProduct(p);prodMap[String(p._id)]=p;}});';
  const legacyStorefrontGuestCartPriceCode =
    "items2.push({item_id:id,item_name:p?p.name||'':'',price:p?p.salePrice||p.regularPrice||0:0,quantity:i.selectedQty||1});";
  const storefrontGuestCartPriceCode =
    "items2.push({item_id:id,item_name:p?p.name||'':'',price:p?finalTrackingPrice(p):0,quantity:i.selectedQty||1});";
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
  const storefrontGtmBootstrapMarker =
    'window.__amolGtmBootstrapScheduled=true;';
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
  const storefrontPendingPurchaseHelperMarker =
    'window.__amolFlushPendingPurchase=function(){';
  const storefrontPurchaseExternalIdHelperMarker =
    'window.__amolEnsurePurchaseExternalId=function(payload){';
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
      var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({ecommerce:null});
      window.dataLayer.push(payload);
      sessionStorage.removeItem('_pendingPurchase');
      return true;
    }catch(e){return false;}
  };
  window.addEventListener('amol-gtm-ready',function(){window.__amolFlushPendingPurchase();});

`;
  const storefrontHistoryPurchaseCode =
    "var _pp=sessionStorage.getItem('_pendingPurchase');\n          if(_pp){try{var _pd=JSON.parse(_pp);window.dataLayer.push({ecommerce:null});window.dataLayer.push(_pd);sessionStorage.removeItem('_pendingPurchase');}catch(e){}}";
  const storefrontDOMContentPurchaseCode =
    "var _pp2=sessionStorage.getItem('_pendingPurchase');\n      if(_pp2){try{var _pd2=JSON.parse(_pp2);window.dataLayer.push({ecommerce:null});window.dataLayer.push(_pd2);sessionStorage.removeItem('_pendingPurchase');}catch(e){}}";
  const storefrontHistoryMarker = '  /* ── history.pushState: SPA nav ── */';
  const adminIncompleteOrderEditorScriptFileName =
    'incomplete-order-editor.js';
  const legacyStorefrontPriceScriptTagPattern =
    /\s*<script src="\/storefront-price-english-digits\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const legacyStorefrontSpecialPackageScriptTagPattern =
    /\s*<script src="\/storefront-special-package\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const legacyStorefrontAttributionScriptTagPattern =
    /\s*<script src="\/storefront-attribution\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const staticAssetPattern =
    /\.(js|css|map|json|xml|txt|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$/i;

  function replaceStorefrontTrackingLoader(indexHtml: string) {
    const trackingHtml = indexHtml
      .replace(legacyStapeGtmLoaderUrlPattern, storefrontGtmLoaderUrl)
      .replace(legacyStapeGtmNoscriptUrlPattern, storefrontGtmNoscriptUrl)
      .replace(
        '<!-- GTM/Stape loads after first paint. -->',
        '<!-- GTM/Tagioo loads after first paint. -->',
      );

    let patchedTrackingHtml = trackingHtml;
    if (!patchedTrackingHtml.includes(storefrontStapeDuplicateGuardMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontStapePushCode,
        storefrontStapePushCode,
      );
    }
    if (!patchedTrackingHtml.includes(storefrontViewItemMirrorMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontViewItemMirrorCode,
        storefrontViewItemMirrorCode,
      );
    }
    if (!patchedTrackingHtml.includes(storefrontFinalPriceMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontCartValueCode,
        storefrontFinalPriceHelpers,
      );
    }
    if (!patchedTrackingHtml.includes(storefrontCartCheckoutMirrorMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontViewItemMirrorCode,
        storefrontCartCheckoutMirrorCode,
      );
    }
    if (!patchedTrackingHtml.includes(storefrontProductResponseCacheMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontSuccessfulResponseCode,
        storefrontSuccessfulResponseCode,
      );
    }
    patchedTrackingHtml = patchedTrackingHtml
      .replace(
        legacyStorefrontAddToCartPriceCode,
        storefrontAddToCartPriceCode,
      )
      .replace(
        legacyStorefrontLoggedInCartPriceCode,
        storefrontLoggedInCartPriceCode,
      )
      .replace(
        legacyStorefrontGuestProductMapCode,
        storefrontGuestProductMapCode,
      )
      .replace(
        legacyStorefrontGuestCartPriceCode,
        storefrontGuestCartPriceCode,
      );
    if (!patchedTrackingHtml.includes(storefrontGtmBootstrapMarker)) {
      patchedTrackingHtml = patchedTrackingHtml.replace(
        legacyStorefrontGtmBootstrapCode,
        storefrontGtmBootstrapCode,
      );
    }
    if (!patchedTrackingHtml.includes(storefrontPendingPurchaseHelperMarker)) {
      patchedTrackingHtml = patchedTrackingHtml
        .replace(
          storefrontHistoryMarker,
          storefrontPendingPurchaseHelper + storefrontHistoryMarker,
        )
        .replace(
          storefrontHistoryPurchaseCode,
          'window.__amolFlushPendingPurchase();',
        )
        .replace(
          storefrontDOMContentPurchaseCode,
          'window.__amolFlushPendingPurchase();',
        );
    }
    if (
      !patchedTrackingHtml.includes(storefrontPurchaseExternalIdHelperMarker)
    ) {
      patchedTrackingHtml = patchedTrackingHtml
        .replace(
          storefrontPendingPurchaseHelperMarker,
          storefrontPurchaseExternalIdHelper +
            storefrontPendingPurchaseHelperMarker,
        )
        .replace(
          'var payload=JSON.parse(raw);',
          'var payload=window.__amolEnsurePurchaseExternalId(JSON.parse(raw));',
        );
    }
    return patchedTrackingHtml;
  }

  function installStaticStorefrontPatch() {
    try {
      const storefrontScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontPriceScriptFileName,
      );
      writeFileSync(storefrontScriptPath, STOREFRONT_PRICE_SCRIPT, 'utf8');
      const storefrontSpecialPackageScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontSpecialPackageScriptFileName,
      );
      writeFileSync(
        storefrontSpecialPackageScriptPath,
        STOREFRONT_SPECIAL_PACKAGE_SCRIPT,
        'utf8',
      );
      const storefrontAttributionScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontAttributionScriptFileName,
      );
      writeFileSync(
        storefrontAttributionScriptPath,
        STOREFRONT_ATTRIBUTION_SCRIPT,
        'utf8',
      );

      const indexHtml = readFileSync(storefrontIndexPath, 'utf8');
      const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
        .replace(legacyStorefrontPriceScriptTagPattern, '')
        .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
        .replace(legacyStorefrontAttributionScriptTagPattern, '');
      const storefrontPatchScriptTags =
        storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
      const patchedHtml = cleanedHtml.includes('</body>')
        ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
        : `${cleanedHtml}${storefrontPatchScriptTags}`;

      if (patchedHtml !== indexHtml) {
        writeFileSync(storefrontIndexPath, patchedHtml, 'utf8');
      }
      logger.log('Static storefront patch installed');
    } catch (error) {
      logger.warn(`Static storefront patch skipped: ${error.message}`);
    }
  }

  function sendStorefrontIndex(res: express.Response) {
    try {
      const indexHtml = readFileSync(storefrontIndexPath, 'utf8');
      const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
        .replace(legacyStorefrontPriceScriptTagPattern, '')
        .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
        .replace(legacyStorefrontAttributionScriptTagPattern, '');
      const storefrontPatchScriptTags =
        storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
      const html = cleanedHtml.includes('</body>')
        ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
        : `${cleanedHtml}${storefrontPatchScriptTags}`;
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('html').send(html);
    } catch (error) {
      res.sendFile(storefrontIndexPath);
    }
  }

  installStaticStorefrontPatch();

  const httpAdapter = app.getHttpAdapter().getInstance() as express.Express;
  httpAdapter.get(
    `/${storefrontAttributionScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('application/javascript').send(STOREFRONT_ATTRIBUTION_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${storefrontPriceScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('application/javascript').send(STOREFRONT_PRICE_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${storefrontSpecialPackageScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res
        .type('application/javascript')
        .send(STOREFRONT_SPECIAL_PACKAGE_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${adminIncompleteOrderEditorScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res
        .type('application/javascript')
        .send(ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT);
    },
  );

  // Serve injected storefront HTML before ServeStaticModule can serve the SPA.
  // This keeps ui/dist untouched while making the local storefront change apply.
  httpAdapter.use(
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const accept = String(req.headers.accept || '');
      const path = req.path || '';
      if (
        req.method !== 'GET' ||
        !accept.includes('text/html') ||
        path.startsWith('/api') ||
        path.startsWith('/upload') ||
        path.startsWith('/invoice') ||
        path === '/storefront-price-english-digits.js' ||
        path === '/storefront-special-package.js' ||
        path === '/storefront-attribution.js' ||
        path === '/incomplete-order-editor.js' ||
        staticAssetPattern.test(path)
      ) {
        return next();
      }
      return sendStorefrontIndex(res);
    },
  );
  // app.enableCors();
  // Version Control
  app.enableVersioning({
    type: VersioningType.URI,
  });
  // Global Prefix
  // Limit payload size
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;

  // init() initializes all modules (ServeStatic registers here, NestJS Router built here)
  await app.init();

  // Wire up the lazy reference now that DI is ready
  redirectMiddlewareRef = app.get(RedirectUrlMiddleware);

  // SPA fallback: serves index.html for any unhandled route
  httpAdapter.use((_req: express.Request, res: express.Response) => {
    if (!res.headersSent) {
      sendStorefrontIndex(res);
    }
  });

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}

bootstrap();
