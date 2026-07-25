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
    note?: string;
    orderStatus?: number;
    email?: string;
    city?: string;
    orderId?: string;
    phoneNo?: string;
    shippingAddress?: string;
    paymentType?: string;
    paymentStatus?: string;
    orderedItems?: any[];
    subTotal?: number;
    deliveryCharge?: number;
    fraudChecker?: any;
    discount?: number;
    grandTotal?: number;
    checkoutDate?: string;
    adminNote?: string;
    user?: mongoose.Types.ObjectId;
}>;
