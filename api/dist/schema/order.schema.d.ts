import * as mongoose from 'mongoose';
export declare const OrderSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    subTotal: number;
    phoneNo: string;
    orderId: string;
    shippingAddress: string;
    orderStatus: number;
    orderedItems: mongoose.Types.DocumentArray<{
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
    discount: number;
    paymentStatus: string;
    year?: number;
    month?: number;
    admin?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    email?: string;
    city?: string;
    note?: string;
    area?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    zone?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    user?: mongoose.Types.ObjectId;
    paymentType?: string;
    coupon?: mongoose.Types.ObjectId;
    courierLink?: string;
    discountTypes?: any[];
    courierData?: {
        createdAt?: string;
        providerName?: string;
        consignmentId?: string;
        trackingId?: string;
    };
    deliveryCharge?: number;
    weightBasedDeliveryCharge?: number;
    grandTotal?: number;
    checkoutDate?: string;
    deliveryDate?: Date;
    sslSessionId?: string;
    hasOrderTimeline?: boolean;
    processingDate?: Date;
    shippingDate?: Date;
    deliveringDate?: Date;
    preferredTime?: string;
    orderTimeline?: any;
    productDiscount?: number;
    orderSmsSent?: boolean;
    orderFrom?: string;
    fraudChecker?: any;
    orderDiscountFromApps?: number;
    bkashPaymentId?: string;
    nagadPaymentId?: string;
    deliveryDateString?: string;
    preferredDateString?: string;
    couponDiscount?: number;
}>;
