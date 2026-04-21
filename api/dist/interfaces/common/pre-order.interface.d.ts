import { Product } from './product.interface';
import { User } from '../../interfaces/user/user.interface';
export interface PreOrder {
    _id?: string;
    product?: string | Product;
    name: string;
    phoneNo: string;
    email?: string;
    status?: 'pending' | 'completed' | 'cancelled';
    user?: string | User;
    createdAt?: Date;
    updatedAt?: Date;
}
