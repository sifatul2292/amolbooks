import * as mongoose from 'mongoose';
export declare const CouponSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    discountType: number;
    discountAmount: number;
    name: string;
    startDateTime: Date;
    endDateTime: Date;
    minimumAmount: number;
    couponCode: string;
    description?: string;
    bannerImage?: string;
}>;
