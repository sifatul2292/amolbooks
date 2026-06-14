import * as mongoose from 'mongoose';
export declare const CategorySchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    description?: string;
    nameEn?: string;
    status?: string;
    image?: string;
    mobileImage?: string;
    readOnly?: boolean;
    serial?: number;
}>;
