import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import { User } from '../../../interfaces/user/user.interface';
import { Order } from '../../../interfaces/common/order.interface';
import { OrderOffer } from '../../../interfaces/common/order-offer.interface';
import { AddOrderOfferDto } from '../../../dto/order-offer.dto';

const ObjectId = Types.ObjectId;

@Injectable()
export class OrderOfferService {
  private logger = new Logger(OrderOfferService.name);

  constructor(
    @InjectModel('OrderOffer')
    private readonly orderOfferModel: Model<OrderOffer>,
    @InjectModel('Product') private readonly productModel: Model<any>,
    @InjectModel('Order')
    private readonly orderModel: Model<Order>,
    @InjectModel('User')
    private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  async saveBookGifts(body: any): Promise<ResponsePayload> {
    if (!body || !Array.isArray(body.offers) || body.offers.length > 50)
      throw new BadRequestException('Provide up to 50 book offers');
    const offers = body.offers.map((offer: any) => {
      if (!offer || typeof offer.bookSlug !== 'string' || !offer.bookSlug.trim() ||
          offer.bookSlug.length > 300 || !Number.isInteger(offer.quantity) ||
          offer.quantity < 1 || offer.quantity > 100 || typeof offer.enabled !== 'boolean')
        throw new BadRequestException('Invalid book offer');
      return { bookSlug: offer.bookSlug.trim(), quantity: offer.quantity, enabled: offer.enabled };
    });
    if (new Set(offers.map((o) => o.bookSlug)).size !== offers.length)
      throw new BadRequestException('Each book can have one offer');
    const config = await this.orderOfferModel.findOne();
    let giftProduct = (config as any)?.giftProduct;
    if (body.notebookSlug !== undefined) {
      if (typeof body.notebookSlug !== 'string' || !body.notebookSlug.trim() || body.notebookSlug.length > 300)
        throw new BadRequestException('Invalid notebook product');
      const notebook = await this.productModel.findOne({ slug: body.notebookSlug.trim() }).select('_id name slug images').lean();
      if (!notebook) throw new BadRequestException('Notebook product was not found');
      giftProduct = { _id: String(notebook._id), name: notebook.name, slug: notebook.slug, image: notebook.images?.[0] || '' };
    }
    if (!giftProduct?._id)
      throw new BadRequestException('Choose the notebook gift product first');
    const slugs = offers.map((o) => o.bookSlug);
    const books = await this.productModel.find({ slug: { $in: slugs } }).select('slug').lean();
    if (books.length !== slugs.length)
      throw new BadRequestException('One or more books were not found');
    if (offers.some((o) => o.bookSlug === giftProduct.slug))
      throw new BadRequestException('The notebook cannot qualify as its own gift');
    if (config) {
      await this.orderOfferModel.updateOne({ _id: config._id }, { $set: { giftBookOffers: offers, ...(body.notebookSlug !== undefined ? { giftProduct } : {}) } });
    } else {
      await this.orderOfferModel.create({ giftEnabled: true, giftProduct, giftBookOffers: offers });
    }
    return { success: true, message: 'Book gift offers saved', data: offers } as ResponsePayload;
  }

  /**
   * addOrderOffer
   * insertManyOrderOffer
   */
  async addOrderOffer(
    addOrderOfferDto: AddOrderOfferDto,
  ): Promise<ResponsePayload> {
    try {
      const orderOfferData = await this.orderOfferModel.findOne();
      if (orderOfferData) {
        await this.orderOfferModel.findByIdAndUpdate(orderOfferData._id, {
          $set: addOrderOfferDto,
        });
        const data = {
          _id: orderOfferData._id,
        };

        return {
          success: true,
          message: 'Data Updated Success',
          data,
        } as ResponsePayload;
      } else {
        const newData = new this.orderOfferModel(addOrderOfferDto);
        const saveData = await newData.save();
        const data = {
          _id: saveData._id,
        };

        return {
          success: true,
          message: 'Data Added Success',
          data,
        } as ResponsePayload;
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  /**
   * getOrderOffer
   * getOrderOfferById
   */

  async getOrderOffer(select: string): Promise<ResponsePayload> {
    try {
      const data = await this.orderOfferModel.findOne({}).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getOrderOfferWithUser(
    user: User,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const fOrderOfferData = await this.orderOfferModel
        .findOne({})
        .select(select);

      const orderOfferData = JSON.parse(JSON.stringify(fOrderOfferData));
      let finalData: any;

      if (orderOfferData) {
        const orderCount = await this.orderModel.countDocuments({
          user: new ObjectId(user._id),
        });
        const currentMonth = this.utilsService.getDateMonth(false, new Date());
        const currentYear = this.utilsService.getDateYear(new Date());

        const orderInMonth = await this.orderModel.find({
          user: new ObjectId(user._id),
          month: currentMonth,
          year: currentYear,
        });
        const jOrderInMonth = JSON.parse(JSON.stringify(orderInMonth));

        let hasMonthDiscount = false;

        for (const data of jOrderInMonth) {
          if (data.hasMonthDiscount) {
            hasMonthDiscount = true;
          }
        }

        const orderInMonthAmount = jOrderInMonth
          .map((m: any) => m.grandTotal)
          .reduce((acc: number, value: number) => acc + value, 0);

        if (orderCount === 0) {
          finalData = {
            ...orderOfferData,
            ...{
              hasFirstOrderDiscount: true,
            },
          };
        } else {
          finalData = {
            ...orderOfferData,
            ...{
              hasFirstOrderDiscount: false,
              orderInMonthAmount: hasMonthDiscount ? 0 : orderInMonthAmount,
            },
          };
        }
      } else {
        finalData = {
          ...orderOfferData,
          ...{
            hasFirstOrderDiscount: false,
            orderInMonthAmount: null,
          },
        };
      }

      return {
        success: true,
        message: 'Success',
        data: finalData,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }
}
