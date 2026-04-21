import { User } from '../user/user.interface';
import { Product } from './product.interface';
import { Blog } from './blog.interface';

export interface BlogComment {
  _id?: string;
  readOnly?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  queryType?: string;
  subject?: string;
  message?: string;
  receivingMails?: string;
  emailSent?: string;
  user?: string | User;
  product?: string | Product;
  blog?: string | Blog;
  // name?: string;
  reviewDate: string;
  review: string;
  rating: number;
  status: boolean;
  isReview: boolean;
  reply: string;
  replyDate: string;
}
