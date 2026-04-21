import * as mongoose from 'mongoose';
export declare const SpecialPackageSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    salePrice: number;
    name: string;
    slug: string;
    products: mongoose.Types.DocumentArray<{
        quantity: number;
        product: mongoose.Types.ObjectId;
        hasVariations?: boolean;
        selectedVariation?: mongoose.Types.ObjectId;
    }>;
    discountType?: number;
    discountAmount?: number;
    description?: string;
    image?: string;
    active?: boolean;
    gifts?: any[];
}>;
