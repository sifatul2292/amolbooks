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
const ObjectId = mongoose_2.Types.ObjectId;
let OrderService = OrderService_1 = class OrderService {
    constructor(adminModel, orderModel, productModel, specialPackageModel, uniqueIdModel, cartModel, userModel, settingModel, couponModel, courierService, shopInformationModel, orderOfferModel, configService, utilsService, bulkSmsService, emailService) {
        this.adminModel = adminModel;
        this.orderModel = orderModel;
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
        this.configService = configService;
        this.utilsService = utilsService;
        this.bulkSmsService = bulkSmsService;
        this.emailService = emailService;
        this.logger = new common_1.Logger(OrderService_1.name);
        this.checkAndUpdateCourierStatus();
    }
    async addOrderAdmin(admin, addOrderDto) {
        if (!admin || !admin._id) {
            this.logger.error('Admin data is missing in addOrderAdmin');
            throw new common_1.BadRequestException('Admin authentication failed: Admin data is missing');
        }
        let user;
        let mData;
        const adminData = await this.adminModel.findById(admin._id);
        const incOrder = await this.uniqueIdModel.findOneAndUpdate({}, { $inc: { orderId: 1 } }, { new: true, upsert: true });
        const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);
        const dataExtra = {
            orderId: orderIdUnique,
            month: this.utilsService.getDateMonth(false, new Date()),
            year: this.utilsService.getDateYear(new Date()),
        };
        if (addOrderDto.phoneNo && !addOrderDto.user) {
            user = await this.userModel.findOne({ phoneNo: addOrderDto.phoneNo });
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
        const newData = new this.orderModel(mData);
        try {
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
                orderId: saveData.orderId,
            };
            if (addOrderDto.user) {
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
            for (const f of addOrderDto['orderedItems']) {
                const product = await this.productModel.findById(f._id);
                if ((product === null || product === void 0 ? void 0 : product.quantity) > 0) {
                    await this.productModel.findByIdAndUpdate(f._id, {
                        $inc: {
                            quantity: -f.quantity,
                            totalSold: f.quantity,
                        },
                    });
                }
                else {
                    await this.productModel.findByIdAndUpdate(f._id, {
                        $inc: {
                            totalSold: f.quantity,
                        },
                    });
                }
            }
            const response = {
                success: true,
                message: 'Order Added Success',
                data,
            };
            this.processOrderBackgroundTasks(saveData, addOrderDto).catch((error) => {
                this.logger.error(`Error in background order processing for order ${saveData.orderId}:`, error);
            });
            return response;
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addOrder(addOrderDto) {
        try {
            let newOrderMake;
            const fraudCheckerData = null;
            newOrderMake = await this.newOrderMake(addOrderDto);
            const incOrder = await this.uniqueIdModel.findOneAndUpdate({}, { $inc: { orderId: 1 } }, { new: true, upsert: true });
            const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);
            const dataExtra = {
                orderId: orderIdUnique,
                month: this.utilsService.getDateMonth(false, new Date()),
                year: this.utilsService.getDateYear(new Date()),
            };
            const mData = Object.assign(Object.assign({}, newOrderMake), dataExtra);
            const newData = new this.orderModel(mData);
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
            this.processOrderBackgroundTasks(saveData, addOrderDto).catch((error) => {
                this.logger.error(`Error in background order processing for order ${saveData.orderId}:`, error);
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
                const orderCheck = await this.orderModel.findById(saveData._id).select('orderSmsSent');
                if (!(orderCheck === null || orderCheck === void 0 ? void 0 : orderCheck.orderSmsSent)) {
                    const message = `
         আপনার অর্ডারটি alambook.com-এ সফলভাবে সম্পন্ন হয়েছে! অর্ডার আইডি ${saveData.orderId},অর্ডারের বিল ${saveData.grandTotal} টাকা যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন 01754896763 ধন্যবাদ, alambook.com টিম
        `;
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
    async addOrderByUser(addOrderDto, user) {
        if (user) {
            addOrderDto.user = user._id;
        }
        return this.addOrder(addOrderDto);
    }
    async addOrderByAnonymous(addOrderDto) {
        return this.addOrder(addOrderDto);
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
                        ? (_b = (_a = fOrderData.courierData.consignmentId) !== null && _a !== void 0 ? _a : fOrderData.courierData.trackingId) !== null && _b !== void 0 ? _b : null
                        : (_d = (_c = fOrderData.courierData.consignmentId) !== null && _c !== void 0 ? _c : fOrderData.courierData.trackingId) !== null && _d !== void 0 ? _d : null
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
        const mData = addOrdersDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
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
            });
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
            await this.orderModel.findByIdAndUpdate(id, { $set: { orderStatus: 8 } });
            return { success: true, message: 'Order sent to courier successfully' };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async addSingleOrderToCourier(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
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
                        return `Division: ${(_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name}, Area: ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.area}, Zone: ${(_c = (_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.zone) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'n/a'}, ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress}`;
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
                        item_description: ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) === null || _c === void 0 ? void 0 : _c.map((i) => i.name).join(', ')) || '',
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
                            },
                        });
                    }
                }
            }
            if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Pathao Courier') {
                if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_f = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _f === void 0 ? void 0 : _f.consignmentId)) {
                }
                else {
                    console.log('fOrder', fOrder);
                    const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, fOrder);
                    console.log('courierResponse', courierResponse);
                    if (courierResponse.code === 200) {
                        const orderCourierData = {
                            providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                            consignmentId: (_g = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _g === void 0 ? void 0 : _g.consignment_id,
                            trackingId: (_h = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _h === void 0 ? void 0 : _h.merchant_order_id,
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
                if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_j = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _j === void 0 ? void 0 : _j.consignmentId)) {
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
                        customerThana: (_l = (_k = fOrder.area) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : 'Mirpur',
                        customerDistrict: (_m = fOrder.division) === null || _m === void 0 ? void 0 : _m.name,
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
                        special_instruction: (_o = courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) !== null && _o !== void 0 ? _o : '',
                    };
                    const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                    if (courierResponse.response_code === 200) {
                        const orderCourierData = {
                            providerName: 'Paperfly Courier',
                            trackingId: (_p = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _p === void 0 ? void 0 : _p.tracking_number,
                            consignmentId: (_q = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _q === void 0 ? void 0 : _q.tracking_number,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
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
                            return `Division: ${(_a = fOrder === null || fOrder === void 0 ? void 0 : fOrder.division) === null || _a === void 0 ? void 0 : _a.name}, Area: ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.area}, Zone: ${(_c = (_b = fOrder === null || fOrder === void 0 ? void 0 : fOrder.zone) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'n/a'}, ${fOrder === null || fOrder === void 0 ? void 0 : fOrder.shippingAddress}`;
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
                            item_description: ((_c = fOrder === null || fOrder === void 0 ? void 0 : fOrder.orderedItems) === null || _c === void 0 ? void 0 : _c.map((i) => i.name).join(', ')) || '',
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
                                },
                            });
                        }
                    }
                }
                if ((courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName) === 'Pathao Courier') {
                    if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_f = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _f === void 0 ? void 0 : _f.consignmentId)) {
                    }
                    else {
                        const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, fOrder);
                        if (courierResponse.code === 200) {
                            const orderCourierData = {
                                providerName: courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.providerName,
                                consignmentId: (_g = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _g === void 0 ? void 0 : _g.consignment_id,
                                trackingId: (_h = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.data) === null || _h === void 0 ? void 0 : _h.merchant_order_id,
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
                    if ((fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) && ((_j = fOrder === null || fOrder === void 0 ? void 0 : fOrder.courierData) === null || _j === void 0 ? void 0 : _j.consignmentId)) {
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
                            customerThana: (_l = (_k = fOrder.area) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : 'Mirpur',
                            customerDistrict: (_m = fOrder.division) === null || _m === void 0 ? void 0 : _m.name,
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
                            special_instruction: (_o = courierMethod === null || courierMethod === void 0 ? void 0 : courierMethod.specialInstruction) !== null && _o !== void 0 ? _o : '',
                        };
                        const courierResponse = await this.courierService.createOrderWithProvider(courierApiConfig, payload);
                        if (courierResponse.response_code === 200) {
                            const orderCourierData = {
                                providerName: 'Paperfly Courier',
                                trackingId: (_p = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _p === void 0 ? void 0 : _p.tracking_number,
                                consignmentId: (_q = courierResponse === null || courierResponse === void 0 ? void 0 : courierResponse.success) === null || _q === void 0 ? void 0 : _q.tracking_number,
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
            const mData = {
                courierLink: updateOrderStatusDto.courierLink,
                orderStatus: orderStatus,
                orderTimeline: orderTimeline,
                paymentStatus: orderStatus === order_enum_1.OrderStatus.DELIVERED ? 'paid' : data.paymentStatus,
                deliveryDate: deliveryDate,
                deliveryDateString: deliveryDateString,
            };
            await this.orderModel.findByIdAndUpdate(id, {
                $set: mData,
            });
            if (orderStatus === 2) {
                const message = `আপনার অর্ডার আইডি ${data === null || data === void 0 ? void 0 : data.orderId} নিশ্চিত করা হয়েছে। ডেলিভারি সময়: ঢাকার ভিতরে ১–২ কার্যদিবস, ঢাকার বাইরে ৩–৬ কার্যদিবস। ধন্যবাদ আলম বুক এর সঙ্গে থাকার জন্য।`;
                this.bulkSmsService.sentSingleSms(data.phoneNo, message);
            }
            if (orderStatus === 5) {
                for (const f of data['orderedItems']) {
                    await this.productModel.findByIdAndUpdate(f._id, {
                        $inc: {
                            totalSold: f.quantity,
                        },
                    });
                    await this.productModel.findByIdAndUpdate(f._id, {
                        $inc: {
                            quantity: -f.quantity,
                        },
                    });
                }
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
                ? JSON.parse(JSON.stringify(await this.specialPackageModel.find({
                    _id: { $in: fSpecialPackages.map((id) => new ObjectId(id)) },
                })))
                : [];
            if ((fProducts && fProducts.length) || specialPackages) {
                cartItems = orderData.cartData.map((t1) => {
                    const productFromFProducts = fProducts.find((t2) => t2._id === t1.product);
                    const productFromSpecialPackages = specialPackages.find((t2) => t2._id === t1.product);
                    return Object.assign(Object.assign({}, t1), { product: Object.assign({}, productFromFProducts), specialPackage: Object.assign({}, productFromSpecialPackages) });
                });
            }
        }
        else {
            cartItems = JSON.parse(JSON.stringify(await this.cartModel
                .find({ user: orderData.user })
                .populate('product', 'name nameEn slug author description publisher salePrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit')
                .populate('specialPackage')));
        }
        const finalData = cartItems
            .map((item) => {
            if (item.cartType === 1) {
                if (item.specialPackage) {
                    const images = [item.specialPackage.image];
                    return Object.assign(Object.assign({}, item), { product: Object.assign(Object.assign({}, item.specialPackage), { images }) });
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
                quantity: m.selectedQty,
                orderType: 'regular',
            });
        });
        const cartSubTotal = finalData.reduce((acc, t) => acc +
            this.utilsService.transform(t.product, 'regularPrice', t.selectedQty), 0);
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
            orderFrom: 'Website',
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
        };
        return newOrderData;
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
        const courierMethodArray = [];
        try {
            const fSetting = await this.settingModel
                .findOne()
                .select('courierMethods -_id');
            const fCourierMethods = (_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.courierMethods) !== null && _a !== void 0 ? _a : [];
            const activeCourier = fCourierMethods.find((c) => c.status === 'active');
            if (activeCourier) {
                courierMethodArray.push({ courier: activeCourier });
            }
        }
        catch (err) {
            console.error(`Failed to fetch courier setting`, err);
        }
        const BATCH_SIZE = 100;
        for (let i = 0; i < orders.length; i += BATCH_SIZE) {
            const batch = orders.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (order) => {
                var _a;
                const matchedCourier = courierMethodArray;
                if (matchedCourier) {
                    try {
                        await this.getAndUpdateOrderStatusFromCourier(order, matchedCourier.courier);
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
        var _a, _b;
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
                        switch (courierResponse.delivery_status) {
                            case 'delivered':
                                orderStatus = 'delivered';
                                break;
                            case 'cancelled':
                                orderStatus = 'cancelled';
                                break;
                        }
                        await this.orderModel.findByIdAndUpdate(order.id, {
                            $set: {
                                orderStatus: orderStatus,
                            },
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
                        ((_b = (_a = courierResponse.success) === null || _a === void 0 ? void 0 : _a.trackingStatus) === null || _b === void 0 ? void 0 : _b.length) > 0) {
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
};
OrderService = OrderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Admin')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('Product')),
    __param(3, (0, mongoose_1.InjectModel)('SpecialPackage')),
    __param(4, (0, mongoose_1.InjectModel)('UniqueId')),
    __param(5, (0, mongoose_1.InjectModel)('Cart')),
    __param(6, (0, mongoose_1.InjectModel)('User')),
    __param(7, (0, mongoose_1.InjectModel)('Setting')),
    __param(8, (0, mongoose_1.InjectModel)('Coupon')),
    __param(10, (0, mongoose_1.InjectModel)('ShopInformation')),
    __param(11, (0, mongoose_1.InjectModel)('OrderOffer')),
    __metadata("design:paramtypes", [mongoose_2.Model,
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
        config_1.ConfigService,
        utils_service_1.UtilsService,
        bulk_sms_service_1.BulkSmsService,
        email_service_1.EmailService])
], OrderService);
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map