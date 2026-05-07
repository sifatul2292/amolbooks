import { User } from '../user/user.interface';

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
  checkoutDate?: string;
  status?: string;
  orderedItems?: any[];
  user?: string | User;
  createdAt?: Date;
  updatedAt?: Date;
}
