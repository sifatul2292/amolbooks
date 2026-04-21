import * as mongoose from 'mongoose';
export declare const GallerySchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    url: string;
    type: string;
    size?: number;
    description?: string;
    folder?: string;
    metaTitle?: string;
}>;
