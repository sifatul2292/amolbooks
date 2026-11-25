// Read-only local demonstration using the real order calculator, schema and admin page.
// No database connection, orders, payments, SMS or courier requests are made.
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const deps=path.join(root,'api/node_modules');
require(deps+'/reflect-metadata');
const express=require(deps+'/express');
const mongoose=require(deps+'/mongoose');
const {OrderService}=require('../api/dist/pages/sales/order/order.service');
const {OrderSchema}=require('../api/dist/schema/order.schema');
const {customerManagerPages}=require('../api/dist/pages/customer-manager/customer-manager-pages');
async function fixture(){
 const book={_id:'000000000000000000000001',name:'প্রোডাক্টিভ মুসলিম',nameEn:'Productive Muslim',salePrice:500,discountType:2,discountAmount:185};
 const service=Object.create(OrderService.prototype);
 service.productModel={find:async()=>[book]};
 service.utilsService={transform:(p,field,qty=1)=>(field==='discountAmount'?185:field==='salePrice'?315:500)*qty,getDateString:()=> '2026-11-25'};
 service.getProductUnitCostSnapshot=()=>0;
 service.evaluateGiftLine=async()=>({_id:'000000000000000000000002',name:'Amol Notebook',quantity:1,unitPrice:0,salePrice:0,regularPrice:0,orderType:'gift',isGift:true});
 service.calculateCouponDiscount=async()=>0;service.calculateOrderDiscount=async()=>0;
 service.calculateWeightBasedDeliveryCharge=()=>0;service.normalizeAttribution=()=>undefined;
 const data=await service.newOrderMake({name:'Demo Gift Recipient',phoneNo:'01800000002',shippingAddress:'TEST ONLY — House 1, Mirpur, Dhaka',paymentType:'online_payment',isGiftOrder:true,giftWrap:true,deliveryCharge:60,carts:[book._id],cartData:[{product:book._id,cartType:0,selectedQty:1}],gift:{senderName:'Demo Gift Sender',senderPhone:'01700000001',message:'শুভ জন্মদিন! প্রিয় বইগুলো তোমার জন্য।'}});
 const Model=mongoose.models.GiftOrderPanelDemo||mongoose.model('GiftOrderPanelDemo',OrderSchema);
 const record=new Model({...data,_id:'000000000000000000000030',orderId:'TEST-GIFT-001',createdAt:new Date(),orderStatus:1});
 const error=record.validateSync();if(error)throw error;
 return JSON.parse(JSON.stringify(record.toObject()));
}
async function start(){
 const order=await fixture(),app=express();app.use(express.json());
 app.use('/api',(req,res)=>{
  const read=req.method==='GET'||(req.method==='POST'&&/\/get-all(?:$|\?)/.test(req.url));
  if(!read)return res.status(405).json({success:false,message:'Read-only local demo. No live action was performed.'});
  if(req.path==='/order/get-all'){
   let row=order;
   if(req.body.select&&Object.keys(req.body.select).length){row={_id:order._id};for(const key of Object.keys(req.body.select)){if(req.body.select[key]&&order[key]!==undefined)row[key]=order[key];}}
   return res.json({success:true,data:[row],count:1,calculation:{grandTotal:order.grandTotal}});
  }
  if(req.path==='/order/'+order._id)return res.json({success:true,data:order});
  return res.json({success:true,data:[],count:0,calculation:{grandTotal:0}});
 });
 const pages=customerManagerPages(root);
 app.get('/upload/static/custom-orders.html',(req,res,next)=>{
  const send=res.send.bind(res);
  res.send=function(html){
   if(typeof html==='string'){
    html=html.replace("function getToken() { return localStorage.getItem('co_admin_token') || null; }","function getToken() { return 'LOCAL_GIFT_DEMO'; }");
    html=html.replace(/<script id="ab-staff-(?:live|attribution)"[\s\S]*?<\/script>/g,'');
    const banner='<aside style="position:sticky;top:0;z-index:9999;padding:12px;text-align:center;background:#fff3cc;color:#654600;font:600 14px sans-serif">LOCAL DEMO — TEST-GIFT-001 · Not a real order · Online payment pending · All changes disabled</aside>';
    html=html.replace('</head>','<style>#productsModal{top:64px!important}#productsModal .modal-box{max-height:calc(100dvh - 80px)!important}@media(max-width:768px){#productsModal .modal-box{height:calc(100dvh - 80px)!important}}</style></head>');
    html=html.replace('<body>', '<body>'+banner);
    html=html.replace(/<\/body>(?=\s*<\/html>\s*$)/,'<script>var demoWait=setInterval(function(){var button=document.querySelector(\'[onclick*=\"openProducts\"]\');if(button){clearInterval(demoWait);button.click();}},100);</script></body>');
   }
   return send(html);
  };
  pages(req,res,next);
 });
 app.get('/incomplete-order-editor.js',(_req,res)=>res.type('js').send('// Editing is disabled in this read-only demonstration.'));
 app.get('/',(_req,res)=>res.redirect('/upload/static/custom-orders.html'));
 const server=app.listen(Number(process.env.PORT||3003),'127.0.0.1',()=>console.log('Read-only gift order panel: http://localhost:'+server.address().port+'/upload/static/custom-orders.html'));
 return server;
}
if(require.main===module)start().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={fixture,start};
