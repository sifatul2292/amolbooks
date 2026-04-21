import * as mongoose from 'mongoose';
export declare const SettingSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    chats: mongoose.Types.DocumentArray<{
        url?: string;
        status?: string;
        chatType?: string;
    }>;
    smsMethods: mongoose.Types.DocumentArray<{
        status?: string;
        password?: string;
        providerName?: string;
        apiKey?: string;
        secretKey?: string;
        username?: string;
        senderId?: string;
        clientId?: string;
    }>;
    courierMethods: mongoose.Types.DocumentArray<{
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
    deliveryCharges: mongoose.Types.DocumentArray<{
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
    paymentMethods: mongoose.Types.DocumentArray<{
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
    advancePayment: mongoose.Types.DocumentArray<{
        division: unknown[];
        status?: unknown;
        providerName?: unknown;
        minimumAmount?: unknown;
        advancePaymentAmount?: unknown;
    }>;
    country?: {
        name?: string;
        code?: string;
    };
    analytics?: {
        tagManagerId?: string;
        facebookPixelId?: string;
        facebookPixelAccessToken?: string;
        IsManageFbPixelByTagManager?: boolean;
        isEnablePixelTestEvent?: boolean;
        facebookPixelTestEventId?: string;
    };
    smsSendingOption?: {
        orderPlaced?: boolean;
        orderConfirmed?: boolean;
        orderDelivered?: boolean;
        orderCanceled?: boolean;
        adminNotification?: boolean;
    };
    facebookCatalog?: {
        isEnableFacebookCatalog?: boolean;
    };
    isCashOnDeliveryOff?: boolean;
    orderSetting?: {
        isEnableOrderNote?: boolean;
        isEnablePrescriptionOrder?: boolean;
        successPageMessage?: string;
        isEnableOrderSuccessPageOrderId?: boolean;
        isEnableOtp?: boolean;
        isProductSkuEnable?: boolean;
        isSLEnable?: boolean;
        isEnableHomeRecentOrder?: boolean;
        isSwapPaymentAndOrderItem?: boolean;
        isEnablePreviousOrderCount?: boolean;
        isEnableSingleIpBlock?: boolean;
        isEnableIpWiseOrderLimitAndBlockTime?: boolean;
        ipWiseOrderBlockTime?: number;
        ipWiseOrderLimit?: number;
    };
    orderPhoneValidation?: {
        isEnableOutsideBd?: boolean;
        maxLength?: number;
        minLength?: number;
    };
    orderNotification?: {
        isEnableSMSNotification?: boolean;
        isEnableEmailNotification?: boolean;
        isEnablePersonalNotification?: boolean;
        appEmail?: string;
        appPassword?: string;
    };
    incompleteOrder?: {
        isEnableIncompleteOrder?: boolean;
    };
    affiliate?: {
        isAffiliate?: boolean;
    };
    blog?: {
        isEnableBlog?: boolean;
    };
    deliveryOptionType?: {
        isEnableDivision?: boolean;
        isEnableInsideCityOutsideCity?: boolean;
        deliveryOptionTitle?: string;
        insideCityText?: string;
        outsideCityText?: string;
    };
    invoiceSetting?: {
        selectedInvoice?: string;
        isEnableInvoiceCourierId?: boolean;
        isDisableInvoicePriceSection?: boolean;
    };
    productSetting?: {
        productType?: string;
        checkoutType?: string;
        urlType?: string;
        isEnableSoldQuantitySort?: boolean;
        isEnablePrioritySort?: boolean;
        isEnablePhoneModel?: boolean;
        isEnableProductKeyFeature?: boolean;
        isEnableProductFaq?: boolean;
        isEnableProductTestimonial?: boolean;
        isShowCategoryOnHomePage?: boolean;
        isEnableProductDetailsView?: boolean;
        isEnableAdvancePayment?: boolean;
        isEnableDeliveryCharge?: boolean;
        isHideCostPrice?: boolean;
        isEnableProductCondition?: boolean;
        digitalProduct?: {
            isEmailEnable?: boolean;
            isAddressEnable?: boolean;
            isDivisionEnable?: boolean;
        };
        isCampaignEnable?: boolean;
    };
    currency?: {
        symbol?: string;
        name?: string;
        code?: string;
        countryCode?: string;
    };
    searchHints?: string;
    orderLanguage?: string;
    googleSearchConsoleToken?: string;
    themeColors?: {
        primary?: string;
        secondary?: string;
        tertiary?: string;
    };
    smsCustomMessages?: {
        orderPlaced?: string;
        orderConfirmed?: string;
        orderDelivered?: string;
        orderCanceled?: string;
        adminNotification?: string;
    };
}>;
