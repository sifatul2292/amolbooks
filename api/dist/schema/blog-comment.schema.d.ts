import * as mongoose from 'mongoose';
export declare const BlogCommentSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    status: boolean;
    review: string;
    name?: string;
    rating?: number;
    address?: string;
    email?: string;
    readOnly?: boolean;
    blog?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        slug?: string;
        image?: string;
    };
    phoneNo?: string;
    user?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        profileImg?: string;
    };
    message?: string;
    emailSent?: boolean;
    reply?: string;
    replyDate?: Date;
    reviewDate?: Date;
    isReview?: boolean;
    isComment?: boolean;
}>;
