import * as mongoose from 'mongoose';
export declare const AuthorSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    name: string;
    slug: string;
    followers: mongoose.Types.ObjectId[];
    description?: string;
    nameEn?: string;
    address?: string;
    image?: string;
    priority?: number;
    birthDate?: Date;
    addressEn?: string;
    descriptionEn?: string;
}>;
