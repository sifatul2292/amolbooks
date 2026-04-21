export interface Variation {
    _id?: string;
    readOnly?: boolean;
    name?: string;
    values?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    select?: boolean;
}
export interface VariationOption {
    _id: string;
    quantity?: number;
    price?: number;
    image?: string;
    discountType?: number;
    discountAmount?: number;
    sku?: string;
    variations?: ProductVariationOption[];
}
export interface ProductVariationOption {
    _id?: string;
    name?: string;
    value?: string;
}
