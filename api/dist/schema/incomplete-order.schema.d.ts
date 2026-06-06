import * as mongoose from 'mongoose';
export declare const IncompleteOrderSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name?: string;
    status?: string;
    email?: string;
    city?: string;
    note?: string;
    subTotal?: number;
    phoneNo?: string;
    user?: mongoose.Types.ObjectId;
    orderId?: string;
    paymentType?: string;
    shippingAddress?: string;
    fraudChecker?: any;
    adminNote?: string;
    orderStatus?: number;
    orderedItems?: any[];
    deliveryCharge?: number;
    discount?: number;
    grandTotal?: number;
    checkoutDate?: string;
    paymentStatus?: string;
}>;
