import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

/** The district rules the checkout page uses too (it is served from the same file). */
const CORE_FILE = join(__dirname, '..', '..', '..', '..', 'gtm-snippets', 'delivery-zone-core.js');
const SHIPPING_CACHE_MS = 60 * 1000;

export interface DeliveryLocationRecord {
  district: string;
  districtName: string;
  /** English district name, e.g. "Cox's Bazar". */
  districtEn: string;
  /** Town sent to Meta as ct (lowercase letters, e.g. "coxsbazar", "chittagong"). */
  metaCity: string;
  area: string;
  areaName: string;
  zone: 'inside' | 'outside' | null;
  /** A place named in the address that is not the chosen district/area ('' when they agree). */
  mismatch: string;
  /** The customer saw the mismatch warning and kept the district. */
  confirmed: boolean;
  weightGram: number;
  clientCharge: number;
  charge: number;
}

/**
 * Delivery charge by district (owner, 2026-11-14: customers outside Dhaka were choosing the Dhaka
 * charge). The checkout sends the district (and Dhaka area) the customer picked
 * (gtm-snippets/checkout-location.js). Here the charge is set from it: the shop's weight rules for
 * "inside Dhaka city" or "outside", the same as the checkout shows. The charge the checkout sent is
 * kept when it is right for the district (its weight tier, or the zone's base charge that the
 * saved-address checkout uses); anything else is replaced. Orders without a district (older
 * checkout pages, other order forms) are left as before. Owner, 2026-11-16: outside Dhaka city, an
 * order with books under ৳294 pays at least ৳100 (smallOrderCharge in the same rules file).
 * Owner, later 2026-11-16: the district box is off the checkout for now; when the order carries no
 * district, the place is read from the typed address (fromAddress) and the charge set the same way.
 */
@Injectable()
export class DeliveryZoneService {
  private readonly logger = new Logger(DeliveryZoneService.name);
  private core: any = null;
  private shipping: { at: number; doc: any } | null = null;

  constructor(
    @InjectModel('ShippingCharge') private readonly shippingChargeModel: Model<any>,
    @InjectModel('Product') private readonly productModel: Model<any>,
  ) {}

  /** gtm-snippets/delivery-zone-core.js, run as a plain script (it is a browser file too). */
  rules(): any {
    if (!this.core) {
      const sandbox: any = { module: { exports: {} } };
      runInNewContext(readFileSync(CORE_FILE, 'utf8'), sandbox, { filename: CORE_FILE });
      this.core = sandbox.module.exports;
    }
    return this.core;
  }

  private async shippingCharge(): Promise<any> {
    if (this.shipping && Date.now() - this.shipping.at < SHIPPING_CACHE_MS) return this.shipping.doc;
    const doc = await this.shippingChargeModel.findOne({}).lean();
    this.shipping = { at: Date.now(), doc };
    return doc;
  }

  /** Cart weight in grams, counted like the checkout (book weight × quantity; packages count 0). */
  private async cartWeight(items: any[]): Promise<number> {
    const books = (items || []).filter((item) => item && item.cartType !== 1 && item.product?._id);
    return this.weightOf(books.map((item) => ({ id: item.product._id, quantity: item.selectedQty })));
  }

  private async weightOf(lines: { id: any; quantity: any }[]): Promise<number> {
    const zone = this.rules();
    const valid = lines.filter((line) => line.id && Types.ObjectId.isValid(String(line.id)));
    if (!valid.length) return 0;
    const rows: any[] = await this.productModel
      .find({ _id: { $in: valid.map((line) => String(line.id)) } })
      .select('weight')
      .lean();
    const weights = new Map(rows.map((row) => [String(row._id), row.weight]));
    // Anything not a book here (a package) weighs nothing, as at checkout.
    return valid.reduce(
      (sum, line) => sum + zone.weightGram(weights.get(String(line.id))) * Math.max(1, Number(line.quantity) || 1),
      0,
    );
  }

