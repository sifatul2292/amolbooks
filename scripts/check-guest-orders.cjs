// Real isolated Mongo/Nest tests. Never uses production credentials, SMS, or orders.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
const {createRequire,Module}=require('node:module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'api/dist'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter);Module._initPaths();
const lib=createRequire(path.join(root,'api/package.json'));
const mongoose=lib('mongoose');
const {NestFactory}=lib('@nestjs/core');
const {Module:NestModule}=lib('@nestjs/common');
const {ThrottlerModule,ThrottlerGuard}=lib('@nestjs/throttler');
const {APP_GUARD}=lib('@nestjs/core');
const {GuestOrderAccessSchema}=require('../api/dist/pages/guest-orders/guest-order-access.schema');
const {GuestOrdersService}=require('../api/dist/pages/guest-orders/guest-orders.service');
const {GuestOrdersController}=require('../api/dist/pages/guest-orders/guest-orders.controller');
const {normalizeOrderPhone,orderPhoneAliases,canCustomerCancel}=require('../api/dist/pages/guest-orders/guest-orders.policy');
const {OrderSchema}=require('../api/dist/schema/order.schema');
const {ProductSchema}=require('../api/dist/schema/product.schema');
const {StockMovementSchema}=require('../api/dist/schema/stock-movement.schema');
const {OrderService}=require('../api/dist/pages/sales/order/order.service');
const {BulkSmsService}=require('../api/dist/shared/bulk-sms/bulk-sms.service');
const crypto=require('node:crypto');
let failedConnection;
const serve=process.argv.includes('--serve');
const dbName='amol_guest_orders_test_'+crypto.randomBytes(7).toString('hex');
const PHONE='01700000000',OTHER='01800000000';
function httpCall(port,method,url,body,token){return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):'';const req=http.request({hostname:'127.0.0.1',port,path:url,method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(text)}));});req.on('error',reject);req.end(data);});}
(async()=>{
 assert.equal(normalizeOrderPhone('+880 1700-000000'),PHONE);assert.equal(normalizeOrderPhone('০১৭০০০০০০০০'),PHONE);
 assert.throws(()=>normalizeOrderPhone('01700000000.*'));
 const connection=await mongoose.createConnection('mongodb://127.0.0.1:27017/'+dbName,{serverSelectionTimeoutMS:3000}).asPromise();
 failedConnection=connection;
 const Access=connection.model('GuestOrderAccess',GuestOrderAccessSchema);
 const Order=connection.model('Order',OrderSchema);
 const Product=connection.model('Product',ProductSchema.clone().set('autoIndex',false));
 const Movement=connection.model('StockMovement',StockMovementSchema);
 await Promise.all([Access.init(),Order.init(),Product.init(),Movement.init()]);
 const orderService=Object.create(OrderService.prototype);
 Object.assign(orderService,{orderModel:Order,productModel:Product,stockMovementModel:Movement,logger:{error(){},warn(){},log(){}}});
 const codes=new Map();let sends=0;let failSms=false;
 const sms={sendOrderAccessOtp:async(phone,message)=>{if(failSms)throw Error('SMS unavailable');sends++;codes.set(phone,message.match(/\b\d{6}\b/)[0]);}};
 const service=new GuestOrdersService(Access,Order,sms,orderService);
 // Sandbox only: expose a disposable test code, with no production hook/provider bypass.
 if(serve){const actual=service.requestCode.bind(service);service.requestCode=async input=>({...await actual(input),developmentCode:codes.get(normalizeOrderPhone(input))});}
 class TestModule{}
 NestModule({imports:[ThrottlerModule.forRoot({ttl:60,limit:120})],controllers:[GuestOrdersController],providers:[{provide:APP_GUARD,useClass:ThrottlerGuard},{provide:GuestOrdersService,useValue:service}]})(TestModule);
 const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api');
 await app.listen(serve?3012:0,'127.0.0.1');const port=app.getHttpServer().address().port;
 const productId=new mongoose.Types.ObjectId();
 await Product.collection.insertOne({_id:productId,name:'পরীক্ষার বই — প্রকৃত অর্ডার নয়',stock:8});
 async function seed(overrides={}){const id=new mongoose.Types.ObjectId();const doc={_id:id,orderId:'DEMO-'+id.toString().slice(-7),name:'Demo customer',phoneNo:PHONE,orderStatus:1,paymentType:'cash_on_delivery',paymentStatus:'unpaid',grandTotal:560,deliveryCharge:60,stockDecremented:true,stockRestocked:false,orderedItems:[{_id:productId,name:'পরীক্ষার বই — প্রকৃত অর্ডার নয়',quantity:2,salePrice:250}],createdAt:new Date(),updatedAt:new Date(),...overrides};await Order.collection.insertOne(doc);return doc;}
 if(serve){await seed({orderStatus:2,paymentStatus:'paid',paymentType:'online_payment'});await seed({orderStatus:4,courierData:{consignmentId:'TEST-ONLY'}});await seed();console.log('Guest order sandbox at http://127.0.0.1:3012 — phone '+PHONE+'; no real SMS or orders.');const stop=async()=>{await app.close();await connection.dropDatabase();await connection.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);return;}
 try{
  await assert.rejects(service.verifiedPhone(''),/মোবাইল/);
  const sent=await service.requestCode(PHONE);assert.equal(sent.success,true);assert.equal(JSON.stringify(sent).includes(codes.get(PHONE)),false);
  await assert.rejects(service.requestCode('+88'+PHONE),error=>error.status===429);
  const otp=codes.get(PHONE);const stored=await Access.findOne({phoneNo:PHONE}).lean();assert.notEqual(stored.codeHash,otp);assert.equal(stored.code,undefined);
  const verifies=await Promise.allSettled([service.verifyCode(PHONE,otp),service.verifyCode(PHONE,otp)]);
  assert.equal(verifies.filter(result=>result.status==='fulfilled').length,1,'OTP is single-use under concurrent verification');
  const token=verifies.find(result=>result.status==='fulfilled').value.data.token;const auth='Bearer '+token;
  const own=await seed();const other=await seed({phoneNo:OTHER});await seed({phoneNo:'+88'+PHONE});
  const listing=await service.list(auth);assert.equal(listing.data.length,2);assert.equal(listing.data.some(order=>String(order._id)===String(other._id)),false);
  assert.equal(JSON.stringify(listing).includes('Demo customer'),false);assert.equal(JSON.stringify(listing).includes('phoneNo'),false);
  await assert.rejects(service.cancel(auth,String(other._id),'wrong owner'),error=>error.status===404);
  const results=await Promise.all([service.cancel(auth,String(own._id),'test'),service.cancel(auth,String(own._id),'retry')]);assert.ok(results.every(result=>result.success));
  assert.equal((await Product.findById(productId)).stock,10,'Restore once for parallel cancellation');assert.equal(await Movement.countDocuments({referenceId:own._id}),1);
  assert.equal((await Order.findById(own._id)).orderStatus,6);
  await assert.rejects(orderService.claimCourierBooking(String(own._id)),error=>error.status===409);
  let calls=0;orderService.courierService={createOrderWithProvider:async()=>{calls++;throw Error('must not call');}};
  await assert.rejects(orderService.addSingleOrderToCourier({orderStatus:8,id:String(own._id),courierMethod:{providerName:'Steadfast Courier'}}));assert.equal(calls,0);
  await orderService.addMultipleOrderToCourier({orderStatus:8,mIds:[own._id],courierMethod:{providerName:'Steadfast Courier'}});assert.equal(calls,0);
  for(const fields of [{orderStatus:4},{orderStatus:5},{courierData:{consignmentId:'x'}},{courierLink:'https://example.com/track'},{stockOperationInProgress:true},{courierBookingStartedAt:new Date()}]){
    const order=await seed(fields);assert.equal(canCustomerCancel(order),false);await assert.rejects(service.cancel(auth,String(order._id),''),error=>error.status===409);
  }
  const race=await seed();const raced=await Promise.allSettled([service.cancel(auth,String(race._id),''),orderService.claimCourierBooking(String(race._id))]);
  const racedDoc=await Order.findById(race._id).lean();assert.notEqual(Boolean(racedDoc.customerCancelledAt),Boolean(racedDoc.courierBookingStartedAt),'Cancellation and booking cannot both win');assert.equal(raced.filter(result=>result.status==='fulfilled').length,1);
  const paid=await seed({paymentStatus:'paid',paymentType:'online_payment'});const paidResult=await service.cancel(auth,String(paid._id),'');assert.equal(paidResult.data.refundReviewRequired,true);assert.equal((await Order.findById(paid._id)).paymentStatus,'paid','Never claim a refund occurred');
  orderService.utilsService={getLocalDateTime:()=>new Date(),getDateString:()=> '2026-10-26'};
  await orderService.changeOrderStatus(String(paid._id),{orderStatus:7});
  assert.equal((await Order.findById(paid._id)).orderStatus,7,'Staff can record a refund without reopening a cancelled order');
  const refundedList=await service.list(auth);assert.equal(refundedList.data.find(order=>String(order._id)===String(paid._id)).refundReviewRequired,false);
  // Crash/retry: after a product has been restored, replay cannot increment it again.
  await Order.updateOne({_id:own._id},{$unset:{customerRestockCompletedAt:1},$set:{stockRestocked:false}});const before=(await Product.findById(productId)).stock;await orderService.reconcileCustomerCancellationStock();assert.equal((await Product.findById(productId)).stock,before);
  const beforeCancelledStock=(await Product.findById(productId)).stock;
  await orderService.processOrderBackgroundTasks(await Order.findById(own._id),{});assert.equal((await Product.findById(productId)).stock,beforeCancelledStock,'Late background work cannot deduct a cancelled order');
  await assert.rejects(orderService.updateOrderByAdmin(String(own._id),{orderStatus:2},{}));
  assert.equal((await Order.findById(own._id)).orderStatus,6,'A stale staff screen cannot reopen a customer cancellation');
  const processingOrder=await seed({stockDecremented:false});
  let release,started;
  const blocked=new Promise(resolve=>{release=resolve;});const began=new Promise(resolve=>{started=resolve;});
  const actualDecrease=orderService.decreaseProductStock.bind(orderService);
  orderService.decreaseProductStock=async(...args)=>{started();await blocked;return actualDecrease(...args);};
  const baselineStock=(await Product.findById(productId)).stock;
  const processing=orderService.processOrderBackgroundTasks(processingOrder,{});await began;
  await assert.rejects(service.cancel(auth,String(processingOrder._id),''),error=>error.status===409);
  release();await processing;orderService.decreaseProductStock=actualDecrease;
  await service.cancel(auth,String(processingOrder._id),'');assert.equal((await Product.findById(productId)).stock,baselineStock);
  assert.equal((await Product.findById(productId)).inventoryRestockKeys,undefined,'Internal retry markers are excluded from normal catalogue reads');
  const internalProduct=await Product.findById(productId).select('+inventoryRestockKeys').lean();assert.ok(internalProduct.inventoryRestockKeys.every(key=>/^[a-f0-9]{32}$/.test(key)),'Catalogue markers cannot disclose order IDs');
  const guessed='01900000000';await service.requestCode(guessed);const good=codes.get(guessed);
  for(let i=0;i<5;i++)await assert.rejects(service.verifyCode(guessed,good==='111111'?'222222':'111111'),error=>error.status===401);
  await assert.rejects(service.verifyCode(guessed,good),error=>error.status===401);
  const expired='01600000000';await service.requestCode(expired);await Access.updateOne({phoneNo:expired},{$set:{codeExpiresAt:new Date(0)}});await assert.rejects(service.verifyCode(expired,codes.get(expired)),error=>error.status===401);
  failSms=true;await assert.rejects(service.requestCode('01500000000'),error=>error.status===503);assert.equal((await Access.findOne({phoneNo:'01500000000'})).codeHash,undefined);failSms=false;
  await assert.rejects(service.verifiedPhone('Bearer '+'a'.repeat(64)),error=>error.status===401);
  const denied=await httpCall(port,'GET','/api/guest-orders');assert.equal(denied.status,401);assert.equal(denied.headers['cache-control'],'no-store');
  const injection=await httpCall(port,'POST','/api/guest-orders/request-code',{phoneNo:{$ne:null}});assert.equal(injection.status,400);
  const scoped=await httpCall(port,'GET','/api/guest-orders?phoneNo='+OTHER,null,token);assert.equal(scoped.status,200);assert.equal(scoped.data.data.some(order=>String(order._id)===String(other._id)),false);
  const extra=await httpCall(port,'POST','/api/guest-orders/'+own._id+'/cancel',{phoneNo:OTHER},token);assert.equal(extra.status,400);
  for(let i=0;i<25;i++)await seed();
  const seen=new Set();let cursor;
  do{const page=await service.list(auth,cursor);page.data.forEach(order=>{assert.equal(seen.has(String(order._id)),false);seen.add(String(order._id));});cursor=page.nextCursor;}while(cursor);
  assert.equal(seen.size,await Order.countDocuments({phoneNo:{$in:orderPhoneAliases(PHONE)}}),'Pagination covers the verified phone only');
  const indexes=await Access.collection.indexes();assert.ok(indexes.some(index=>index.key.phoneNo&&index.unique));assert.ok(indexes.some(index=>index.key.purgeAt&&index.expireAfterSeconds===0));
  const hourly='01300000000';
  for(let i=0;i<5;i++){await Access.updateOne({phoneNo:hourly},{$set:{resendAfter:new Date(0)}});await service.requestCode(hourly);}
  await Access.updateOne({phoneNo:hourly},{$set:{resendAfter:new Date(0)}});await assert.rejects(service.requestCode(hourly),error=>error.status===429);
  const simultaneous='01400000000';const sentBefore=sends;const attempts=await Promise.allSettled([service.requestCode(simultaneous),service.requestCode(simultaneous)]);assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);assert.equal(sends,sentBefore+1,'One resend per number under concurrency');
  // A simulated interrupted two-product restock recovers exactly the missing item.
  const secondProduct=new mongoose.Types.ObjectId();await Product.collection.insertOne({_id:secondProduct,name:'Second test book',stock:5});
  const interrupted=await seed({orderedItems:[{_id:productId,quantity:2},{_id:secondProduct,quantity:3}]});
  const actualUpdate=Product.findOneAndUpdate.bind(Product);let failOnce=true;
  Product.findOneAndUpdate=function(filter,...rest){if(String(filter._id)===String(secondProduct)&&failOnce){failOnce=false;throw Error('test interruption');}return actualUpdate(filter,...rest);};
  const stockBefore=(await Product.findById(productId)).stock;
  await service.cancel(auth,String(interrupted._id),'');assert.equal((await Order.findById(interrupted._id)).customerRestockCompletedAt,undefined);
  Product.findOneAndUpdate=actualUpdate;await orderService.reconcileCustomerCancellationStock();assert.equal((await Product.findById(productId)).stock,stockBefore+2);assert.equal((await Product.findById(secondProduct)).stock,8);assert.ok((await Order.findById(interrupted._id)).customerRestockCompletedAt);
  const throttles=[];for(let i=0;i<3;i++)throttles.push(await httpCall(port,'POST','/api/guest-orders/request-code',{phoneNo:'invalid'}));assert.equal(throttles[2].status,429,'Per-IP OTP throttle is active');
  await service.logout(auth);await assert.rejects(service.list(auth),error=>error.status===401);
  // The strict sender must fail closed on missing credentials and gateway rejection.
  const missing=new BulkSmsService({}, {get:()=>null});await assert.rejects(missing.sendOrderAccessOtp(PHONE,'test'),error=>error.status===503);
  const {of}=lib('rxjs');const failed=new BulkSmsService({post:()=>of({data:[{status:'FAILED'}]})},{get:()=> 'test-only'});await assert.rejects(failed.sendOrderAccessOtp(PHONE,'test'),error=>error.status===503);
  const success=new BulkSmsService({post:()=>of({data:[{status:'SENT'}]})},{get:()=> 'test-only'});await success.sendOrderAccessOtp(PHONE,'test');
  new (require('node:vm').Script)(fs.readFileSync(path.join(root,'gtm-snippets/guest-orders.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]);
  console.log('Guest orders: OTP, ownership, expiry, HTTP validation, concurrent cancellation, inventory recovery and courier exclusion pass');
 } finally{await app.close();await connection.dropDatabase();await connection.close();}
})().catch(async error=>{console.error(error);if(failedConnection&&failedConnection.readyState===1){await failedConnection.dropDatabase();await failedConnection.close();}process.exitCode=1;});
