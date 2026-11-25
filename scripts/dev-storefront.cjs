// Local storefront preview: production reads only; no database or background jobs.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const express = require('../api/node_modules/express');
const ts = require('../api/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const app = express();
app.use(express.json());
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const snippetNames = [...main.match(/const storefrontSnippetFiles = \[([\s\S]*?)\];/)[1].matchAll(/^\s*'([^']+\.html)',?\s*$/gm)].map(match => match[1]);
const scripts = {
  'storefront-price-english-digits.js': ['storefront-price-script', 'STOREFRONT_PRICE_SCRIPT'],
  'storefront-special-package.js': ['storefront-special-package-script', 'STOREFRONT_SPECIAL_PACKAGE_SCRIPT'],
  'storefront-attribution.js': ['storefront-attribution-script', 'STOREFRONT_ATTRIBUTION_SCRIPT'],
  'storefront-product-sections.js': ['storefront-product-sections-script', 'STOREFRONT_PRODUCT_SECTIONS_SCRIPT'],
};
Object.entries(scripts).forEach(([url, [file, key]]) => app.get('/' + url, (req, res) => {
  const source = fs.readFileSync(path.join(root, 'api/src/' + file + '.ts'), 'utf8');
  const result = {};
  new Function('exports', ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(result);
  res.type('js').send(result[key]);
}));
app.get('/api/storefront-assets/delivery-zone-core.js', (req,res) => res.type('js').sendFile(path.join(root,'gtm-snippets/delivery-zone-core.js')));
app.use('/api/storefront-assets', express.static(path.join(root, 'gtm-snippets/assets')));
function proxy(req, res) {
  const remotePath = req.originalUrl.replace(/^\/storefront-catalog/, '/api');
  const read = ['GET','HEAD'].includes(req.method) || (req.method === 'POST' && /\/get[-/]/.test(req.path));
  if (!read) return res.status(405).json({success:false,message:'Preview allows catalogue reads only'});
  const body = req.method === 'POST' ? JSON.stringify(req.body || {}) : '';
  const target = req.originalUrl === '/storefront-catalog/library'
    ? 'https://www.amolbooks.com/storefront-catalog/library'
    : 'https://apisub.amolbooks.com' + remotePath;
  const request = https.request(target, {method:req.method,headers:{'Content-Type':'application/json', ...(body ? {'Content-Length':Buffer.byteLength(body)} : {})}}, upstream => {
    res.status(upstream.statusCode || 502).type(upstream.headers['content-type'] || 'application/json');
    upstream.pipe(res);
  });
  request.on('error', () => res.status(502).end('Catalogue unavailable'));
  request.end(body);
}
// Guest order preview can only reach the explicitly configured local sandbox.
app.use('/api/guest-orders', (req,res) => {
  const port=Number(process.env.GUEST_ORDERS_PREVIEW_PORT);
  if (!Number.isInteger(port)||port<1024||port>65535) return res.status(503).json({success:false,message:'পরীক্ষার অর্ডার API চালু নেই'});
  if (!['GET','POST'].includes(req.method)) return res.sendStatus(405);
  const body=req.method==='POST'?JSON.stringify(req.body||{}):'';
  const request=require('node:http').request({hostname:'127.0.0.1',port,path:'/api/guest-orders'+req.url,method:req.method,
    headers:{'Content-Type':'application/json',...(req.headers.authorization?{Authorization:req.headers.authorization}:{}),...(body?{'Content-Length':Buffer.byteLength(body)}:{})}},upstream=>{
      res.status(upstream.statusCode||502).set('Cache-Control','no-store').type('application/json');upstream.pipe(res);
    });
  request.on('error',()=>res.status(503).json({success:false,message:'পরীক্ষার অর্ডার API চালু নেই'}));request.end(body);
});
// Opt-in thank-you demonstration on a separate port/origin; never forwards these fixtures.
const giftSuccessPreview = process.env.GIFT_SUCCESS_PREVIEW === '1';
const giftDemoId = '000000000000000000000030';
if (giftSuccessPreview) {
  // Keep sample purchase data on this origin; external tracking scripts/pixels cannot run.
  app.use((_req,res,next) => {
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://apisub.amolbooks.com https://www.amolbooks.com; connect-src 'self'; frame-src 'none'; form-action 'self'");
    next();
  });
  let example;
  async function sampleGift() {
    if (!example) {
      const order = await require('./dev-gift-order-panel.cjs').fixture();
      example = { ...order, paymentStatus:'paid', paymentGateway:'eps', paidAmount:order.grandTotal };
    }
    return example;
  }
  app.get('/api/order/' + giftDemoId, async (_req,res,next) => {
    try { res.set('Cache-Control','no-store').json({success:true,data:await sampleGift()}); } catch(error) { next(error); }
  });
  app.get('/api/payment/eps/status/' + giftDemoId, async (_req,res,next) => {
    try { const order=await sampleGift();res.set('Cache-Control','no-store').json({success:true,data:{paymentStatus:'paid',amount:order.grandTotal,paidAmount:order.grandTotal,paidWith:'bKash (demo)'}}); } catch(error) { next(error); }
  });
}
app.use('/api', proxy);
app.use('/storefront-catalog', proxy);
const ui = path.join(root, 'ui/dist/angular-ui/browser');
app.get('*', (req, res, next) => {
  if (/\.[a-z0-9]+$/i.test(req.path)) return next();
  let html = fs.readFileSync(path.join(ui, 'index.html'), 'utf8');
  html = html.replace(/<!-- amol-storefront-snippets:start -->[\s\S]*?<!-- amol-storefront-snippets:end -->/g, '');
  const snippets = snippetNames.map(name => fs.readFileSync(path.join(root, 'gtm-snippets', name), 'utf8')).join('\n');
  if (giftSuccessPreview && req.path === '/checkout/order-success/' + giftDemoId) {
    html = html.replace('<body>', '<body><aside id="ab-gift-success-preview" style="position:sticky;top:0;z-index:20000;padding:12px;text-align:center;background:#fff3cc;color:#654600;font:600 14px/1.5 sans-serif">LOCAL GIFT DEMO · TEST-GIFT-001 · Sample paid confirmation · No real order or payment was made</aside>');
  }
  // Match production: presentation styles must precede the first Angular paint.
  res.type('html').send(html.replace('</head>', snippets + '</head>'));
});
app.use(express.static(ui));
app.listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('Storefront preview: http://localhost:' + (process.env.PORT || 3000)));
