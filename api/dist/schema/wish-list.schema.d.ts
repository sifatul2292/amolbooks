import * as mongoose from 'mongoose';
export declare const WishListSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    product: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    selectedQty: number;
}>;
