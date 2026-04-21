import * as mongoose from 'mongoose';
export declare const CartSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    user: mongoose.Types.ObjectId;
    cartType: number;
    selectedQty: number;
    product?: mongoose.Types.ObjectId;
    specialPackage?: mongoose.Types.ObjectId;
}>;
