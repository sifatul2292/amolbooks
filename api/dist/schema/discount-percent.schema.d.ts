import * as mongoose from 'mongoose';
export declare const DiscountPercentSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    discountType: string;
    readOnly?: boolean;
    discountPercent?: number;
}>;
