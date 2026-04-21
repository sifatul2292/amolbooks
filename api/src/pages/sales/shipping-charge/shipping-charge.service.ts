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
import { ShippingCharge } from '../../../interfaces/common/shipping-charge.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import { AddShippingChargeDto } from '../../../dto/shipping-charge.dto';

const ObjectId = Types.ObjectId;

@Injectable()
export class ShippingChargeService {
  private logger = new Logger(ShippingChargeService.name);

  constructor(
    @InjectModel('ShippingCharge')
    private readonly shippingChargeModel: Model<ShippingCharge>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addShippingCharge
   * insertManyShippingCharge
   */
  async addShippingCharge(
    addShippingChargeDto: AddShippingChargeDto,
  ): Promise<ResponsePayload> {
    try {
      const shippingChargeData = await this.shippingChargeModel.findOne();
      if (shippingChargeData) {
        await this.shippingChargeModel.findByIdAndUpdate(
          shippingChargeData._id,
          {
            $set: addShippingChargeDto,
          },
        );
        const data = {
          _id: shippingChargeData._id,
        };

        return {
          success: true,
          message: 'Data Updated Success',
          data,
        } as ResponsePayload;
      } else {
        const newData = new this.shippingChargeModel(addShippingChargeDto);
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
   * getShippingCharge
   * getShippingChargeById
   */

  async getShippingCharge(select: string): Promise<ResponsePayload> {
    try {
      const data = await this.shippingChargeModel.findOne({}).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
