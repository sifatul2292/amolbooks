import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CatalogueKind, cataloguePath } from './catalogue-seo.utils';

const PUBLISHED = { status: 'publish', slug: { $exists: true, $ne: '' } };
const PAGE_BOOKS = 100;
const BOOK_FIELD = { author: 'author', publisher: 'publisher', category: 'category' };

// Slugs come from addresses: try the text as given and in both Unicode forms (য় is stored either way).
function slugForms(slug: string): string[] {
  const value = String(slug || '').trim().replace(/\/+$/, '');
  return value ? [...new Set([value, value.normalize('NFC'), value.normalize('NFD')])] : [];
}

@Injectable()
export class CatalogueSeoService {
  constructor(
    @InjectModel('Author') private readonly authorModel: Model<any>,
    @InjectModel('Publisher') private readonly publisherModel: Model<any>,
    @InjectModel('Category') private readonly categoryModel: Model<any>,
    @InjectModel('Product') private readonly productModel: Model<any>,
  ) {}

  private model(kind: CatalogueKind): Model<any> {
    return kind === 'author' ? this.authorModel : kind === 'publisher' ? this.publisherModel : this.categoryModel;
  }

  // One author, publisher or category with its published books, best sellers first; null when unknown.
  async page(kind: CatalogueKind, slug: string, id?: string) {
    const conditions: any[] = [];
    if (/^[a-f0-9]{24}$/i.test(String(id || ''))) conditions.push({ _id: new Types.ObjectId(id) });
    const forms = slugForms(slug);
    if (forms.length) conditions.push({ slug: { $in: forms } });
    if (!conditions.length) return null;
    const entity = await this.model(kind)
      .findOne(conditions.length > 1 ? { $or: conditions } : conditions[0])
      .select('name nameEn slug image description status')
      .lean();
    if (!entity || !entity.slug) return null;
    const filter = { ...PUBLISHED, [`${BOOK_FIELD[kind]}._id`]: entity._id };
    const books = await this.productModel
      .find(filter)
      .select('name slug images')
      .sort({ totalSold: -1, priority: -1, _id: 1 })
      .limit(PAGE_BOOKS)
      .lean();
    const total = books.length < PAGE_BOOKS ? books.length : await this.productModel.countDocuments(filter);
    return { entity, books, total };
  }

  // Authors, publishers and (visible) categories with at least one published book.
  async sitemapEntries(): Promise<{ url: string; lastmod?: Date; name: string; image?: string }[]> {
    const entries = [];
    for (const kind of ['author', 'publisher', 'category'] as CatalogueKind[]) {
      const field = BOOK_FIELD[kind];
      const groups = await this.productModel.aggregate([
        { $match: PUBLISHED },
        ...(kind === 'publisher' ? [] : [{ $unwind: `$${field}` }]),
        { $group: { _id: `$${field}._id`, updatedAt: { $max: '$updatedAt' } } },
      ]);
      const latest = new Map(groups.filter((group) => group._id).map((group) => [String(group._id), group.updatedAt]));
      const filter: any = { _id: { $in: groups.map((group) => group._id).filter(Boolean) }, slug: { $exists: true, $ne: '' } };
      if (kind === 'category') filter.status = { $in: ['publish', null] };
      const items = await this.model(kind).find(filter).select('name slug image updatedAt').sort({ name: 1 }).lean();
      for (const item of items) {
        const dates = [item.updatedAt, latest.get(String(item._id))].filter(Boolean).map((date) => new Date(date));
        entries.push({
          url: cataloguePath(kind, item.slug),
          lastmod: dates.length ? new Date(Math.max(...dates.map(Number))) : undefined,
          name: item.name,
          image: /^https?:\/\//.test(String(item.image || '')) ? item.image : undefined,
        });
      }
    }
    return entries;
  }
}
