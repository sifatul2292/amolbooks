import { Product } from './product.interface';
import { User } from '../user/user.interface';
export interface Review {
    _id?: string;
    user?: string | User;
    product?: string | Product;
    name?: string;
    reviewDate: string;
    review: string;
    rating: number;
    status: boolean;
    isReview: boolean;
    reply: string;
    replyDate: string;
}
