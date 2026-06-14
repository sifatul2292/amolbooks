import * as mongoose from 'mongoose';
export declare const NotificationSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug?: string;
    description?: string;
    nameEn?: string;
    image?: string;
    priority?: number;
    readOnly?: boolean;
    isReadNoti?: boolean;
}>;
