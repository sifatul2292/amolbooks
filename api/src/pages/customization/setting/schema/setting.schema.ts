import * as mongoose from 'mongoose';
import {
  ADVANCE_PAYMENT_SETTING,
  CHAT_SETTING,
  COURIER_METHOD_SETTING,
  DELIVERY_CHARGE_SETTING,
  PAYMENT_METHOD_SETTING,
  SMS_METHOD_SETTING,
} from '../../../../schema/sub-schema.schema';

export const SettingSchema = new mongoose.Schema(
  {
    analytics: {
      tagManagerId: {
        type: String,
        required: false,
      },
      facebookPixelId: {
        type: String,
        required: false,
      },
      facebookPixelAccessToken: {
        type: String,
        required: false,
      },
      IsManageFbPixelByTagManager: {
        type: Boolean,
        required: false,
      },
      isEnablePixelTestEvent: {
        type: Boolean,
        required: false,
      },
      facebookPixelTestEventId: {
        type: String,
        required: false,
      },
    },
    isCashOnDeliveryOff: {
      type: Boolean,
      required: false,
    },
    facebookCatalog: {
      isEnableFacebookCatalog: {
        type: Boolean,
        required: false,
      },
    },
    orderSetting: {
      isEnableOrderNote: {
        type: Boolean,
        required: false,
      },
      isEnablePrescriptionOrder: {
        type: Boolean,
        required: false,
      },
      successPageMessage: {
        type: String,
        required: false,
      },
      isEnableOrderSuccessPageOrderId: {
        type: Boolean,
        required: false,
      },
      isEnableOtp: {
        type: Boolean,
        required: false,
        default: false,
      },

      isProductSkuEnable: {
        type: Boolean,
        required: false,
      },
      isSLEnable: {
        type: Boolean,
        required: false,
        default: true,
      },
      isEnableHomeRecentOrder: {
        type: Boolean,
        required: false,
      },
      isSwapPaymentAndOrderItem: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnablePreviousOrderCount: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableSingleIpBlock: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableIpWiseOrderLimitAndBlockTime: {
        type: Boolean,
        required: false,
        default: false,
      },
      ipWiseOrderBlockTime: {
        type: Number,
        required: false,
      },
      ipWiseOrderLimit: {
        type: Number,
        required: false,
      },
    },
    orderPhoneValidation: {
      isEnableOutsideBd: {
        type: Boolean,
        required: false,
      },
      maxLength: {
        type: Number,
        required: false,
      },
      minLength: {
        type: Number,
        required: false,
      },
    },
    orderNotification: {
      isEnableSMSNotification: {
        type: Boolean,
        required: false,
      },
      isEnableEmailNotification: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnablePersonalNotification: {
        type: Boolean,
        required: false,
        default: false,
      },
      appEmail: {
        type: String,
        required: false,
      },
      appPassword: {
        type: String,
        required: false,
      },
    },
    incompleteOrder: {
      isEnableIncompleteOrder: {
        type: Boolean,
        required: false,
      },
    },

    affiliate: {
      isAffiliate: {
        type: Boolean,
        required: false,
      },
    },
    blog: {
      isEnableBlog: {
        type: Boolean,
        required: false,
      },
    },
    deliveryOptionType: {
      isEnableDivision: {
        type: Boolean,
        required: false,
      },
      isEnableInsideCityOutsideCity: {
        type: Boolean,
        required: false,
      },
      deliveryOptionTitle: {
        type: String,
        required: false,
      },
      insideCityText: {
        type: String,
        required: false,
      },
      outsideCityText: {
        type: String,
        required: false,
      },
    },
    invoiceSetting: {
      selectedInvoice: {
        type: String,
        required: false,
        default: 'invoice1',
      },
      isEnableInvoiceCourierId: {
        type: Boolean,
        required: false,
      },
      isDisableInvoicePriceSection: {
        type: Boolean,
        required: false,
      },
    },
    productSetting: {
      productType: {
        type: String,
        required: false,
      },
      checkoutType: {
        type: String,
        required: false,
      },
      urlType: {
        type: String,
        required: false,
      },
      isEnableSoldQuantitySort: {
        type: Boolean,
        required: false,
      },
      isEnablePrioritySort: {
        type: Boolean,
        required: false,
      },
      isEnablePhoneModel: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableProductKeyFeature: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableProductFaq: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableProductTestimonial: {
        type: Boolean,
        required: false,
        default: false,
      },
      isShowCategoryOnHomePage: {
        type: Boolean,
        required: false,
        default: false,
      },
      isEnableProductDetailsView: {
        type: Boolean,
        required: false,
      },
      isEnableAdvancePayment: {
        type: Boolean,
        required: false,
      },
      isEnableDeliveryCharge: {
        type: Boolean,
        required: false,
      },
      isHideCostPrice: {
        type: Boolean,
        required: false,
      },
      isEnableProductCondition: {
        type: Boolean,
        required: false,
      },
      digitalProduct: {
        isEmailEnable: {
          type: Boolean,
          required: false,
        },
        isAddressEnable: {
          type: Boolean,
          required: false,
        },
        isDivisionEnable: {
          type: Boolean,
          required: false,
        },
      },

      isCampaignEnable: {
        type: Boolean,
        required: false,
      },
    },
    deliveryCharges: [DELIVERY_CHARGE_SETTING],
    paymentMethods: [PAYMENT_METHOD_SETTING],
    advancePayment: [ADVANCE_PAYMENT_SETTING],
    smsMethods: [SMS_METHOD_SETTING],
    courierMethods: [COURIER_METHOD_SETTING],
    chats: [CHAT_SETTING],
    currency: {
      name: {
        type: String,
        required: false,
      },
      code: {
        type: String,
        required: false,
      },
      symbol: {
        type: String,
        required: false,
      },
      countryCode: {
        type: String,
        required: false,
      },
    },
    country: {
      name: {
        type: String,
        required: false,
      },
      code: {
        type: String,
        required: false,
      },
    },
    searchHints: {
      type: String,
      required: false,
    },
    orderLanguage: {
      type: String,
      required: false,
    },
    googleSearchConsoleToken: {
      type: String,
      required: false,
    },
    themeColors: {
      primary: {
        type: String,
        required: false,
      },
      secondary: {
        type: String,
        required: false,
      },
      tertiary: {
        type: String,
        required: false,
      },
    },
    smsSendingOption: {
      orderPlaced: {
        type: Boolean,
        required: false,
      },
      orderConfirmed: {
        type: Boolean,
        required: false,
      },
      orderDelivered: {
        type: Boolean,
        required: false,
      },
      orderCanceled: {
        type: Boolean,
        required: false,
      },
      adminNotification: {
        type: Boolean,
        required: false,
      },
    },
    smsCustomMessages: {
      orderPlaced: {
        type: String,
        required: false,
        default: '',
      },
      orderConfirmed: {
        type: String,
        required: false,
        default: '',
      },
      orderDelivered: {
        type: String,
        required: false,
        default: '',
      },
      orderCanceled: {
        type: String,
        required: false,
        default: '',
      },
      adminNotification: {
        type: String,
        required: false,
        default: '',
      },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
