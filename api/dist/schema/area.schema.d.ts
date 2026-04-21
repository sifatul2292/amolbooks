import * as mongoose from 'mongoose';
export declare const AreaSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    status?: string;
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    priority?: number;
}>;
