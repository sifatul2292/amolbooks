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
var SpecialPackageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialPackageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const job_scheduler_service_1 = require("../../../shared/job-scheduler/job-scheduler.service");
const special_package_price_util_1 = require("../../../shared/utils/special-package-price.util");
const product_enum_1 = require("../../../enum/product.enum");
const sharp = require("sharp");
const path_1 = require("path");
const ObjectId = mongoose_2.Types.ObjectId;
let SpecialPackageService = SpecialPackageService_1 = class SpecialPackageService {
    constructor(specialPackageModel, productModel, configService, utilsService, jobSchedulerService) {
        this.specialPackageModel = specialPackageModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.jobSchedulerService = jobSchedulerService;
        this.logger = new common_1.Logger(SpecialPackageService_1.name);
    }
    async getPackageImageDimensions(imageUrl) {
        if (!imageUrl)
            return null;
        try {
            const fileName = (0, path_1.basename)(decodeURIComponent(new URL(imageUrl).pathname));
            const imagePath = (0, path_1.join)(__dirname, '..', '..', '..', '..', 'upload', 'images', fileName);
            const metadata = await sharp(imagePath).metadata();
            return metadata.width && metadata.height
                ? { width: metadata.width, height: metadata.height }
                : null;
        }
        catch (_) {
            return null;
        }
    }
    async getSpecialPackageOgHtml(id, res) {
        var _a, _b;
        const sendError = (status, title) => {
            res.setHeader('Cache-Control', 'no-store');
            res.status(status).send(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title} | Amolbooks</title></head><body><h1>${title}</h1></body></html>`);
        };
        try {
            if (!ObjectId.isValid(id)) {
                sendError(404, 'প্যাকেজটি পাওয়া যায়নি');
                return;
            }
            const data = await this.specialPackageModel
                .findById(id)
                .populate('products.product', 'name slug images quantity')
                .select('name slug description image salePrice products updatedAt')
                .lean();
            if (!data) {
                sendError(404, 'প্যাকেজটি পাওয়া যায়নি');
                return;
            }
            const escapeHtml = (value) => (value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
            const normalizeMetaText = (value, maxLength = 160) => {
                const normalized = (value || '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return normalized.length > maxLength
                    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
                    : normalized;
            };
            const origin = 'https://www.amolbooks.com';
            const items = Array.isArray(data.products) ? data.products : [];
            const products = items.map((item) => item === null || item === void 0 ? void 0 : item.product).filter(Boolean);
            const productCount = products.length;
            const packageName = data.name || 'বিশেষ বইয়ের প্যাকেজ';
            const rawTitle = normalizeMetaText(`${packageName}${productCount ? ` — ${productCount}টি বইয়ের বিশেষ প্যাকেজ` : ''}`, 110);
            const price = Math.max(0, Number(data.salePrice || 0));
            const rawDescription = normalizeMetaText(data.description ||
                `${packageName}-এ${productCount
                    ? ` ${productCount}টি নির্বাচিত ইসলামিক বই`
                    : ' নির্বাচিত ইসলামিক বই'} একসাথে পান। অফার মূল্য ৳${price}। সারা বাংলাদেশে হোম ডেলিভারি।`);
            const image = data.image ||
                ((_b = (_a = products.find((product) => { var _a; return (_a = product === null || product === void 0 ? void 0 : product.images) === null || _a === void 0 ? void 0 : _a.length; })) === null || _a === void 0 ? void 0 : _a.images) === null || _b === void 0 ? void 0 : _b[0]) ||
                'https://www.amolbooks.com/assets/images/logo/logo.png';
            const dimensions = await this.getPackageImageDimensions(image);
            const imageType = /\.webp(?:$|\?)/i.test(image)
                ? 'image/webp'
                : /\.png(?:$|\?)/i.test(image)
                    ? 'image/png'
                    : 'image/jpeg';
            const canonicalUrl = `${origin}/special-package-details/${encodeURIComponent(String(data._id))}`;
            const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
            const productJsonLd = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                '@id': `${canonicalUrl}#product`,
                name: packageName,
                description: rawDescription,
                image: [image],
                url: canonicalUrl,
                sku: String(data._id),
                category: 'Book bundle',
                brand: { '@type': 'Brand', name: 'Amolbooks' },
                offers: {
                    '@type': 'Offer',
                    url: canonicalUrl,
                    priceCurrency: 'BDT',
                    price: price.toFixed(2),
                    availability: 'https://schema.org/InStock',
                    itemCondition: 'https://schema.org/NewCondition',
                    seller: { '@type': 'Organization', name: 'Amolbooks' },
                },
            };
            if (products.length) {
                productJsonLd.isRelatedTo = products.map((product) => {
                    var _a;
                    return ({
                        '@type': 'Book',
                        name: product.name,
                        image: (_a = product.images) === null || _a === void 0 ? void 0 : _a[0],
                        url: product.slug
                            ? `${origin}/product-details/${encodeURIComponent(product.slug)}`
                            : undefined,
                    });
                });
            }
            const breadcrumbJsonLd = {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'হোম',
                        item: `${origin}/`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'অফার',
                        item: `${origin}/offers`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: packageName,
                        item: canonicalUrl,
                    },
                ],
            };
            const title = escapeHtml(rawTitle);
            const description = escapeHtml(rawDescription);
            const safeImage = escapeHtml(image);
            const safeUrl = escapeHtml(canonicalUrl);
            const imageAlt = escapeHtml(`${packageName} বিশেষ প্যাকেজ`);
            const imageSizeTags = dimensions
                ? `<meta property="og:image:width" content="${dimensions.width}">\n  <meta property="og:image:height" content="${dimensions.height}">`
                : '';
            const imageSizeAttributes = dimensions
                ? ` width="${dimensions.width}" height="${dimensions.height}"`
                : '';
            const productList = products.length
                ? `<ul>${products
                    .map((product) => `<li>${escapeHtml(product.name || '')}</li>`)
                    .join('')}</ul>`
                : '';
            const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title} | Amolbooks</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="bn_BD">
  <meta property="og:site_name" content="Amolbooks">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="${imageType}">
  ${imageSizeTags}
  <meta property="og:image:alt" content="${imageAlt}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="BDT">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="twitter:image:alt" content="${imageAlt}">
  <link rel="canonical" href="${safeUrl}">
  <script type="application/ld+json">${safeJsonLd(productJsonLd)}</script>
  <script type="application/ld+json">${safeJsonLd(breadcrumbJsonLd)}</script>
