import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssistProduct, parseOrderMessage, prepareCatalogue } from './order-message-parser';

const CATALOGUE_TTL_MS = 2 * 60 * 1000;
const MAX_TEXT = 20000;

/** AI Assist: reads a pasted order message against the published catalogue. */
@Injectable()
export class OrderAssistService {
  private catalogue: { at: number; entries: ReturnType<typeof prepareCatalogue> } | null = null;

  constructor(@InjectModel('Product') private readonly productModel: Model<any>) {}

  async parse(body: any) {
    const text = String(body?.text == null ? '' : body.text);
    if (!text.trim()) throw new BadRequestException('Paste the order message first.');
    if (text.length > MAX_TEXT) throw new BadRequestException('The text is too long. Paste one order at a time.');
    const data = parseOrderMessage(text, await this.entries());
    return { success: true, data };
  }

  private async entries() {
    if (this.catalogue && Date.now() - this.catalogue.at < CATALOGUE_TTL_MS) return this.catalogue.entries;
    const docs: any[] = await this.productModel
      .find({ status: 'publish' })
      .select('name nameEn salePrice discountType discountAmount totalSold')
      .lean();
    const products: AssistProduct[] = docs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      nameEn: doc.nameEn,
      price: this.price(doc),
      totalSold: Number(doc.totalSold) || 0,
    }));
    this.catalogue = { at: Date.now(), entries: prepareCatalogue(products) };
    return this.catalogue.entries;
  }

  /** The price a customer pays (same as the shop: percentage or Taka off the sale price). */
  private price(doc: any): number {
    const sale = Number(doc.salePrice) || 0;
    const off = Number(doc.discountAmount) || 0;
    if (Number(doc.discountType) === 1 && off) return Math.floor(sale - (sale * off) / 100);
    if (Number(doc.discountType) === 2 && off) return Math.floor(sale - off);
    return Math.floor(sale);
  }
}
