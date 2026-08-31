"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const order_enum_1 = require("../../../enum/order.enum");
const bulk_sms_service_1 = require("../../../shared/bulk-sms/bulk-sms.service");
const email_service_1 = require("../../../shared/email/email.service");
const product_enum_1 = require("../../../enum/product.enum");
const courier_service_1 = require("../../../shared/courier/courier.service");
const schedule = require("node-schedule");
const crypto = require("crypto");
const analytics_service_1 = require("../../../shared/analytics/analytics.service");
const special_package_price_util_1 = require("../../../shared/utils/special-package-price.util");
const ObjectId = mongoose_2.Types.ObjectId;
const FREE_NOTEBOOK_MIN_AMOUNT = 499;
const RECENT_BUYERS_TTL_MS = 120000;
const recentBuyersCache = new Map();
const WEBSITE_PURCHASE_GRACE_MS = 20 * 60 * 1000;
const META_EVENT_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;
let OrderService = OrderService_1 = class OrderService {
    constructor(adminModel, orderModel, incompleteOrderModel, productModel, specialPackageModel, uniqueIdModel, cartModel, userModel, settingModel, couponModel, courierService, shopInformationModel, orderOfferModel, stockMovementModel, configService, utilsService, bulkSmsService, emailService, analyticsService) {
        this.adminModel = adminModel;
        this.orderModel = orderModel;
        this.incompleteOrderModel = incompleteOrderModel;
        this.productModel = productModel;
        this.specialPackageModel = specialPackageModel;
        this.uniqueIdModel = uniqueIdModel;
        this.cartModel = cartModel;
        this.userModel = userModel;
        this.settingModel = settingModel;
        this.couponModel = couponModel;
        this.courierService = courierService;
        this.shopInformationModel = shopInformationModel;
        this.orderOfferModel = orderOfferModel;
        this.stockMovementModel = stockMovementModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.bulkSmsService = bulkSmsService;
        this.emailService = emailService;
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(OrderService_1.name);
        this.steadfastBackfillRunning = false;
        this.steadfastInReviewSyncRunning = false;
        this.steadfastInReviewSyncCompletedAt = 0;
        this.steadfastInReviewSyncResult = null;
        this.steadfastMissingChargeSyncRunning = false;
        this.steadfastMissingChargeSyncCompletedAt = 0;
        this.websitePurchaseGapFillRunning = false;
        this.checkAndUpdateCourierStatus();
        this.scheduleManualMetaPurchaseRetries();
        this.scheduleWebsitePurchaseGapFill();
    }
    getSteadfastDeliveryCharge(payload) {
        var _a, _b, _c, _d;
        const candidates = [
            payload === null || payload === void 0 ? void 0 : payload.delivery_charge,
            payload === null || payload === void 0 ? void 0 : payload.delivery_fee,
            (_a = payload === null || payload === void 0 ? void 0 : payload.consignment) === null || _a === void 0 ? void 0 : _a.delivery_charge,
            (_b = payload === null || payload === void 0 ? void 0 : payload.consignment) === null || _b === void 0 ? void 0 : _b.delivery_fee,
            (_c = payload === null || payload === void 0 ? void 0 : payload.data) === null || _c === void 0 ? void 0 : _c.delivery_charge,
            (_d = payload === null || payload === void 0 ? void 0 : payload.data) === null || _d === void 0 ? void 0 : _d.delivery_fee,
        ];
        for (const candidate of candidates) {
            if (candidate === null || candidate === undefined || candidate === '') {
                continue;
            }
            const charge = Number(candidate);
            if (Number.isFinite(charge) && charge >= 0)
                return charge;
        }
        return undefined;
    }
    async addOrderAdmin(admin, addOrderDto) {
        if (!admin || !admin._id) {
            this.logger.error('Admin data is missing in addOrderAdmin');
            throw new common_1.BadRequestException('Admin authentication failed: Admin data is missing');
        }
        const manualOrderRequestId = String(addOrderDto.manualOrderRequestId || '').trim();
        if (manualOrderRequestId) {
            const existingOrder = await this.orderModel
                .findOne({ manualOrderRequestId })
                .select('_id orderId')
                .maxTimeMS(5000)
                .lean();
            if (existingOrder) {
                return {
                    success: true,
                    message: 'Order already created',
                    data: existingOrder,
                };
            }
        }
        let user;
        let mData;
        const adminData = await this.adminModel.findById(admin._id).maxTimeMS(5000);
        const incOrder = await this.uniqueIdModel.findOneAndUpdate({}, { $inc: { orderId: 1 } }, { new: true, upsert: true, maxTimeMS: 5000 });
        const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);
        const dataExtra = {
            orderId: orderIdUnique,
            month: this.utilsService.getDateMonth(false, new Date()),
            year: this.utilsService.getDateYear(new Date()),
        };
        if (addOrderDto.phoneNo && !addOrderDto.user) {
            user = await this.userModel
                .findOne({ phoneNo: addOrderDto.phoneNo })
                .maxTimeMS(5000);
            if (user) {
                mData = Object.assign(Object.assign(Object.assign({}, addOrderDto), dataExtra), { user: user._id });
            }
            else {
                mData = Object.assign(Object.assign({}, addOrderDto), dataExtra);
            }
        }
        else {
            mData = Object.assign(Object.assign(Object.assign({}, addOrderDto), dataExtra), adminData);
        }
        const convertedIncomplete = addOrderDto.incompleteOrderId &&
            ObjectId.isValid(addOrderDto.incompleteOrderId)
            ? await this.incompleteOrderModel
                .findById(addOrderDto.incompleteOrderId)
                .select('attribution')
                .lean()
            : null;
        const adminManualSource = this.normalizeManualOrderSource(addOrderDto.incompleteOrderId ? 'phone' : addOrderDto.manualOrderSource, 'whatsapp');
        mData.manualOrderSource = adminManualSource;
        mData.orderFrom = this.manualOrderLabel(adminManualSource);
        mData.orderOrigin = addOrderDto.incompleteOrderId
            ? 'incomplete'
            : 'admin';
        mData.attribution = this.normalizeAttribution((convertedIncomplete === null || convertedIncomplete === void 0 ? void 0 : convertedIncomplete.attribution) || addOrderDto.attribution);
        mData = this.normalizeAdminOrderData(mData);
        mData.orderedItems = await this.attachCostSnapshots(mData.orderedItems);
        const newData = new this.orderModel(mData);
        try {
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
                orderId: saveData.orderId,
            };
            const response = {
                success: true,
                message: 'Order Added Success',
                data,
            };
            this.processAdminOrderBookkeeping(saveData, addOrderDto).catch((error) => {
                this.logger.error(`Admin bookkeeping failed for order ${saveData.orderId}:`, error);
            });
            this.sendManualOrderToMeta(saveData, adminManualSource).catch((error) => {
                this.logger.error(`Manual-order CAPI task failed for order ${saveData.orderId}:`, error);
            });
            this.processOrderBackgroundTasks(saveData, addOrderDto).catch((error) => {
                this.logger.error(`Error in background order processing for order ${saveData.orderId}:`, error);
            });
            return response;
        }
        catch (error) {
            if (manualOrderRequestId && Number(error === null || error === void 0 ? void 0 : error.code) === 11000) {
                const existingOrder = await this.orderModel
                    .findOne({ manualOrderRequestId })
                    .select('_id orderId')
                    .maxTimeMS(5000)
                    .lean();
                if (existingOrder) {
                    return {
                        success: true,
                        message: 'Order already created',
                        data: existingOrder,
                    };
                }
            }
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async processAdminOrderBookkeeping(saveData, addOrderDto) {
        if (addOrderDto.incompleteOrderId) {
            try {
                await this.markIncompleteOrderConverted(addOrderDto.incompleteOrderId, saveData.orderId);
            }
            catch (error) {
                this.logger.warn(`Order ${saveData.orderId} was created, but incomplete order conversion marking failed:`, (error === null || error === void 0 ? void 0 : error.message) || error);
            }
        }
        for (const item of addOrderDto['orderedItems'] || []) {
            try {
                if (!(item === null || item === void 0 ? void 0 : item._id) || !ObjectId.isValid(item._id))
                    continue;
                const quantity = Number(item.quantity) || 0;
                if (quantity <= 0)
                    continue;
                await this.productModel.findByIdAndUpdate(item._id, {
                    $inc: { totalSold: quantity },
                });
            }
            catch (error) {
                this.logger.warn(`Order ${saveData.orderId} was created, but totalSold update failed for product ${item === null || item === void 0 ? void 0 : item._id}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
            }
        }
    }
    async trackManualOrderMetaAdmin(admin, orderId, source) {
        if (!admin || !admin._id) {
            throw new common_1.BadRequestException('Admin authentication failed');
        }
        const order = await this.orderModel.findById(orderId);
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const manualOrderSource = this.normalizeManualOrderSource(source || 'whatsapp');
        await this.orderModel.updateOne({ _id: order._id }, {
            $set: {
                orderFrom: this.manualOrderLabel(manualOrderSource),
                manualOrderSource,
            },
        });
        await this.sendManualOrderToMeta(order, manualOrderSource);
        const result = await this.orderModel
            .findById(order._id)
            .select('metaPurchaseStatus metaPurchaseEventId metaPurchaseError metaPurchaseDeliveryChannel tagiooPurchaseEventId tagiooPurchaseError')
            .lean();
        const sent = (result === null || result === void 0 ? void 0 : result.metaPurchaseStatus) === 'sent';
        return {
            success: sent,
            message: sent
                ? 'Manual Purchase acknowledged by Meta'
                : (result === null || result === void 0 ? void 0 : result.metaPurchaseError) || 'Manual Purchase was not sent to Meta',
            data: result,
        };
    }
    async getManualOrderRequestStatusAdmin(admin, requestId) {
        if (!admin || !admin._id) {
            throw new common_1.BadRequestException('Admin authentication failed');
        }
        const normalizedRequestId = String(requestId || '')
            .trim()
            .slice(0, 120);
        if (!/^ai_[A-Za-z0-9_-]+$/.test(normalizedRequestId)) {
            throw new common_1.BadRequestException('Invalid manual order request ID');
        }
        const order = await this.orderModel
            .findOne({ manualOrderRequestId: normalizedRequestId })
            .select('_id orderId')
            .maxTimeMS(5000)
            .lean();
        return {
            success: true,
            message: order ? 'Order created' : 'Order is still processing',
            data: order
                ? { status: 'completed', _id: order._id, orderId: order.orderId }
                : { status: 'pending' },
        };
    }
    async addAiAssistOrderAdmin(admin, addOrderDto) {
        if (!admin || !admin._id) {
            throw new common_1.BadRequestException('Admin authentication failed');
        }
        const rawCart = Array.isArray(addOrderDto.cartData)
            ? addOrderDto.cartData
            : [];
        const selections = rawCart
            .map((item) => ({
            productId: String((item === null || item === void 0 ? void 0 : item.product) || ''),
            quantity: Math.max(1, Math.floor(Number(item === null || item === void 0 ? void 0 : item.selectedQty) || 1)),
        }))
            .filter((item) => ObjectId.isValid(item.productId));
        if (!selections.length) {
            throw new common_1.BadRequestException('Please select at least one product');
        }
        const products = await this.productModel
            .find({ _id: { $in: selections.map((item) => item.productId) } })
            .maxTimeMS(8000)
            .lean();
        const productById = new Map(products.map((product) => [String(product._id), product]));
        if (productById.size !==
            new Set(selections.map((item) => item.productId)).size) {
            throw new common_1.BadRequestException('One or more selected products are no longer available');
        }
        const orderedItems = selections.map((selection) => {
            var _a;
            const product = productById.get(selection.productId);
            const regularPrice = this.utilsService.transform(product, 'regularPrice');
            const salePrice = this.utilsService.transform(product, 'salePrice');
            return {
                _id: String(product._id),
                name: product.name,
                nameEn: product.nameEn,
                slug: product.slug,
                image: ((_a = product.images) === null || _a === void 0 ? void 0 : _a[0]) || null,
                author: product.author,
                category: product.category,
                subCategory: product.subCategory,
                publisher: product.publisher,
                brand: product.brand,
                regularPrice,
                unitPrice: salePrice,
                salePrice,
                quantity: selection.quantity,
                orderType: 'regular',
                discountType: product.discountType,
                discountAmount: product.discountAmount,
            };
        });
        const subTotal = orderedItems.reduce((sum, item) => sum + item.regularPrice * item.quantity, 0);
        const saleTotal = orderedItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
        const deliveryCharge = Math.max(0, Number(addOrderDto.deliveryCharge) || 0);
        const manualOrderDto = Object.assign(Object.assign({}, addOrderDto), { orderedItems,
            subTotal, discount: Math.max(0, subTotal - saleTotal), deliveryCharge, grandTotal: saleTotal + deliveryCharge, paymentStatus: addOrderDto.paymentStatus || 'unpaid', orderStatus: order_enum_1.OrderStatus.PENDING, manualOrderSource: 'whatsapp', orderFrom: 'WhatsApp' });
        return this.addOrderAdmin(admin, manualOrderDto);
    }
    async addOrder(addOrderDto, req) {
        var _a, _b, _c;
        try {
            let newOrderMake;
            const fraudCheckerData = null;
            const orderInput = Object.assign({}, addOrderDto);
            orderInput.orderFrom = 'Website';
            orderInput.orderOrigin = 'website';
            delete orderInput.manualOrderSource;
            if (req) {
                orderInput.attribution = Object.assign(Object.assign({}, (orderInput.attribution || {})), { clientUserAgent: ((_a = orderInput.attribution) === null || _a === void 0 ? void 0 : _a.clientUserAgent) ||
                        ((_b = req.headers) === null || _b === void 0 ? void 0 : _b['user-agent']), clientIpAddress: ((_c = orderInput.attribution) === null || _c === void 0 ? void 0 : _c.clientIpAddress) ||
                        this.utilsService.getClientIp(req) });
            }
            newOrderMake = await this.newOrderMake(orderInput);
            const incOrder = await this.uniqueIdModel.findOneAndUpdate({}, { $inc: { orderId: 1 } }, { new: true, upsert: true });
            const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);
            const dataExtra = {
                orderId: orderIdUnique,
                month: this.utilsService.getDateMonth(false, new Date()),
                year: this.utilsService.getDateYear(new Date()),
            };
            newOrderMake.orderedItems = await this.attachCostSnapshots(newOrderMake.orderedItems);
            const mData = Object.assign(Object.assign({}, newOrderMake), dataExtra);
            const newData = new this.orderModel(mData);
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
                orderId: saveData.orderId,
            };
            await this.cleanupIncompleteOrdersForPlacedOrder(saveData, addOrderDto.incompleteOrderId);
            const response = {
                success: true,
                message: 'Order Added Success',
                data,
            };
            this.processOrderBackgroundTasks(saveData, orderInput).catch((error) => {
                this.logger.error(`Error in background order processing for order ${saveData.orderId}:`, error);
            });
            this.sendWebsiteOrderToMeta(saveData).catch((error) => {
                this.logger.error(`Website-order CAPI task failed for order ${saveData.orderId}:`, error);
            });
            return response;
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async processOrderBackgroundTasks(saveData, addOrderDto) {
        try {
            const stockDecremented = await this.decreaseProductStock(saveData._id, saveData === null || saveData === void 0 ? void 0 : saveData.orderedItems);
            if (stockDecremented) {
                await this.orderModel.updateOne({ _id: saveData._id }, { $set: { stockDecremented: true } });
            }
            if (addOrderDto.phoneNo) {
                try {
                    const fraudCheckerData = await this.courierService.checkFraudOrder(addOrderDto.phoneNo);
                    if (fraudCheckerData && !fraudCheckerData.summary) {
                        this.logger.warn(`Fraud checker response missing summary for phone: ${addOrderDto.phoneNo}`);
                    }
                    if (fraudCheckerData) {
                        await this.orderModel.updateOne({ _id: saveData._id }, { $set: { fraudChecker: fraudCheckerData } });
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to fetch fraud checker data for phone: ${addOrderDto === null || addOrderDto === void 0 ? void 0 : addOrderDto.phoneNo}`, (error === null || error === void 0 ? void 0 : error.message) || error);
                }
            }
            if (addOrderDto.phoneNo && !addOrderDto.incompleteOrderId) {
                await this.incompleteOrderModel.deleteMany({
                    phoneNo: addOrderDto.phoneNo,
                    status: { $ne: 'converted' },
                });
            }
            if (addOrderDto.user && saveData._id) {
                await this.cartModel.deleteMany({
                    user: new ObjectId(addOrderDto.user),
                });
                await this.userModel.findOneAndUpdate({ _id: addOrderDto.user }, {
                    $set: {
                        carts: [],
                    },
                });
                if (addOrderDto.coupon) {
                    await this.userModel.findOneAndUpdate({ _id: addOrderDto.user }, {
                        $push: {
                            usedCoupons: addOrderDto.coupon,
                        },
                    });
                }
            }
            await this.utilsService.generateInvoicePdf(saveData);
            const pdfLink = `https://api.alambook.com/invoice/invoice-${saveData.orderId}.pdf`;
            if (saveData['paymentType'] === 'cash_on_delivery') {
                const orderCheck = await this.orderModel
                    .findById(saveData._id)
                    .select('orderSmsSent');
                if (!(orderCheck === null || orderCheck === void 0 ? void 0 : orderCheck.orderSmsSent)) {
                    const message = `অর্ডারটি কনফার্ম হয়েছে, ৩ দিনের মধ্যে ডেলিভারি করা হবে, amolbooks.com`;
                    this.bulkSmsService.sentSingleSms(saveData.phoneNo, message);
                    await this.orderModel.updateOne({ _id: saveData._id }, { $set: { orderSmsSent: true } });
                }
                if (saveData.email) {
                    const html = `
      <p>Thank you for your purchase from alambook.com. Your order (${saveData.orderId}) has been placed successfully. Please wait for a confirmation Call. Track your order alambook.com/order-track/${saveData._id}
      </p>
      <iframe src="${pdfLink}" frameborder="0" width="100%" height="500px"></iframe>
      <a href="${pdfLink}">Download your invoice</a>
      `;
                    this.emailService.sendEmail(saveData.email, 'Alambook', html);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error processing background tasks for order ${saveData.orderId}:`, error);
        }
    }
    async receiveSteadfastWebhook(authorization, payload) {
        var _a, _b, _c, _d, _e;
        const configuredToken = this.configService.get('steadfastWebhookToken');
        if (!configuredToken) {
            this.logger.error('STEADFAST_WEBHOOK_TOKEN is not configured');
            throw new common_1.ServiceUnavailableException('Webhook is not configured.');
        }
        const suppliedToken = String(authorization || '').replace(/^Bearer\s+/i, '');
        const expectedHash = crypto
            .createHash('sha256')
            .update(configuredToken)
            .digest();
        const suppliedHash = crypto
            .createHash('sha256')
            .update(suppliedToken)
            .digest();
        if (!suppliedToken || !crypto.timingSafeEqual(expectedHash, suppliedHash)) {
            throw new common_1.UnauthorizedException('Invalid webhook token.');
        }
        if (!payload ||
            !['delivery_status', 'tracking_update'].includes(payload.notification_type) ||
            (payload.consignment_id == null && !payload.invoice)) {
            throw new common_1.BadRequestException('Invalid Steadfast webhook payload.');
        }
        const consignmentId = payload.consignment_id == null
            ? null
            : String(payload.consignment_id).trim();
        const invoice = payload.invoice == null ? null : String(payload.invoice).trim();
        const [byConsignment, byInvoice] = await Promise.all([
            consignmentId
                ? this.orderModel.findOne({
                    'courierData.providerName': 'Steadfast Courier',
                    'courierData.consignmentId': consignmentId,
                })
                : null,
            invoice ? this.orderModel.findOne({ orderId: invoice }) : null,
        ]);
        if (byConsignment &&
            byInvoice &&
            String(byConsignment._id) !== String(byInvoice._id)) {
            throw new common_1.BadRequestException('Consignment ID and invoice identify different orders.');
        }
        const order = byConsignment || byInvoice;
        if (!order) {
            throw new common_1.NotFoundException('Invalid consignment ID or invoice.');
        }
        if (((_a = order.courierData) === null || _a === void 0 ? void 0 : _a.providerName) &&
            order.courierData.providerName !== 'Steadfast Courier') {
            throw new common_1.BadRequestException('Order does not use Steadfast Courier.');
        }
        if (consignmentId &&
            ((_b = order.courierData) === null || _b === void 0 ? void 0 : _b.consignmentId) &&
            String(order.courierData.consignmentId) !== consignmentId) {
            throw new common_1.BadRequestException('Consignment ID does not match invoice.');
        }
        if (invoice && String(order.orderId) !== invoice) {
            throw new common_1.BadRequestException('Invoice does not match consignment ID.');
        }
        const notificationType = payload.notification_type;
        const rawStatus = notificationType === 'delivery_status' && payload.status
            ? String(payload.status).trim().toLowerCase()
            : undefined;
        const updatedAt = payload.updated_at
            ? String(payload.updated_at).trim()
            : new Date().toISOString();
        const trackingMessage = payload.tracking_message
            ? String(payload.tracking_message).trim()
            : undefined;
        const codAmount = payload.cod_amount === null || payload.cod_amount === undefined
            ? undefined
            : Number(payload.cod_amount);
        const deliveryCharge = this.getSteadfastDeliveryCharge(payload);
        const eventKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({
            notificationType,
            consignmentId,
            invoice,
            rawStatus,
            trackingMessage,
            codAmount: Number.isFinite(codAmount) ? codAmount : undefined,
            deliveryCharge,
            updatedAt,
        }))
            .digest('hex');
        const existingHistory = order.courierStatusHistory || [];
        if (existingHistory.some((event) => event.eventKey === eventKey)) {
            return;
        }
        const receivedAt = new Date();
        const historyEvent = {
            eventKey,
            notificationType,
            status: rawStatus,
            trackingMessage,
            updatedAt,
            receivedAt,
        };
        const currentUpdatedAt = (_c = order.courierStatus) === null || _c === void 0 ? void 0 : _c.updatedAt;
        const incomingTimestamp = Date.parse(updatedAt.replace(' ', 'T'));
        const currentTimestamp = currentUpdatedAt
            ? Date.parse(String(currentUpdatedAt).replace(' ', 'T'))
            : NaN;
        const isCurrentEvent = !currentUpdatedAt ||
            (Number.isFinite(incomingTimestamp) && Number.isFinite(currentTimestamp)
                ? incomingTimestamp >= currentTimestamp
                : updatedAt >= currentUpdatedAt);
        const update = {
            $push: {
                courierStatusHistory: {
                    $each: [historyEvent],
                    $slice: -20,
                },
            },
        };
        if (isCurrentEvent) {
            const currentStatus = (_d = order.courierStatus) === null || _d === void 0 ? void 0 : _d.status;
            update.$set = {
                'courierStatus.status': rawStatus || currentStatus || 'in_review',
                'courierStatus.notificationType': notificationType,
                'courierStatus.trackingMessage': trackingMessage ||
                    ((_e = order.courierStatus) === null || _e === void 0 ? void 0 : _e.trackingMessage) ||
                    '',
                'courierStatus.updatedAt': updatedAt,
                'courierStatus.receivedAt': receivedAt,
            };
            if (Number.isFinite(codAmount)) {
                update.$set['courierStatus.codAmount'] = codAmount;
            }
            if (deliveryCharge !== undefined) {
                update.$set['courierStatus.deliveryCharge'] = deliveryCharge;
                update.$unset = Object.assign(Object.assign({}, (update.$unset || {})), { 'courierStatus.chargeLookupError': 1 });
            }
        }
        await this.orderModel.updateOne({
            _id: order._id,
            'courierStatusHistory.eventKey': { $ne: eventKey },
        }, update);
    }
    async backfillSteadfastStatus(body) {
        if (this.steadfastBackfillRunning) {
            throw new common_1.ConflictException('Another Steadfast backfill batch is already running.');
        }
        this.steadfastBackfillRunning = true;
        try {
            return await this.runSteadfastStatusBackfillBatch(body);
        }
        finally {
            this.steadfastBackfillRunning = false;
        }
    }
    async syncSteadfastInReview() {
        if (this.steadfastInReviewSyncRunning) {
            throw new common_1.ConflictException('A Steadfast In Review sync is already running.');
        }
        if (this.steadfastInReviewSyncResult &&
            Date.now() - this.steadfastInReviewSyncCompletedAt < 45000) {
            return Object.assign(Object.assign({}, this.steadfastInReviewSyncResult), { data: Object.assign(Object.assign({}, this.steadfastInReviewSyncResult.data), { cached: true }) });
        }
        this.steadfastInReviewSyncRunning = true;
        try {
            const result = await this.runSteadfastInReviewSync();
            this.steadfastInReviewSyncResult = result;
            this.steadfastInReviewSyncCompletedAt = Date.now();
            return result;
        }
        finally {
            this.steadfastInReviewSyncRunning = false;
        }
    }
    async runSteadfastInReviewSync() {
        const setting = await this.settingModel
            .findOne()
            .select('courierMethods -_id');
        const courierMethod = ((setting === null || setting === void 0 ? void 0 : setting.courierMethods) || []).find((courier) => courier.status === 'active' &&
            courier.providerName === 'Steadfast Courier');
        if (!(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey) || !(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey)) {
            throw new common_1.BadRequestException('Active Steadfast API credentials are not configured.');
        }
        const inReviewQuery = {
            'courierData.providerName': 'Steadfast Courier',
            'courierData.consignmentId': { $exists: true, $nin: [null, ''] },
            'courierStatus.status': 'in_review',
        };
        const syncCandidatesQuery = {
            'courierData.providerName': 'Steadfast Courier',
            'courierData.consignmentId': { $exists: true, $nin: [null, ''] },
            'courierStatus.status': {
                $nin: ['delivered', 'partial_delivered', 'cancelled'],
            },
        };
        const inReviewOrders = await this.orderModel
            .find(syncCandidatesQuery)
            .sort({ 'courierStatus.lastSyncedAt': 1, createdAt: 1 })
            .limit(50)
            .select('orderId courierData courierStatus');
        const orders = inReviewOrders;
        const courierApiConfig = {
            providerName: courierMethod.providerName,
            apiKey: courierMethod.apiKey,
            secretKey: courierMethod.secretKey,
            merchantCode: courierMethod.merchantCode,
            pickMerchantThana: courierMethod.thana,
            pickMerchantDistrict: courierMethod.district,
            pickMerchantAddress: courierMethod.address,
            pickMerchantName: courierMethod.merchant_name,
            pickupMerchantPhone: courierMethod.contact_number,
        };
        const results = [];
        for (let index = 0; index < orders.length; index += 8) {
            const chunk = orders.slice(index, index + 8);
            const chunkResults = await Promise.all(chunk.map(async (order) => {
                var _a, _b, _c, _d, _e;
                const syncedAt = new Date();
                try {
                    const response = await this.courierService.getOrderStatusFormCourier(courierApiConfig, order.courierData.consignmentId, order.orderId);
                    if ((response === null || response === void 0 ? void 0 : response.status) !== 200 ||
                        typeof (response === null || response === void 0 ? void 0 : response.delivery_status) !== 'string') {
                        throw new Error((response === null || response === void 0 ? void 0 : response.details) ||
                            (response === null || response === void 0 ? void 0 : response.message) ||
                            'Steadfast returned no delivery status.');
                    }
                    const status = response.delivery_status.trim().toLowerCase();
                    const previousStatus = String(((_a = order.courierStatus) === null || _a === void 0 ? void 0 : _a.status) || '').toLowerCase();
                    const statusChanged = status !== previousStatus;
                    const moved = previousStatus === 'in_review' && status !== 'in_review';
                    const entered = previousStatus !== 'in_review' && status === 'in_review';
                    const deliveryCharge = this.getSteadfastDeliveryCharge(response);
                    const needsCharge = ((_b = order.courierStatus) === null || _b === void 0 ? void 0 : _b.deliveryCharge) === null ||
                        ((_c = order.courierStatus) === null || _c === void 0 ? void 0 : _c.deliveryCharge) === undefined;
                    const update = {
                        $set: { 'courierStatus.lastSyncedAt': syncedAt },
                        $unset: { 'courierStatus.lastSyncError': 1 },
                    };
                    if (needsCharge) {
                        update.$set['courierStatus.chargeLookupAttemptedAt'] = syncedAt;
                        if (deliveryCharge !== undefined) {
                            update.$set['courierStatus.deliveryCharge'] = deliveryCharge;
                            update.$unset['courierStatus.chargeLookupError'] = 1;
                        }
                        else {
                            update.$set['courierStatus.chargeLookupError'] =
                                'Steadfast status response did not include delivery charge.';
                        }
                    }
                    if (statusChanged) {
                        const trackingMessage = 'Live status reconciled with Steadfast.';
                        const updatedAt = syncedAt.toISOString();
                        const eventKey = crypto
                            .createHash('sha256')
                            .update(`live_in_review_sync:${order.courierData.consignmentId}:${status}:${updatedAt}`)
                            .digest('hex');
                        update.$set = Object.assign(Object.assign({}, update.$set), { 'courierStatus.status': status, 'courierStatus.notificationType': 'live_in_review_sync', 'courierStatus.trackingMessage': trackingMessage, 'courierStatus.updatedAt': updatedAt, 'courierStatus.receivedAt': syncedAt });
                        update.$push = {
                            courierStatusHistory: {
                                $each: [
                                    {
                                        eventKey,
                                        notificationType: 'live_in_review_sync',
                                        status,
                                        trackingMessage,
                                        updatedAt,
                                        receivedAt: syncedAt,
                                    },
                                ],
                                $slice: -20,
                            },
                        };
                    }
                    await this.orderModel.updateOne({ _id: order._id }, update);
                    return {
                        id: String(order._id),
                        orderId: order.orderId,
                        success: true,
                        status,
                        moved,
                        entered,
                        chargeUpdated: needsCharge && deliveryCharge !== undefined,
                    };
                }
                catch (error) {
                    const message = String((error === null || error === void 0 ? void 0 : error.message) || 'Steadfast status lookup failed.').slice(0, 300);
                    await this.orderModel.updateOne({ _id: order._id }, {
                        $set: Object.assign({ 'courierStatus.lastSyncedAt': syncedAt, 'courierStatus.lastSyncError': message }, (((_d = order.courierStatus) === null || _d === void 0 ? void 0 : _d.deliveryCharge) === null ||
                            ((_e = order.courierStatus) === null || _e === void 0 ? void 0 : _e.deliveryCharge) === undefined
                            ? {
                                'courierStatus.chargeLookupAttemptedAt': syncedAt,
                                'courierStatus.chargeLookupError': message,
                            }
                            : {})),
                    });
                    return {
                        id: String(order._id),
                        orderId: order.orderId,
                        success: false,
                        error: message,
                    };
                }
            }));
            results.push(...chunkResults);
        }
        const currentCount = await this.orderModel.countDocuments(inReviewQuery);
        void this.syncSteadfastMissingCharges().catch((error) => {
            this.logger.warn(`Steadfast missing-charge background batch failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        });
        const moved = results.filter((result) => result.moved);
        const entered = results.filter((result) => result.entered);
        const chargesUpdated = results.filter((result) => result.chargeUpdated).length;
        const failed = results.filter((result) => !result.success);
        return {
            success: true,
            message: 'Steadfast In Review queue synchronized.',
            data: {
                checked: results.length,
                moved: moved.length,
                entered: entered.length,
                chargesUpdated,
                failed: failed.length,
                currentCount,
                movedOrderIds: moved.map((result) => result.id),
                enteredOrderIds: entered.map((result) => result.id),
                failures: failed.slice(0, 10),
            },
        };
    }
    async syncSteadfastMissingCharges() {
        if (this.steadfastMissingChargeSyncRunning ||
            Date.now() - this.steadfastMissingChargeSyncCompletedAt < 5 * 60 * 1000) {
            return;
        }
        this.steadfastMissingChargeSyncRunning = true;
        try {
            const setting = await this.settingModel
                .findOne()
                .select('courierMethods -_id');
            const courierMethod = ((setting === null || setting === void 0 ? void 0 : setting.courierMethods) || []).find((courier) => courier.status === 'active' &&
                courier.providerName === 'Steadfast Courier');
            if (!(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey) || !(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey))
                return;
            const retryChargeBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const findMissingChargeOrders = async (statuses, limit, excludedIds = []) => this.orderModel
                .find({
                'courierData.providerName': 'Steadfast Courier',
                'courierData.consignmentId': {
                    $exists: true,
                    $nin: [null, ''],
                },
                'courierStatus.status': { $in: statuses },
                $and: [
                    {
                        $or: [
                            { 'courierStatus.deliveryCharge': { $exists: false } },
                            { 'courierStatus.deliveryCharge': null },
                        ],
                    },
                    {
                        $or: [
                            {
                                'courierStatus.chargeLookupAttemptedAt': {
                                    $exists: false,
                                },
                            },
                            {
                                'courierStatus.chargeLookupAttemptedAt': {
                                    $lt: retryChargeBefore,
                                },
                            },
                        ],
                    },
                ],
                _id: { $nin: excludedIds },
            })
                .sort({ 'courierStatus.chargeLookupAttemptedAt': 1, createdAt: -1 })
                .limit(limit)
                .select('orderId courierData courierStatus');
            const deliveredOrders = await findMissingChargeOrders([
                'delivered',
                'partial_delivered',
                'delivered_approval_pending',
                'partial_delivered_approval_pending',
            ], 20);
            const otherOrders = await findMissingChargeOrders([
                'pending',
                'hold',
                'cancelled',
                'cancelled_approval_pending',
                'unknown',
                'unknown_approval_pending',
            ], 20 - deliveredOrders.length, deliveredOrders.map((order) => order._id));
            const orders = [...deliveredOrders, ...otherOrders];
            const courierApiConfig = {
                providerName: courierMethod.providerName,
                apiKey: courierMethod.apiKey,
                secretKey: courierMethod.secretKey,
                merchantCode: courierMethod.merchantCode,
                pickMerchantThana: courierMethod.thana,
                pickMerchantDistrict: courierMethod.district,
                pickMerchantAddress: courierMethod.address,
                pickMerchantName: courierMethod.merchant_name,
                pickupMerchantPhone: courierMethod.contact_number,
            };
            for (let index = 0; index < orders.length; index += 5) {
                await Promise.all(orders.slice(index, index + 5).map(async (order) => {
                    const attemptedAt = new Date();
                    try {
                        const response = await this.courierService.getOrderStatusFormCourier(courierApiConfig, order.courierData.consignmentId, order.orderId);
                        if ((response === null || response === void 0 ? void 0 : response.status) !== 200) {
                            throw new Error((response === null || response === void 0 ? void 0 : response.details) ||
                                (response === null || response === void 0 ? void 0 : response.message) ||
                                'Steadfast status lookup failed.');
                        }
                        const deliveryCharge = this.getSteadfastDeliveryCharge(response);
                        await this.orderModel.updateOne({ _id: order._id }, deliveryCharge === undefined
                            ? {
                                $set: {
                                    'courierStatus.chargeLookupAttemptedAt': attemptedAt,
                                    'courierStatus.chargeLookupError': 'Steadfast status response did not include delivery charge.',
                                },
                            }
                            : {
                                $set: {
                                    'courierStatus.deliveryCharge': deliveryCharge,
                                    'courierStatus.chargeLookupAttemptedAt': attemptedAt,
                                },
                                $unset: { 'courierStatus.chargeLookupError': 1 },
                            });
                    }
                    catch (error) {
                        const message = String((error === null || error === void 0 ? void 0 : error.message) || 'Steadfast charge lookup failed.').slice(0, 300);
                        await this.orderModel.updateOne({ _id: order._id }, {
                            $set: {
                                'courierStatus.chargeLookupAttemptedAt': attemptedAt,
                                'courierStatus.chargeLookupError': message,
                            },
                        });
                    }
                }));
            }
        }
        finally {
            this.steadfastMissingChargeSyncRunning = false;
            this.steadfastMissingChargeSyncCompletedAt = Date.now();
        }
    }
    async runSteadfastStatusBackfillBatch(body) {
        const requestedLimit = Number(body === null || body === void 0 ? void 0 : body.limit) || 15;
        const limit = Math.min(Math.max(Math.floor(requestedLimit), 1), 25);
        const retryFailed = (body === null || body === void 0 ? void 0 : body.retryFailed) === true;
        const setting = await this.settingModel
            .findOne()
            .select('courierMethods -_id');
        const courierMethod = ((setting === null || setting === void 0 ? void 0 : setting.courierMethods) || []).find((courier) => courier.status === 'active' &&
            courier.providerName === 'Steadfast Courier');
        if (!(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey) || !(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey)) {
            throw new common_1.BadRequestException('Active Steadfast API credentials are not configured.');
        }
        const missingStatusQuery = () => ({
            'courierData.providerName': 'Steadfast Courier',
            'courierData.consignmentId': { $exists: true, $nin: [null, ''] },
            $or: [
                { 'courierStatus.status': { $exists: false } },
                { 'courierStatus.status': null },
                { 'courierStatus.status': '' },
            ],
        });
        const candidateQuery = {
            $and: [
                missingStatusQuery(),
                retryFailed
                    ? { 'courierStatus.backfillAttemptedAt': { $exists: true } }
                    : { 'courierStatus.backfillAttemptedAt': { $exists: false } },
            ],
        };
        const orders = await this.orderModel
            .find(candidateQuery)
            .sort(retryFailed
            ? { 'courierStatus.backfillAttemptedAt': 1 }
            : { createdAt: 1 })
            .limit(limit)
            .select('orderId courierData courierStatus');
        const courierApiConfig = {
            providerName: courierMethod.providerName,
            apiKey: courierMethod.apiKey,
            secretKey: courierMethod.secretKey,
            merchantCode: courierMethod.merchantCode,
            pickMerchantThana: courierMethod.thana,
            pickMerchantDistrict: courierMethod.district,
            pickMerchantAddress: courierMethod.address,
            pickMerchantName: courierMethod.merchant_name,
            pickupMerchantPhone: courierMethod.contact_number,
        };
        const results = [];
        for (let index = 0; index < orders.length; index += 3) {
            const chunk = orders.slice(index, index + 3);
            const chunkResults = await Promise.all(chunk.map(async (order) => {
                const attemptedAt = new Date();
                try {
                    const response = await this.courierService.getOrderStatusFormCourier(courierApiConfig, order.courierData.consignmentId, order.orderId);
                    if ((response === null || response === void 0 ? void 0 : response.status) !== 200 ||
                        typeof (response === null || response === void 0 ? void 0 : response.delivery_status) !== 'string') {
                        throw new Error((response === null || response === void 0 ? void 0 : response.details) ||
                            (response === null || response === void 0 ? void 0 : response.message) ||
                            'Steadfast returned no delivery status.');
                    }
                    const status = response.delivery_status.trim().toLowerCase();
                    const deliveryCharge = this.getSteadfastDeliveryCharge(response);
                    const eventKey = crypto
                        .createHash('sha256')
                        .update(`historical_backfill:${order.courierData.consignmentId}:${status}`)
                        .digest('hex');
                    const statusSet = {
                        'courierStatus.status': status,
                        'courierStatus.notificationType': 'historical_backfill',
                        'courierStatus.trackingMessage': 'Historical status retrieved from Steadfast.',
                        'courierStatus.updatedAt': attemptedAt.toISOString(),
                        'courierStatus.receivedAt': attemptedAt,
                        'courierStatus.backfillAttemptedAt': attemptedAt,
                        'courierStatus.chargeLookupAttemptedAt': attemptedAt,
                    };
                    const statusUnset = {
                        'courierStatus.backfillError': 1,
                    };
                    if (deliveryCharge !== undefined) {
                        statusSet['courierStatus.deliveryCharge'] = deliveryCharge;
                        statusUnset['courierStatus.chargeLookupError'] = 1;
                    }
                    else {
                        statusSet['courierStatus.chargeLookupError'] =
                            'Steadfast status response did not include delivery charge.';
                    }
                    await this.orderModel.updateOne({ _id: order._id }, {
                        $set: statusSet,
                        $unset: statusUnset,
                        $push: {
                            courierStatusHistory: {
                                $each: [
                                    {
                                        eventKey,
                                        notificationType: 'historical_backfill',
                                        status,
                                        trackingMessage: 'Historical status retrieved from Steadfast.',
                                        updatedAt: attemptedAt.toISOString(),
                                        receivedAt: attemptedAt,
                                    },
                                ],
                                $slice: -20,
                            },
                        },
                    });
                    return { orderId: order.orderId, success: true };
                }
                catch (error) {
                    const message = String((error === null || error === void 0 ? void 0 : error.message) || 'Steadfast status lookup failed.').slice(0, 300);
                    await this.orderModel.updateOne({ _id: order._id }, {
                        $set: {
                            'courierStatus.backfillAttemptedAt': attemptedAt,
                            'courierStatus.backfillError': message,
                        },
                    });
                    return {
                        orderId: order.orderId,
                        success: false,
                        error: message,
                    };
                }
            }));
            results.push(...chunkResults);
        }
        const [remaining, failedTotal] = await Promise.all([
            this.orderModel.countDocuments({
                $and: [
                    missingStatusQuery(),
                    { 'courierStatus.backfillAttemptedAt': { $exists: false } },
                ],
            }),
            this.orderModel.countDocuments({
                $and: [
                    missingStatusQuery(),
                    { 'courierStatus.backfillAttemptedAt': { $exists: true } },
                ],
            }),
        ]);
        const updated = results.filter((result) => result.success).length;
        const failed = results.length - updated;
        return {
            success: true,
            message: 'Steadfast historical status batch completed.',
            data: {
                checked: results.length,
                updated,
                failed,
                remaining,
                failedTotal,
                failures: results.filter((result) => !result.success).slice(0, 10),
            },
        };
    }
    async sendManualOrderToMeta(saveData, manualOrderSource) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (await this.isDuplicateMetaPurchase(saveData))
            return;
        const eventId = `order_${saveData.orderId}`;
        const staleSendingBefore = new Date(Date.now() - 10 * 60 * 1000);
        const claimedOrder = await this.orderModel.findOneAndUpdate({
            _id: saveData._id,
            $or: [
                { metaPurchaseStatus: { $exists: false } },
                { metaPurchaseStatus: 'failed' },
                {
                    metaPurchaseStatus: 'sending',
                    metaPurchaseLastAttemptAt: { $lt: staleSendingBefore },
                },
            ],
        }, {
            $set: {
                manualOrderSource,
                metaPurchaseStatus: 'sending',
                metaPurchaseEventId: eventId,
                metaPurchaseLastAttemptAt: new Date(),
            },
            $inc: { metaPurchaseAttemptCount: 1 },
            $unset: { metaPurchaseError: 1 },
        }, { new: true });
        if (!claimedOrder) {
            this.logger.log(`Manual-order CAPI Purchase already claimed/sent for order ${saveData.orderId}`);
            return;
        }
        let tagiooError = '';
        let tagiooAccepted = false;
        try {
            const hash = (value) => crypto
                .createHash('sha256')
                .update(String(value).trim().toLowerCase())
                .digest('hex');
            const normalizedPhone = this.normalizedBdPhone(claimedOrder.phoneNo);
            const nameParts = String(claimedOrder.name || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            const trackableItems = (claimedOrder.orderedItems || []).filter((item) => item === null || item === void 0 ? void 0 : item._id);
            const contents = trackableItems.map((item) => {
                var _a, _b;
                return ({
                    id: String(item._id),
                    quantity: Math.max(1, Number(item.quantity) || 1),
                    item_price: Number((_b = (_a = item.unitPrice) !== null && _a !== void 0 ? _a : item.salePrice) !== null && _b !== void 0 ? _b : 0),
                });
            });
            const eventTimeSeconds = this.metaEventTime(claimedOrder.createdAt);
            const contentIds = contents.map((item) => item.id);
            const city = this.metaLocationName(claimedOrder.city ||
                ((_a = claimedOrder.area) === null || _a === void 0 ? void 0 : _a.name) ||
                ((_b = claimedOrder.zone) === null || _b === void 0 ? void 0 : _b.name));
            const region = this.metaLocationName((_c = claimedOrder.division) === null || _c === void 0 ? void 0 : _c.name);
            const tagiooUserData = {
                address: { country_code: 'BD' },
            };
            const attributionTouch = ((_d = claimedOrder.attribution) === null || _d === void 0 ? void 0 : _d.lastTouch) ||
                ((_e = claimedOrder.attribution) === null || _e === void 0 ? void 0 : _e.firstTouch) ||
                {};
            const attributionFbc = attributionTouch.fbc ||
                (attributionTouch.fbclid
                    ? `fb.1.${new Date(attributionTouch.capturedAt ||
                        claimedOrder.createdAt ||
                        Date.now()).getTime()}.${attributionTouch.fbclid}`
                    : undefined);
            let externalId = `manual_${String(claimedOrder._id)}`;
            if (claimedOrder.user) {
                externalId = `user_${String(claimedOrder.user)}`;
            }
            else if ((_f = claimedOrder.attribution) === null || _f === void 0 ? void 0 : _f.anonymousId) {
                externalId = String(claimedOrder.attribution.anonymousId);
            }
            else if (normalizedPhone.length > 2) {
                externalId = `customer_${hash(normalizedPhone)}`;
            }
            else if (claimedOrder.email) {
                externalId = `customer_${hash(claimedOrder.email)}`;
            }
            tagiooUserData.user_id = externalId;
            if (normalizedPhone.length > 2) {
                tagiooUserData.sha256_phone_number = hash(normalizedPhone);
            }
            if (claimedOrder.email) {
                tagiooUserData.sha256_email_address = hash(claimedOrder.email);
            }
            if (nameParts[0]) {
                tagiooUserData.address.sha256_first_name = hash(nameParts[0]);
            }
            if (nameParts.length > 1) {
                tagiooUserData.address.sha256_last_name = hash(nameParts.slice(1).join(''));
            }
            if (city)
                tagiooUserData.address.sha256_city = hash(city);
            if (region)
                tagiooUserData.address.sha256_region = hash(region);
            if (attributionFbc)
                tagiooUserData.fbc = attributionFbc;
            if (attributionTouch.fbp)
                tagiooUserData.fbp = attributionTouch.fbp;
            if ((_g = claimedOrder.attribution) === null || _g === void 0 ? void 0 : _g.clientIpAddress) {
                tagiooUserData.client_ip_address =
                    claimedOrder.attribution.clientIpAddress;
            }
            if ((_h = claimedOrder.attribution) === null || _h === void 0 ? void 0 : _h.clientUserAgent) {
                tagiooUserData.client_user_agent =
                    claimedOrder.attribution.clientUserAgent;
            }
            try {
                const tagiooResult = await this.analyticsService.trackServerContainerEvent('purchase', {
                    client_id: `admin.${String(claimedOrder._id)}`,
                    event_id: eventId,
                    event_time: eventTimeSeconds,
                    transaction_id: String(claimedOrder.orderId),
                    order_id: String(claimedOrder.orderId),
                    currency: 'BDT',
                    value: Number(claimedOrder.grandTotal || 0),
                    content_type: 'product',
                    content_ids: contentIds,
                    contents,
                    meta_content_ids: contentIds,
                    meta_contents: contents,
                    items: trackableItems.map((item) => {
                        var _a, _b;
                        return ({
                            item_id: String(item._id),
                            item_name: String(item.name || item._id),
                            price: Number((_b = (_a = item.unitPrice) !== null && _a !== void 0 ? _a : item.salePrice) !== null && _b !== void 0 ? _b : 0),
                            quantity: Math.max(1, Number(item.quantity) || 1),
                        });
                    }),
                    user_data: tagiooUserData,
                    user_id: tagiooUserData.user_id,
                    phone_number: tagiooUserData.sha256_phone_number,
                    email_address: tagiooUserData.sha256_email_address,
                    first_name: tagiooUserData.address.sha256_first_name,
                    last_name: tagiooUserData.address.sha256_last_name,
                    city: tagiooUserData.address.sha256_city,
                    region: tagiooUserData.address.sha256_region,
                    country: hash('bd'),
                    action_source: this.metaActionSource(manualOrderSource),
                    page_hostname: 'amolbooks.com',
                    page_location: 'https://amolbooks.com/',
                    page_path: '/',
                    manual_order_source: manualOrderSource,
                });
                if (!(tagiooResult === null || tagiooResult === void 0 ? void 0 : tagiooResult.accepted)) {
                    throw new Error('Tagioo did not accept the server event');
                }
                tagiooAccepted = true;
                await this.orderModel.updateOne({ _id: saveData._id, metaPurchaseEventId: eventId }, {
                    $set: {
                        tagiooPurchaseEventId: eventId,
                    },
                    $unset: { tagiooPurchaseError: 1 },
                });
                this.logger.log(`Manual-order Purchase accepted by Tagioo for order ${saveData.orderId}`);
            }
            catch (error) {
                tagiooError = String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 500);
                this.logger.warn(`Tagioo Purchase failed for order ${saveData.orderId}; continuing with authoritative direct Meta delivery: ${tagiooError}`);
            }
            const fSetting = await this.settingModel.findOne().select('analytics');
            const analytics = fSetting === null || fSetting === void 0 ? void 0 : fSetting.analytics;
            if (tagiooAccepted && (analytics === null || analytics === void 0 ? void 0 : analytics.IsManageFbPixelByTagManager)) {
                await this.orderModel.updateOne({ _id: saveData._id, metaPurchaseEventId: eventId }, {
                    $set: {
                        metaPurchaseStatus: 'sent',
                        metaPurchaseSentAt: new Date(),
                        metaPurchaseDeliveryChannel: 'tagioo',
                        tagiooPurchaseEventId: eventId,
                    },
                    $unset: { metaPurchaseError: 1, tagiooPurchaseError: 1 },
                });
                this.logger.log(`Manual-order Purchase delivered through GTM-managed Tagioo for order ${saveData.orderId}`);
                return;
            }
            if (!(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelId) || !(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelAccessToken)) {
                throw new Error('Meta Pixel ID or access token is not configured');
            }
            const userData = {};
            userData.external_id = externalId;
            if (normalizedPhone.length > 2)
                userData.ph = hash(normalizedPhone);
            if (claimedOrder.email)
                userData.em = hash(claimedOrder.email);
            if (nameParts[0])
                userData.fn = hash(nameParts[0]);
            if (nameParts.length > 1) {
                userData.ln = hash(nameParts.slice(1).join(''));
            }
            if (city)
                userData.ct = hash(city);
            if (region)
                userData.st = hash(region);
            userData.country = hash('bd');
            if (attributionFbc)
                userData.fbc = attributionFbc;
            if (attributionTouch.fbp)
                userData.fbp = attributionTouch.fbp;
            if ((_j = claimedOrder.attribution) === null || _j === void 0 ? void 0 : _j.clientIpAddress) {
                userData.client_ip_address = claimedOrder.attribution.clientIpAddress;
            }
            if ((_k = claimedOrder.attribution) === null || _k === void 0 ? void 0 : _k.clientUserAgent) {
                userData.client_user_agent = claimedOrder.attribution.clientUserAgent;
            }
            if (!userData.ph && !userData.em) {
                throw new Error('Manual order has no phone or email for Meta matching');
            }
            const payload = {
                event_name: 'Purchase',
                event_time: eventTimeSeconds,
                action_source: this.metaActionSource(manualOrderSource),
                event_id: eventId,
                custom_data: {
                    currency: 'BDT',
                    value: Number(claimedOrder.grandTotal || 0),
                    content_type: 'product',
                    content_ids: contentIds,
                    contents,
                    order_id: String(claimedOrder.orderId),
                },
                user_data: userData,
            };
            const requestData = { data: [payload] };
            let result = null;
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                result = await this.analyticsService.trackFbConversionEventClient(analytics.facebookPixelId, analytics.facebookPixelAccessToken, requestData);
                if (result && Number(result.events_received) >= 1)
                    break;
                if (attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
                }
            }
            if (!result || Number(result.events_received) < 1) {
                throw new Error('Meta did not acknowledge the Purchase event after 3 attempts');
            }
            await this.orderModel.updateOne({ _id: saveData._id, metaPurchaseEventId: eventId }, {
                $set: Object.assign({ metaPurchaseStatus: 'sent', metaPurchaseSentAt: new Date(), metaPurchaseDeliveryChannel: 'direct_meta' }, (tagiooAccepted
                    ? { tagiooPurchaseEventId: eventId }
                    : { tagiooPurchaseError: tagiooError })),
                $unset: { metaPurchaseError: 1 },
            });
            this.logger.log(`Manual-order Purchase acknowledged by Meta for order ${saveData.orderId}`);
        }
        catch (error) {
            const message = String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 500);
            await this.orderModel.updateOne({ _id: saveData._id, metaPurchaseEventId: eventId }, {
                $set: Object.assign({ metaPurchaseStatus: 'failed', metaPurchaseError: message }, (tagiooError ? { tagiooPurchaseError: tagiooError } : {})),
            });
            this.logger.warn(`Manual-order CAPI Purchase failed for order ${saveData.orderId}: ${message}`);
        }
    }
    async markBrowserPurchaseFired(body) {
        const orderId = String((body === null || body === void 0 ? void 0 : body.orderId) || (body === null || body === void 0 ? void 0 : body.transaction_id) || '').trim();
        if (!orderId || orderId.length > 40) {
            return { success: false, message: 'Missing order id' };
        }
        const eventId = String((body === null || body === void 0 ? void 0 : body.eventId) || '')
            .trim()
            .slice(0, 120);
        const updated = await this.orderModel.updateOne({ orderId, browserPurchaseFiredAt: { $exists: false } }, {
            $set: Object.assign({ browserPurchaseFiredAt: new Date() }, (eventId ? { browserPurchaseEventId: eventId } : {})),
        });
        return {
            success: true,
            message: updated.modifiedCount
                ? 'Browser purchase recorded'
                : 'Already recorded',
        };
    }
    scheduleWebsitePurchaseGapFill() {
        if (this.isGapFillDisabled()) {
            this.logger.warn('Website purchase gap-fill is disabled by META_GAP_FILL_DISABLED.');
            return;
        }
        const run = () => {
            this.fillMissingWebsitePurchases().catch((error) => {
                this.logger.error('Website purchase gap-fill job failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
            });
        };
        setTimeout(run, 20000);
        schedule.scheduleJob('*/5 * * * *', run);
    }
    isGapFillDisabled() {
        return String(process.env.META_GAP_FILL_DISABLED || '') === 'true';
    }
    async fillMissingWebsitePurchases() {
        if (this.isGapFillDisabled())
            return;
        if (this.websitePurchaseGapFillRunning)
            return;
        this.websitePurchaseGapFillRunning = true;
        try {
            const now = Date.now();
            const candidates = await this.orderModel
                .find({
                orderFrom: 'Website',
                createdAt: {
                    $gte: new Date(now - META_EVENT_MAX_AGE_MS),
                    $lte: new Date(now - WEBSITE_PURCHASE_GRACE_MS),
                },
                $or: [
                    {
                        metaPurchaseStatus: 'failed',
                        metaPurchaseAttemptCount: { $lt: 3 },
                    },
                    {
                        metaPurchaseStatus: 'sending',
                        metaPurchaseAttemptCount: { $lt: 3 },
                        metaPurchaseLastAttemptAt: {
                            $lt: new Date(now - 10 * 60 * 1000),
                        },
                    },
                ],
            })
                .sort({ createdAt: 1 })
                .limit(50);
            if (!candidates.length)
                return;
            this.logger.log(`Website Purchase retry: ${candidates.length} failed/stuck order(s).`);
            for (const order of candidates) {
                await this.sendWebsiteOrderToMeta(order);
            }
        }
        finally {
            this.websitePurchaseGapFillRunning = false;
        }
    }
    async sendWebsiteOrderToMeta(order) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (this.isGapFillDisabled())
            return;
        const eventId = `order_${order.orderId}`;
        const staleSendingBefore = new Date(Date.now() - 10 * 60 * 1000);
        const claimedOrder = await this.orderModel.findOneAndUpdate({
            _id: order._id,
            $or: [
                { metaPurchaseStatus: { $exists: false } },
                { metaPurchaseStatus: 'failed' },
                {
                    metaPurchaseStatus: 'sending',
                    metaPurchaseLastAttemptAt: { $lt: staleSendingBefore },
                },
            ],
        }, {
            $set: {
                metaPurchaseStatus: 'sending',
                metaPurchaseEventId: eventId,
                metaPurchaseLastAttemptAt: new Date(),
            },
            $inc: { metaPurchaseAttemptCount: 1 },
            $unset: { metaPurchaseError: 1 },
        }, { new: true });
        if (!claimedOrder)
            return;
        let tagiooError = '';
        let tagiooAccepted = false;
        try {
            const touch = ((_a = claimedOrder.attribution) === null || _a === void 0 ? void 0 : _a.lastTouch) ||
                ((_b = claimedOrder.attribution) === null || _b === void 0 ? void 0 : _b.firstTouch) ||
                {};
            const userData = this.buildMetaUserDataFromOrder(claimedOrder);
            userData.client_ip_address =
                ((_c = claimedOrder.attribution) === null || _c === void 0 ? void 0 : _c.clientIpAddress) || undefined;
            userData.client_user_agent =
                ((_d = claimedOrder.attribution) === null || _d === void 0 ? void 0 : _d.clientUserAgent) || undefined;
            if (touch.fbc)
                userData.fbc = touch.fbc;
            if (touch.fbp)
                userData.fbp = touch.fbp;
            if (!userData.fbc && touch.fbclid) {
                const clickedAt = touch.capturedAt
                    ? new Date(touch.capturedAt).getTime()
                    : new Date(claimedOrder.createdAt || Date.now()).getTime();
                userData.fbc = `fb.1.${clickedAt}.${touch.fbclid}`;
            }
            const trackableItems = (claimedOrder.orderedItems || []).filter((item) => item === null || item === void 0 ? void 0 : item._id);
            const contents = trackableItems.map((item) => {
                var _a, _b;
                return ({
                    id: String(item._id),
                    quantity: Math.max(1, Number(item.quantity) || 1),
                    item_price: Number((_b = (_a = item.unitPrice) !== null && _a !== void 0 ? _a : item.salePrice) !== null && _b !== void 0 ? _b : 0),
                });
            });
            const contentIds = contents.map((item) => item.id);
            const eventTime = this.metaEventTime(claimedOrder.createdAt);
            const eventSourceUrl = touch.landingPage || 'https://amolbooks.com/';
            try {
                const tagiooUserData = {
                    address: { country_code: 'BD' },
                };
                if (userData.external_id)
                    tagiooUserData.user_id = userData.external_id;
                if (userData.ph)
                    tagiooUserData.sha256_phone_number = userData.ph;
                if (userData.em)
                    tagiooUserData.sha256_email_address = userData.em;
                if (userData.fn)
                    tagiooUserData.address.sha256_first_name = userData.fn;
                if (userData.ln)
                    tagiooUserData.address.sha256_last_name = userData.ln;
                if (userData.ct)
                    tagiooUserData.address.sha256_city = userData.ct;
                if (userData.st)
                    tagiooUserData.address.sha256_region = userData.st;
                if (userData.fbc)
                    tagiooUserData.fbc = userData.fbc;
                if (userData.fbp)
                    tagiooUserData.fbp = userData.fbp;
                if (userData.client_ip_address) {
                    tagiooUserData.client_ip_address = userData.client_ip_address;
                }
                if (userData.client_user_agent) {
                    tagiooUserData.client_user_agent = userData.client_user_agent;
                }
                const tagiooResult = await this.analyticsService.trackServerContainerEvent('purchase', {
                    client_id: ((_e = claimedOrder.attribution) === null || _e === void 0 ? void 0 : _e.gaClientId) ||
                        ((_f = claimedOrder.attribution) === null || _f === void 0 ? void 0 : _f.anonymousId) ||
                        `website.${String(claimedOrder._id)}`,
                    session_id: ((_g = claimedOrder.attribution) === null || _g === void 0 ? void 0 : _g.gaSessionId) ||
                        String(Math.max(1, eventTime)),
                    engagement_time_msec: 1,
                    event_id: eventId,
                    event_time: eventTime,
                    transaction_id: String(claimedOrder.orderId),
                    order_id: String(claimedOrder.orderId),
                    currency: 'BDT',
                    value: Number(claimedOrder.grandTotal || 0),
                    content_type: 'product',
                    content_ids: contentIds,
                    contents,
                    meta_content_ids: contentIds,
                    meta_contents: contents,
                    items: trackableItems.map((item) => {
                        var _a, _b;
                        return ({
                            item_id: String(item._id),
                            item_name: String(item.name || item._id),
                            price: Number((_b = (_a = item.unitPrice) !== null && _a !== void 0 ? _a : item.salePrice) !== null && _b !== void 0 ? _b : 0),
                            quantity: Math.max(1, Number(item.quantity) || 1),
                        });
                    }),
                    user_data: tagiooUserData,
                    user_id: tagiooUserData.user_id,
                    phone_number: tagiooUserData.sha256_phone_number,
                    email_address: tagiooUserData.sha256_email_address,
                    first_name: tagiooUserData.address.sha256_first_name,
                    last_name: tagiooUserData.address.sha256_last_name,
                    city: tagiooUserData.address.sha256_city,
                    region: tagiooUserData.address.sha256_region,
                    country: userData.country,
                    action_source: 'website',
                    page_hostname: 'amolbooks.com',
                    page_location: eventSourceUrl,
                    page_path: '/',
                    order_source: 'website',
                });
                if (!(tagiooResult === null || tagiooResult === void 0 ? void 0 : tagiooResult.accepted)) {
                    throw new Error('Tagioo did not accept the server event');
                }
                tagiooAccepted = true;
                await this.orderModel.updateOne({ _id: claimedOrder._id, metaPurchaseEventId: eventId }, {
                    $set: {
                        tagiooPurchaseEventId: eventId,
                    },
                    $unset: { tagiooPurchaseError: 1 },
                });
                this.logger.log(`Website-order Purchase accepted by Tagioo for order ${claimedOrder.orderId}`);
            }
            catch (error) {
                tagiooError = String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 500);
                this.logger.warn(`Tagioo Purchase failed for website order ${claimedOrder.orderId}; continuing with authoritative direct Meta delivery: ${tagiooError}`);
            }
            const fSetting = await this.settingModel.findOne().select('analytics');
            const analytics = fSetting === null || fSetting === void 0 ? void 0 : fSetting.analytics;
            if (tagiooAccepted && (analytics === null || analytics === void 0 ? void 0 : analytics.IsManageFbPixelByTagManager)) {
                await this.orderModel.updateOne({ _id: claimedOrder._id, metaPurchaseEventId: eventId }, {
                    $set: {
                        metaPurchaseStatus: 'sent',
                        metaPurchaseSentAt: new Date(),
                        metaPurchaseDeliveryChannel: 'tagioo',
                        tagiooPurchaseEventId: eventId,
                    },
                    $unset: { metaPurchaseError: 1, tagiooPurchaseError: 1 },
                });
                this.logger.log(`Website-order Purchase delivered through GTM-managed Tagioo for order ${claimedOrder.orderId}`);
                return;
            }
            if (!(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelId) || !(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelAccessToken)) {
                throw new Error('Meta Pixel ID or access token is not configured');
            }
            const payload = {
                event_name: 'Purchase',
                event_time: eventTime,
                action_source: 'website',
                event_id: eventId,
                event_source_url: eventSourceUrl,
                custom_data: {
                    currency: 'BDT',
                    value: Number(claimedOrder.grandTotal || 0),
                    content_type: 'product',
                    content_ids: contentIds,
                    contents,
                    order_id: String(claimedOrder.orderId),
                },
                user_data: userData,
            };
            const result = await this.postMetaPurchase(analytics, payload);
            if (!result || Number(result.events_received) < 1) {
                throw new Error('Meta did not acknowledge the website Purchase event');
            }
            await this.orderModel.updateOne({ _id: claimedOrder._id, metaPurchaseEventId: eventId }, {
                $set: Object.assign({ metaPurchaseStatus: 'sent', metaPurchaseSentAt: new Date(), metaPurchaseDeliveryChannel: 'direct_meta' }, (tagiooAccepted
                    ? { tagiooPurchaseEventId: eventId }
                    : { tagiooPurchaseError: tagiooError })),
                $unset: { metaPurchaseError: 1 },
            });
            this.logger.log(`Website-order Purchase acknowledged by Meta for order ${claimedOrder.orderId}`);
        }
        catch (error) {
            const message = String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 500);
            await this.orderModel.updateOne({ _id: claimedOrder._id, metaPurchaseEventId: eventId }, {
                $set: Object.assign({ metaPurchaseStatus: 'failed', metaPurchaseError: message }, (tagiooError ? { tagiooPurchaseError: tagiooError } : {})),
            });
            this.logger.warn(`Gap-fill Purchase failed for website order ${claimedOrder.orderId}: ${message}`);
        }
    }
    metaHash(value) {
        return crypto
            .createHash('sha256')
            .update(String(value).trim().toLowerCase())
            .digest('hex');
    }
    metaLocationName(value) {
        const raw = String((value === null || value === void 0 ? void 0 : value.name) || value || '').trim();
        if (!raw)
            return '';
        const parts = raw
            .split(/\s*(?:>>|>|\||—|–)\s*/)
            .map((part) => part.trim())
            .filter(Boolean);
        const english = parts.find((part) => /[A-Za-z]/.test(part));
        return english || parts[0] || raw;
    }
    normalizedBdPhone(phoneNo) {
        const digits = String(phoneNo || '').replace(/\D/g, '');
        if (digits.length < 3)
            return '';
        if (digits.startsWith('880'))
            return digits;
        if (digits.length === 10 && digits.startsWith('1'))
            return `880${digits}`;
        if (digits.length === 11 && digits.startsWith('0'))
            return `88${digits}`;
        return digits.startsWith('88') ? digits : `88${digits}`;
    }
    metaEventTime(createdAt) {
        const now = Date.now();
        const raw = new Date(createdAt || now).getTime();
        const usable = Number.isFinite(raw) ? raw : now;
        const floor = now - META_EVENT_MAX_AGE_MS;
        return Math.floor(Math.min(Math.max(usable, floor), now) / 1000);
    }
    buildMetaUserDataFromOrder(order) {
        var _a, _b, _c, _d;
        const userData = {};
        const phone = this.normalizedBdPhone(order.phoneNo);
        const nameParts = String(order.name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if ((_a = order.attribution) === null || _a === void 0 ? void 0 : _a.anonymousId) {
            userData.external_id = String(order.attribution.anonymousId);
        }
        else if (order.user) {
            userData.external_id = `user_${String(order.user)}`;
        }
        else if (phone) {
            userData.external_id = `customer_${this.metaHash(phone)}`;
        }
        if (phone)
            userData.ph = this.metaHash(phone);
        if (order.email)
            userData.em = this.metaHash(order.email);
        if (nameParts[0])
            userData.fn = this.metaHash(nameParts[0]);
        if (nameParts.length > 1) {
            userData.ln = this.metaHash(nameParts.slice(1).join(''));
        }
        const city = this.metaLocationName(order.city || ((_b = order.area) === null || _b === void 0 ? void 0 : _b.name) || ((_c = order.zone) === null || _c === void 0 ? void 0 : _c.name));
        const region = this.metaLocationName((_d = order.division) === null || _d === void 0 ? void 0 : _d.name);
        if (city)
            userData.ct = this.metaHash(city);
        if (region)
            userData.st = this.metaHash(region);
        userData.country = this.metaHash('bd');
        return userData;
    }
    async getMetaAnalyticsSettings() {
        const fSetting = await this.settingModel.findOne().select('analytics');
        const analytics = fSetting === null || fSetting === void 0 ? void 0 : fSetting.analytics;
        if (!(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelId) || !(analytics === null || analytics === void 0 ? void 0 : analytics.facebookPixelAccessToken)) {
            throw new Error('Meta Pixel ID or access token is not configured');
        }
        return analytics;
    }
    async postMetaPurchase(analytics, payload) {
        const requestData = { data: [payload] };
        let result = null;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            result = await this.analyticsService.trackFbConversionEventClient(analytics.facebookPixelId, analytics.facebookPixelAccessToken, requestData);
            if (result && Number(result.events_received) >= 1)
                break;
            if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            }
        }
        return result;
    }
    async isDuplicateMetaPurchase(order) {
        const phone = this.normalizedBdPhone(order.phoneNo);
        if (!phone)
            return false;
        const digits = phone.replace(/^88/, '');
        const since = new Date(new Date(order.createdAt || Date.now()).getTime() - 24 * 60 * 60 * 1000);
        const twin = await this.orderModel
            .findOne({
            _id: { $ne: order._id },
            phoneNo: { $regex: `${digits}$` },
            grandTotal: order.grandTotal,
            createdAt: { $gte: since },
            $or: [
                { metaPurchaseStatus: 'sent' },
                { browserPurchaseFiredAt: { $exists: true } },
            ],
        })
            .select('orderId')
            .lean();
        if (twin) {
            this.logger.warn(`Order ${order.orderId} skipped for Meta: same phone and total as already-reported order ${twin.orderId}`);
        }
        return !!twin;
    }
    normalizeManualOrderSource(value, fallback = 'other') {
        const allowed = [
            'whatsapp',
            'whatsapp_ad',
            'phone',
            'facebook',
            'instagram',
            'email',
            'walk_in',
            'other',
        ];
        return allowed.includes(value) ? value : fallback;
    }
    manualOrderLabel(source) {
        const labels = {
            whatsapp: 'WhatsApp',
            whatsapp_ad: 'WhatsApp Ad',
            phone: 'Phone',
            facebook: 'Facebook',
            instagram: 'Instagram',
            email: 'Email',
            walk_in: 'Walk-in',
            other: 'Manual',
        };
        return labels[source];
    }
    metaActionSource(source) {
        if (source === 'whatsapp_ad')
            return 'business_messaging';
        if (source === 'phone')
            return 'phone_call';
        if (source === 'email')
            return 'email';
        if (source === 'walk_in')
            return 'physical_store';
        if (source === 'whatsapp' ||
            source === 'facebook' ||
            source === 'instagram') {
            return 'chat';
        }
        return 'other';
    }
    scheduleManualMetaPurchaseRetries() {
        const retry = () => {
            this.retryPendingManualMetaPurchases().catch((error) => {
                this.logger.error('Manual-order CAPI recovery job failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
            });
        };
        setTimeout(retry, 5000);
        schedule.scheduleJob('*/5 * * * *', retry);
    }
    async retryPendingManualMetaPurchases() {
        const recentOrderCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleSendingBefore = new Date(Date.now() - 10 * 60 * 1000);
        const orders = await this.orderModel
            .find({
            manualOrderSource: { $exists: true, $ne: null },
            createdAt: { $gte: recentOrderCutoff },
            $and: [
                {
                    $or: [
                        { metaPurchaseStatus: { $exists: false } },
                        { metaPurchaseStatus: 'failed' },
                        {
                            metaPurchaseStatus: 'sending',
                            metaPurchaseLastAttemptAt: { $lt: staleSendingBefore },
                        },
                    ],
                },
                {
                    $or: [
                        { metaPurchaseAttemptCount: { $exists: false } },
                        { metaPurchaseAttemptCount: { $lt: 5 } },
                    ],
                },
            ],
        })
            .select('_id orderId manualOrderSource')
            .sort({ createdAt: 1 })
            .limit(25)
            .lean();
        for (const order of orders) {
            await this.sendManualOrderToMeta(order, this.normalizeManualOrderSource(order.manualOrderSource));
        }
    }
    normalizeAdminOrderData(orderData) {
        const orderedItems = this.normalizeOrderItems((orderData === null || orderData === void 0 ? void 0 : orderData.orderedItems) || []);
        if (!orderedItems.length) {
            throw new common_1.BadRequestException('Please select product on cart');
        }
        const deliveryCharge = this.toFiniteNumber(orderData === null || orderData === void 0 ? void 0 : orderData.deliveryCharge, 0);
        const subTotalFromItems = orderedItems.reduce((sum, item) => sum + item.regularPrice * item.quantity, 0);
        const saleTotalFromItems = orderedItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
        const subTotal = this.toFiniteNumber(orderData === null || orderData === void 0 ? void 0 : orderData.subTotal, subTotalFromItems);
        const discount = this.toFiniteNumber(orderData === null || orderData === void 0 ? void 0 : orderData.discount, Math.max(subTotal - saleTotalFromItems, 0));
        const grandTotal = this.toFiniteNumber(orderData === null || orderData === void 0 ? void 0 : orderData.grandTotal, saleTotalFromItems + deliveryCharge);
        return Object.assign(Object.assign({}, orderData), { orderedItems,
            deliveryCharge,
            subTotal,
            discount,
            grandTotal });
    }
    async decreaseProductStock(orderId, items) {
        try {
            if (!Array.isArray(items) || !items.length)
                return false;
            const parsed = items
                .map((it) => {
                const id = (it === null || it === void 0 ? void 0 : it._id) || (it === null || it === void 0 ? void 0 : it.product) || (it === null || it === void 0 ? void 0 : it.productId);
                const qty = Math.max(1, Math.floor(Number(it === null || it === void 0 ? void 0 : it.quantity)) || 1);
                if (!id)
                    return null;
                return { id, qty };
            })
                .filter(Boolean);
            if (!parsed.length)
                return false;
            const ops = parsed.map(({ id, qty }) => ({
                updateOne: {
                    filter: { _id: id, stock: { $ne: null } },
                    update: { $inc: { stock: -qty } },
                },
            }));
            await this.productModel.bulkWrite(ops);
            const trackedIds = parsed.map((p) => p.id);
            const trackedProducts = await this.productModel
                .find({ _id: { $in: trackedIds } })
                .select('sku stock')
                .lean();
            const trackedById = new Map(trackedProducts.map((p) => [String(p._id), p]));
            const movements = parsed
                .filter(({ id }) => trackedById.has(String(id)))
                .map(({ id, qty }) => {
                const product = trackedById.get(String(id));
                return {
                    product: id,
                    sku: product === null || product === void 0 ? void 0 : product.sku,
                    qtyChange: -qty,
                    stockAfter: product === null || product === void 0 ? void 0 : product.stock,
                    reason: 'order',
                    referenceType: 'order',
                    referenceId: orderId,
                };
            });
            if (movements.length) {
                try {
                    await this.stockMovementModel.insertMany(movements);
                }
                catch (err) {
                    this.logger.warn(`Failed to log stock movements for order ${orderId}: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                }
            }
            return true;
        }
        catch (err) {
            this.logger.warn(`decreaseProductStock failed: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
            return false;
        }
    }
    async restockProducts(orderId, items, reason) {
        try {
            if (!Array.isArray(items) || !items.length)
                return;
            const parsed = items
                .map((it) => {
                const id = (it === null || it === void 0 ? void 0 : it._id) || (it === null || it === void 0 ? void 0 : it.product) || (it === null || it === void 0 ? void 0 : it.productId);
                const qty = Math.max(1, Math.floor(Number(it === null || it === void 0 ? void 0 : it.quantity)) || 1);
                if (!id)
                    return null;
                return { id, qty };
            })
                .filter(Boolean);
            if (!parsed.length)
                return;
            const ops = parsed.map(({ id, qty }) => ({
                updateOne: {
                    filter: { _id: id, stock: { $ne: null } },
                    update: { $inc: { stock: qty } },
                },
            }));
            await this.productModel.bulkWrite(ops);
            const trackedIds = parsed.map((p) => p.id);
            const trackedProducts = await this.productModel
                .find({ _id: { $in: trackedIds } })
                .select('sku stock')
                .lean();
            const trackedById = new Map(trackedProducts.map((p) => [String(p._id), p]));
            const movements = parsed
                .filter(({ id }) => trackedById.has(String(id)))
                .map(({ id, qty }) => {
                const product = trackedById.get(String(id));
                return {
                    product: id,
                    sku: product === null || product === void 0 ? void 0 : product.sku,
                    qtyChange: qty,
                    stockAfter: product === null || product === void 0 ? void 0 : product.stock,
                    reason,
                    referenceType: 'order',
                    referenceId: orderId,
                };
            });
            if (movements.length) {
                await this.stockMovementModel.insertMany(movements);
            }
        }
        catch (err) {
            this.logger.warn(`restockProducts failed for order ${orderId}: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
        }
    }
    normalizeOrderItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        return items
            .map((item) => this.normalizeOrderItem(item))
            .filter((item) => Boolean(item));
    }
    async attachCostSnapshots(items) {
        if (!Array.isArray(items) || !items.length)
            return [];
        const ids = items
            .map((item) => (item === null || item === void 0 ? void 0 : item._id) || (item === null || item === void 0 ? void 0 : item.product) || (item === null || item === void 0 ? void 0 : item.productId))
            .filter((id) => id && ObjectId.isValid(id));
        const products = ids.length
            ? await this.productModel
                .find({ _id: { $in: ids } })
                .select('_id costPrice')
                .maxTimeMS(5000)
                .lean()
            : [];
        const catalogCost = new Map(products.map((product) => [
            String(product._id),
            this.optionalNonNegativeNumber(product.costPrice),
        ]));
        return items.map((item) => {
            const itemCost = this.optionalNonNegativeNumber(item === null || item === void 0 ? void 0 : item.costPriceAtOrder);
            const fallback = catalogCost.get(String((item === null || item === void 0 ? void 0 : item._id) || (item === null || item === void 0 ? void 0 : item.product) || (item === null || item === void 0 ? void 0 : item.productId) || ''));
            const costPriceAtOrder = itemCost !== null && itemCost !== void 0 ? itemCost : fallback;
            return costPriceAtOrder === undefined
                ? Object.assign({}, item) : Object.assign(Object.assign({}, item), { costPriceAtOrder });
        });
    }
    optionalNonNegativeNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }
    getProductUnitCostSnapshot(product) {
        const directCost = this.optionalNonNegativeNumber(product === null || product === void 0 ? void 0 : product.costPrice);
        if (directCost !== undefined)
            return directCost;
        if (!Array.isArray(product === null || product === void 0 ? void 0 : product.products))
            return undefined;
        let complete = true;
        const packageCost = product.products.reduce((sum, entry) => {
            var _a;
            const itemCost = this.optionalNonNegativeNumber((_a = entry === null || entry === void 0 ? void 0 : entry.product) === null || _a === void 0 ? void 0 : _a.costPrice);
            if (itemCost === undefined) {
                complete = false;
                return sum;
            }
            return sum + itemCost * Math.max(1, Number(entry === null || entry === void 0 ? void 0 : entry.quantity) || 1);
        }, 0);
        return complete ? packageCost : undefined;
    }
    normalizeAttribution(value) {
        if (!value || typeof value !== 'object')
            return undefined;
        const text = (input, max = 500) => {
            if (input === undefined || input === null)
                return undefined;
            return String(input).trim().slice(0, max) || undefined;
        };
        const touch = (input) => {
            if (!input || typeof input !== 'object')
                return undefined;
            return {
                source: text(input.source, 120),
                medium: text(input.medium, 120),
                campaign: text(input.campaign, 200),
                campaignId: text(input.campaignId, 120),
                adSet: text(input.adSet, 200),
                adSetId: text(input.adSetId, 120),
                ad: text(input.ad, 200),
                adId: text(input.adId, 120),
                landingPage: text(input.landingPage),
                referrer: text(input.referrer),
                fbclid: text(input.fbclid, 300),
                gclid: text(input.gclid, 300),
                wbraid: text(input.wbraid, 300),
                gbraid: text(input.gbraid, 300),
                fbc: text(input.fbc, 300),
                fbp: text(input.fbp, 300),
                capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
            };
        };
        return {
            anonymousId: text(value.anonymousId, 120),
            gaClientId: text(value.gaClientId, 120),
            gaSessionId: text(value.gaSessionId, 120),
            firstTouch: touch(value.firstTouch),
            lastTouch: touch(value.lastTouch),
            clientUserAgent: text(value.clientUserAgent, 500),
            clientIpAddress: text(value.clientIpAddress, 60),
        };
    }
    normalizeOrderItem(item) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        const product = this.getOrderItemProduct(item);
        const productId = this.getOrderItemProductId(item, product);
        if (!productId) {
            this.logger.warn(`Skipping incomplete order item without product id: ${JSON.stringify(item)}`);
            return null;
        }
        const quantity = Math.max(1, this.toFiniteNumber((_b = (_a = item === null || item === void 0 ? void 0 : item.quantity) !== null && _a !== void 0 ? _a : item === null || item === void 0 ? void 0 : item.selectedQty) !== null && _b !== void 0 ? _b : item === null || item === void 0 ? void 0 : item.qty, 1));
        const salePrice = this.toFiniteNumber((_f = (_e = (_d = (_c = item === null || item === void 0 ? void 0 : item.unitPrice) !== null && _c !== void 0 ? _c : item === null || item === void 0 ? void 0 : item.salePrice) !== null && _d !== void 0 ? _d : product === null || product === void 0 ? void 0 : product.salePrice) !== null && _e !== void 0 ? _e : product === null || product === void 0 ? void 0 : product.price) !== null && _f !== void 0 ? _f : product === null || product === void 0 ? void 0 : product.regularPrice, 0);
        const regularPrice = this.toFiniteNumber((_k = (_j = (_h = (_g = item === null || item === void 0 ? void 0 : item.regularPrice) !== null && _g !== void 0 ? _g : item === null || item === void 0 ? void 0 : item.costPrice) !== null && _h !== void 0 ? _h : product === null || product === void 0 ? void 0 : product.regularPrice) !== null && _j !== void 0 ? _j : product === null || product === void 0 ? void 0 : product.price) !== null && _k !== void 0 ? _k : salePrice, salePrice);
        const image = this.getOrderItemImage(item, product);
        return {
            _id: productId,
            name: (_l = item === null || item === void 0 ? void 0 : item.name) !== null && _l !== void 0 ? _l : product === null || product === void 0 ? void 0 : product.name,
            nameEn: (_m = item === null || item === void 0 ? void 0 : item.nameEn) !== null && _m !== void 0 ? _m : product === null || product === void 0 ? void 0 : product.nameEn,
            slug: (_o = item === null || item === void 0 ? void 0 : item.slug) !== null && _o !== void 0 ? _o : product === null || product === void 0 ? void 0 : product.slug,
            image,
            author: this.normalizeOrderItemRef((_p = item === null || item === void 0 ? void 0 : item.author) !== null && _p !== void 0 ? _p : product === null || product === void 0 ? void 0 : product.author),
            category: this.normalizeOrderItemRef((_q = item === null || item === void 0 ? void 0 : item.category) !== null && _q !== void 0 ? _q : product === null || product === void 0 ? void 0 : product.category),
            subCategory: this.normalizeOrderItemRef((_r = item === null || item === void 0 ? void 0 : item.subCategory) !== null && _r !== void 0 ? _r : product === null || product === void 0 ? void 0 : product.subCategory),
            publisher: this.normalizeOrderItemRef((_s = item === null || item === void 0 ? void 0 : item.publisher) !== null && _s !== void 0 ? _s : product === null || product === void 0 ? void 0 : product.publisher),
            brand: this.normalizeOrderItemRef((_t = item === null || item === void 0 ? void 0 : item.brand) !== null && _t !== void 0 ? _t : product === null || product === void 0 ? void 0 : product.brand),
            regularPrice,
            unitPrice: salePrice,
            salePrice,
            costPriceAtOrder: (_u = this.optionalNonNegativeNumber(item === null || item === void 0 ? void 0 : item.costPriceAtOrder)) !== null && _u !== void 0 ? _u : this.optionalNonNegativeNumber(product === null || product === void 0 ? void 0 : product.costPrice),
            quantity,
            orderType: (_v = item === null || item === void 0 ? void 0 : item.orderType) !== null && _v !== void 0 ? _v : 'regular',
            discountAmount: this.toFiniteNumber(item === null || item === void 0 ? void 0 : item.discountAmount, 0),
            discountType: (_w = item === null || item === void 0 ? void 0 : item.discountType) !== null && _w !== void 0 ? _w : null,
            unit: (_y = (_x = item === null || item === void 0 ? void 0 : item.unit) !== null && _x !== void 0 ? _x : product === null || product === void 0 ? void 0 : product.unit) !== null && _y !== void 0 ? _y : null,
        };
    }
    getOrderItemProduct(item) {
        if ((item === null || item === void 0 ? void 0 : item.product) && typeof item.product === 'object') {
            return item.product;
        }
        if ((item === null || item === void 0 ? void 0 : item.productId) && typeof item.productId === 'object') {
            return item.productId;
        }
        if ((item === null || item === void 0 ? void 0 : item.productData) && typeof item.productData === 'object') {
            return item.productData;
        }
        return item || {};
    }
    getOrderItemProductId(item, product) {
        const candidates = [
            product === null || product === void 0 ? void 0 : product._id,
            product === null || product === void 0 ? void 0 : product.id,
            typeof (item === null || item === void 0 ? void 0 : item.product) === 'string' ? item.product : null,
            typeof (item === null || item === void 0 ? void 0 : item.productId) === 'string' ? item.productId : null,
            item === null || item === void 0 ? void 0 : item._id,
            item === null || item === void 0 ? void 0 : item.id,
        ];
        const id = candidates.find((candidate) => ObjectId.isValid(candidate));
        return id ? String(id) : null;
    }
    getOrderItemImage(item, product) {
        var _a;
        if (item === null || item === void 0 ? void 0 : item.image) {
            return item.image;
        }
        if (Array.isArray(item === null || item === void 0 ? void 0 : item.images) && item.images.length) {
            return item.images[0];
        }
        if (Array.isArray(product === null || product === void 0 ? void 0 : product.images) && product.images.length) {
            return product.images[0];
        }
        return (_a = product === null || product === void 0 ? void 0 : product.image) !== null && _a !== void 0 ? _a : null;
    }
    normalizeOrderItemRef(value) {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        return {
            _id: ObjectId.isValid(value === null || value === void 0 ? void 0 : value._id) ? value._id : undefined,
            name: value === null || value === void 0 ? void 0 : value.name,
            slug: value === null || value === void 0 ? void 0 : value.slug,
        };
    }
    toFiniteNumber(value, fallback = 0) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : fallback;
    }
    async markIncompleteOrderConverted(incompleteOrderId, orderId) {
        if (!ObjectId.isValid(incompleteOrderId)) {
            this.logger.warn(`Invalid incomplete order id: ${incompleteOrderId}`);
            return;
        }
        await this.incompleteOrderModel.findByIdAndUpdate(incompleteOrderId, {
            $set: {
                status: 'converted',
                orderId,
            },
        });
    }
    async cleanupIncompleteOrdersForPlacedOrder(saveData, exceptIncompleteOrderId) {
        if (!(saveData === null || saveData === void 0 ? void 0 : saveData.phoneNo)) {
            return;
        }
        const createdAt = saveData.createdAt || new Date();
        const match = {
            phoneNo: saveData.phoneNo,
            createdAt: { $lte: createdAt },
        };
        if (exceptIncompleteOrderId && ObjectId.isValid(exceptIncompleteOrderId)) {
            match._id = { $ne: new ObjectId(exceptIncompleteOrderId) };
        }
        await this.incompleteOrderModel.deleteMany(match);
    }
    async addOrderByUser(addOrderDto, user, req) {
        if (user) {
            addOrderDto.user = user._id;
        }
        return this.addOrder(addOrderDto, req);
    }
    async addOrderByAnonymous(addOrderDto, req) {
        return this.addOrder(addOrderDto, req);
    }
    async updateDate() {
        try {
            const data = await this.orderModel.find();
            if (data) {
                data.forEach(async (f) => {
                    const date = this.utilsService.getDateString(f.preferredDate);
                    await this.orderModel.findByIdAndUpdate(f._id, {
                        $set: { preferredDateString: date },
                    });
                });
            }
            return {
                success: true,
                message: 'Date updated successfully!',
                data: null,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkFraudSpy(phoneNo) {
        try {
            const fraudData = await this.courierService.checkFraudOrder(phoneNo);
            return {
                success: true,
                message: 'Fraud check completed',
                data: fraudData,
            };
        }
        catch (err) {
            this.logger.error('Fraud check failed: ' + err.message);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getRepeatCustomers() {
        try {
            const data = await this.orderModel.aggregate([
                { $group: { _id: '$phoneNo', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 }, _id: { $nin: [null, ''] } } },
                { $project: { _id: 0, phoneNo: '$_id', count: 1 } },
            ]);
            return { success: true, message: 'Success', data };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getRecentBuyersByProduct(slug) {
        try {
            if (!slug) {
                return {
                    success: true,
                    message: 'No slug',
                    data: [],
                };
            }
            const cached = recentBuyersCache.get(slug);
            if (cached && Date.now() - cached.at < RECENT_BUYERS_TTL_MS) {
                return {
                    success: true,
                    message: 'Success',
                    data: cached.data,
                };
            }
            const limit = 12;
            const orders = await this.orderModel
                .find({ 'orderedItems.slug': slug }, { name: 1, createdAt: 1 })
                .sort({ createdAt: -1 })
                .limit(limit)
                .maxTimeMS(2000)
                .lean();
            const data = (orders || [])
                .map((o) => {
                var _a;
                const firstName = ((o === null || o === void 0 ? void 0 : o.name) || '').toString().trim().split(/\s+/)[0];
                if (!firstName)
                    return null;
                return { firstName, purchasedAt: (_a = o === null || o === void 0 ? void 0 : o.createdAt) !== null && _a !== void 0 ? _a : null };
            })
                .filter(Boolean);
            recentBuyersCache.set(slug, { at: Date.now(), data });
            return { success: true, message: 'Success', data };
        }
        catch (err) {
            this.logger.warn('getRecentBuyersByProduct failed: ' + err.message);
            return { success: true, message: 'Success', data: [] };
        }
    }
    async buildInvoicePayload(fOrderData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const fShopInfo = await this.shopInformationModel.findOne({});
        return {
            _id: fOrderData._id,
            shopLogo: fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.navLogo,
            signatureImage: null,
            shopName: fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.siteName,
            shopPhoneNo: ((_a = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.phones) === null || _a === void 0 ? void 0 : _a.length)
                ? (_b = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.phones[0]) === null || _b === void 0 ? void 0 : _b.value
                : '-',
            shopWhatsappNo: ((_c = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.phones) === null || _c === void 0 ? void 0 : _c.length)
                ? (_d = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.phones[0]) === null || _d === void 0 ? void 0 : _d.value
                : '-',
            shopAddress: ((_e = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.addresses) === null || _e === void 0 ? void 0 : _e.length)
                ? (_f = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.addresses[0]) === null || _f === void 0 ? void 0 : _f.value
                : '-',
            shopEmail: ((_g = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.emails) === null || _g === void 0 ? void 0 : _g.length) ? (_h = fShopInfo === null || fShopInfo === void 0 ? void 0 : fShopInfo.emails[0]) === null || _h === void 0 ? void 0 : _h.value : '-',
            orderId: fOrderData.orderId,
            customerId: null,
            name: fOrderData.name,
            phoneNo: fOrderData.phoneNo,
            address: fOrderData.addresses,
            additionalDiscount: fOrderData.additionalDiscount,
            division: (_j = fOrderData.division) === null || _j === void 0 ? void 0 : _j.name,
            area: (_k = fOrderData.area) === null || _k === void 0 ? void 0 : _k.name,
            shippingAddress: fOrderData.shippingAddress,
            date: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.checkoutDate,
            paymentStatus: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.paymentStatus,
            subTotal: fOrderData.subTotal,
            discount: fOrderData.discount,
            deliveryCharge: fOrderData.deliveryCharge,
            weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
            grandTotal: fOrderData.grandTotal,
            items: fOrderData.orderedItems,
            couponDiscount: fOrderData.couponDiscount,
            deliveryNote: fOrderData.deliveryNote,
            paymentType: fOrderData.paymentType,
            paidAmount: fOrderData.paidAmount,
            advancePaymentStatus: fOrderData.advancePaymentStatus,
            advancePayment: fOrderData.advancePayment,
            trackingId: (_l = fOrderData.trackingId) !== null && _l !== void 0 ? _l : null,
            customerNotes: (_m = fOrderData.customerNotes) !== null && _m !== void 0 ? _m : null,
        };
    }
    async generateInvoicesByIds(ids) {
        try {
            const objectIds = ids.map((id) => new mongoose_2.Types.ObjectId(id));
            const orders = await this.orderModel.find({ _id: { $in: objectIds } });
            if (!(orders === null || orders === void 0 ? void 0 : orders.length)) {
                return { success: true, message: 'No orders found', data: [] };
            }
            const payloads = [];
            for (const order of orders) {
                const plain = JSON.parse(JSON.stringify(order));
                const invoice = await this.buildInvoicePayload(plain);
                payloads.push(invoice);
            }
            return {
                success: true,
                message: 'Success',
                data: payloads,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async generateInvoiceById(shop, id) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const fShopInfo = await this.shopInformationModel.findOne({
                shop: shop,
            });
            const fOrderData = JSON.parse(JSON.stringify(await this.orderModel.findById(id)));
            const invoiceData = {
                _id: fOrderData._id,
                shopLogo: fShopInfo.navLogo,
                signatureImage: null,
                shopName: fShopInfo.siteName,
                shopPhoneNo: fShopInfo.phones.length ? fShopInfo.phones[0].value : '-',
                shopWhatsappNo: fShopInfo.phones.length
                    ? fShopInfo.phones[0].value
                    : '-',
                shopAddress: fShopInfo.addresses.length
                    ? fShopInfo.addresses[0].value
                    : '-',
                shopEmail: fShopInfo.emails.length ? fShopInfo.emails[0].value : '-',
                orderId: fOrderData.orderId,
                customerId: null,
                name: fOrderData.name,
                phoneNo: fOrderData.phoneNo,
                sku: fOrderData.sku,
                address: fOrderData.addresses,
                additionalDiscount: fOrderData.additionalDiscount,
                shippingAddress: fOrderData.shippingAddress,
                date: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.checkoutDate,
                paymentStatus: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.paymentStatus,
                subTotal: fOrderData.subTotal,
                discount: fOrderData.discount,
                deliveryCharge: fOrderData.deliveryCharge,
                weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
                grandTotal: fOrderData.grandTotal,
                items: fOrderData.orderedItems.map((item) => {
                    var _a, _b, _c;
                    return (Object.assign(Object.assign({}, item), { sku: (_c = (_b = (_a = item.variation) === null || _a === void 0 ? void 0 : _a.sku) !== null && _b !== void 0 ? _b : item.sku) !== null && _c !== void 0 ? _c : null }));
                }),
                couponDiscount: fOrderData.couponDiscount,
                deliveryNote: fOrderData.deliveryNote,
                paymentType: fOrderData.paymentType,
                paidAmount: fOrderData.paidAmount,
                advancePaymentStatus: fOrderData.advancePaymentStatus,
                advancePayment: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.advancePayment,
                postCode: fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.postCode,
                trackingId: (fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.courierData)
                    ? fOrderData.courierData.providerName === 'Pathao Courier'
                        ? ((_b = (_a = fOrderData.courierData.consignmentId) !== null && _a !== void 0 ? _a : fOrderData.courierData.trackingId) !== null && _b !== void 0 ? _b : null)
                        : ((_d = (_c = fOrderData.courierData.consignmentId) !== null && _c !== void 0 ? _c : fOrderData.courierData.trackingId) !== null && _d !== void 0 ? _d : null)
                    : null,
                providerName: (_f = (_e = fOrderData === null || fOrderData === void 0 ? void 0 : fOrderData.courierData) === null || _e === void 0 ? void 0 : _e.providerName) !== null && _f !== void 0 ? _f : null,
            };
            return {
                success: true,
                message: 'Success',
                data: invoiceData,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getOrderByOrderId(orderId, select) {
        try {
            const data = await this.orderModel
                .findOne({ orderId: orderId })
                .select(select);
            return {
                success: true,
                message: 'Success! Order fetch successfully.',
                data,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async insertManyOrder(addOrdersDto, optionOrderDto) {
        var _a;
        const { deleteMany } = optionOrderDto;
        if (deleteMany) {
            await this.orderModel.deleteMany({});
        }
        const mData = await Promise.all(addOrdersDto.map(async (m) => {
            return Object.assign(Object.assign(Object.assign({}, m), { orderedItems: await this.attachCostSnapshots(m.orderedItems || []), attribution: this.normalizeAttribution(m.attribution), orderOrigin: m.orderOrigin ||
                    (String(m.orderFrom || '').toLowerCase() === 'website'
                        ? 'website'
                        : 'admin') }), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        }));
        try {
            const saveData = await this.orderModel.insertMany(mData);
            return {
                success: true,
                message: `${saveData && saveData.length ? saveData.length : 0}  Data Added Success`,
            };
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) && ((_a = error === null || error === void 0 ? void 0 : error.code) === null || _a === void 0 ? void 0 : _a.toString()) === (error_code_enum_1.ErrorCodes === null || error_code_enum_1.ErrorCodes === void 0 ? void 0 : error_code_enum_1.ErrorCodes.UNIQUE_FIELD)) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error === null || error === void 0 ? void 0 : error.message);
            }
        }
    }
    async getAllOrders(filterOrderDto, searchQuery) {
        var _a;
        const { filter } = filterOrderDto;
        const { pagination } = filterOrderDto;
        const { sort } = filterOrderDto;
        const { select } = filterOrderDto;
        const aggregateStagesCalculation = [];
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        const mf = mFilter;
        const coerceDate = (dateStr, endOfDay) => {
            const iso = endOfDay
                ? dateStr + 'T23:59:59.999+06:00'
                : dateStr + 'T00:00:00.000+06:00';
            return new Date(iso);
        };
        if (mf.createdAt && typeof mf.createdAt === 'object') {
            if (mf.createdAt.$gte && typeof mf.createdAt.$gte === 'string')
                mf.createdAt.$gte = coerceDate(mf.createdAt.$gte, false);
            if (mf.createdAt.$lte && typeof mf.createdAt.$lte === 'string')
                mf.createdAt.$lte = coerceDate(mf.createdAt.$lte, true);
        }
        if (searchQuery) {
            mFilter = {
                $and: [
                    mFilter,
                    {
                        $or: [
                            { orderId: { $regex: searchQuery, $options: 'i' } },
                            { phoneNo: { $regex: searchQuery, $options: 'i' } },
                            { name: { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                ],
            };
        }
        if (sort) {
            mSort = sort;
        }
        else {
            mSort = { createdAt: -1 };
        }
        if (select) {
            mSelect = Object.assign({}, select);
        }
        else {
            mSelect = { name: 1 };
        }
        if (Object.keys(mFilter).length) {
            aggregateStages.push({ $match: mFilter });
            const group = {
                $group: {
                    _id: null,
                    grandTotal: { $sum: '$grandTotal' },
                },
            };
            aggregateStagesCalculation.push({ $match: mFilter });
            aggregateStagesCalculation.push(group);
        }
        else {
            const group = {
                $group: {
                    _id: null,
                    grandTotal: { $sum: '$grandTotal' },
                },
            };
            aggregateStagesCalculation.push(group);
        }
        if (Object.keys(mSort).length) {
            aggregateStages.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateStages.push({ $project: mSelect });
        }
        if (pagination) {
            if (Object.keys(mSelect).length) {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                            { $project: mSelect },
                        ],
                    },
                };
            }
            else {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                        ],
                    },
                };
            }
            aggregateStages.push(mPagination);
            aggregateStages.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.orderModel.aggregate(aggregateStages);
            const calculateAggregates = await this.orderModel.aggregate(aggregateStagesCalculation);
            if (pagination) {
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), {
                    calculation: calculateAggregates[0],
                    success: true,
                    message: 'Success',
                });
            }
            else {
                return {
                    data: dataAggregates,
                    success: true,
                    message: 'Success',
                    count: dataAggregates.length,
                };
            }
        }
        catch (err) {
            this.logger.error(err);
            if ((err === null || err === void 0 ? void 0 : err.code) &&
                ((_a = err === null || err === void 0 ? void 0 : err.code) === null || _a === void 0 ? void 0 : _a.toString()) === (error_code_enum_1.ErrorCodes === null || error_code_enum_1.ErrorCodes === void 0 ? void 0 : error_code_enum_1.ErrorCodes.PROJECTION_MISMATCH)) {
                throw new common_1.BadRequestException('Error! Projection mismatch');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async getSalesStatsByFilter(filterType, filterId) {
        var _a, _b, _c, _d;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const filterObjectId = new mongoose_2.Types.ObjectId(filterId);
            const matchCondition = filterType === 'publisher'
                ? { 'orderedItems.publisher._id': filterObjectId }
                : { 'orderedItems.category._id': filterObjectId };
            const todayStats = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: {
                            $gte: today,
                            $lt: tomorrow,
                        },
                        orderStatus: { $ne: 6 },
                    },
                },
                {
                    $unwind: '$orderedItems',
                },
                {
                    $match: matchCondition,
                },
                {
                    $group: {
                        _id: null,
                        todayBooksSold: { $sum: '$orderedItems.quantity' },
                        todaySalesAmount: {
                            $sum: {
                                $multiply: [
                                    '$orderedItems.unitPrice',
                                    '$orderedItems.quantity',
                                ],
                            },
                        },
                    },
                },
            ]);
            const allTimeStats = await this.orderModel.aggregate([
                {
                    $match: {
                        orderStatus: { $ne: 6 },
                    },
                },
                {
                    $unwind: '$orderedItems',
                },
                {
                    $match: matchCondition,
                },
                {
                    $group: {
                        _id: null,
                        totalBooksSold: { $sum: '$orderedItems.quantity' },
                        totalSalesAmount: {
                            $sum: {
                                $multiply: [
                                    '$orderedItems.unitPrice',
                                    '$orderedItems.quantity',
                                ],
                            },
                        },
                    },
                },
            ]);
            const result = {
                todayBooksSold: ((_a = todayStats[0]) === null || _a === void 0 ? void 0 : _a.todayBooksSold) || 0,
                todaySalesAmount: ((_b = todayStats[0]) === null || _b === void 0 ? void 0 : _b.todaySalesAmount) || 0,
                totalBooksSold: ((_c = allTimeStats[0]) === null || _c === void 0 ? void 0 : _c.totalBooksSold) || 0,
                totalSalesAmount: ((_d = allTimeStats[0]) === null || _d === void 0 ? void 0 : _d.totalSalesAmount) || 0,
            };
            return {
                success: true,
                message: 'Sales statistics retrieved successfully',
                data: result,
            };
        }
        catch (error) {
            this.logger.error('Error getting sales stats:', error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getOrdersByUser(user, filterOrderDto, searchQuery) {
        const { filter } = filterOrderDto;
        let mFilter;
        if (filter) {
            mFilter = Object.assign({ user: new ObjectId(user._id) }, filter);
        }
        else {
            mFilter = { user: new ObjectId(user._id) };
        }
        filterOrderDto.filter = mFilter;
        return this.getAllOrders(filterOrderDto, searchQuery);
    }
    async getOrderById(id, select) {
        try {
            const data = await this.orderModel.findById(id).select(select);
            return {
                success: true,
                message: 'Success',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateOrderById(id, updateOrderDto) {
        var _a, _b, _c;
        const { name, orderStatus } = updateOrderDto;
        let data;
        try {
            data = await this.orderModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.orderModel.findByIdAndUpdate(id, {
                $set: updateOrderDto,
            }, { strict: false });
            const fSetting = await this.settingModel
                .findOne()
                .select('smsSendingOption currency smsMethods orderSetting courierMethods -_id');
            const fProductSetting = (_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.productSetting) !== null && _a !== void 0 ? _a : {};
            const fCourierMethods = (_b = fSetting === null || fSetting === void 0 ? void 0 : fSetting.courierMethods) !== null && _b !== void 0 ? _b : [];
            const courierMethod = fCourierMethods.find((f) => f.status === 'active');
            const fSmsMethods = (_c = fSetting === null || fSetting === void 0 ? void 0 : fSetting.smsMethods) !== null && _c !== void 0 ? _c : [];
            const smsMethod = fSmsMethods.find((f) => f.status === 'active');
            const smsSendingOption = fSetting === null || fSetting === void 0 ? void 0 : fSetting.smsSendingOption;
            if (orderStatus) {
                this.addSingleOrderToCourier({
                    orderStatus: orderStatus,
                    courierMethod: courierMethod,
                    id: id,
                });
            }
            return {
                success: true,
                message: 'Order updated successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleOrderById(ids, updateOrderDto) {
        var _a, _b;
        const { orderStatus } = updateOrderDto;
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.orderModel.updateMany({ _id: { $in: mIds } }, { $set: updateOrderDto });
            const fSetting = await this.settingModel
                .findOne()
                .select('smsSendingOption currency smsMethods productSetting courierMethods -_id');
            const fCourierMethods = (_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.courierMethods) !== null && _a !== void 0 ? _a : [];
            const courierMethod = fCourierMethods.find((f) => f.status === 'active');
            const fSmsMethods = (_b = fSetting === null || fSetting === void 0 ? void 0 : fSetting.smsMethods) !== null && _b !== void 0 ? _b : [];
            const smsMethod = fSmsMethods.find((f) => f.status === 'active');
            const smsSendingOption = fSetting === null || fSetting === void 0 ? void 0 : fSetting.smsSendingOption;
            this.addMultipleOrderToCourier({
                orderStatus: orderStatus,
                courierMethod: courierMethod,
                mIds: mIds,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async sendToCourier(id) {
        var _a;
        try {
            const fSetting = await this.settingModel.findOne();
            const courierMethods = (_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.courierMethods) !== null && _a !== void 0 ? _a : [];
            const courierMethod = courierMethods.find((f) => f.status === 'active');
            await this.addSingleOrderToCourier({ orderStatus: 8, courierMethod, id });
            await this.orderModel.findByIdAndUpdate(id, { $set: { orderStatus: 2 } });
            return {
                success: true,
                message: 'Order sent to courier successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async addSingleOrderToCourier(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const { orderStatus, courierMethod, id } = data;
        if (orderStatus === 8 && courierMethod) {
            const courierApiConfig = {
                providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                apiKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey,
                secretKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey,
                merchantCode: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchantCode,
                pickMerchantThana: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.thana,
                pickMerchantDistrict: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.district,
                pickMerchantAddress: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.address,
                pickMerchantName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchant_name,
                pickupMerchantPhone: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.contact_number,
                username: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.username,
                password: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.password,
                specialInstruction: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction,
                storeId: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.storeId,
            };
            const fOrder = await this.orderModel.findById(id);
            const mdata = {};
            if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Steadfast Courier') {
                if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _a === void 0 ? void 0 : _a.consignmentId)) {
                }
                else {
                    const getFullAddress = () => {
                        var _a, _b, _c;
                        const parts = [];
                        if ((_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name)
                            parts.push(fOrder.division.name);
                        const area = typeof (fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === 'object'
                            ? (_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === null || _b === void 0 ? void 0 : _b.name
                            : fOrder === null || fOrder === void 0 ? void 0 : fOrder.area;
                        if (area)
                            parts.push(area);
                        if ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.zone) === null || _c === void 0 ? void 0 : _c.name)
                            parts.push(fOrder.zone.name);
                        if (fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress)
                            parts.push(fOrder.shippingAddress);
                        return parts.join(', ');
                    };
                    const cashOnDeliveryAmount = () => {
                        var _a;
                        if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.paymentStatus) === 'paid') {
                            return 0;
                        }
                        else {
                            return (_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal) !== null && _a !== void 0 ? _a : 0;
                        }
                    };
                    const payload = {
                        invoice: fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderId,
                        recipient_name: fOrder === null || fOrder === void 0 ? void 0 : fOrder.name,
                        recipient_phone: fOrder === null || fOrder === void 0 ? void 0 : fOrder.phoneNo,
                        recipient_email: (_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.email) !== null && _b !== void 0 ? _b : null,
                        recipient_address: getFullAddress(),
                        cod_amount: cashOnDeliveryAmount(),
                        item_description: ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) === null || _c === void 0 ? void 0 : _c.map((i) => `${i.name} x${i.quantity || 1}`).join(', ')) || '',
                        note: (fOrder === null || fOrder === void 0 ? void 0 : fOrder.deliveryNote)
                            ? `${fOrder.deliveryNote} (${(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) || ''})`
                            : (courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) || '',
                    };
                    const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                    if (courierResponse.status === 200) {
                        const orderCourierData = {
                            providerName: 'Steadfast Courier',
                            consignmentId: (_d = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _d === void 0 ? void 0 : _d.consignment_id,
                            trackingId: (_e = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _e === void 0 ? void 0 : _e.tracking_code,
                            createdAt: this.utilsService.getDateString(new Date()),
                        };
                        await this.orderModel.findByIdAndUpdate(id, {
                            $set: {
                                courierData: orderCourierData,
                                courierStatus: Object.assign({ status: ((_f = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _f === void 0 ? void 0 : _f.status) || 'in_review', notificationType: 'order_created', trackingMessage: 'Order is waiting for courier review.', updatedAt: ((_g = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _g === void 0 ? void 0 : _g.updated_at) ||
                                        new Date().toISOString(), receivedAt: new Date() }, (this.getSteadfastDeliveryCharge(courierResponse) !==
                                    undefined
                                    ? {
                                        deliveryCharge: this.getSteadfastDeliveryCharge(courierResponse),
                                    }
                                    : {})),
                            },
                        });
                    }
                }
            }
            if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Pathao Courier') {
                if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_h = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _h === void 0 ? void 0 : _h.consignmentId)) {
                }
                else {
                    console.log('fOrder', fOrder);
                    const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, fOrder);
                    console.log('courierResponse', courierResponse);
                    if (courierResponse.code === 200) {
                        const orderCourierData = {
                            providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                            consignmentId: (_j = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _j === void 0 ? void 0 : _j.consignment_id,
                            trackingId: (_k = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _k === void 0 ? void 0 : _k.merchant_order_id,
                            createdAt: this.utilsService.getDateString(new Date()),
                        };
                        await this.orderModel.findByIdAndUpdate(id, {
                            $set: {
                                courierData: orderCourierData,
                            },
                        });
                    }
                }
            }
            if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Paperfly Courier') {
                if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_l = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _l === void 0 ? void 0 : _l.consignmentId)) {
                }
                else {
                    const getFullAddress = () => {
                        var _a, _b;
                        return `${(_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name}, ${(_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === null || _b === void 0 ? void 0 : _b.name}, ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress}`;
                    };
                    const cashOnDeliveryAmount = () => {
                        var _a;
                        if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.paymentStatus) === 'paid') {
                            return 0;
                        }
                        else {
                            return (_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal) !== null && _a !== void 0 ? _a : 0;
                        }
                    };
                    const payload = {
                        merOrderRef: fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderId,
                        custname: fOrder.name,
                        custPhone: fOrder.phoneNo,
                        custaddress: getFullAddress(),
                        customerThana: (_o = (_m = fOrder.area) === null || _m === void 0 ? void 0 : _m.name) !== null && _o !== void 0 ? _o : 'Mirpur',
                        customerDistrict: (_p = fOrder.division) === null || _p === void 0 ? void 0 : _p.name,
                        productSizeWeight: 'standard',
                        productBrief: this.getOrderItemProductNames(fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) ||
                            'No description',
                        packagePrice: fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal,
                        max_weight: 1,
                        deliveryOption: 'regular',
                        merchantCode: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchantCode,
                        pickMerchantThana: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.thana,
                        pickMerchantDistrict: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.district,
                        pickMerchantAddress: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.address,
                        pickMerchantName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchant_name,
                        pickupMerchantPhone: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.contact_number,
                        special_instruction: (_q = courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) !== null && _q !== void 0 ? _q : '',
                    };
                    const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                    if (courierResponse.response_code === 200) {
                        const orderCourierData = {
                            providerName: 'Paperfly Courier',
                            trackingId: (_r = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _r === void 0 ? void 0 : _r.tracking_number,
                            consignmentId: (_s = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _s === void 0 ? void 0 : _s.tracking_number,
                            createdAt: this.utilsService.getDateString(new Date()),
                        };
                        await this.orderModel.findByIdAndUpdate(id, {
                            $set: {
                                courierData: orderCourierData,
                            },
                        });
                    }
                }
            }
        }
    }
    getOrderItemProductNames(orderItems) {
        return orderItems
            .map((item) => (item === null || item === void 0 ? void 0 : item.name) || '')
            .filter((name) => name)
            .join(',');
    }
    async addMultipleOrderToCourier(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const { orderStatus, courierMethod, mIds } = data;
        if (orderStatus === 8 && courierMethod) {
            const courierApiConfig = {
                providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                apiKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey,
                secretKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey,
                merchantCode: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchantCode,
                pickMerchantThana: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.thana,
                pickMerchantDistrict: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.district,
                pickMerchantAddress: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.address,
                pickMerchantName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchant_name,
                pickupMerchantPhone: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.contact_number,
                username: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.username,
                password: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.password,
                specialInstruction: (_a = courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) !== null && _a !== void 0 ? _a : '',
                storeId: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.storeId,
            };
            for (const id of mIds) {
                const fOrder = await this.orderModel.findById(id);
                if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Steadfast Courier') {
                    if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _b === void 0 ? void 0 : _b.consignmentId)) {
                    }
                    else {
                        const getFullAddress = () => {
                            var _a, _b, _c;
                            const parts = [];
                            if ((_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name)
                                parts.push(fOrder.division.name);
                            const area = typeof (fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === 'object'
                                ? (_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === null || _b === void 0 ? void 0 : _b.name
                                : fOrder === null || fOrder === void 0 ? void 0 : fOrder.area;
                            if (area)
                                parts.push(area);
                            if ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.zone) === null || _c === void 0 ? void 0 : _c.name)
                                parts.push(fOrder.zone.name);
                            if (fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress)
                                parts.push(fOrder.shippingAddress);
                            return parts.join(', ');
                        };
                        const cashOnDeliveryAmount = () => {
                            var _a;
                            if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.paymentStatus) === 'paid') {
                                return 0;
                            }
                            else {
                                return (_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal) !== null && _a !== void 0 ? _a : 0;
                            }
                        };
                        const payload = {
                            invoice: fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderId,
                            recipient_name: fOrder === null || fOrder === void 0 ? void 0 : fOrder.name,
                            recipient_phone: fOrder === null || fOrder === void 0 ? void 0 : fOrder.phoneNo,
                            recipient_address: getFullAddress(),
                            cod_amount: cashOnDeliveryAmount(),
                            item_description: ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) === null || _c === void 0 ? void 0 : _c.map((i) => `${i.name} x${i.quantity || 1}`).join(', ')) || '',
                            note: (fOrder === null || fOrder === void 0 ? void 0 : fOrder.deliveryNote)
                                ? `${fOrder.deliveryNote} (${(courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) || ''})`
                                : (courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) || '',
                        };
                        const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                        if (courierResponse.status === 200) {
                            const orderCourierData = {
                                providerName: 'Steadfast Courier',
                                consignmentId: (_d = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _d === void 0 ? void 0 : _d.consignment_id,
                                trackingId: (_e = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _e === void 0 ? void 0 : _e.tracking_code,
                                createdAt: this.utilsService.getDateString(new Date()),
                            };
                            await this.orderModel.findByIdAndUpdate(id, {
                                $set: {
                                    courierData: orderCourierData,
                                    courierStatus: Object.assign({ status: ((_f = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _f === void 0 ? void 0 : _f.status) || 'in_review', notificationType: 'order_created', trackingMessage: 'Order is waiting for courier review.', updatedAt: ((_g = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.consignment) === null || _g === void 0 ? void 0 : _g.updated_at) ||
                                            new Date().toISOString(), receivedAt: new Date() }, (this.getSteadfastDeliveryCharge(courierResponse) !==
                                        undefined
                                        ? {
                                            deliveryCharge: this.getSteadfastDeliveryCharge(courierResponse),
                                        }
                                        : {})),
                                },
                            });
                        }
                    }
                }
                if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Pathao Courier') {
                    if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_h = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _h === void 0 ? void 0 : _h.consignmentId)) {
                    }
                    else {
                        const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, fOrder);
                        if (courierResponse.code === 200) {
                            const orderCourierData = {
                                providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                                consignmentId: (_j = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _j === void 0 ? void 0 : _j.consignment_id,
                                trackingId: (_k = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _k === void 0 ? void 0 : _k.merchant_order_id,
                                createdAt: this.utilsService.getDateString(new Date()),
                            };
                            await this.orderModel.findByIdAndUpdate(id, {
                                $set: {
                                    courierData: orderCourierData,
                                },
                            });
                        }
                    }
                }
                if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Paperfly Courier') {
                    if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_l = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _l === void 0 ? void 0 : _l.consignmentId)) {
                    }
                    else {
                        const getFullAddress = () => {
                            var _a, _b;
                            return `${(_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name}, ${(_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.area) === null || _b === void 0 ? void 0 : _b.name}, ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress}`;
                        };
                        const cashOnDeliveryAmount = () => {
                            var _a;
                            if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.paymentStatus) === 'paid') {
                                return 0;
                            }
                            else {
                                return (_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal) !== null && _a !== void 0 ? _a : 0;
                            }
                        };
                        const payload = {
                            merOrderRef: fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderId,
                            custname: fOrder.name,
                            custPhone: fOrder.phoneNo,
                            custaddress: getFullAddress(),
                            customerThana: (_o = (_m = fOrder.area) === null || _m === void 0 ? void 0 : _m.name) !== null && _o !== void 0 ? _o : 'Mirpur',
                            customerDistrict: (_p = fOrder.division) === null || _p === void 0 ? void 0 : _p.name,
                            productSizeWeight: 'standard',
                            productBrief: this.getOrderItemProductNames(fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) ||
                                'No description',
                            packagePrice: fOrder === null || fOrder === void 0 ? void 0 : fOrder.grandTotal,
                            max_weight: 1,
                            deliveryOption: 'regular',
                            merchantCode: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchantCode,
                            pickMerchantThana: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.thana,
                            pickMerchantDistrict: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.district,
                            pickMerchantAddress: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.address,
                            pickMerchantName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchant_name,
                            pickupMerchantPhone: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.contact_number,
                            special_instruction: (_q = courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) !== null && _q !== void 0 ? _q : '',
                        };
                        const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                        if (courierResponse.response_code === 200) {
                            const orderCourierData = {
                                providerName: 'Paperfly Courier',
                                trackingId: (_r = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _r === void 0 ? void 0 : _r.tracking_number,
                                consignmentId: (_s = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _s === void 0 ? void 0 : _s.tracking_number,
                                createdAt: this.utilsService.getDateString(new Date()),
                            };
                            await this.orderModel.findByIdAndUpdate(id, {
                                $set: {
                                    courierData: orderCourierData,
                                },
                            });
                        }
                    }
                }
            }
        }
    }
    async updateOrderSessionKey(id, updateOrderDto) {
        try {
            await this.orderModel.findByIdAndUpdate(id, {
                $set: updateOrderDto,
            });
            return {
                success: true,
                message: 'Order updated successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async changeOrderStatus(id, updateOrderStatusDto) {
        const { orderStatus } = updateOrderStatusDto;
        let data;
        try {
            data = await this.orderModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            let deliveryDate;
            let deliveryDateString;
            if (orderStatus === 5) {
                deliveryDate = this.utilsService.getLocalDateTime();
                deliveryDateString = this.utilsService.getDateString(this.utilsService.getLocalDateTime());
            }
            else {
                deliveryDate = null;
                deliveryDateString = null;
            }
            let orderTimeline;
            if (data.hasOrderTimeline) {
                orderTimeline = data.orderTimeline;
                if (orderStatus === order_enum_1.OrderStatus.CONFIRM) {
                    orderTimeline.confirmed = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: null,
                    };
                }
                else if (orderStatus === order_enum_1.OrderStatus.PROCESSING) {
                    orderTimeline.processed = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: data.orderTimeline.processed.expectedDate,
                    };
                }
                else if (orderStatus === order_enum_1.OrderStatus.SHIPPING) {
                    orderTimeline.shipped = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: data.orderTimeline.shipped.expectedDate,
                    };
                }
                else if (orderStatus === order_enum_1.OrderStatus.DELIVERED) {
                    orderTimeline.delivered = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: data.orderTimeline.delivered.expectedDate,
                    };
                    if (!orderTimeline.confirmed.success) {
                        orderTimeline.confirmed = {
                            success: true,
                            date: this.utilsService.getLocalDateTime(),
                            expectedDate: null,
                        };
                    }
                    if (!orderTimeline.processed.success) {
                        orderTimeline.processed = {
                            success: true,
                            date: this.utilsService.getLocalDateTime(),
                            expectedDate: data.orderTimeline.processed.expectedDate,
                        };
                    }
                    if (!orderTimeline.shipped.success) {
                        orderTimeline.shipped = {
                            success: true,
                            date: this.utilsService.getLocalDateTime(),
                            expectedDate: data.orderTimeline.shipped.expectedDate,
                        };
                    }
                }
                else if (orderStatus === order_enum_1.OrderStatus.CANCEL) {
                    orderTimeline.canceled = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: null,
                    };
                }
                else if (orderStatus === order_enum_1.OrderStatus.REFUND) {
                    orderTimeline.refunded = {
                        success: true,
                        date: this.utilsService.getLocalDateTime(),
                        expectedDate: null,
                    };
                }
            }
            else {
                orderTimeline = null;
            }
            const isRestockStatus = [
                order_enum_1.OrderStatus.CANCEL,
                order_enum_1.OrderStatus.REFUND,
                order_enum_1.OrderStatus.RETURN,
            ].includes(orderStatus);
            const shouldRestock = isRestockStatus &&
                data.stockDecremented === true &&
                !data.stockRestocked;
            const mData = {
                courierLink: updateOrderStatusDto.courierLink,
                orderStatus: orderStatus,
                orderTimeline: orderTimeline,
                paymentStatus: orderStatus === order_enum_1.OrderStatus.DELIVERED ? 'paid' : data.paymentStatus,
                deliveryDate: deliveryDate,
                deliveryDateString: deliveryDateString,
            };
            if (shouldRestock) {
                mData.stockRestocked = true;
            }
            await this.orderModel.findByIdAndUpdate(id, {
                $set: mData,
            });
            if (shouldRestock) {
                const restockReason = orderStatus === order_enum_1.OrderStatus.RETURN
                    ? 'return_restock'
                    : 'cancel_restock';
                await this.restockProducts(id, data['orderedItems'], restockReason);
            }
            if (orderStatus === 2) {
                const message = `আপনার অর্ডার আইডি ${data === null || data === void 0 ? void 0 : data.orderId} নিশ্চিত করা হয়েছে। ডেলিভারি সময়: ঢাকার ভিতরে ১–২ কার্যদিবস, ঢাকার বাইরে ৩–৬ কার্যদিবস। ধন্যবাদ আলম বুক এর সঙ্গে থাকার জন্য।`;
                this.bulkSmsService.sentSingleSms(data.phoneNo, message);
            }
            return {
                success: true,
                message: 'Order updated successfully',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteOrderById(id, checkUsage) {
        let data;
        try {
            data = await this.orderModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.orderModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleOrderById(ids, checkUsage) {
        try {
            await this.orderModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async newOrderMake(orderData) {
        var _a, _b, _c, _d;
        let cartItems = [];
        if (!(orderData === null || orderData === void 0 ? void 0 : orderData.user)) {
            const fProducts = JSON.parse(JSON.stringify(await this.productModel.find({
                _id: { $in: orderData.carts.map((m) => new ObjectId(m)) },
            })));
            const fSpecialPackages = orderData.cartData
                .filter((item) => item.cartType === 1)
                .map((item) => item.specialPackage);
            const specialPackages = fSpecialPackages.length
                ? JSON.parse(JSON.stringify(await this.specialPackageModel
                    .find({
                    _id: { $in: fSpecialPackages.map((id) => new ObjectId(id)) },
                })
                    .populate('products.product', 'salePrice costPrice discountType discountAmount variationsOptions hasVariations')))
                : [];
            if ((fProducts && fProducts.length) || specialPackages) {
                cartItems = orderData.cartData.map((t1) => {
                    const productFromFProducts = fProducts.find((t2) => t2._id === t1.product);
                    const productFromSpecialPackages = specialPackages.find((t2) => String(t2._id) === String(t1.specialPackage || t1.product));
                    return Object.assign(Object.assign({}, t1), { product: Object.assign({}, productFromFProducts), specialPackage: Object.assign({}, productFromSpecialPackages) });
                });
            }
        }
        else {
            cartItems = JSON.parse(JSON.stringify(await this.cartModel
                .find({ user: orderData.user })
                .populate('product', 'name nameEn slug author description publisher salePrice costPrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit')
                .populate({
                path: 'specialPackage',
                populate: {
                    path: 'products.product',
                    select: 'salePrice costPrice discountType discountAmount variationsOptions hasVariations',
                },
            })));
        }
        const finalData = cartItems
            .map((item) => {
            if (item.cartType === 1) {
                if (item.specialPackage) {
                    const images = [item.specialPackage.image];
                    const specialPackage = (0, special_package_price_util_1.withCalculatedSpecialPackageSubtotal)(item.specialPackage);
                    return Object.assign(Object.assign({}, item), { product: Object.assign(Object.assign({}, specialPackage), { images }) });
                }
                return null;
            }
            return item;
        })
            .filter((item) => item !== null);
        const products = finalData.map((m) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            return ({
                _id: m.product._id,
                name: m.product.name,
                nameEn: m.product.nameEn,
                slug: m.product.slug,
                image: ((_a = m.product.images) === null || _a === void 0 ? void 0 : _a[0]) || null,
                category: {
                    _id: (_b = m.product.category) === null || _b === void 0 ? void 0 : _b._id,
                    name: (_c = m.product.category) === null || _c === void 0 ? void 0 : _c.name,
                    slug: (_d = m.product.category) === null || _d === void 0 ? void 0 : _d.slug,
                },
                author: {
                    _id: (_e = m.product.author) === null || _e === void 0 ? void 0 : _e._id,
                    name: (_f = m.product.author) === null || _f === void 0 ? void 0 : _f.name,
                    slug: (_g = m.product.author) === null || _g === void 0 ? void 0 : _g.slug,
                },
                publisher: {
                    _id: (_h = m.product.publisher) === null || _h === void 0 ? void 0 : _h._id,
                    name: (_j = m.product.publisher) === null || _j === void 0 ? void 0 : _j.name,
                    slug: (_k = m.product.publisher) === null || _k === void 0 ? void 0 : _k.slug,
                },
                subCategory: {
                    _id: (_l = m.product.subCategory) === null || _l === void 0 ? void 0 : _l._id,
                    name: (_m = m.product.subCategory) === null || _m === void 0 ? void 0 : _m.name,
                    slug: (_o = m.product.subCategory) === null || _o === void 0 ? void 0 : _o.slug,
                },
                brand: {
                    _id: (_p = m.product.brand) === null || _p === void 0 ? void 0 : _p._id,
                    name: (_q = m.product.brand) === null || _q === void 0 ? void 0 : _q.name,
                    slug: (_r = m.product.brand) === null || _r === void 0 ? void 0 : _r.slug,
                },
                discountType: m.product.discountType,
                discountAmount: m.product.discountAmount,
                regularPrice: this.utilsService.transform(m.product, 'regularPrice'),
                unitPrice: this.utilsService.transform(m.product, 'salePrice'),
                salePrice: this.utilsService.transform(m.product, 'salePrice'),
                costPriceAtOrder: this.getProductUnitCostSnapshot(m.product),
                quantity: m.selectedQty,
                orderType: 'regular',
            });
        });
        const cartSubTotal = finalData.reduce((acc, t) => acc +
            this.utilsService.transform(t.product, 'regularPrice', t.selectedQty), 0);
        const giftLine = await this.evaluateGiftLine(products, finalData);
        if (giftLine)
            products.push(giftLine);
        const cartDiscountAmount = finalData.reduce((acc, t) => acc +
            this.utilsService.transform(t.product, 'discountAmount', t.selectedQty), 0);
        const couponDiscount = await this.calculateCouponDiscount(cartSubTotal, orderData === null || orderData === void 0 ? void 0 : orderData.coupon);
        const orderDiscount = cartSubTotal > 0
            ? await this.calculateOrderDiscount(cartSubTotal, orderData === null || orderData === void 0 ? void 0 : orderData.user, orderData.orderFrom)
            : 0;
        const weightBasedDeliveryCharge = this.calculateWeightBasedDeliveryCharge(finalData, (_a = orderData === null || orderData === void 0 ? void 0 : orderData.division) === null || _a === void 0 ? void 0 : _a.name, (_b = orderData === null || orderData === void 0 ? void 0 : orderData.area) === null || _b === void 0 ? void 0 : _b.name, (_c = orderData === null || orderData === void 0 ? void 0 : orderData.zone) === null || _c === void 0 ? void 0 : _c.name);
        const grandTotal = cartSubTotal +
            (orderData === null || orderData === void 0 ? void 0 : orderData.deliveryCharge) -
            couponDiscount -
            cartDiscountAmount -
            orderDiscount;
        const newOrderData = {
            name: orderData === null || orderData === void 0 ? void 0 : orderData.name,
            phoneNo: orderData === null || orderData === void 0 ? void 0 : orderData.phoneNo,
            shippingAddress: orderData === null || orderData === void 0 ? void 0 : orderData.shippingAddress,
            division: orderData === null || orderData === void 0 ? void 0 : orderData.division,
            note: orderData === null || orderData === void 0 ? void 0 : orderData.note,
            area: orderData === null || orderData === void 0 ? void 0 : orderData.area,
            zone: orderData === null || orderData === void 0 ? void 0 : orderData.zone,
            city: orderData === null || orderData === void 0 ? void 0 : orderData.city,
            orderFrom: (orderData === null || orderData === void 0 ? void 0 : orderData.orderFrom) || 'Website',
            orderOrigin: (orderData === null || orderData === void 0 ? void 0 : orderData.orderOrigin) || 'website',
            manualOrderSource: orderData === null || orderData === void 0 ? void 0 : orderData.manualOrderSource,
            paymentType: orderData === null || orderData === void 0 ? void 0 : orderData.paymentType,
            country: orderData === null || orderData === void 0 ? void 0 : orderData.country,
            paymentStatus: 'unpaid',
            orderStatus: order_enum_1.OrderStatus.PENDING,
            orderedItems: products,
            subTotal: cartSubTotal,
            deliveryCharge: (orderData === null || orderData === void 0 ? void 0 : orderData.deliveryCharge) || 0,
            weightBasedDeliveryCharge: weightBasedDeliveryCharge,
            discount: cartDiscountAmount.toFixed(2),
            totalSave: cartDiscountAmount,
            grandTotal,
            discountTypes: [{ productDiscount: cartDiscountAmount.toFixed(2) }],
            checkoutDate: this.utilsService.getDateString(new Date()),
            user: (orderData === null || orderData === void 0 ? void 0 : orderData.user) || null,
            email: (orderData === null || orderData === void 0 ? void 0 : orderData.email) || null,
            coupon: (_d = orderData === null || orderData === void 0 ? void 0 : orderData.coupon) !== null && _d !== void 0 ? _d : null,
            couponDiscount,
            hasOrderTimeline: true,
            orderTimeline: orderData === null || orderData === void 0 ? void 0 : orderData.orderTimeline,
            attribution: this.normalizeAttribution(orderData === null || orderData === void 0 ? void 0 : orderData.attribution),
        };
        return newOrderData;
    }
    async evaluateGiftLine(products, finalData) {
        try {
            const cfg = JSON.parse(JSON.stringify(await this.orderOfferModel.findOne({}))) ||
                {
                    giftEnabled: true,
                    giftMinAmount: FREE_NOTEBOOK_MIN_AMOUNT,
                    giftProduct: {
                        _id: '6a3c1d665676acb52a082df5',
                        name: 'Amol Notebook',
                        slug: 'Amol Notebook',
                        image: 'https://apisub.amolbooks.com/api/upload/images/free-notebook-a015.webp',
                    },
                    giftBuyXProductSlug: '500 shobder kuraner 75%',
                    giftBuyXQty: 2,
                    giftLabel: 'ফ্রি নোটবুক',
                };
            if (!cfg ||
                !cfg.giftEnabled ||
                !cfg.giftProduct ||
                !cfg.giftProduct._id) {
                return null;
            }
            const giftId = String(cfg.giftProduct._id);
            if (!mongoose_2.Types.ObjectId.isValid(giftId)) {
                this.logger.error('evaluateGiftLine: invalid giftProduct._id ' + giftId);
                return null;
            }
            const giftEligibleSubTotal = finalData.reduce((acc, t) => {
                var _a;
                if (String((_a = t.product) === null || _a === void 0 ? void 0 : _a._id) === giftId)
                    return acc;
                return (acc +
                    this.utilsService.transform(t.product, 'salePrice', t.selectedQty));
            }, 0);
            let eligible = false;
            if (giftEligibleSubTotal >= FREE_NOTEBOOK_MIN_AMOUNT) {
                eligible = true;
            }
            if (!eligible && cfg.giftBuyXProductSlug && cfg.giftBuyXQty) {
                const match = products.find((p) => p.slug === cfg.giftBuyXProductSlug);
                if (match && Number(match.quantity) >= Number(cfg.giftBuyXQty)) {
                    eligible = true;
                }
            }
            const existing = products.find((p) => String(p._id) === giftId);
            if (!eligible) {
                return null;
            }
            if (existing) {
                existing.regularPrice = 0;
                existing.unitPrice = 0;
                existing.salePrice = 0;
                existing.discountType = undefined;
                existing.discountAmount = 0;
                existing.orderType = 'gift';
                existing.isGift = true;
                return null;
            }
            return {
                _id: cfg.giftProduct._id,
                name: cfg.giftProduct.name || cfg.giftLabel || 'উপহার',
                nameEn: cfg.giftProduct.nameEn || 'Free Gift',
                slug: cfg.giftProduct.slug || null,
                image: cfg.giftProduct.image || null,
                regularPrice: 0,
                unitPrice: 0,
                salePrice: 0,
                quantity: 1,
                orderType: 'gift',
                isGift: true,
            };
        }
        catch (err) {
            this.logger.error('evaluateGiftLine failed: ' + err.message);
            return null;
        }
    }
    async calculateCouponDiscount(cartSubTotal, couponId) {
        const coupon = JSON.parse(JSON.stringify(await this.couponModel.findOne({ _id: couponId })));
        if (!coupon) {
            return 0;
        }
        const discount = coupon.discountType === product_enum_1.DiscountTypeEnum.PERCENTAGE
            ? Math.floor((coupon.discountAmount / 100) * cartSubTotal)
            : Math.floor(coupon.discountAmount);
        return discount;
    }
    async calculateOrderDiscount(cartSubTotal, userId, orderFrom) {
        const fOrderOfferData = await this.orderOfferModel.findOne({});
        const orderOfferData = JSON.parse(JSON.stringify(fOrderOfferData));
        let finalData;
        let orderDiscount = 0;
        let orderDiscountFromApps = 0;
        if (orderOfferData) {
            const orderCount = await this.orderModel.countDocuments({
                user: new ObjectId(userId),
            });
            const currentMonth = this.utilsService.getDateMonth(false, new Date());
            const currentYear = this.utilsService.getDateYear(new Date());
            const orderInMonth = await this.orderModel.find({
                user: new ObjectId(userId),
                month: currentMonth,
                year: currentYear,
            });
            const jOrderInMonth = JSON.parse(JSON.stringify(orderInMonth));
            let hasMonthDiscount = false;
            for (const data of jOrderInMonth) {
                if (data.hasMonthDiscount) {
                    hasMonthDiscount = true;
                }
            }
            const orderInMonthAmount = jOrderInMonth
                .map((m) => m.grandTotal)
                .reduce((acc, value) => acc + value, 0);
            if (orderCount === 0) {
                finalData = Object.assign(Object.assign({}, orderOfferData), {
                    hasFirstOrderDiscount: true,
                });
            }
            else {
                finalData = Object.assign(Object.assign({}, orderOfferData), {
                    hasFirstOrderDiscount: false,
                    orderInMonthAmount: hasMonthDiscount ? 0 : orderInMonthAmount,
                });
            }
        }
        else {
            finalData = Object.assign(Object.assign({}, orderOfferData), {
                hasFirstOrderDiscount: false,
                orderInMonthAmount: null,
            });
        }
        if (finalData) {
            if (cartSubTotal >= finalData.amount3OrderMinAmount &&
                cartSubTotal < finalData.monthOrderMinAmount) {
                if (finalData.amount3OrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.amount3OrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.amount3OrderDiscountAmount);
                }
            }
            else if (cartSubTotal >= finalData.amount3OrderMinAmount &&
                finalData.monthOrderMinAmount >= 0) {
                if (finalData.amount3OrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.amount3OrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.amount3OrderDiscountAmount);
                }
            }
            else if (cartSubTotal >= finalData.amount2OrderMinAmount &&
                cartSubTotal < finalData.amount3OrderMinAmount) {
                if (finalData.amount2OrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.amount2OrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.amount2OrderDiscountAmount);
                }
            }
            else if (cartSubTotal >= finalData.amountOrderMinAmount &&
                cartSubTotal < finalData.amount2OrderMinAmount) {
                if (finalData.amountOrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.amountOrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.amountOrderDiscountAmount);
                }
            }
            else if (finalData.hasFirstOrderDiscount &&
                cartSubTotal >= finalData.firstOrderDiscountAmount &&
                cartSubTotal < finalData.amountOrderMinAmount) {
                if (finalData.firstOrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.firstOrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.firstOrderDiscountAmount);
                }
            }
            else if (finalData.orderInMonthAmount >= finalData.monthOrderValue &&
                finalData.monthOrderMinAmount <= cartSubTotal) {
                if (finalData.monthOrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                    orderDiscount = this.utilsService.roundNumber((finalData.monthOrderDiscountAmount / 100) * cartSubTotal);
                }
                else {
                    orderDiscount = this.utilsService.roundNumber(finalData.monthOrderDiscountAmount);
                }
            }
            if (orderFrom && orderFrom === 'Apps') {
                if (finalData.appsOrderMinAmount &&
                    cartSubTotal >= finalData.appsOrderMinAmount) {
                    if (finalData.appsOrderDiscountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                        orderDiscountFromApps = this.utilsService.roundNumber((finalData.appsOrderDiscountAmount / 100) * cartSubTotal);
                    }
                    else {
                        orderDiscountFromApps = this.utilsService.roundNumber(finalData.appsOrderDiscountAmount);
                    }
                }
            }
            return orderDiscount + orderDiscountFromApps;
        }
    }
    calculateWeightBasedDeliveryCharge(cartItems, division, area, zone) {
        const dhakaOutsideAreas = [
            'Savar >> সাভার',
            'Dohar — দোহার',
            'Nawabganj — নবাবগঞ্জ',
            'Keraniganj — কেরানীগঞ্জ',
            'Dhamrai — ধামরাই',
        ];
        const isDhakaDivision = division === 'Dhaka > ঢাকা' ||
            division === 'Dhaka >> ঢাকা' ||
            division === 'Dhaka >ঢাকা';
        if (isDhakaDivision) {
            if (area && dhakaOutsideAreas.includes(area)) {
                return 0;
            }
            return 0;
        }
        const totalWeight = cartItems.reduce((totalWeight, item) => {
            var _a;
            const itemWeight = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.weight) || 0;
            const quantity = item.selectedQty || 1;
            return totalWeight + itemWeight * quantity;
        }, 0);
        if (totalWeight > 2000) {
            const excessWeight = totalWeight - 2000;
            const additionalKg = Math.ceil(excessWeight / 1000);
            const additionalCharge = additionalKg * 15;
            return additionalCharge;
        }
        return 0;
    }
    async checkAndUpdateCourierStatus() {
        schedule.scheduleJob('0 */6 * * *', async () => {
            console.log('Get All Courier Status And Update Start...');
            await this.getAllCourierStatusAndUpdate();
        });
    }
    async getAllCourierStatusAndUpdate() {
        var _a;
        const last3Days = new Date(this.utilsService.getNextDateString(new Date(), -15));
        const formattedDate = last3Days.toISOString().split('T')[0];
        const orders = await this.orderModel.find({
            'courierData.createdAt': { $gte: formattedDate },
            courierData: { $exists: true, $ne: null },
        });
        if (orders.length === 0) {
            console.log('No orders found for the last 3 days with courierData.');
            return;
        }
        let courierMethods = [];
        try {
            const fSetting = await this.settingModel
                .findOne()
                .select('courierMethods -_id');
            courierMethods = ((_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.courierMethods) !== null && _a !== void 0 ? _a : []).filter((courier) => courier.status === 'active');
        }
        catch (err) {
            console.error(`Failed to fetch courier setting`, err);
        }
        const BATCH_SIZE = 100;
        for (let i = 0; i < orders.length; i += BATCH_SIZE) {
            const batch = orders.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (order) => {
                var _a;
                const matchedCourier = courierMethods.find((courier) => { var _a; return courier.providerName === ((_a = order.courierData) === null || _a === void 0 ? void 0 : _a.providerName); });
                if (matchedCourier) {
                    try {
                        await this.getAndUpdateOrderStatusFromCourier(order, matchedCourier);
                    }
                    catch (err) {
                        console.error(`Failed to update order ${order._id}`, ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
                    }
                }
            });
            await Promise.allSettled(batchPromises);
            console.log(`✅ Processed batch ${i / BATCH_SIZE + 1}`);
        }
        console.log('🎉 All courier status updates complete.');
    }
    async getAndUpdateOrderStatusFromCourier(order, courierMethod) {
        var _a, _b, _c, _d, _e;
        let orderStatus;
        const courierApiConfig = {
            providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
            apiKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.apiKey,
            merchantCode: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchantCode,
            pickMerchantThana: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.thana,
            pickMerchantDistrict: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.district,
            pickMerchantAddress: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.address,
            pickMerchantName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.merchant_name,
            pickupMerchantPhone: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.contact_number,
            secretKey: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.secretKey,
            username: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.username,
            password: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.password,
        };
        if (order.courierData.consignmentId) {
            const courierResponse = await this.courierService.getOrderStatusFormCourier(courierApiConfig, order.courierData.consignmentId, order === null || order === void 0 ? void 0 : order.orderId);
            switch (courierResponse && (courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName)) {
                case 'Steadfast Courier':
                    if (courierResponse.status === 200) {
                        const receivedAt = new Date();
                        const deliveryCharge = this.getSteadfastDeliveryCharge(courierResponse);
                        const statusSet = {
                            'courierStatus.status': String(courierResponse.delivery_status || 'unknown').toLowerCase(),
                            'courierStatus.notificationType': 'status_poll',
                            'courierStatus.trackingMessage': ((_a = order.courierStatus) === null || _a === void 0 ? void 0 : _a.trackingMessage) || '',
                            'courierStatus.updatedAt': receivedAt.toISOString(),
                            'courierStatus.receivedAt': receivedAt,
                            'courierStatus.lastSyncedAt': receivedAt,
                        };
                        const statusUnset = {
                            'courierStatus.lastSyncError': 1,
                        };
                        if (((_b = order.courierStatus) === null || _b === void 0 ? void 0 : _b.deliveryCharge) === null ||
                            ((_c = order.courierStatus) === null || _c === void 0 ? void 0 : _c.deliveryCharge) === undefined) {
                            statusSet['courierStatus.chargeLookupAttemptedAt'] = receivedAt;
                            if (deliveryCharge !== undefined) {
                                statusSet['courierStatus.deliveryCharge'] = deliveryCharge;
                                statusUnset['courierStatus.chargeLookupError'] = 1;
                            }
                            else {
                                statusSet['courierStatus.chargeLookupError'] =
                                    'Steadfast status response did not include delivery charge.';
                            }
                        }
                        await this.orderModel.findByIdAndUpdate(order.id, {
                            $set: statusSet,
                            $unset: statusUnset,
                        });
                    }
                    break;
                case 'Pathao Courier':
                    if (courierResponse.code === 200) {
                        console.log('courierResponse.data.order_status', courierResponse.data.order_status);
                        switch (courierResponse.data.order_status) {
                            case 'Delivered':
                                orderStatus = 'delivered';
                                break;
                            case 'Cancelled':
                                orderStatus = 'cancelled';
                                break;
                            case 'Cancel':
                                orderStatus = 'cancelled';
                                break;
                            case 'Return':
                                orderStatus = 'refunded';
                                break;
                            case 'Pending':
                                orderStatus = 'Pathao Checking';
                                break;
                            default:
                                orderStatus = courierResponse.data.order_status;
                                break;
                        }
                        await this.orderModel.findByIdAndUpdate(order.id, {
                            $set: {
                                orderStatus: orderStatus,
                            },
                        });
                    }
                    break;
                case 'Paperfly Courier':
                    if (courierResponse.response_code === 200 &&
                        ((_e = (_d = courierResponse.success) === null || _d === void 0 ? void 0 : _d.trackingStatus) === null || _e === void 0 ? void 0 : _e.length) > 0) {
                        const statusObj = courierResponse.success.trackingStatus[0];
                        const statusKeys = [
                            'Pick',
                            'inTransit',
                            'ReceivedAtPoint',
                            'PickedForDelivery',
                            'Delivered',
                            'Returned',
                            'Partial',
                            'onHoldSchedule',
                            'close',
                            'Cancelled',
                            'Cancel',
                            'Not yet picked',
                        ];
                        let latestStatus = null;
                        let latestTime = null;
                        for (const key of statusKeys) {
                            const timeKey = key + 'Time';
                            const timeStr = statusObj[timeKey];
                            if (timeStr) {
                                const t = new Date(timeStr);
                                if (!latestTime || t > latestTime) {
                                    latestTime = t;
                                    latestStatus = key;
                                }
                            }
                        }
                        let orderStatus;
                        switch (latestStatus) {
                            case 'Delivered':
                                orderStatus = 'delivered';
                                break;
                            case 'Cancelled':
                            case 'Cancel':
                                orderStatus = 'cancelled';
                                break;
                            case 'inTransit':
                                orderStatus = 'Order is in the processing';
                                break;
                            case 'ReceivedAtPoint':
                                orderStatus = 'Order has been received at point';
                                break;
                            case 'Pick':
                                orderStatus = 'Order has been picked';
                                break;
                            case 'PickedForDelivery':
                                orderStatus = 'Picked for delivery';
                                break;
                            case 'Returned':
                                orderStatus = 'Order has been returned';
                                break;
                        }
                        await this.orderModel.findByIdAndUpdate(order.id, {
                            $set: {
                                orderStatus,
                            },
                        });
                    }
                    break;
            }
        }
    }
    buildIncompleteOrderMergePatch(addIncompleteOrderDto) {
        const dto = addIncompleteOrderDto;
        return OrderService_1.INCOMPLETE_ORDER_MERGE_FIELDS.reduce((patch, field) => {
            const incoming = dto === null || dto === void 0 ? void 0 : dto[field];
            if (incoming === undefined || incoming === null)
                return patch;
            if (typeof incoming === 'string' && !incoming.trim())
                return patch;
            if (typeof incoming === 'number' &&
                (!Number.isFinite(incoming) || incoming === 0))
                return patch;
            if (Array.isArray(incoming) && !incoming.length)
                return patch;
            patch[field] = incoming;
            return patch;
        }, {});
    }
    async addIncompleteOrder(addIncompleteOrderDto, req) {
        var _a, _b, _c;
        try {
            const incompleteInput = Object.assign({}, addIncompleteOrderDto);
            incompleteInput.attribution = this.normalizeAttribution(Object.assign(Object.assign({}, (incompleteInput.attribution || {})), { clientUserAgent: ((_a = incompleteInput.attribution) === null || _a === void 0 ? void 0 : _a.clientUserAgent) ||
                    ((_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b['user-agent']), clientIpAddress: ((_c = incompleteInput.attribution) === null || _c === void 0 ? void 0 : _c.clientIpAddress) ||
                    (req ? this.utilsService.getClientIp(req) : undefined) }));
            const phoneNo = String((addIncompleteOrderDto === null || addIncompleteOrderDto === void 0 ? void 0 : addIncompleteOrderDto.phoneNo) || '').trim();
            if (phoneNo) {
                const existing = await this.incompleteOrderModel
                    .findOne({
                    phoneNo,
                    status: { $ne: 'converted' },
                    createdAt: {
                        $gte: new Date(Date.now() - OrderService_1.INCOMPLETE_ORDER_MERGE_WINDOW_MS),
                    },
                })
                    .sort({ createdAt: -1 })
                    .select({ _id: 1 });
                if (existing) {
                    const patch = this.buildIncompleteOrderMergePatch(incompleteInput);
                    if (Object.keys(patch).length) {
                        await this.incompleteOrderModel.updateOne({ _id: existing._id }, { $set: patch });
                    }
                    return {
                        success: true,
                        message: 'Incomplete order saved successfully',
                        data: { _id: existing._id },
                    };
                }
            }
            const newData = new this.incompleteOrderModel(incompleteInput);
            const saveData = await newData.save();
            if (saveData.phoneNo) {
                this.runIncompleteOrderFraudCheck(String(saveData._id), saveData.phoneNo).catch((error) => {
                    this.logger.warn(`Auto fraud check failed for incomplete order ${saveData._id}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
                });
            }
            return {
                success: true,
                message: 'Incomplete order saved successfully',
                data: { _id: saveData._id },
            };
        }
        catch (err) {
            this.logger.error(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async runIncompleteOrderFraudCheck(incompleteOrderId, phoneNo) {
        const fraudCheckerData = await this.courierService.checkFraudOrder(phoneNo);
        if (fraudCheckerData) {
            await this.incompleteOrderModel.updateOne({ _id: incompleteOrderId }, { $set: { fraudChecker: fraudCheckerData } });
        }
    }
    async getAllIncompleteOrders(filterDto, searchQuery) {
        var _a, _b, _c, _d;
        const { filter, pagination, sort, select } = filterDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = { createdAt: -1 };
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        const mf = mFilter;
        const coerceDate = (dateStr, endOfDay) => {
            const iso = endOfDay
                ? dateStr + 'T23:59:59.999+06:00'
                : dateStr + 'T00:00:00.000+06:00';
            return new Date(iso);
        };
        if (mf.createdAt && typeof mf.createdAt === 'object') {
            if (mf.createdAt.$gte && typeof mf.createdAt.$gte === 'string')
                mf.createdAt.$gte = coerceDate(mf.createdAt.$gte, false);
            if (mf.createdAt.$lte && typeof mf.createdAt.$lte === 'string')
                mf.createdAt.$lte = coerceDate(mf.createdAt.$lte, true);
        }
        if (searchQuery) {
            mFilter = {
                $and: [
                    mFilter,
                    {
                        $or: [
                            { name: { $regex: searchQuery, $options: 'i' } },
                            { phoneNo: { $regex: searchQuery, $options: 'i' } },
                            { orderId: { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                ],
            };
        }
        if (sort) {
            mSort = sort;
        }
        if (select) {
            mSelect = Object.assign({}, select);
        }
        if (Object.keys(mFilter).length) {
            aggregateStages.push({ $match: mFilter });
        }
        aggregateStages.push({
            $lookup: {
                from: 'orders',
                let: {
                    incompletePhoneNo: '$phoneNo',
                    incompleteCreatedAt: '$createdAt',
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$phoneNo', '$$incompletePhoneNo'] },
                                    { $gte: ['$createdAt', '$$incompleteCreatedAt'] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: 'placedOrders',
            },
        }, {
            $match: {
                $or: [{ status: 'converted' }, { placedOrders: { $size: 0 } }],
            },
        });
        if (Object.keys(mSort).length) {
            aggregateStages.push({ $sort: mSort });
        }
        let pageSize = 25;
        let currentPage = 1;
        if (pagination) {
            pageSize =
                pagination.pageSize && Number(pagination.pageSize) > 0
                    ? Number(pagination.pageSize)
                    : 25;
            currentPage =
                pagination.currentPage && Number(pagination.currentPage) > 0
                    ? Number(pagination.currentPage)
                    : 1;
            mPagination = {
                skip: pageSize * (currentPage - 1),
                limit: pageSize,
            };
        }
        const dataPipeline = [
            { $skip: mPagination.skip || 0 },
            { $limit: mPagination.limit || pageSize },
        ];
        if (Object.keys(mSelect).length) {
            dataPipeline.push({ $project: mSelect });
        }
        aggregateStages.push({
            $facet: {
                data: dataPipeline,
                count: [{ $count: 'count' }],
                calculation: [
                    { $group: { _id: null, grandTotal: { $sum: '$grandTotal' } } },
                ],
            },
        });
        try {
            const [result] = await this.incompleteOrderModel.aggregate(aggregateStages);
            const data = (result === null || result === void 0 ? void 0 : result.data) || [];
            const count = ((_b = (_a = result === null || result === void 0 ? void 0 : result.count) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.count) || 0;
            const calculation = {
                grandTotal: ((_d = (_c = result === null || result === void 0 ? void 0 : result.calculation) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.grandTotal) || 0,
            };
            return {
                success: true,
                message: 'Incomplete orders retrieved successfully',
                data,
                count,
                calculation,
            };
        }
        catch (err) {
            this.logger.error(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getIncompleteOrderById(id) {
        try {
            const data = await this.incompleteOrderModel
                .findById(id)
                .populate('user', 'name email phoneNo');
            if (!data) {
                throw new common_1.NotFoundException('Incomplete order not found');
            }
            return {
                success: true,
                message: 'Incomplete order retrieved successfully',
                data,
            };
        }
        catch (err) {
            this.logger.error(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateIncompleteOrderById(id, updateIncompleteOrderDto, req) {
        var _a, _b, _c;
        const incompleteInput = Object.assign({}, updateIncompleteOrderDto);
        if (incompleteInput.attribution || req) {
            incompleteInput.attribution = this.normalizeAttribution(Object.assign(Object.assign({}, (incompleteInput.attribution || {})), { clientUserAgent: ((_a = incompleteInput.attribution) === null || _a === void 0 ? void 0 : _a.clientUserAgent) ||
                    ((_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b['user-agent']), clientIpAddress: ((_c = incompleteInput.attribution) === null || _c === void 0 ? void 0 : _c.clientIpAddress) ||
                    (req ? this.utilsService.getClientIp(req) : undefined) }));
        }
        return this.updateIncompleteOrderFields(id, incompleteInput, [
            'name',
            'phoneNo',
            'email',
            'city',
            'shippingAddress',
            'division',
            'area',
            'zone',
            'paymentType',
            'paymentStatus',
            'deliveryCharge',
            'subTotal',
            'discount',
            'grandTotal',
            'orderedItems',
            'note',
            'attribution',
        ], false);
    }
    async updateIncompleteOrderByAdmin(id, updateIncompleteOrderDto) {
        return this.updateIncompleteOrderFields(id, updateIncompleteOrderDto, [
            'name',
            'phoneNo',
            'email',
            'city',
            'shippingAddress',
            'division',
            'area',
            'zone',
            'paymentType',
            'paymentStatus',
            'deliveryCharge',
            'subTotal',
            'discount',
            'grandTotal',
            'orderedItems',
            'note',
            'adminNote',
            'fraudChecker',
        ]);
    }
    async updateIncompleteOrderFields(id, updateIncompleteOrderDto, editableFields, allowConverted = true) {
        try {
            const dto = updateIncompleteOrderDto;
            const updateData = editableFields.reduce((result, field) => {
                if (!Object.prototype.hasOwnProperty.call(dto || {}, field)) {
                    return result;
                }
                const value = dto[field];
                if (!allowConverted &&
                    typeof value === 'string' &&
                    !value.trim() &&
                    field !== 'adminNote' &&
                    field !== 'note') {
                    return result;
                }
                result[field] = value;
                return result;
            }, {});
            const match = allowConverted
                ? { _id: id }
                : { _id: id, status: { $ne: 'converted' } };
            const data = await this.incompleteOrderModel.findOneAndUpdate(match, { $set: updateData }, { new: true, runValidators: true });
            if (!data) {
                throw new common_1.NotFoundException('Incomplete order not found');
            }
            return {
                success: true,
                message: 'Incomplete order updated successfully',
                data,
            };
        }
        catch (err) {
            this.logger.error(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleIncompleteOrderById(ids) {
        try {
            await this.incompleteOrderModel.deleteMany({
                _id: { $in: ids },
            });
            return {
                success: true,
                message: 'Incomplete orders deleted successfully',
            };
        }
        catch (err) {
            this.logger.error(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
OrderService.INCOMPLETE_ORDER_MERGE_WINDOW_MS = 6 * 60 * 60 * 1000;
OrderService.INCOMPLETE_ORDER_MERGE_FIELDS = [
    'orderId',
    'name',
    'phoneNo',
    'email',
    'city',
    'shippingAddress',
    'division',
    'area',
    'zone',
    'paymentType',
    'paymentStatus',
    'grandTotal',
    'subTotal',
    'discount',
    'deliveryCharge',
    'orderedItems',
    'note',
    'checkoutDate',
    'user',
    'attribution',
];
OrderService = OrderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Admin')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('IncompleteOrder')),
    __param(3, (0, mongoose_1.InjectModel)('Product')),
    __param(4, (0, mongoose_1.InjectModel)('SpecialPackage')),
    __param(5, (0, mongoose_1.InjectModel)('UniqueId')),
    __param(6, (0, mongoose_1.InjectModel)('Cart')),
    __param(7, (0, mongoose_1.InjectModel)('User')),
    __param(8, (0, mongoose_1.InjectModel)('Setting')),
    __param(9, (0, mongoose_1.InjectModel)('Coupon')),
    __param(11, (0, mongoose_1.InjectModel)('ShopInformation')),
    __param(12, (0, mongoose_1.InjectModel)('OrderOffer')),
    __param(13, (0, mongoose_1.InjectModel)('StockMovement')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        courier_service_1.CourierService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        bulk_sms_service_1.BulkSmsService,
        email_service_1.EmailService,
        analytics_service_1.AnalyticsService])
], OrderService);
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map