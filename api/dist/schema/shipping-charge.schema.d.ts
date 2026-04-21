import * as mongoose from 'mongoose';
export declare const ShippingChargeSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    deliveryInDhaka: number;
    deliveryOutsideDhaka: number;
    deliveryOutsideBD?: number;
}>;
