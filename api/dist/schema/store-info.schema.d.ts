import * as mongoose from 'mongoose';
export declare const StoreInfoSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    country: string;
    map: string;
    address: string;
    district: string;
    storeName: string;
    phoneNumber: string;
    readOnly?: boolean;
}>;
