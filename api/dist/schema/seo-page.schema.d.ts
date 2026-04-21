import * as mongoose from 'mongoose';
export declare const SeoPageSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    seoDescription?: string;
    image?: string;
    readOnly?: boolean;
    keyWord?: string;
    pageName?: string;
}>;
