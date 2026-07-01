import { Product } from './product.interface';

export interface StockMovement {
  _id?: string;
  product?: string | Product;
  sku?: string;
  qtyChange?: number;
  stockAfter?: number;
  reason?:
    | 'order'
    | 'cancel_restock'
    | 'return_restock'
    | 'manual_adjustment'
    | 'purchase';
  referenceType?: 'order' | 'purchase' | null;
  referenceId?: string;
  note?: string;
  adminId?: string;
  adminName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
