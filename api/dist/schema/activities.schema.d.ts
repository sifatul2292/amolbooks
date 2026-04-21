import * as mongoose from 'mongoose';
export declare const ActivitiesSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
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
    image?: string;
    priority?: number;
    mobileImage?: string;
    descriptionEn?: string;
    authorName?: string;
    shortDesc?: string;
    totalView?: number;
    shortDescEn?: string;
}>;
