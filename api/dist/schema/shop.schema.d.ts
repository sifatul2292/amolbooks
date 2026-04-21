import * as mongoose from 'mongoose';
export declare const ShopSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    address?: string;
    createdAtString?: string;
    phone?: string;
    updatedAtString?: string;
}>;
