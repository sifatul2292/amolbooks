import { User } from "../user/user.interface";
export interface IncompleteOrder {
    _id?: string;
    orderId?: string;
    name?: string;
    phoneNo?: string;
    email?: string;
    city?: string;
    shippingAddress?: string;
    paymentType?: string;
    paymentStatus?: string;
    orderStatus?: number;
    grandTotal?: number;
    subTotal?: number;
    discount?: number;
    deliveryCharge?: number;
    checkoutDate?: string;
    status?: string;
    note?: string;
    adminNote?: string;
    fraudChecker?: any;
    orderedItems?: any[];
    user?: string | User;
    attribution?: any;
    createdAt?: Date;
    updatedAt?: Date;
}
