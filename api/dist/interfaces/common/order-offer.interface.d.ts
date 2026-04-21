export interface OrderOffer {
    _id?: string;
    firstOrderDiscountAmount?: number;
    firstOrderDiscountType?: number;
    firstOrderMinAmount?: number;
    amountOrderDiscountAmount?: number;
    amountOrderDiscountType?: number;
    amountOrderMinAmount?: number;
    amount2OrderDiscountAmount?: number;
    amount2OrderDiscountType?: number;
    amount2OrderMinAmount?: number;
    amount3OrderDiscountAmount?: number;
    amount3OrderDiscountType?: number;
    amount3OrderMinAmount?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
