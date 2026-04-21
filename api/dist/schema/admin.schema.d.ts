import * as mongoose from 'mongoose';
export declare const AdminSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    password: string;
    username: string;
    readOnly: boolean;
    hasAccess: boolean;
    role: string;
    email?: string;
    gender?: string;
    profileImg?: string;
    phoneNo?: string;
    permissions?: string[];
    registrationAt?: string;
    lastLoggedIn?: Date;
}>;
