import * as mongoose from 'mongoose';
export declare const NewsletterSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    number?: string;
    email?: string;
    readOnly?: boolean;
}>;
