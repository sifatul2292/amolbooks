import * as mongoose from 'mongoose';
export declare const ReaderClassSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    description?: string;
    status?: string;
    priority?: number;
    image?: string;
    readOnly?: boolean;
}>;