  /**
   * The delivery charge an abandoned checkout should carry for its district: its own charge when
   * that is right for the district (weight tier or base), else the district's weight tier. Null
   * when there is nothing to decide (no zone, no charge set, free delivery).
   */
  async chargeForSaved(location: any, orderedItems: any[], current: number, productTotal?: number): Promise<number | null> {
    try {
      const zone = this.rules();
      const where = zone.zoneFor(location?.district, location?.area || '');
      if (!where || !(current > 0)) return null;
      const shipping = await this.shippingCharge();
      const weight = await this.weightOf((orderedItems || []).map((item) => ({ id: item?._id, quantity: item?.quantity })));
      const expected = zone.chargeFor(where, weight, shipping, productTotal);
      // The base charge too, raised for a small order outside Dhaka (books under ৳294 pay ৳100).
      const base = zone.smallOrderCharge(
        where,
        Number((where === 'inside' ? shipping?.deliveryInDhaka : shipping?.deliveryOutsideDhaka) || 0),
        productTotal,
      );
      if (expected == null || !(expected > 0) || current === expected || current === base) return current;
      return expected;
    } catch (error) {
      this.logger.warn(`Saved delivery charge not checked: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * The district picked at checkout, checked and described, for an abandoned checkout (no charge
   * check; staff turn it into an order by phone). Null when it is not a district we know.
   */
  describe(input: any, address?: string): Omit<DeliveryLocationRecord, 'weightGram' | 'clientCharge' | 'charge'> | null {
    try {
      const zone = this.rules();
      const read = !input || typeof input !== 'object' || !input.district;
      if (read) input = this.fromAddress(address);
      if (!input) return null;
      const district = String(input.district || '').slice(0, 40);
      const districtEntry = zone.district(district);
      if (!districtEntry) return null;
      const areaEntry = district === 'dhaka' ? zone.area(String(input.area || '').slice(0, 40)) : null;
      const area = areaEntry ? areaEntry[0] : '';
      return {
        district,
        districtName: districtEntry[1],
        districtEn: districtEntry[2],
        metaCity: zone.metaCity(district),
        area,
        areaName: areaEntry ? areaEntry[1] : '',
        zone: zone.zoneFor(district, area),
        // Read from the address itself: nothing to disagree with.
        mismatch: read ? '' : zone.mismatch({ district, area }, String(address || '')),
        confirmed: input.confirmed === true,
      };
    } catch (error) {
      this.logger.warn(`Delivery district skipped: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * The place an address names, when it is clear enough to charge by: another district, a Dhaka
   * outskirt, or a named Dhaka city area. "Dhaka" alone (city or district?) and addresses that
   * name no place give null, and the customer's own choice stands.
   */
  fromAddress(address: any): { district: string; area: string; confirmed: false } | null {
    const zone = this.rules();
    const found = zone.detect(String(address || ''));
    if (!found || !found.district) return null;
    const area = String(found.area || '');
    if (!zone.zoneFor(found.district, area)) return null;
    return { district: String(found.district), area, confirmed: false };
  }

  /**
   * For a new order: the delivery charge for the district the customer picked, what to store about
   * it, the district as the order's city, and the address with the area/district added when it
   * does not name them. Null when the order has no district (nothing changes then).
   */
  async forOrder(
    orderData: any,
    items: any[],
    freeDelivery: boolean,
    /** The books' price after product discounts: under ৳294 outside Dhaka city pays at least ৳100. */
    productTotal?: number,
  ): Promise<{ charge: number; record: DeliveryLocationRecord; shippingAddress: string; city: string } | null> {
    try {
      const zone = this.rules();
      const address = String(orderData?.shippingAddress || '');
      // Owner, 2026-11-16: no district box at checkout any more. The customer picks inside /
      // outside Dhaka as before, and the order's charge follows the address they typed.
      let input = orderData?.deliveryLocation;
      const read = !input || typeof input !== 'object' || !input.district;
      if (read) input = this.fromAddress(address);
      if (!input) return null;
      const district = String(input.district || '').slice(0, 40);
      const districtEntry = zone.district(district);
      if (!districtEntry) return null;
      const areaEntry = district === 'dhaka' ? zone.area(String(input.area || '').slice(0, 40)) : null;
      const area = areaEntry ? areaEntry[0] : '';
      const where = zone.zoneFor(district, area);
      const clientCharge = Number(orderData?.deliveryCharge || 0);
      let charge = clientCharge;
      let weightGram = 0;
      if (where && !freeDelivery) {
        const shipping = await this.shippingCharge();
        weightGram = await this.cartWeight(items);
        const expected = zone.chargeFor(where, weightGram, shipping, productTotal);
        const base = zone.smallOrderCharge(
          where,
          Number((where === 'inside' ? shipping?.deliveryInDhaka : shipping?.deliveryOutsideDhaka) || 0),
          productTotal,
        );
        if (expected != null && expected > 0 && clientCharge !== expected && clientCharge !== base) {
          charge = expected;
        }
      }
      if (charge !== clientCharge) {
        this.logger.log(
          `Delivery charge ${clientCharge} -> ${charge} for ${district}${area ? '/' + area : ''} (${weightGram} g)`,
        );
      }
      const mismatch = read ? '' : zone.mismatch({ district, area }, address);
      return {
        charge,
        // The order's city: the district in English, for staff pages, payment and Meta.
        city: districtEntry[2],
        // Not added to an address that names another place: staff see the flag and call instead.
        // Read from the address: it already names the place, leave it as typed.
        shippingAddress: read || mismatch ? address : zone.withLocation(address, { district, area }),
        record: {
          district,
          districtName: districtEntry[1],
          districtEn: districtEntry[2],
          metaCity: zone.metaCity(district),
          area,
          areaName: areaEntry ? areaEntry[1] : '',
          zone: where,
          mismatch,
          confirmed: input.confirmed === true,
          weightGram,
          clientCharge,
          charge,
        },
      };
    } catch (error) {
      this.logger.warn(`Delivery district skipped: ${error?.message || error}`);
      return null;
    }
  }
}
