import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { unbookedOrderFilter } from '../../guest-orders/guest-orders.policy';
import { StaffActivityService } from '../../staff-activity/staff-activity.service';
import { OrderService } from '../order/order.service';

/**
 * Future delivery (owner, 2026-11-08): staff park an order and pick a date and
 * time; at that time it goes to the courier exactly like the Orders page's
 * Send button (OrderService.sendToCourier), credited to whoever scheduled it.
 *
 * order.courierSchedule: { at, status, by, scheduledAt, startedAt, sentAt,
 * failedAt, error }. status: scheduled → sending → sent, or failed (with the
 * reason). A failed booking is never retried on its own: the existing send
 * keeps its "booking started" marker so a parcel is never booked twice, and
 * staff check the courier panel. Removing the schedule unsets the field.
 */
export const COURIER_SCHEDULE_ACTIVE = ['scheduled', 'sending', 'failed'];
// Pending, Confirmed, Processing: orders still waiting for the courier.
const SCHEDULABLE_STATUSES = [1, 2, 3];
const TICK_MS = 60 * 1000;
const MAX_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;
// A send that never finished (server restarted mid-booking) is reported, not resent.
const STUCK_SENDING_MS = 10 * 60 * 1000;
const MAX_IDS = 200;
const MAX_SENDS_PER_TICK = 50;

