import * as mongoose from 'mongoose';
export declare const COURSE_MODULE_SCHEMA: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: true;
    timestamps: false;
}>, {
    name: string;
    description: string;
}>;
export declare const CHAT_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    url?: string;
    status?: string;
    chatType?: string;
}>;
export declare const PAYMENT_METHOD_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    status?: string;
    password?: string;
    providerName?: string;
    providerType?: string;
    accountNumber?: string;
    paymentInstruction?: string;
    binanceType?: string;
    apiKey?: string;
    secretKey?: string;
    username?: string;
    production?: boolean;
}>;
export declare const ADVANCE_PAYMENT_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    status?: string;
    providerName?: string;
    minimumAmount?: number;
    advancePaymentAmount?: number;
    division?: string[];
}>;
export declare const SMS_METHOD_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    status?: string;
    password?: string;
    providerName?: string;
    apiKey?: string;
    secretKey?: string;
    username?: string;
    senderId?: string;
    clientId?: string;
}>;
export declare const COURIER_METHOD_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    status?: string;
    password?: string;
    providerName?: string;
    apiKey?: string;
    secretKey?: string;
    username?: string;
    merchant_name?: string;
    address?: string;
    thana?: string;
    district?: string;
    website?: string;
    facebook?: string;
    company_phone?: string;
    contact_name?: string;
    designation?: string;
    contact_number?: string;
    email?: string;
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    bank_branch?: string;
    merchantCode?: string;
    wings_username?: string;
    pFlyPassword?: string;
    storeId?: number;
    specialInstruction?: string;
}>;
export declare const DELIVERY_CHARGE_SETTING: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    name?: string;
    status?: string;
    type?: string;
    city?: string;
    insideCity?: number;
    outsideCity?: number;
    freeDeliveryMinAmount?: number;
    note?: string;
    isAdvancePayment?: boolean;
}>;
export declare const PACKAGE_ITEMS: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: true;
    versionKey: false;
}>, {
    quantity: number;
    product: mongoose.Types.ObjectId;
    hasVariations?: boolean;
    selectedVariation?: mongoose.Types.ObjectId;
}>;
export declare const ORDER_ITEM_SCHEMA: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: true;
}>, {
    salePrice: number;
    quantity: number;
    _id: mongoose.Types.ObjectId;
    unitPrice: number;
    orderType: string;
    discountType?: number;
    discountAmount?: number;
    name?: string;
    slug?: string;
    nameEn?: string;
    category?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    subCategory?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    brand?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    publisher?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    author?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    regularPrice?: number;
    image?: string;
    unit?: string;
}>;
export declare const VARIATION_SUB_SCHEMA: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    _id: mongoose.Types.ObjectId;
    name: string;
    values: string[];
}>;
export declare const PRODUCT_VARIATION_OPTION_SCHEMA: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
}>, {
    _id: mongoose.Types.ObjectId;
    name: string;
    value: string;
}>;
export declare const PRODUCT_DISCOUNT_OPTIONS: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
    versionKey: false;
}>, {
    product?: mongoose.Types.ObjectId;
    offerDiscountAmount?: number;
    offerDiscountType?: number;
    resetDiscount?: boolean;
}>;
export declare const PRODUCT_DISCOUNT_OPTIONS1: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    _id: false;
    versionKey: false;
}>, {
    product?: {
        variationsOptions: {
            variations: mongoose.Types.DocumentArray<{
                _id: mongoose.Types.ObjectId;
                name: string;
                value: string;
            }>;
            quantity?: number;
            price?: number;
            image?: string;
        }[];
        discountType?: number;
        discountAmount?: number;
        salePrice?: number;
        quantity?: number;
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
        description?: string;
        costPrice?: number;
        hasTax?: boolean;
        tax?: number;
        sku?: string;
        emiMonth?: number[];
        images?: string[];
        trackQuantity?: boolean;
        category?: {
            _id?: mongoose.Types.ObjectId;
            name?: string;
            slug?: string;
        };
        subCategory?: {
            _id?: mongoose.Types.ObjectId;
            name?: string;
            slug?: string;
        };
        brand?: {
            _id?: mongoose.Types.ObjectId;
            name?: string;
            slug?: string;
        };
        tags?: mongoose.Types.ObjectId[];
        status?: string;
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
        earnPoint?: boolean;
        pointType?: number;
        pointValue?: number;
        redeemPoint?: boolean;
        redeemType?: number;
        redeemValue?: number;
        discountStartDateTime?: Date;
        discountEndDateTime?: Date;
        hasVariations?: boolean;
        unit?: string;
        slug2?: string;
        productType?: string;
        productTagType?: string;
        variations?: mongoose.Types.DocumentArray<{
            _id: mongoose.Types.ObjectId;
            name: string;
            values: string[];
        }>;
        videoUrl?: string;
        specifications?: any[];
        totalSold?: number;
        ratingAvr?: number;
        ratingCount?: number;
        ratingTotal?: number;
        reviewTotal?: number;
        createdAtString?: string;
    };
    offerDiscountAmount?: number;
    offerDiscountType?: number;
    resetDiscount?: boolean;
}>;
