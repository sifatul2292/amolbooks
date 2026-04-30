import * as mongoose from 'mongoose';
export declare const ProductSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    category: {
        _id: mongoose.Types.ObjectId;
        name: string;
        slug: string;
        nameEn?: string;
    }[];
    subCategory: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    }[];
    author: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
        nameEn?: string;
    }[];
    tags: {
        _id: mongoose.Types.ObjectId;
        name: string;
        slug: string;
    }[];
    status: string;
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
    description?: string;
    language?: string[];
    country?: string;
    url?: string;
    isbn?: string;
    pdfFile?: string;
    edition?: string;
    nameEn?: string;
    shortDescription?: string;
    featureTitle?: string;
    costPrice?: number;
    hasTax?: boolean;
    tax?: number;
    sku?: string;
    emiMonth?: number[];
    threeMonth?: number;
    emiAmount?: number;
    sixMonth?: number;
    twelveMonth?: number;
    images?: string[];
    trackQuantity?: boolean;
    cartLimit?: number;
    totalPages?: number;
    currentVersion?: string;
    publishEditionDate?: string;
    publishedDate?: Date;
    translatorName?: string[];
    brand?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
    };
    publisher?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
        image?: string;
    };
    isPreOrder?: boolean;
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
    boughtTogetherIds?: string[];
    isFacebookCatalog?: boolean;
    hasVariations?: boolean;
    unit?: string;
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
    tagline?: string;
    taglineEn?: string;
    dollarPrice?: number;
    editionEn?: string;
    currentVersionEn?: string;
    translatorNameEn?: string[];
    weight?: number;
    afterDiscountPrice?: number;
    features?: any[];
    ratingDetails?: {
        oneStar: number;
        twoStar: number;
        threeStar: number;
        fourStar: number;
        fiveStar: number;
    };
    priority?: number;
}>;
