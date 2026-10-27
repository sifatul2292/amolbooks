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
const snippetNames = [...main.match(/const storefrontSnippetFiles = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
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
app.use('/api', proxy);
app.use('/storefront-catalog', proxy);
const ui = path.join(root, 'ui/dist/angular-ui/browser');
app.get('*', (req, res, next) => {
  if (/\.[a-z0-9]+$/i.test(req.path)) return next();
  let html = fs.readFileSync(path.join(ui, 'index.html'), 'utf8');
  html = html.replace(/<!-- amol-storefront-snippets:start -->[\s\S]*?<!-- amol-storefront-snippets:end -->/g, '');
  const snippets = snippetNames.map(name => fs.readFileSync(path.join(root, 'gtm-snippets', name), 'utf8')).join('\n');
  // Match production: presentation styles must precede the first Angular paint.
  res.type('html').send(html.replace('</head>', snippets + '</head>'));
});
app.use(express.static(ui));
app.listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('Storefront preview: http://localhost:' + (process.env.PORT || 3000)));
