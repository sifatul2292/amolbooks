import * as mongoose from 'mongoose';
export declare const SubCategorySchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    category: mongoose.Types.ObjectId;
    nameEn?: string;
    status?: string;
    image?: string;
    priority?: number;
    readOnly?: boolean;
}>;
