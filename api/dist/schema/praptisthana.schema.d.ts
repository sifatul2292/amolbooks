import * as mongoose from 'mongoose';
export declare const PraptisthanaSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    url?: string;
    title?: string;
    image?: string;
    priority?: number;
    mobileImage?: string;
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    address?: string;
    zone?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    area?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    phone?: string;
    amount?: string;
}>;
