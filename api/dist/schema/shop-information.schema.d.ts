import * as mongoose from 'mongoose';
export declare const ShopInformationSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any>, {}, {}, {}, {}, mongoose.ResolveSchemaOptions<{
    versionKey: false;
    timestamps: true;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    siteName: string;
    addresses: any[];
    emails: any[];
    phones: any[];
    downloadUrls: any[];
    socialLinks: any[];
    shortDescription?: string;
    siteLogo?: string;
    newsSlider?: string;
    navLogo?: string;
    redirectUrl?: string;
    categoryPdfFile?: string;
    footerLogo?: string;
    othersLogo?: string;
}>;