</head>
<body>
  <main><article>
    <h1>${escapeHtml(packageName)}</h1>
    <img src="${safeImage}"${imageSizeAttributes} alt="${imageAlt}">
    <p>${description}</p>
    <p>প্যাকেজ মূল্য: ৳${price}</p>
    ${productList}
    <a href="${safeUrl}">Amolbooks থেকে প্যাকেজটি দেখুন ও অর্ডার করুন</a>
  </article></main>
</body>
</html>`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.status(200).send(html);
        }
        catch (_) {
            sendError(500, 'প্যাকেজ তথ্য লোড করা যায়নি');
        }
    }
    async findAllForSitemap() {
        return this.specialPackageModel
            .find({})
            .select('_id name image updatedAt')
            .lean();
    }
    async addSpecialPackage(addSpecialPackageDto) {
        try {
            const { name } = addSpecialPackageDto;
            const { products } = addSpecialPackageDto;
            const checkData = await this.specialPackageModel.findOne({ name: name });
            if (checkData) {
                return {
                    success: false,
                    message: 'Data Cannot be Added. Its a Single Document Collection',
                    data: null,
                };
            }
            const mData = Object.assign({}, addSpecialPackageDto);
            const newData = new this.specialPackageModel(mData);
            const saveData = await newData.save();
            return {
                success: true,
                message: 'Data Added Success',
            };
        }
        catch (error) {
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async createSpecialPackageDraft(draft) {
        if (!draft.name.trim()) {
            throw new common_1.BadRequestException('Bundle name is required');
        }
        const productIds = draft.products.map((item) => item.product);
        if (new Set(productIds).size !== productIds.length) {
            throw new common_1.BadRequestException('Each book can only appear once');
        }
        const products = await this.productModel
            .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
            .select('salePrice discountType discountAmount');
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('One or more books no longer exist');
        }
        const productsById = new Map(products.map((product) => [String(product._id), product]));
        const regularPrice = draft.products.reduce((total, item) => total +
            (0, special_package_price_util_1.calculateEffectiveProductPrice)(productsById.get(item.product)) *
                item.quantity, 0);
        if (!regularPrice || draft.sellingPrice > regularPrice) {
            throw new common_1.BadRequestException('Bundle price must not exceed the current discounted total');
        }
        const existing = await this.specialPackageModel.findOne({
            name: draft.name.trim(),
        });
        if (existing)
            throw new common_1.ConflictException('A package with this name exists');
        const slugBase = this.utilsService.transformToSlug(draft.name) || 'bundle';
        const saved = await new this.specialPackageModel({
            name: draft.name.trim(),
            slug: `${slugBase}-${Date.now().toString(36)}`,
            salePrice: regularPrice,
            discountType: product_enum_1.DiscountTypeEnum.CASH,
            discountAmount: regularPrice - draft.sellingPrice,
            active: false,
            products: draft.products.map((item) => ({
                product: item.product,
                quantity: item.quantity,
                hasVariations: false,
            })),
        }).save();
        return {
            success: true,
            message: 'Bundle saved as an inactive draft',
            data: {
                _id: saved._id,
                name: saved.name,
                slug: saved.slug,
                active: saved.active,
                sellingPrice: draft.sellingPrice,
            },
        };
    }
    async insertManySpecialPackage(addSpecialPackagesDto, optionSpecialPackageDto) {
        const { deleteMany } = optionSpecialPackageDto;
        if (deleteMany) {
            await this.specialPackageModel.deleteMany({});
        }
        const mData = addSpecialPackagesDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.specialPackageModel.insertMany(mData);
            return {
                success: true,
                message: `${saveData && saveData.length ? saveData.length : 0}  Data Added Success`,
            };
        }
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async getAllSpecialPackages(filterSpecialPackageDto, searchQuery) {
        const { filter } = filterSpecialPackageDto;
        const { pagination } = filterSpecialPackageDto;
        const { sort } = filterSpecialPackageDto;
        const { select } = filterSpecialPackageDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = Object.assign(Object.assign({}, mFilter), { name: new RegExp(searchQuery, 'i') });
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
            const dataAggregates = await this.specialPackageModel.aggregate(aggregateStages);
            if (pagination) {
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), { success: true, message: 'Success' });
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
            if (err.code && err.code.toString() === error_code_enum_1.ErrorCodes.PROJECTION_MISMATCH) {
                throw new common_1.BadRequestException('Error! Projection mismatch');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async getSpecialPackageByIds(ids, select) {
        if (!(ids === null || ids === void 0 ? void 0 : ids.ids) || ids.ids.length === 0) {
            return { success: true, message: 'Success', data: [] };
        }
        try {
            const mIds = ids.ids.map((m) => new ObjectId(m));
            const data = await this.specialPackageModel
                .find({ _id: { $in: mIds } })
                .populate('products.product', 'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id')
                .select(select);
            const transformedData = data.map((specialPackage) => {
                const transformedProducts = specialPackage.products.map((item) => {
                    var _a;
                    const transformedProduct = Object.assign(Object.assign({}, (_a = item === null || item === void 0 ? void 0 : item.product) === null || _a === void 0 ? void 0 : _a._doc), {
                        quantity: item === null || item === void 0 ? void 0 : item.quantity,
                        hasVariations: item === null || item === void 0 ? void 0 : item.hasVariations,
                        selectedVariation: item === null || item === void 0 ? void 0 : item.selectedVariation,
                    });
                    if (transformedProduct === null || transformedProduct === void 0 ? void 0 : transformedProduct.hasVariations) {
                        let found = null;
                        transformedProduct.variationsOptions.forEach((variationOption) => {
                            if (String(variationOption === null || variationOption === void 0 ? void 0 : variationOption._id) ===
                                String(transformedProduct === null || transformedProduct === void 0 ? void 0 : transformedProduct.selectedVariation)) {
                                found = variationOption;
                            }
                        });
                        return found
                            ? Object.assign(Object.assign({}, transformedProduct), { hasVariations: true, selectedVariation: found }) : Object.assign(Object.assign({}, transformedProduct), { hasVariations: false, selectedVariation: null });
                    }
                    else {
                        return transformedProduct;
                    }
                });
                return (0, special_package_price_util_1.withCalculatedSpecialPackageSubtotal)(Object.assign(Object.assign({}, specialPackage === null || specialPackage === void 0 ? void 0 : specialPackage._doc), { products: transformedProducts }));
            });
            return {
                success: true,
                message: 'Success',
                data: transformedData,
            };
        }
        catch (err) {
            console.log('err', err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getSpecialPackageById(id, select) {
        try {
            let data = await this.specialPackageModel
                .findById(id)
                .populate('products.product', 'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author  salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id')
                .select(select);
            const newdata = await data.products.map((item) => {
                var _a;
                const transFrom = Object.assign(Object.assign({}, (_a = item === null || item === void 0 ? void 0 : item.product) === null || _a === void 0 ? void 0 : _a._doc), {
                    quantity: item === null || item === void 0 ? void 0 : item.quantity,
                    hasVariations: item === null || item === void 0 ? void 0 : item.hasVariations,
                    selectedVariation: item === null || item === void 0 ? void 0 : item.selectedVariation,
                });
                if (transFrom === null || transFrom === void 0 ? void 0 : transFrom.hasVariations) {
                    let found = null;
                    transFrom.variationsOptions.map((item) => {
                        if (String(item === null || item === void 0 ? void 0 : item._id) == String(transFrom === null || transFrom === void 0 ? void 0 : transFrom.selectedVariation)) {
                            found = item;
                        }
                    });
                    if (!found) {
                        return Object.assign(Object.assign({}, transFrom), { hasVariations: false, selectedVariation: null });
                    }
                    else {
                        return Object.assign(Object.assign({}, transFrom), { hasVariations: true, selectedVariation: found });
                    }
                }
                else {
                    return transFrom;
                }
            });
            data = (0, special_package_price_util_1.withCalculatedSpecialPackageSubtotal)(Object.assign(Object.assign({}, data === null || data === void 0 ? void 0 : data._doc), { products: newdata }));
            return {
                success: true,
                message: 'Success',
                data,
            };
        }
        catch (err) {
            console.log('err', err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getSpecialPackageBySlug(slug, select) {
        try {
            let data = await this.specialPackageModel
                .findOne({ slug: slug })
                .populate('products.product', 'name description salePrice sku tax shortDesc discountType slug variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id')
                .select(select);
            const newdata = await data.products.map((item) => {
                const transFrom = Object.assign(Object.assign({}, item.product._doc), {
                    quantity: item.quantity,
                    hasVariations: item.hasVariations,
                    selectedVariation: item.selectedVariation,
                });
                if (transFrom.hasVariations) {
                    let found = null;
                    transFrom.variationsOptions.map((item) => {
                        if (String(item._id) == String(transFrom.selectedVariation)) {
                            found = item;
                        }
                    });
                    if (!found) {
                        return Object.assign(Object.assign({}, transFrom), { hasVariations: false, selectedVariation: null });
                    }
                    else {
                        return Object.assign(Object.assign({}, transFrom), { hasVariations: true, selectedVariation: found });
                    }
                }
                else {
                    return transFrom;
                }
            });
            data = (0, special_package_price_util_1.withCalculatedSpecialPackageSubtotal)(Object.assign(Object.assign({}, data._doc), { products: newdata }));
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
    async getSpecialPackageSingle(select) {
        try {
            const data = await this.specialPackageModel
                .findOne({})
                .populate('products.product')
                .select(select ? select : '');
            return {
                success: true,
                message: 'Success',
                data: (0, special_package_price_util_1.withCalculatedSpecialPackageSubtotal)(data),
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateSpecialPackageById(id, updateSpecialPackageDto) {
        try {
            const { name } = updateSpecialPackageDto;
            const { products } = updateSpecialPackageDto;
            const data = await this.specialPackageModel.findById(id);
            const finalData = Object.assign({}, updateSpecialPackageDto);
            await this.specialPackageModel.findByIdAndUpdate(id, {
                $set: finalData,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleSpecialPackageById(ids, updateSpecialPackageDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateSpecialPackageDto.slug) {
            delete updateSpecialPackageDto.slug;
        }
        try {
            await this.specialPackageModel.updateMany({ _id: { $in: mIds } }, { $set: updateSpecialPackageDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteSpecialPackageById(id, checkUsage) {
        let data;
        try {
            data = await this.specialPackageModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        if (data.readOnly) {
            throw new common_1.NotFoundException('Sorry! Read only data can not be deleted');
        }
        try {
            const defaultSpecialPackage = await this.specialPackageModel.findOne({
                _id: id,
            });
            await this.specialPackageModel.findByIdAndDelete(id);
            const productIds = defaultSpecialPackage
                ? defaultSpecialPackage.products.map((m) => new ObjectId(m))
                : [];
            let resetData = {
                discountStartDateTime: null,
                discountEndDateTime: null,
            };
            if (checkUsage) {
                resetData = Object.assign(Object.assign({}, resetData), {
                    discountType: null,
                    discountAmount: null,
                });
            }
            await this.productModel.updateMany({ _id: { $in: productIds } }, { $set: resetData });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleSpecialPackageById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.specialPackageModel.find({
                _id: { $in: mIds },
            });
            await this.specialPackageModel.deleteMany({ _id: mIds });
            const mProductsIds = [];
            allCategory.forEach((f) => {
                f.products.forEach((g) => {
                    mProductsIds.push(g);
                });
            });
            const productIds = mProductsIds.map((m) => new ObjectId(m));
            let resetData = {
                discountStartDateTime: null,
                discountEndDateTime: null,
            };
            if (checkUsage) {
                resetData = Object.assign(Object.assign({}, resetData), {
                    discountType: null,
                    discountAmount: null,
                });
            }
            await this.productModel.updateMany({ _id: { $in: productIds } }, { $set: resetData });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
SpecialPackageService = SpecialPackageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('SpecialPackage')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        job_scheduler_service_1.JobSchedulerService])
], SpecialPackageService);
exports.SpecialPackageService = SpecialPackageService;
//# sourceMappingURL=special-package.service.js.map