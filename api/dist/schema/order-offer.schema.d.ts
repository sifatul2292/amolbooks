import * as mongoose from 'mongoose';
export declare const OrderOfferSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    firstOrderDiscountAmount?: number;
    firstOrderDiscountType?: number;
    firstOrderMinAmount?: number;
    amountOrderDiscountAmount?: number;
    amountOrderDiscountType?: number;
    amountOrderMinAmount?: number;
    amount2OrderDiscountAmount?: number;
    amount2OrderDiscountType?: number;
    amount2OrderMinAmount?: number;
    amount3OrderDiscountAmount?: number;
    amount3OrderDiscountType?: number;
    amount3OrderMinAmount?: number;
    monthOrderDiscountAmount?: number;
    monthOrderDiscountType?: number;
    monthOrderMinAmount?: number;
    monthOrderValue?: number;
    appsOrderDiscountAmount?: number;
    appsOrderDiscountType?: number;
    appsOrderMinAmount?: number;
}>;
