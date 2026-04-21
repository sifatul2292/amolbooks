import * as mongoose from 'mongoose';
export declare const TagSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    url?: string;
    image?: string;
    priority?: number;
    readOnly?: boolean;
}>;
