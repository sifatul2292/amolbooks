import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';

// The search box asks again as the customer keeps typing; within this window the
// visitor's last search is updated instead of adding another row.
const MERGE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [7, 30, 90, 365];
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|python|curl|wget|httpclient/i;

export const searchKey = (term: string) =>
  String(term || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

@Injectable()
export class SearchInsightsService {
  private readonly logger = new Logger(SearchInsightsService.name);

  constructor(
    @InjectModel('SearchLog') private readonly searchLogModel: Model<any>,
  ) {}

  /** A shop search (storefront search box or results page). Never throws. */
  async record(raw: any, results: number, req: any): Promise<void> {
    try {
      const headers = req?.headers || {};
      // Staff searching in the admin panel are not customers.
      if (headers.administrator) return;
      const ua = String(headers['user-agent'] || '');
      if (!ua || BOT_UA.test(ua)) return;
      const term = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
      const key = searchKey(term);
      if (key.length < 2 || term.length > 80 || /https?:|www\./i.test(term)) return;
      const ip =
        String(headers['cf-connecting-ip'] || '').trim() ||
        String(headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        String(req?.ip || '');
      const day = new Date().toISOString().slice(0, 10);
      const visitor = createHash('sha256')
        .update(`${day}|${ip}|${ua}`)
        .digest('hex')
        .slice(0, 16);
      const now = new Date();
      const found = Number.isFinite(Number(results)) ? Number(results) : 0;
      const last: any = await this.searchLogModel
        .findOne({ visitor, at: { $gte: new Date(now.getTime() - MERGE_MS) } })
        .sort({ at: -1 })
        .lean();
      if (last && (key.startsWith(last.key) || last.key.startsWith(key))) {
        // Typing on keeps the longer words; the results page repeating it changes nothing else.
        const update = key.length >= last.key.length ? { term, key, results: found, at: now } : { at: now };
        await this.searchLogModel.updateOne({ _id: last._id }, { $set: update });
        return;
      }
      await this.searchLogModel.create({ term, key, visitor, results: found, at: now });
    } catch (error) {
      this.logger.warn(`Search log failed: ${error?.message || error}`);
    }
  }

  /** Searches grouped by term for the admin "Customer Searches" page. */
  async report(query: any) {
    const days = PERIODS.includes(Number(query?.days)) ? Number(query.days) : 30;
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await this.searchLogModel.aggregate([
      { $match: { at: { $gte: since } } },
      { $sort: { at: 1 } },
      {
        $group: {
          _id: '$key',
          term: { $last: '$term' },
          searches: { $sum: 1 },
          visitors: { $addToSet: '$visitor' },
          results: { $last: '$results' },
          lastAt: { $last: '$at' },
        },
      },
      {
        $project: {
          _id: 0,
          term: 1,
          searches: 1,
          visitors: { $size: '$visitors' },
          results: 1,
          lastAt: 1,
        },
      },
      { $sort: { searches: -1, lastAt: -1 } },
      { $limit: 2000 },
    ]);
    return {
      success: true,
      message: 'Success',
      data: {
        days,
        since,
        searches: rows.reduce((sum, row) => sum + row.searches, 0),
        terms: rows.length,
        notFound: rows.filter((row) => !row.results).length,
        rows,
      },
    };
  }
}
