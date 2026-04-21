import * as mongoose from 'mongoose';
export declare const PreOrderSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    product: mongoose.Types.ObjectId;
    phoneNo: string;
    status?: "cancelled" | "pending" | "completed";
    email?: string;
    user?: mongoose.Types.ObjectId;
}>;
