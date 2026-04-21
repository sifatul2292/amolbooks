import * as mongoose from 'mongoose';
export declare const ContactSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    address?: string;
    email?: string;
    readOnly?: boolean;
    phoneNo?: string;
    message?: string;
    emailSent?: boolean;
}>;
