import * as mongoose from 'mongoose';
export declare const AddressSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    phone: string;
    user: mongoose.Types.ObjectId;
    name?: string;
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    address?: string;
    city?: string;
    area?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    zone?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    addressType?: string;
    setDefaultAddress?: boolean;
}>;
