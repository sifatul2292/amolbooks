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
var UtilsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilsService = void 0;
const common_1 = require("@nestjs/common");
const moment = require("moment-timezone");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const fs = require("fs");
const path = require("path");
const product_enum_1 = require("../../enum/product.enum");
const PDFDocument = require('pdfkit');
let UtilsService = UtilsService_1 = class UtilsService {
    constructor(productModel) {
        this.productModel = productModel;
        this.logger = new common_1.Logger(UtilsService_1.name);
    }
    getDateString(date) {
        return moment(date).format('YYYY-MM-DD');
    }
    getPdfDateString(date, format) {
        const fm = format ? format : 'YYYY-MM-DD';
        return moment(date).format(fm);
    }
    getNextDateString(date, day) {
        return moment(date).add(day, 'days').format('YYYY-MM-DD');
    }
    getDateMonth(fromZero, date) {
        let d;
        if (date) {
            d = new Date(date);
        }
        else {
            d = new Date();
        }
        const month = d.getMonth();
        return fromZero ? month : month + 1;
    }
    getDateYear(date) {
        let d;
        if (date) {
            d = new Date(date);
        }
        else {
            d = new Date();
        }
        return d.getFullYear();
    }
    getLocalDateTime() {
        const newDate = moment().tz('Asia/Dhaka');
        return newDate.toDate();
    }
    createRegexFromString(inputString) {
        const escapedString = inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escapedString, 'i');
    }
    createRegexFromString1(inputString) {
        const escapedString = inputString.replace(/[-[\]{}()*+?.,\\^$|/#]/g, '\\$&');
        return new RegExp(escapedString.trim(), 'i');
    }
    getClientIp(req) {
        var _a;
        const xff = (req.headers['x-forwarded-for'] ||
            req.headers['cf-connecting-ip'] ||
            '');
        const remote = (((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || '');
        const candidates = String(xff || remote)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        for (const ip of candidates) {
            if (!this.isPrivateOrLoopback(ip))
                return ip;
        }
        return undefined;
    }
    isPrivateOrLoopback(ip) {
        const v4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
        if (v4) {
            const parts = ip.split('.').map(Number);
            const [a, b] = parts;
            if (ip === '127.0.0.1')
                return true;
            if (a === 10)
                return true;
            if (a === 192 && b === 168)
                return true;
            if (a === 172 && b >= 16 && b <= 31)
                return true;
            return false;
        }
        const lower = ip.toLowerCase();
        if (lower === '::1')
            return true;
        if (lower.startsWith('fc') || lower.startsWith('fd'))
            return true;
        return false;
    }
    getDateWithCurrentTime(date) {
        const _ = moment().tz('Asia/Dhaka');
        const newDate = moment(date).add({ hours: _.hour(), minutes: _.minute() });
        return newDate.toDate();
    }
    getDateDifference(date1, date2, unit) {
        const a = moment(date1).tz('Asia/Dhaka');
        const b = moment(date2).tz('Asia/Dhaka');
        switch (unit) {
            case 'seconds': {
                return b.diff(a, 'seconds');
            }
            case 'minutes': {
                return b.diff(a, 'minutes');
            }
            case 'hours': {
                return b.diff(a, 'hours');
            }
            case 'days': {
                return b.diff(a, 'days');
            }
            case 'weeks': {
                return b.diff(a, 'weeks');
            }
            default: {
                return b.diff(a, 'hours');
            }
        }
    }
    async generateInvoicePdf(orderData) {
        var _a, _b, _c, _d, _e;
        const dir = `./upload/invoice`;
        const logoPath = path.join(dir, 'logo1.png');
        const fileName = `invoice-${orderData.orderId}.pdf`;
        const filePath = path.join(dir, fileName);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);
        doc.image(logoPath, doc.page.margins.left, doc.page.margins.top, {
            width: 50,
        });
        const infoX = doc.page.margins.left + 60;
        const topPadding = doc.page.margins.top;
        doc
            .fontSize(10)
            .font('Helvetica')
            .text('www.alambook.com', infoX, topPadding, { align: 'left' })
            .text('62/A, Islamiya Market, Office Goli, Nilkhet, Dhaka, Bangladesh', infoX, topPadding + 15, { align: 'left' })
            .text('Telephone: +8801784-324117', infoX, topPadding + 30, {
            align: 'left',
        })
            .text('Email: alambooks@gmail.com', infoX, topPadding + 45, {
            align: 'left',
        });
        const invoiceDetailsX = doc.page.width - doc.page.margins.right - 170;
        doc
            .fontSize(10)
            .text(`Invoice ID: SL-${orderData.orderId}`, invoiceDetailsX, topPadding, { align: 'right' })
            .text(`Date: ${this.getDateString(new Date())}`, invoiceDetailsX, topPadding + 15, { align: 'right' })
            .text(`Contact: ${(_b = (_a = orderData === null || orderData === void 0 ? void 0 : orderData.user) === null || _a === void 0 ? void 0 : _a.phoneNo) !== null && _b !== void 0 ? _b : orderData === null || orderData === void 0 ? void 0 : orderData.phoneNo}`, invoiceDetailsX, topPadding + 30, { align: 'right' });
        doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(doc.page.margins.left, topPadding + 80)
            .lineTo(doc.page.width - doc.page.margins.right, topPadding + 80)
            .stroke();
        const orderInfoY = topPadding + 90;
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Order Info:', doc.page.margins.left, orderInfoY)
            .font('Helvetica')
            .text(`Order Id: #${orderData.orderId}`, doc.page.margins.left, orderInfoY + 15)
            .text(`Date: ${this.getDateString(new Date())}`, doc.page.margins.left, orderInfoY + 30)
            .text(`Payment Status: ${orderData.paymentStatus}`, doc.page.margins.left, orderInfoY + 45)
            .text(`Total Product: ${(_c = orderData === null || orderData === void 0 ? void 0 : orderData.orderedItems) === null || _c === void 0 ? void 0 : _c.length} Items`, doc.page.margins.left, orderInfoY + 60);
        const deliveryAddressX = invoiceDetailsX;
        doc
            .font('Helvetica-Bold')
            .text('Delivery Address:', deliveryAddressX, orderInfoY)
            .font('Helvetica')
            .text(`Name: ${(_d = orderData === null || orderData === void 0 ? void 0 : orderData.name) !== null && _d !== void 0 ? _d : 'N/A'}`, deliveryAddressX, orderInfoY + 15)
            .text(`Address: ${(_e = orderData === null || orderData === void 0 ? void 0 : orderData.shippingAddress) !== null && _e !== void 0 ? _e : 'N/A'}`, deliveryAddressX, orderInfoY + 30)
            .text(`Phone: ${orderData.phoneNo}`, deliveryAddressX, orderInfoY + 45);
        const tableHeaderY = orderInfoY + 105;
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('SL', doc.page.margins.left + 20, tableHeaderY)
            .text('Product', doc.page.margins.left + 50, tableHeaderY, { width: 100 })
            .text('Price', doc.page.margins.left + 170, tableHeaderY)
            .text('Discount', doc.page.margins.left + 240, tableHeaderY)
            .text('Dis.Amount', doc.page.margins.left + 310, tableHeaderY)
            .text('Quantity', doc.page.margins.left + 380, tableHeaderY)
            .text('Total', doc.page.margins.left + 450, tableHeaderY);
        doc
            .moveTo(doc.page.margins.left, tableHeaderY + 15)
            .lineTo(doc.page.width - doc.page.margins.right, tableHeaderY + 15)
            .stroke();
        const startX = doc.page.margins.left;
        const columnWidths = [30, 130, 80, 70, 90, 60, 70];
        const columnPositions = [startX];
        for (let i = 1; i < columnWidths.length; i++) {
            columnPositions.push(columnPositions[i - 1] + columnWidths[i - 1]);
        }
        let y = tableHeaderY + 25;
        orderData.orderedItems.forEach((item, index) => {
            doc.font('Helvetica');
            const texts = [
                index + 1,
                item.nameEn,
                `${item.regularPrice} TK`,
                `${this.calculateDiscount(item, 'discountPercentage')} %`,
                `${this.calculateDiscount(item, 'discountAmount')} TK`,
                item.quantity,
                `${item.regularPrice * item.quantity} TK`,
            ];
            const rowHeight = texts.reduce((max, text, i) => {
                const textHeight = doc.heightOfString(text === null || text === void 0 ? void 0 : text.toString(), {
                    width: columnWidths[i],
                });
                return textHeight > max ? textHeight : max;
            }, 0);
            y += 5;
            texts.forEach((text, i) => {
                doc.text(text === null || text === void 0 ? void 0 : text.toString(), columnPositions[i], y, {
                    width: columnWidths[i],
                    align: i === 0 ? 'center' : 'left',
                });
            });
            y += rowHeight + 5;
            doc
                .moveTo(startX, y)
                .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), y)
                .stroke();
        });
        const subtotalY = y + 30;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Note:', doc.page.margins.left + 20, subtotalY);
        const totalsStartX = doc.page.margins.left + 290;
        const totalsWidth = 210;
        const borderMiddleX = totalsStartX + 120;
        doc.rect(totalsStartX, subtotalY - 5, totalsWidth, 85).stroke();
        doc
            .moveTo(borderMiddleX, subtotalY - 5)
            .lineTo(borderMiddleX, subtotalY + 80)
            .stroke();
        const drawLabelValue = (label, value, x, y, labelWidth, valueWidth) => {
            doc.font('Helvetica').fontSize(10);
            doc.text(label, x, y, { width: labelWidth, align: 'left' });
            doc.text(value, x + labelWidth, y, { width: valueWidth, align: 'right' });
        };
        const labelWidth = borderMiddleX - totalsStartX - 10;
        const valueWidth = totalsWidth - labelWidth - 20;
        drawLabelValue('SubTotal:', `${orderData.subTotal} TK`, totalsStartX + 10, subtotalY, labelWidth, valueWidth);
        drawLabelValue('Discount:', `-${orderData.discount} TK`, totalsStartX + 10, subtotalY + 20, labelWidth, valueWidth);
        drawLabelValue('Delivery Charge:', `${orderData.deliveryCharge} TK`, totalsStartX + 10, subtotalY + 40, labelWidth, valueWidth);
        drawLabelValue('Grand Total:', `${orderData.grandTotal} TK`, totalsStartX + 10, subtotalY + 60, labelWidth, valueWidth);
        doc
            .fontSize(10)
            .font('Helvetica')
            .text('Thank you for choosing Alambook', doc.page.margins.left, y + 200, {
            align: 'center',
        });
        doc.end();
        writeStream.on('finish', () => {
            console.log('Invoice PDF generated successfully.');
        });
        writeStream.on('error', (err) => {
            console.error('Error generating PDF:', err);
        });
    }
    isValidFacebookPixelId(pixelId) {
        if (!pixelId || typeof pixelId !== 'string')
            return false;
        const pixelIdRegex = /^\d{10,20}$/;
        return pixelIdRegex.test(pixelId);
    }
    isValidFacebookAccessTokenFormat(token) {
        if (!token || typeof token !== 'string')
            return false;
        const validPrefixes = ['EAA', 'EAAB', 'EAAC', 'EAAD', 'EAAF', 'EAAG'];
        const startsWithValidPrefix = validPrefixes.some((prefix) => token.startsWith(prefix));
        const isLengthValid = token.length >= 100;
        const hasInvalidCharacters = /\s/.test(token);
        return startsWithValidPrefix && isLengthValid && !hasInvalidCharacters;
    }
    calculateDiscount(item, type) {
        const { discountType, discountAmount, salePrice, quantity } = item;
        if (type === 'discountAmount') {
            if (discountType === 1) {
                const discountValue = (discountAmount / 100) * salePrice;
                return quantity ? discountValue * quantity : discountValue;
            }
            else if (discountType === 2) {
                return quantity ? discountAmount * quantity : discountAmount;
            }
        }
        else if (type === 'discountPercentage') {
            if (discountType === 1) {
                return discountAmount;
            }
            else if (discountType === 2) {
                const percentage = Math.round((discountAmount / salePrice) * 100);
                return percentage;
            }
        }
        return 0;
    }
    transformToSlug(value, salt) {
        const slug = value
            .trim()
            .replace(/[^A-Z0-9]+/gi, '-')
            .toLowerCase();
        return salt ? `${slug}-${this.getRandomInt(1, 100)}` : slug;
    }
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    padLeadingZeros(num) {
        return String(num).padStart(4, '0');
    }
    async updateProductsOnOfferStart(products) {
        for (const product of products) {
            await this.productModel.updateOne({ _id: product.product }, {
                $set: {
                    discountType: product.offerDiscountType,
                    discountAmount: product.offerDiscountAmount,
                },
            });
        }
    }
    async updateProductsOnOfferEnd(products) {
        for (const product of products) {
            if (product.resetDiscount) {
                await this.productModel.updateOne({ _id: product.product }, {
                    $set: {
                        discountType: null,
                        discountAmount: null,
                    },
                });
            }
        }
    }
    getRandomOtpCode4() {
        return (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
    }
    getRandomOtpCode6() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }
    addMinuteInCurrentTime(time) {
        const newDate = moment().tz('Asia/Dhaka').add(time, 'minutes');
        return newDate.toDate();
    }
    transform(product, type, quantity) {
        if (product) {
            switch (type) {
                case 'salePrice': {
                    if (product.discountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                        const disPrice = ((product === null || product === void 0 ? void 0 : product.discountAmount) / 100) * (product === null || product === void 0 ? void 0 : product.salePrice);
                        if (quantity) {
                            return Math.floor(((product === null || product === void 0 ? void 0 : product.salePrice) - disPrice) * quantity);
                        }
                        return Math.floor((product === null || product === void 0 ? void 0 : product.salePrice) - disPrice);
                    }
                    else if (product.discountType === product_enum_1.DiscountTypeEnum.CASH) {
                        if (quantity) {
                            return Math.floor(((product === null || product === void 0 ? void 0 : product.salePrice) - product.discountAmount) * quantity);
                        }
                        return Math.floor((product === null || product === void 0 ? void 0 : product.salePrice) - product.discountAmount);
                    }
                    else {
                        if (quantity) {
                            return Math.floor((product === null || product === void 0 ? void 0 : product.salePrice) * quantity);
                        }
                        return Math.floor(product === null || product === void 0 ? void 0 : product.salePrice);
                    }
                }
                case 'discountAmount': {
                    if (product.discountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                        if (quantity) {
                            return Math.floor(((product === null || product === void 0 ? void 0 : product.discountAmount) / 100) * (product === null || product === void 0 ? void 0 : product.salePrice) * quantity);
                        }
                        return Math.floor(((product === null || product === void 0 ? void 0 : product.discountAmount) / 100) * (product === null || product === void 0 ? void 0 : product.salePrice));
                    }
                    else if (product.discountType === product_enum_1.DiscountTypeEnum.CASH) {
                        if (quantity) {
                            return (product === null || product === void 0 ? void 0 : product.discountAmount) * quantity;
                        }
                        return product === null || product === void 0 ? void 0 : product.discountAmount;
                    }
                    else {
                        return 0;
                    }
                }
                case 'discountPercentage': {
                    if (product.discountType === product_enum_1.DiscountTypeEnum.PERCENTAGE) {
                        if (quantity) {
                            return product === null || product === void 0 ? void 0 : product.discountAmount;
                        }
                        return product === null || product === void 0 ? void 0 : product.discountAmount;
                    }
                    else if (product.discountType === product_enum_1.DiscountTypeEnum.CASH) {
                        if (quantity) {
                            return Math.round(((product === null || product === void 0 ? void 0 : product.discountAmount) / (product === null || product === void 0 ? void 0 : product.salePrice)) * 100);
                        }
                        return Math.round(((product === null || product === void 0 ? void 0 : product.discountAmount) / (product === null || product === void 0 ? void 0 : product.salePrice)) * 100);
                    }
                    else {
                        return 0;
                    }
                }
                case 'regularPrice': {
                    if (quantity) {
                        return Math.floor((product === null || product === void 0 ? void 0 : product.salePrice) * quantity);
                    }
                    return Math.floor(product === null || product === void 0 ? void 0 : product.salePrice);
                }
                default: {
                    return product === null || product === void 0 ? void 0 : product.salePrice;
                }
            }
        }
        else {
            return 0;
        }
    }
    roundNumber(num) {
        const integer = Math.floor(num);
        const fractional = num - integer;
        const frac2int = (fractional * 100) / 5;
        const fracCeil = Math.fround(frac2int);
        const FracOut = (fracCeil * 5) / 100;
        const ans = integer + FracOut;
        return Number((Math.round(ans * 100) / 100).toFixed(2));
    }
};
UtilsService = UtilsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UtilsService);
exports.UtilsService = UtilsService;
//# sourceMappingURL=utils.service.js.map