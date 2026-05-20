import * as mongoose from 'mongoose';
export declare const ZoneSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    status?: string;
    priority?: number;
    division?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
    area?: {
        _id?: mongoose.Types.ObjectId;
        name?: string;
    };
}>;