@Injectable()
export class CourierScheduleService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(CourierScheduleService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    private readonly orderService: OrderService,
    private readonly staffActivityService: StaffActivityService,
  ) {}

  onModuleInit() {
    if (process.env.COURIER_SCHEDULE_DISABLED === '1') return;
    this.timer = setInterval(() => void this.sendDue(), TICK_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Park orders for the courier at `at`; re-scheduling an order moves its time. */
  async schedule(body: any, admin: any) {
    const ids = this.ids(body?.ids);
    const at = new Date(body?.at);
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Choose a date and time.');
    if (at.getTime() < Date.now() + 60 * 1000) {
      throw new BadRequestException('Choose a time at least one minute from now.');
    }
    if (at.getTime() > Date.now() + MAX_AHEAD_MS) {
      throw new BadRequestException('Choose a date within the next 90 days.');
    }
    const actor = await this.staffActivityService.resolveActor(admin);
    if (!actor) throw new UnauthorizedException('Login expired. Please log in again.');
    const by = { _id: actor._id, name: actor.name, role: actor.role };
    const results = [];
    for (const id of ids) {
      const updated: any = await this.orderModel
        .findOneAndUpdate(
          {
            _id: id,
            ...unbookedOrderFilter(),
            orderStatus: { $in: SCHEDULABLE_STATUSES },
            'courierSchedule.status': { $ne: 'sending' },
          },
          { $set: { courierSchedule: { at, status: 'scheduled', by, scheduledAt: new Date() } } },
          { new: true },
        )
        .select('orderId')
        .lean();
      results.push(
        updated
          ? { id: String(id), ok: true, orderId: updated.orderId }
          : { id: String(id), ok: false, reason: await this.whyNot(id) },
      );
    }
    return { success: true, data: { at, results } };
  }

  /** "Remove": the order goes back to its normal tab. */
  async cancel(body: any) {
    const ids = this.ids(body?.ids);
    const result = await this.orderModel.updateMany(
      { _id: { $in: ids }, 'courierSchedule.status': { $in: ['scheduled', 'failed'] } },
      { $unset: { courierSchedule: 1 } },
    );
    return { success: true, data: { removed: result.modifiedCount || 0 } };
  }

  /** "Send now" from the Future delivery tab, credited to the staff member who presses it. */
  async sendNow(body: any, admin: any) {
    const [id] = this.ids([body?.id]);
    const actor = await this.staffActivityService.resolveActor(admin);
    if (!actor) throw new UnauthorizedException('Login expired. Please log in again.');
    const order: any = await this.orderModel
      .findOneAndUpdate(
        { _id: id, 'courierSchedule.status': { $in: ['scheduled', 'failed'] } },
        { $set: { 'courierSchedule.status': 'sending', 'courierSchedule.startedAt': new Date() } },
        { new: true },
      )
      .lean();
    if (!order) throw new BadRequestException('This order is not waiting in Future delivery.');
    const outcome = await this.deliver(order, { _id: actor._id, name: actor.name, role: actor.role });
    return { success: outcome.sent, message: outcome.sent ? 'Sent to courier' : outcome.error, data: outcome };
  }

  /** Every minute: send what is due, oldest first. */
  async sendDue() {
    if (this.running) return;
    this.running = true;
    try {
      await this.orderModel.updateMany(
        {
          'courierSchedule.status': 'sending',
          'courierSchedule.startedAt': { $lt: new Date(Date.now() - STUCK_SENDING_MS) },
        },
        {
          $set: {
            'courierSchedule.status': 'failed',
            'courierSchedule.failedAt': new Date(),
            'courierSchedule.error': 'Sending was interrupted. Check the courier panel before sending again.',
          },
        },
      );
      for (let sent = 0; sent < MAX_SENDS_PER_TICK; sent++) {
        const order: any = await this.orderModel
          .findOneAndUpdate(
            { 'courierSchedule.status': 'scheduled', 'courierSchedule.at': { $lte: new Date() } },
            { $set: { 'courierSchedule.status': 'sending', 'courierSchedule.startedAt': new Date() } },
            { new: true, sort: { 'courierSchedule.at': 1 } },
          )
          .lean();
        if (!order) break;
        await this.deliver(order, order.courierSchedule?.by);
      }
    } catch (error) {
      this.logger.error(`Future delivery run failed: ${error?.message}`);
    } finally {
      this.running = false;
    }
  }

  private async deliver(order: any, by: any) {
    let error = '';
    if (order.courierData?.consignmentId) {
      // Sent by hand before its time: nothing to book.
      await this.mark(order._id, true, '');
      return { sent: true, error: '' };
    }
    try {
      const admin = by?._id ? ({ _id: String(by._id), username: by.name, role: by.role } as any) : undefined;
      await this.orderService.sendToCourier(String(order._id), admin);
    } catch (sendError) {
      error = String(sendError?.message || sendError || '');
    }
    const after: any = await this.orderModel.findById(order._id).select('courierData').lean();
    const sent = Boolean(after?.courierData?.consignmentId);
    if (!sent && !error) error = 'The courier did not accept this order. Check its phone and address.';
    await this.mark(order._id, sent, error);
    this.logger.log(`Future delivery: order ${order.orderId || order._id} ${sent ? 'sent to courier' : 'not sent: ' + error}`);
    return { sent, error: sent ? '' : error };
  }

  private async mark(id: any, sent: boolean, error: string) {
    await this.orderModel.updateOne(
      { _id: id },
      sent
        ? {
            $set: { 'courierSchedule.status': 'sent', 'courierSchedule.sentAt': new Date() },
            $unset: { 'courierSchedule.error': 1 },
          }
        : {
            $set: {
              'courierSchedule.status': 'failed',
              'courierSchedule.failedAt': new Date(),
              'courierSchedule.error': error.slice(0, 300),
            },
          },
    );
  }

  private async whyNot(id: Types.ObjectId): Promise<string> {
    const order: any = await this.orderModel
      .findById(id)
      .select('orderStatus courierData courierBookingStartedAt customerCancelledAt courierSchedule')
      .lean();
    if (!order) return 'Order not found.';
    if (order.courierData?.consignmentId) return 'Already sent to the courier.';
    if (order.courierSchedule?.status === 'sending') return 'Being sent to the courier right now.';
    if (order.customerCancelledAt || [6, 7, 9].includes(order.orderStatus)) return 'The order is cancelled.';
    if (order.courierBookingStartedAt) return 'A courier booking was already tried. Check the courier panel.';
    return 'Only Pending, Confirmed or Processing orders can be scheduled.';
  }

  private ids(value: any): Types.ObjectId[] {
    const list = (Array.isArray(value) ? value : []).map((id) => String(id || ''));
    const valid = [...new Set(list.filter((id) => Types.ObjectId.isValid(id)))];
    if (!valid.length) throw new BadRequestException('Select at least one order.');
    if (valid.length > MAX_IDS) throw new BadRequestException(`Select up to ${MAX_IDS} orders at a time.`);
    return valid.map((id) => new Types.ObjectId(id));
  }
}
