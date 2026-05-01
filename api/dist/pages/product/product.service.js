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
var ProductService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const fb_catalog_service_1 = require("../../shared/fb-catalog/fb-catalog.service");
const ObjectId = mongoose_2.Types.ObjectId;
let ProductService = ProductService_1 = class ProductService {
    constructor(productModel, categoryModel, brandModel, publisherModel, settingModel, redirectUrlModel, shopInformationModel, boughtTogetherConfigModel, configService, utilsService, fbCatalogService, cacheManager) {
        this.productModel = productModel;
        this.categoryModel = categoryModel;
        this.brandModel = brandModel;
        this.publisherModel = publisherModel;
        this.settingModel = settingModel;
        this.redirectUrlModel = redirectUrlModel;
        this.shopInformationModel = shopInformationModel;
        this.boughtTogetherConfigModel = boughtTogetherConfigModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.fbCatalogService = fbCatalogService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(ProductService_1.name);
        this.cacheProductPage = 'getAllProducts?page=1';
        this.cacheProductCount = 'getAllProducts?count';
    }
    async addProduct(addProductDto) {
        var _a;
        const { nameEn, name, quantity } = addProductDto;
        const existingProduct = await this.productModel.findOne({
            $or: [{ nameEn: nameEn === null || nameEn === void 0 ? void 0 : nameEn.trim() }, { name: name === null || name === void 0 ? void 0 : name.trim() }],
        });
        if (existingProduct) {
            throw new common_1.ConflictException('Product with same name or nameEn already exists');
        }
        const defaultData = {
            quantity: quantity ? quantity : 0,
        };
        const mData = Object.assign(Object.assign({}, addProductDto), defaultData);
        const newData = new this.productModel(mData);
        try {
            const saveData = await newData.save();
            const data = { _id: saveData._id };
            const fSetting = await this.settingModel
                .findOne({})
                .select('facebookCatalog');
            if ((_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.facebookCatalog) === null || _a === void 0 ? void 0 : _a.isEnableFacebookCatalog) {
                this.productUpdateOnFbCatalog();
            }
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Product added successfully',
                data,
            };
        }
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug must be unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async productUpdateOnFbCatalog() {
        const data = JSON.parse(JSON.stringify(await this.productModel.find({
            isFacebookCatalog: true,
            status: 'publish',
        })));
        function transformVariationProduct(product) {
            var _a, _b;
            return {
                id: product._id,
                item_group_id: product._id,
                title: product.name,
                price: `${product.salePrice} BDT`,
                sale_price: `${product.salePrice} BDT`,
                description: 'Your product description will be here',
                availability: (product === null || product === void 0 ? void 0 : product.quantity) > 0 ? 'in stock' : 'out of stock',
                condition: 'new',
                link: `https://alambook.com/product-details/${product.slug}`,
                image_link: product.images && product.images.length
                    ? product.images[0]
                    : 'https://cdn.saleecom.com/upload/images/placeholder.png',
                brand: (_b = (_a = product.brand) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'unknown',
                variations: product.variationList.map((variation) => {
                    var _a, _b, _c, _d, _e, _f;
                    const variationObj = {
                        id: variation._id,
                        item_group_id: product._id,
                        title: product.name,
                        description: 'Your product description will be here',
                        availability: (product === null || product === void 0 ? void 0 : product.quantity) > 0 ? 'in stock' : 'out of stock',
                        condition: 'new',
                        sku: (_a = variation.sku) !== null && _a !== void 0 ? _a : variation._id,
                        price: `${variation.regularPrice} BDT`,
                        sale_price: `${variation.salePrice} BDT`,
                        link: `https://alambook.com/product-details/${product.slug}`,
                        image_link: (_b = variation.image) !== null && _b !== void 0 ? _b : (product.images && product.images.length
                            ? product.images[0]
                            : 'https://cdn.saleecom.com/upload/images/placeholder.png'),
                        brand: (_d = (_c = product.brand) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'unknown',
                        fb_product_category: (_f = (_e = product.category) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : null,
                    };
                    if (product.variation) {
                        const [key, value] = [
                            product.variation.toLowerCase(),
                            variation.name.split(',')[0],
                        ];
                        variationObj[key] = value;
                    }
                    if (product.variation2 && variation.name.includes(',')) {
                        const [_, value] = variation.name.split(',');
                        const key = product.variation2.toLowerCase();
                        variationObj[key] = value;
                    }
                    return variationObj;
                }),
            };
        }
        const mProductData = data.map((m) => {
            var _a, _b, _c, _d;
            if (m.isVariation) {
                return transformVariationProduct(m);
            }
            else {
                return {
                    id: m._id,
                    item_group_id: m._id,
                    title: m.name,
                    description: 'Your product description will be here',
                    availability: (m === null || m === void 0 ? void 0 : m.quantity) > 0 ? 'in stock' : 'out of stock',
                    condition: 'new',
                    price: `${m.salePrice} BDT`,
                    sale_price: `${m.salePrice} BDT`,
                    link: `https://alambook.com/product-details/${m.slug}`,
                    image_link: m.images && m.images.length
                        ? m.images[0]
                        : 'https://cdn.saleecom.com/upload/images/placeholder.png',
                    additional_image_link: m.images && m.images.length > 1 ? m.images.slice(1) : [],
                    brand: (_b = (_a = m.brand) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'unknown',
                    fb_product_category: (_d = (_c = m.category) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null,
                };
            }
        });
        const formattedProducts = [];
        for (const product of mProductData) {
            if (product.variations && product.variations.length > 0) {
                for (const variant of product.variations) {
                    formattedProducts.push(variant);
                }
            }
            else {
                formattedProducts.push(product);
            }
        }
        function normalizeForCsv(jsonData) {
            const allKeys = new Set();
            jsonData.forEach((product) => {
                Object.keys(product).forEach((key) => {
                    if (key !== 'id' && key !== 'title') {
                        allKeys.add(key);
                    }
                });
            });
            const extraFields = Array.from(allKeys);
            return jsonData.map((product) => {
                const normalizedProduct = {
                    id: product.id,
                    title: product.title,
                };
                extraFields.forEach((field) => {
                    var _a;
                    normalizedProduct[field] = (_a = product[field]) !== null && _a !== void 0 ? _a : '';
                });
                return normalizedProduct;
            });
        }
        const finalData = normalizeForCsv(formattedProducts);
        await this.fbCatalogService.addFbCatalogProduct(finalData);
    }
    async cloneSingleProduct(id) {
        try {
            const data = await this.productModel.findById(id);
            const jData = JSON.stringify(data);
            const product = JSON.parse(jData);
            product.name = `${product.name}(Clone-${this.utilsService.getRandomInt(0, 100)})`;
            product.slug = this.utilsService.transformToSlug(product.name, true);
            product.sku = `${product.sku}-${this.utilsService.getRandomInt(0, 100)}`;
            product.quantity = 0;
            delete product._id;
            delete product.createdAt;
            delete product.updatedAt;
            const newData = new this.productModel(product);
            const saveData = await newData.save();
            const response = {
                _id: saveData._id,
            };
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Data Clone Success',
                data: response,
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
    async insertManyProduct(addProductsDto, optionProductDto) {
        const { deleteMany } = optionProductDto;
        if (deleteMany) {
            await this.productModel.deleteMany({});
        }
        const mData = addProductsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.productModel.insertMany(mData);
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: `${saveData && saveData.length ? saveData.length : 0}  Data Added Success`,
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
    async getAllProductForUi(payload) {
        try {
            const { status, page, limit } = payload;
            const tagName = payload['tags.name'];
            const mFilter = {};
            if (status) {
                mFilter.status = status;
            }
            if (tagName) {
                mFilter['tags.name'] = tagName;
            }
            const sortQuery = { createdAt: -1 };
            const skip = (Number(page) - 1) * Number(limit);
            const data = await this.productModel
                .find(mFilter)
                .select('name nameEn seoKeyword seoTitle seoDescription author discountType slug discountAmount tags quantity regularPrice salePrice ratingTotal images ratingCount')
                .skip(Number(skip))
                .limit(Number(limit))
                .sort(sortQuery);
            const totalCount = await this.productModel.countDocuments(mFilter);
            return {
                success: true,
                message: 'Success! Data fetch successfully.',
                data,
                count: totalCount,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getAllProducts(filterProductDto, searchQuery) {
        const { filter } = filterProductDto;
        const { pagination } = filterProductDto;
        const { sort } = filterProductDto;
        const { select } = filterProductDto;
        const { filterGroup } = filterProductDto;
        if (filter &&
            filter['category._id'] &&
            Array.isArray(filter['category._id']['$in'])) {
            filter['category._id']['$in'] = filter['category._id']['$in']
                .filter((id) => ObjectId.isValid(id))
                .map((id) => new ObjectId(id));
        }
        else {
            if (filter && filter['category._id']) {
                filter['category._id'] = new ObjectId(filter['category._id']);
            }
        }
        if (filter && filter['subCategory._id']) {
            filter['subCategory._id'] = new ObjectId(filter['subCategory._id']);
        }
        if (filter && filter['brand._id']) {
            filter['brand._id'] = new ObjectId(filter['brand._id']);
        }
        if (filter && filter['publisher._id']) {
            filter['publisher._id'] = new ObjectId(filter['publisher._id']);
        }
        if (filter && filter['tags._id']) {
            filter['tags._id'] = new ObjectId(filter['tags._id']);
        }
        if (filter && filter['author._id']) {
            filter['author._id'] = new ObjectId(filter['author._id']);
        }
        if (filter && filter['createdAt']) {
            filter['createdAt']['$gte'] = new Date(filter['createdAt']['$gte']);
            filter['createdAt']['$lte'] = new Date(filter['createdAt']['$lte']);
        }
        const aggregateStages = [];
        const aggregateCategoryGroupStages = [];
        const aggregateBrandGroupStages = [];
        const aggregatePublisherGroupStages = [];
        const aggregateSubCategoryGroupStages = [];
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
                            { name: this.utilsService.createRegexFromString1(searchQuery) },
                            { nameEn: this.utilsService.createRegexFromString1(searchQuery) },
                            {
                                seoKeywords: this.utilsService.createRegexFromString1(searchQuery),
                            },
                            {
                                translatorName: this.utilsService.createRegexFromString1(searchQuery),
                            },
                            {
                                'category.name': this.utilsService.createRegexFromString1(searchQuery),
                            },
                            {
                                'publisher.name': this.utilsService.createRegexFromString1(searchQuery),
                            },
                            {
                                'author.name': this.utilsService.createRegexFromString1(searchQuery),
                            },
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
        let groupCategory;
        let groupBrand;
        let groupSubCategory;
        let groupPublisher;
        if (filterGroup && filterGroup.isGroup) {
            if (filterGroup.category) {
                groupCategory = {
                    $group: {
                        _id: { category: '$category._id' },
                        name: { $first: '$category.name' },
                        slug: { $first: '$category.slug' },
                        total: { $sum: 1 },
                    },
                };
            }
            if (filterGroup.brand) {
                groupBrand = {
                    $group: {
                        _id: { brand: '$brand._id' },
                        name: { $first: '$brand.name' },
                        slug: { $first: '$brand.slug' },
                        total: { $sum: 1 },
                    },
                };
            }
            if (filterGroup.subCategory) {
                groupSubCategory = {
                    $group: {
                        _id: { subCategory: '$subCategory._id' },
                        name: { $first: '$subCategory.name' },
                        slug: { $first: '$subCategory.slug' },
                        total: { $sum: 1 },
                    },
                };
            }
            if (filterGroup.publisher) {
                groupPublisher = {
                    $group: {
                        _id: { publisher: '$publisher._id' },
                        name: { $first: '$publisher.name' },
                        slug: { $first: '$publisher.slug' },
                        total: { $sum: 1 },
                    },
                };
            }
        }
        if (Object.keys(mFilter).length) {
            aggregateStages.push({ $match: mFilter });
            if (groupCategory) {
                aggregateCategoryGroupStages.push(groupCategory);
            }
            if (groupSubCategory) {
                aggregateSubCategoryGroupStages.push(groupSubCategory);
            }
            if (groupBrand) {
                aggregateBrandGroupStages.push(groupBrand);
            }
            if (groupPublisher) {
                aggregatePublisherGroupStages.push(groupPublisher);
            }
        }
        else {
            if (groupCategory) {
                aggregateCategoryGroupStages.push(groupCategory);
            }
            if (groupSubCategory) {
                aggregateSubCategoryGroupStages.push(groupSubCategory);
            }
            if (groupBrand) {
                aggregateBrandGroupStages.push(groupBrand);
            }
            if (groupPublisher) {
                aggregatePublisherGroupStages.push(groupPublisher);
            }
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
            const dataAggregates = await this.productModel.aggregate(aggregateStages);
            let categoryAggregates;
            let subCategoryAggregates;
            let brandAggregates;
            let publisherAggregates;
            if (filterGroup && filterGroup.isGroup && filterGroup.category) {
                categoryAggregates = await this.productModel.aggregate(aggregateCategoryGroupStages);
            }
            if (filterGroup && filterGroup.isGroup && filterGroup.subCategory) {
                subCategoryAggregates = await this.productModel.aggregate(aggregateSubCategoryGroupStages);
            }
            if (filterGroup && filterGroup.isGroup && filterGroup.brand) {
                brandAggregates = await this.productModel.aggregate(aggregateBrandGroupStages);
            }
            if (filterGroup && filterGroup.isGroup && filterGroup.publisher) {
                publisherAggregates = await this.productModel.aggregate(aggregatePublisherGroupStages);
            }
            let allFilterGroups;
            if (filterGroup && filterGroup.isGroup) {
                allFilterGroups = {
                    categories: categoryAggregates && categoryAggregates.length
                        ? categoryAggregates
                        : [],
                    subCategories: subCategoryAggregates && subCategoryAggregates.length
                        ? subCategoryAggregates
                        : [],
                    brands: brandAggregates && brandAggregates.length ? brandAggregates : [],
                    publishers: publisherAggregates && publisherAggregates.length
                        ? publisherAggregates
                        : [],
                };
            }
            else {
                allFilterGroups = null;
            }
            if (pagination) {
                if (pagination.currentPage < 1 &&
                    filter == null &&
                    JSON.stringify(sort) == JSON.stringify({ createdAt: -1 })) {
                    await this.cacheManager.set(this.cacheProductPage, dataAggregates[0].data);
                    await this.cacheManager.set(this.cacheProductCount, dataAggregates[0].count);
                    this.logger.log('Cache Added');
                }
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), {
                    success: true,
                    message: 'Success',
                    filterGroup: allFilterGroups,
                });
            }
            else {
                return {
                    data: dataAggregates,
                    success: true,
                    message: 'Success',
                    count: dataAggregates.length,
                    filterGroup: allFilterGroups,
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
    async getProductById(id, select) {
        if (!ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ID format');
        }
        try {
            const data = await this.productModel
                .findById(id)
                .select(select)
                .populate('tags');
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
    async updateSpecificProduct(productId) {
        const updates = {
            ratingCount: 5,
            ratingTotal: 1,
            reviewTotal: 1,
        };
        const result = await this.productModel.findByIdAndUpdate(productId, updates);
        if (!result) {
            throw new Error(`Product with ID ${productId} not found or not updated`);
        }
        return { updated: true };
    }
    async getProductBySlug(slug, select) {
        var _a, _b;
        try {
            let productById;
            const data = await this.productModel
                .findOne({ slug: slug })
                .select(select)
                .populate('tags');
            if (!data) {
                return { success: false, message: 'Product not found', data: null };
            }
            const BT_SELECT = '_id name slug images salePrice discountAmount';
            let boughtTogetherProducts = [];
            const productIds = data.boughtTogetherIds;
            if (productIds && productIds.length > 0) {
                const selfRaw = data.toObject ? data.toObject() : data;
                const selfId = selfRaw._id.toString();
                const mIds = productIds.slice(0, 2)
                    .filter((id) => ObjectId.isValid(id))
                    .map((id) => new ObjectId(id));
                let perItems = await this.productModel
                    .find({ _id: { $in: mIds } })
                    .select(BT_SELECT)
                    .limit(2);
                if (perItems.length < 2) {
                    const slotsLeft = 2 - perItems.length;
                    const usedIds = new Set([selfId, ...perItems.map((p) => p._id.toString())]);
                    const globalConfig = await this.boughtTogetherConfigModel.findOne();
                    if (((_a = globalConfig === null || globalConfig === void 0 ? void 0 : globalConfig.productIds) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                        const fillIds = globalConfig.productIds
                            .filter((id) => ObjectId.isValid(id) && !usedIds.has(id))
                            .slice(0, slotsLeft)
                            .map((id) => new ObjectId(id));
                        if (fillIds.length > 0) {
                            const fillItems = await this.productModel.find({ _id: { $in: fillIds } }).select(BT_SELECT);
                            perItems = [...perItems, ...fillItems];
                        }
                    }
                }
                const self = {
                    _id: selfRaw._id,
                    name: selfRaw.name,
                    slug: selfRaw.slug,
                    images: selfRaw.images,
                    salePrice: selfRaw.salePrice,
                    discountAmount: selfRaw.discountAmount,
                };
                boughtTogetherProducts = [self, ...perItems.slice(0, 2)];
            }
            else {
                const globalConfig = await this.boughtTogetherConfigModel.findOne();
                if (((_b = globalConfig === null || globalConfig === void 0 ? void 0 : globalConfig.productIds) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    const selfRaw2 = data.toObject ? data.toObject() : data;
                    const selfId2 = selfRaw2._id.toString();
                    const mIds = globalConfig.productIds
                        .filter((id) => ObjectId.isValid(id) && id !== selfId2)
                        .slice(0, 2)
                        .map((id) => new ObjectId(id));
                    const others = await this.productModel.find({ _id: { $in: mIds } }).select(BT_SELECT).limit(2);
                    const self2 = {
                        _id: selfRaw2._id,
                        name: selfRaw2.name,
                        slug: selfRaw2.slug,
                        images: selfRaw2.images,
                        salePrice: selfRaw2.salePrice,
                        discountAmount: selfRaw2.discountAmount,
                    };
                    boughtTogetherProducts = [self2, ...others];
                }
            }
            const responseData = Object.assign(Object.assign({}, data.toObject()), { boughtTogetherProducts });
            return { success: true, message: 'Success', data: responseData };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getBoughtTogetherProducts(productSlug) {
        var _a, _b, _c;
        try {
            const BT_SELECT = '_id name slug images salePrice discountAmount discountType discountPercent costPrice quantity weight ratingAverage ratingCount';
            const config = await this.boughtTogetherConfigModel.findOne({});
            const globalIds = (_a = config === null || config === void 0 ? void 0 : config.productIds) !== null && _a !== void 0 ? _a : [];
            let finalIds = [];
            if (productSlug) {
                const productDoc = await this.productModel.findOne({ slug: productSlug }).select('boughtTogetherIds _id');
                const perProductIds = (_b = productDoc === null || productDoc === void 0 ? void 0 : productDoc.boughtTogetherIds) !== null && _b !== void 0 ? _b : [];
                const currentId = (_c = productDoc === null || productDoc === void 0 ? void 0 : productDoc._id) === null || _c === void 0 ? void 0 : _c.toString();
                if (perProductIds.length > 0) {
                    const perPart = perProductIds.slice(0, 2);
                    const slotsLeft = 3 - 1 - perPart.length;
                    const globalFill = slotsLeft > 0
                        ? globalIds.filter((id) => !perProductIds.includes(id) && id !== currentId).slice(0, slotsLeft)
                        : [];
                    finalIds = [currentId, ...perPart, ...globalFill];
                }
                else if (currentId) {
                    const globalFill = globalIds.filter((id) => id !== currentId).slice(0, 2);
                    finalIds = [currentId, ...globalFill];
                }
            }
            if (!finalIds.length) {
                finalIds = globalIds.slice(0, 3);
            }
            if (!finalIds.length) {
                return { success: true, message: 'No bought-together configured', data: { productIds: [], products: [] } };
            }
            const mIds = finalIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
            const rawProducts = await this.productModel.find({ _id: { $in: mIds } }).select(BT_SELECT);
            const productMap = new Map(rawProducts.map((p) => [p._id.toString(), p]));
            const products = finalIds.map((id) => productMap.get(id)).filter(Boolean);
            return { success: true, message: 'Success', data: { productIds: finalIds, products } };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async setBoughtTogetherProducts(productIds) {
        try {
            const clean = [...new Set(productIds)].filter((id) => ObjectId.isValid(id)).slice(0, 3);
            const existing = await this.boughtTogetherConfigModel.findOne({});
            if (existing) {
                await this.boughtTogetherConfigModel.findByIdAndUpdate(existing._id, { $set: { productIds: clean } });
            }
            else {
                await this.boughtTogetherConfigModel.create({ productIds: clean });
            }
            return { success: true, message: 'Bought together updated successfully' };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getBoughtTogetherByProduct(productId) {
        var _a, _b;
        try {
            const BT_SELECT = '_id name slug images salePrice discountAmount discountType discountPercent costPrice quantity weight ratingAverage ratingCount';
            const product = await this.productModel.findById(productId).select('boughtTogetherIds');
            const perProductIds = (_a = product === null || product === void 0 ? void 0 : product.boughtTogetherIds) !== null && _a !== void 0 ? _a : [];
            if (perProductIds.length > 0) {
                const mIds = perProductIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
                const products = await this.productModel.find({ _id: { $in: mIds } }).select(BT_SELECT);
                return { success: true, message: 'Success', data: { source: 'product', productIds: perProductIds, products } };
            }
            const config = await this.boughtTogetherConfigModel.findOne({});
            const globalIds = (_b = config === null || config === void 0 ? void 0 : config.productIds) !== null && _b !== void 0 ? _b : [];
            if (!globalIds.length) {
                return { success: true, message: 'No bought-together configured', data: { source: 'global', productIds: [], products: [] } };
            }
            const mGlobalIds = globalIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
            const products = await this.productModel.find({ _id: { $in: mGlobalIds } }).select(BT_SELECT);
            return { success: true, message: 'Success', data: { source: 'global', productIds: globalIds, products } };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getProductByIds(getProductByIdsDto, select) {
        if (!getProductByIdsDto.ids || getProductByIdsDto.ids.length === 0) {
            return { success: true, message: 'Success', data: [] };
        }
        try {
            const mIds = getProductByIdsDto.ids.map((m) => new ObjectId(m));
            const data = await this.productModel.find({ _id: { $in: mIds } });
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
    async updateProductById(id, updateProductDto) {
        var _a;
        const { nameEn } = updateProductDto;
        let data;
        try {
            data = await this.productModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateProductDto);
            if (nameEn)
                if (nameEn && data.nameEn !== nameEn) {
                    finalData.slug = this.utilsService.transformToSlug(nameEn, true);
                    finalData.quantity = finalData.quantity ? finalData.quantity : 0;
                }
            await this.productModel.findByIdAndUpdate(id, {
                $set: finalData,
            });
            const fSetting = await this.settingModel
                .findOne()
                .select('facebookCatalog');
            if (fSetting.facebookCatalog &&
                ((_a = fSetting.facebookCatalog) === null || _a === void 0 ? void 0 : _a.isEnableFacebookCatalog)) {
                this.productUpdateOnFbCatalog();
            }
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleProductById(ids, updateProductDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateProductDto.slug) {
            delete updateProductDto.slug;
        }
        try {
            await this.productModel.updateMany({ _id: { $in: mIds } }, { $set: updateProductDto });
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteProductById(id) {
        let data;
        try {
            data = await this.productModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.productModel.findByIdAndDelete(id);
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Success Delete',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleProductById(ids) {
        try {
            await this.productModel.deleteMany({ _id: ids });
            await this.cacheManager.del(this.cacheProductPage);
            await this.cacheManager.del(this.cacheProductCount);
            this.logger.log('Cache Removed');
            return {
                success: true,
                message: 'Success Delete',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async setProductQtyNotNull() {
        try {
            const data1 = await this.productModel.countDocuments({});
            const data2 = await this.productModel.countDocuments({
                quantity: { $exists: true },
            });
            const data3 = await this.productModel.countDocuments({
                quantity: { $exists: false },
            });
            const data4 = await this.productModel.countDocuments({
                quantity: { $eq: null },
            });
            await this.productModel.updateMany({ quantity: { $eq: null } }, {
                $set: { quantity: 0 },
            });
            return {
                success: true,
                message: 'Success',
                data: {
                    all: data1,
                    exists: data2,
                    existsNot: data3,
                    nullData: data4,
                },
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async setProductImageHttpToHttps() {
        try {
            const data1 = await this.productModel.find({});
            const mData1 = JSON.parse(JSON.stringify(data1));
            for (const product of mData1) {
                if (product.images && product.images.length) {
                    const mImages = product.images.map((m) => {
                        return m.replace('http://', 'https://');
                    });
                    await this.productModel.findByIdAndUpdate(product._id, {
                        $set: {
                            images: mImages,
                        },
                    });
                }
            }
            return {
                success: true,
                message: 'Success',
                data: null,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getRelatedProductsByMultiCategoryId(dto) {
        try {
            const mIds = dto.ids.map((m) => new ObjectId(m));
            const data = await this.productModel.aggregate([
                {
                    $match: { 'category._id': { $in: mIds } },
                },
                { $sample: { size: dto.limit } },
                {
                    $project: {
                        name: 1,
                        nameEn: 1,
                        slug: 1,
                        images: 1,
                        salePrice: 1,
                        quantity: 1,
                        author: 1,
                        discountAmount: 1,
                        discountType: 1,
                    },
                },
            ]);
            return {
                success: true,
                message: 'Success',
                data: data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async findAllPublished() {
        return this.productModel.find({}).select('slug title').exec();
    }
};
ProductService = ProductService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Product')),
    __param(1, (0, mongoose_1.InjectModel)('Category')),
    __param(2, (0, mongoose_1.InjectModel)('Brand')),
    __param(3, (0, mongoose_1.InjectModel)('Publisher')),
    __param(4, (0, mongoose_1.InjectModel)('Setting')),
    __param(5, (0, mongoose_1.InjectModel)('RedirectUrl')),
    __param(6, (0, mongoose_1.InjectModel)('ShopInformation')),
    __param(7, (0, mongoose_1.InjectModel)('BoughtTogetherConfig')),
    __param(11, (0, common_1.Inject)(common_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        fb_catalog_service_1.FbCatalogService, Object])
], ProductService);
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map