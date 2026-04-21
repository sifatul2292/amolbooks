import * as mongoose from 'mongoose';
export declare const MultiPromoOfferSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    slug: string;
    title: string;
    startDateTime: Date;
    endDateTime: Date;
    products: mongoose.Types.DocumentArray<{
        product?: mongoose.Types.ObjectId;
        offerDiscountAmount?: number;
        offerDiscountType?: number;
        resetDiscount?: boolean;
    }>;
    description?: string;
    status?: string;
    bannerImage?: string;
}>;
