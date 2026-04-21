import * as mongoose from 'mongoose';
export declare const UserSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    addresses: mongoose.Types.ObjectId[];
    hasAccess: boolean;
    carts: mongoose.Types.ObjectId[];
    usedCoupons: mongoose.Types.ObjectId[];
    authors: mongoose.Types.ObjectId[];
    name?: string;
    password?: string;
    username?: string;
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    email?: string;
    image?: string;
    gender?: string;
    profileImg?: string;
    phoneNo?: string;
    birthDate?: string;
    registrationType?: string;
    addressLine?: string;
    area?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    zone?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
}>;
