import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export const COURSE_MODULE_SCHEMA = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    _id: true,
    timestamps: false,
  },
);

export const CHAT_SETTING = new mongoose.Schema(
  {
    chatType: {
      type: String,
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const PAYMENT_METHOD_SETTING = new mongoose.Schema(
  {
    providerName: {
      type: String,
      required: false,
    },
    providerType: {
      type: String,
      required: false,
    },
    accountNumber: {
      type: String,
      required: false,
    },
    paymentInstruction: {
      type: String,
      required: false,
    },
    binanceType: {
      type: String,
      required: false,
    },
    apiKey: {
      type: String,
      required: false,
    },
    secretKey: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    production: {
      type: Boolean,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const ADVANCE_PAYMENT_SETTING = new mongoose.Schema(
  {
    providerName: {
      type: String,
      required: false,
    },
    minimumAmount: {
      type: Number,
      required: false,
    },
    advancePaymentAmount: {
      type: Number,
      required: false,
    },

    division: {
      type: [String],
      required: false,
    },

    status: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const SMS_METHOD_SETTING = new mongoose.Schema(
  {
    providerName: {
      type: String,
      required: false,
    },
    senderId: {
      type: String,
      required: false,
    },
    apiKey: {
      type: String,
      required: false,
    },
    secretKey: {
      type: String,
      required: false,
    },
    clientId: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const COURIER_METHOD_SETTING = new mongoose.Schema(
  {
    providerName: {
      type: String,
      required: false,
    },
    apiKey: {
      type: String,
      required: false,
    },
    secretKey: {
      type: String,
      required: false,
    },
    merchant_name: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    thana: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    website: {
      type: String,
      required: false,
    },
    facebook: {
      type: String,
      required: false,
    },
    company_phone: {
      type: String,
      required: false,
    },
    contact_name: {
      type: String,
      required: false,
    },
    designation: {
      type: String,
      required: false,
    },
    contact_number: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    account_name: {
      type: String,
      required: false,
    },
    account_number: {
      type: String,
      required: false,
    },
    bank_name: {
      type: String,
      required: false,
    },
    bank_branch: {
      type: String,
      required: false,
    },
    merchantCode: {
      type: String,
      required: false,
    },
    wings_username: {
      type: String,
      required: false,
    },
    pFlyPassword: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    storeId: {
      type: Number,
      required: false,
    },
    specialInstruction: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const DELIVERY_CHARGE_SETTING = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    insideCity: {
      type: Number,
      required: false,
    },
    outsideCity: {
      type: Number,
      required: false,
    },
    freeDeliveryMinAmount: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    isAdvancePayment: {
      type: Boolean,
      required: false,
    },
  },
  {
    _id: false,
  },
);

export const PACKAGE_ITEMS = new mongoose.Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    hasVariations: {
      type: Boolean,
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
    },
    selectedVariation: {
      type: Schema.Types.ObjectId,
      ref: 'Product.variationsOptions',
      required: false,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

export const ORDER_ITEM_SCHEMA = new mongoose.Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
    image: {
      type: String,
      required: false,
    },
    author: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Author',
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
    category: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
      name: {
        type: String,
      },
      slug: {
        type: String,
      },
    },
    subCategory: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'SubCategory',
      },
      name: {
        type: String,
      },
      slug: {
        type: String,
      },
    },
    publisher: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Publisher',
      },
      name: {
        type: String,
      },
      slug: {
        type: String,
      },
    },
    brand: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Brand',
      },
      name: {
        type: String,
      },
      slug: {
        type: String,
      },
    },
    regularPrice: {
      type: Number,
      required: false,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    orderType: {
      type: String,
      required: true,
    },
    discountAmount: {
      type: Number,
      required: false,
    },
    discountType: {
      type: Number,
      required: false,
    },
    unit: {
      type: String,
      required: false,
    },
  },
  {
    _id: true,
  },
);

export const VARIATION_SUB_SCHEMA = new mongoose.Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Variation',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    values: {
      type: [String],
      required: true,
    },
  },
  {
    _id: false,
  },
);

export const PRODUCT_VARIATION_OPTION_SCHEMA = new mongoose.Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Variation',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

export const PRODUCT_DISCOUNT_OPTIONS = new mongoose.Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    offerDiscountAmount: {
      type: Number,
      required: false,
    },
    offerDiscountType: {
      type: Number,
      required: false,
    },
    resetDiscount: {
      type: Boolean,
      required: false,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

export const PRODUCT_DISCOUNT_OPTIONS1 = new mongoose.Schema(
  {
    product: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
      },
      name: {
        type: String,
        required: false,
        trim: true,
      },
      slug2: {
        type: String,
        required: false,
      },
      slug: {
        type: String,
        required: false,
      },
      description: {
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
      tax: {
        type: Number,
        required: false,
      },
      hasTax: {
        type: Boolean,
        required: false,
      },
      productType: {
        type: String,
        required: false,
      },
      productTagType: {
        type: String,
        required: false,
      },
      sku: {
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
      images: {
        type: [String],
        required: false,
      },
      quantity: {
        type: Number,
        required: false,
        default: 0,
      },
      trackQuantity: {
        type: Boolean,
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
      category: {
        _id: {
          type: Schema.Types.ObjectId,
          ref: 'Category',
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
      subCategory: {
        _id: {
          type: Schema.Types.ObjectId,
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
      brand: {
        _id: {
          type: Schema.Types.ObjectId,
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
      tags: {
        type: [Schema.Types.ObjectId],
        ref: 'Tag',
        required: false,
      },
      hasVariations: {
        type: Boolean,
        required: false,
      },
      variations: {
        type: [VARIATION_SUB_SCHEMA],
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
          variations: [PRODUCT_VARIATION_OPTION_SCHEMA],
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
        required: false,
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
      totalSold: {
        type: Number,
        required: false,
        default: 0,
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
      createdAtString: {
        type: String,
        required: false,
      },
    },
    offerDiscountAmount: {
      type: Number,
      required: false,
    },
    offerDiscountType: {
      type: Number,
      required: false,
    },
    resetDiscount: {
      type: Boolean,
      required: false,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);
