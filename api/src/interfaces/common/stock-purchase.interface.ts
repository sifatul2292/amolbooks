import { Product } from './product.interface';

export interface StockPurchase {
  _id?: string;
  product?: string | Product;
  sku?: string;
  qty?: number;
  unitCost?: number;
  totalCost?: number;
  supplierName?: string;
  note?: string;
  adminId?: string;
  adminName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
