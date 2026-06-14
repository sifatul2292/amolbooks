import * as mongoose from 'mongoose';
export declare const BlogSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
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
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    image?: string;
    priority?: number;
    mobileImage?: string;
    descriptionEn?: string;
    authorName?: string;
    shortDesc?: string;
    totalView?: number;
    shortDescEn?: string;
    seoMetaTitle?: string;
    seoMetaTag?: string;
    seoScore?: string;
}>;
