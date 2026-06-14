import * as mongoose from 'mongoose';
export declare const CarouselSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
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
    amount?: string;
}>;
