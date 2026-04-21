import * as mongoose from 'mongoose';
export declare const ProfileSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    username?: string;
    email?: string;
    image?: string;
    phoneNo?: string;
}>;
