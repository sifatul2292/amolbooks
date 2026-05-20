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
    priority?: number;
    mobileImage?: string;
    image?: string;
    amount?: string;
}>;
