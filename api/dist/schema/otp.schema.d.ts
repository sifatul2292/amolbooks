import * as mongoose from 'mongoose';
export declare const OtpSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: {
        createdAt: false;
        updatedAt: true;
    };
}>, {
    createdAt: Date;
    count: number;
    code: string;
    phoneNo: string;
    expireTime?: string;
}>;
