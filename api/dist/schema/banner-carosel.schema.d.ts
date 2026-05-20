import * as mongoose from 'mongoose';
export declare const BannerCaroselSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    url?: string;
    priority?: number;
    mobileImage?: string;
    bannerType?: string;
    image?: string;
    imageUrl?: string;
}>;
