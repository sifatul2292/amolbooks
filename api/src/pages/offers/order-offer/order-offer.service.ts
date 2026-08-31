import {
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
    @InjectModel('Order')
    private readonly orderModel: Model<Order>,
    @InjectModel('User')
    private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

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
