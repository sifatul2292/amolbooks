"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const sub_schema_schema_1 = require("./sub-schema.schema");
exports.ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    nameEn: {
        type: String,
        required: false,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: false,
    },
    shortDescription: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
    tagline: {
        type: String,
        required: false,
    },
    taglineEn: {
        type: String,
        required: false,
    },
    featureTitle: {
        type: String,
        required: false,
    },
    costPrice: {
        type: Number,
        required: false,
    },
    salePrice: {
        type: Number,
        required: false,
    },
    dollarPrice: {
        type: Number,
        required: false,
    },
    tax: {
        type: Number,
        required: false,
    },
    hasTax: {
        type: Boolean,
        required: false,
    },
    sku: {
        type: String,
        required: false,
        unique: false,
    },
    isbn: {
        type: String,
        required: false,
    },
    pdfFile: {
        type: String,
        required: false,
    },
    edition: {
        type: String,
        required: false,
    },
    editionEn: {
        type: String,
        required: false,
    },
    emiMonth: {
        type: [Number],
        required: false,
    },
    discountType: {
        type: Number,
        required: false,
    },
    discountAmount: {
        type: Number,
        required: false,
    },
    emiAmount: {
        type: Number,
        required: false,
    },
    images: {
        type: [String],
        required: false,
    },
    quantity: {
        type: Number,
        required: false,
        default: 0,
    },
    threeMonth: {
        type: Number,
        required: false,
        default: 0,
    },
    sixMonth: {
        type: Number,
        required: false,
        default: 0,
    },
    totalPages: {
        type: Number,
        required: false,
        default: 0,
    },
    currentVersion: {
        type: String,
        required: false,
    },
    currentVersionEn: {
        type: String,
        required: false,
    },
    publishEditionDate: {
        type: String,
        required: false,
    },
    publishedDate: {
        type: Date,
        required: false,
    },
    language: {
        type: [String],
        required: false,
    },
    country: {
        type: String,
        required: false,
    },
    translatorName: {
        type: [String],
        required: false,
    },
    translatorNameEn: {
        type: [String],
        required: false,
    },
    twelveMonth: {
        type: Number,
        required: false,
        default: 0,
    },
    cartLimit: {
        type: Number,
        required: false,
        default: 0,
    },
    weight: {
        type: Number,
        required: false,
        default: 0,
    },
    trackQuantity: {
        type: Boolean,
        required: false,
    },
    isFacebookCatalog: {
        type: Boolean,
        required: false,
    },
    afterDiscountPrice: {
        type: Number,
        required: false,
    },
    seoTitle: {
        type: String,
        required: false,
    },
    seoDescription: {
        type: String,
        required: false,
    },
    seoKeywords: {
        type: String,
        required: false,
    },
    category: [
        {
            _id: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category',
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            nameEn: {
                type: String,
                required: false,
            },
            slug: {
                type: String,
                required: true,
            },
        },
    ],
    subCategory: [
        {
            _id: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'SubCategory',
                required: false,
            },
            name: {
                type: String,
                required: false,
            },
            slug: {
                type: String,
                required: false,
            },
        },
    ],
    publisher: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Publisher',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
        image: {
            type: String,
            required: false,
        },
        slug: {
            type: String,
            required: false,
        },
    },
    author: [
        {
            _id: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Author',
                required: false,
            },
            name: {
                type: String,
                required: false,
            },
            nameEn: {
                type: String,
                required: false,
            },
            slug: {
                type: String,
                required: false,
            },
        },
    ],
    brand: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Brand',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
        slug: {
            type: String,
            required: false,
        },
    },
    tags: [
        {
            _id: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Tags',
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            slug: {
                type: String,
                required: true,
            },
        },
    ],
    hasVariations: {
        type: Boolean,
        required: false,
    },
    variations: {
        type: [sub_schema_schema_1.VARIATION_SUB_SCHEMA],
        required: false,
    },
    variationsOptions: [
        {
            quantity: {
                type: Number,
                required: false,
            },
            price: {
                type: Number,
                required: false,
            },
            image: {
                type: String,
                required: false,
            },
            variations: [sub_schema_schema_1.PRODUCT_VARIATION_OPTION_SCHEMA],
        },
    ],
    earnPoint: {
        type: Boolean,
        required: false,
    },
    pointType: {
        type: Number,
        required: false,
    },
    pointValue: {
        type: Number,
        required: false,
    },
    redeemPoint: {
        type: Boolean,
        required: false,
    },
    redeemType: {
        type: Number,
        required: false,
    },
    redeemValue: {
        type: Number,
        required: false,
    },
    status: {
        type: String,
        required: true,
    },
    isPreOrder: {
        type: Boolean,
        required: false,
        default: false,
    },
    discountStartDateTime: {
        type: Date,
        required: false,
    },
    discountEndDateTime: {
        type: Date,
        required: false,
    },
    videoUrl: {
        type: String,
        required: false,
    },
    unit: {
        type: String,
        required: false,
    },
    specifications: {
        type: [Object],
        required: false,
    },
    features: {
        type: [Object],
        required: false,
    },
    totalSold: {
        type: Number,
        required: false,
        default: 0,
    },
    ratingDetails: {
        oneStar: {
            type: Number,
            default: 0,
        },
        twoStar: {
            type: Number,
            default: 0,
        },
        threeStar: {
            type: Number,
            default: 0,
        },
        fourStar: {
            type: Number,
            default: 0,
        },
        fiveStar: {
            type: Number,
            default: 0,
        },
    },
    ratingAvr: {
        type: Number,
        required: false,
        default: 0,
    },
    ratingCount: {
        type: Number,
        required: false,
        default: 0,
    },
    ratingTotal: {
        type: Number,
        required: false,
        default: 0,
    },
    reviewTotal: {
        type: Number,
        required: false,
        default: 0,
    },
    priority: {
        type: Number,
        required: false,
    },
    boughtTogetherIds: {
        type: [String],
        required: false,
        default: [],
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=product.schema.js.map