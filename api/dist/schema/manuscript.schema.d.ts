import * as mongoose from 'mongoose';
export declare const ManuscriptSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
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
    phone?: string;
    birthDayDate?: Date;
    profession?: string;
    docFile?: string;
    manuScriptWords?: string;
    manuScriptContents?: string;
    targrtReaderClasses?: string;
    manuScriptSummery?: string;
    manuScriptComment?: string;
    manuScriptLink?: string;
    manuScriptName?: string;
}>;
