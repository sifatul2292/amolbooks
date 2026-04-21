import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Praptisthana } from '../../interfaces/common/praptisthana.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddPraptisthanaDto,
  CheckPraptisthanaDto,
  FilterAndPaginationPraptisthanaDto,
  OptionPraptisthanaDto,
  UpdatePraptisthanaDto,
} from '../../dto/praptisthana.dto';
import { UtilsService } from '../../shared/utils/utils.service';

const ObjectId = Types.ObjectId;

@Injectable()
export class PraptisthanaService {
  private logger = new Logger(PraptisthanaService.name);

  constructor(
    @InjectModel('Praptisthana')
    private readonly praptisthanaModel: Model<Praptisthana>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addPraptisthana
   * insertManyPraptisthana
   */
  async addPraptisthana(
    addPraptisthanaDto: AddPraptisthanaDto,
  ): Promise<ResponsePayload> {
    const { name } = addPraptisthanaDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addPraptisthanaDto, ...defaultData };
    const newData = new this.praptisthanaModel(mData);
    try {
      const saveData = await newData.save();
      const data = {
        _id: saveData._id,
      };
      return {
        success: true,
        message: 'Data Added Successfully',
        data,
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  async insertManyPraptisthana(
    addPraptisthanasDto: AddPraptisthanaDto[],
    optionPraptisthanaDto: OptionPraptisthanaDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionPraptisthanaDto;
    if (deleteMany) {
      await this.praptisthanaModel.deleteMany({});
    }
    const mData = addPraptisthanasDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.praptisthanaModel.insertMany(mData);
      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
      } as ResponsePayload;
    } catch (error) {
      // console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  /**
   * getAllPraptisthanas
   * getPraptisthanaById
   */
  async getAllPraptisthanasBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.praptisthanaModel
        .find()
        .skip(pageSize * (currentPage - 1))
        .limit(Number(pageSize));
      return {
        success: true,
        message: 'Success',

        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getAllPraptisthanas(
    filterPraptisthanaDto: FilterAndPaginationPraptisthanaDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterPraptisthanaDto;
    const { pagination } = filterPraptisthanaDto;
    const { sort } = filterPraptisthanaDto;
    const { select } = filterPraptisthanaDto;

    // Essential Variables
    const aggregateSpraptisthanaes = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};
    if (filter) {
      if (filter['division._id']) {
        filter['division._id'] = new ObjectId(filter['division._id']);
      }

      if (filter['area._id']) {
        filter['area._id'] = new ObjectId(filter['area._id']);
      }

      if (filter['zone._id']) {
        filter['zone._id'] = new ObjectId(filter['zone._id']);
      }
      mFilter = { ...mFilter, ...filter };
    }

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }
    if (searchQuery) {
      mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
    }
    // Sort
    if (sort) {
      mSort = sort;
    } else {
      mSort = { createdAt: -1 };
    }

    // Select
    if (select) {
      mSelect = { ...select };
    } else {
      mSelect = {
        name: 1,
      };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateSpraptisthanaes.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSpraptisthanaes.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSpraptisthanaes.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      if (Object.keys(mSelect).length) {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: mSelect },
            ],
          },
        };
      } else {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
            ],
          },
        };
      }

      aggregateSpraptisthanaes.push(mPagination);

      aggregateSpraptisthanaes.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.praptisthanaModel.aggregate(
        aggregateSpraptisthanaes,
      );
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{ success: true, message: 'Success' },
        } as ResponsePayload;
      } else {
        return {
          data: dataAggregates,
          success: true,
          message: 'Success',
          count: dataAggregates.length,
        } as ResponsePayload;
      }
    } catch (err) {
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException(err.message);
      }
    }
  }

  async getPraptisthanaById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.praptisthanaModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single contact get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updatePraptisthanaById
   * updateMultiplePraptisthanaById
   */
  async updatePraptisthanaById(
    id: string,
    updatePraptisthanaDto: UpdatePraptisthanaDto,
  ): Promise<ResponsePayload> {
    const { name } = updatePraptisthanaDto;
    let data;
    try {
      data = await this.praptisthanaModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updatePraptisthanaDto };

      await this.praptisthanaModel.findByIdAndUpdate(id, {
        $set: finalData,
      });
      return {
        success: true,
        message: 'Update Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultiplePraptisthanaById(
    ids: string[],
    updatePraptisthanaDto: UpdatePraptisthanaDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.praptisthanaModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updatePraptisthanaDto },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * deletePraptisthanaById
   * deleteMultiplePraptisthanaById
   */
  async deletePraptisthanaById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.praptisthanaModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.praptisthanaModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultiplePraptisthanaById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.praptisthanaModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * COUPON FUNCTIONS
   * generateOtpWithPhoneNo()
   * validateOtpWithPhoneNo()
   */
  async checkPraptisthanaAvailability(
    user: User,
    checkPraptisthanaDto: CheckPraptisthanaDto,
  ): Promise<ResponsePayload> {
    try {
      const { praptisthanaCode, subTotal } = checkPraptisthanaDto;

      const praptisthanaData = await this.praptisthanaModel.findOne({
        praptisthanaCode,
      });

      if (praptisthanaData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(praptisthanaData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(praptisthanaData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Praptisthana offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Praptisthana Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userPraptisthanaExists = await this.userModel.findOne({
            _id: user._id,
            usedPraptisthanas: praptisthanaData._id,
          });

          if (userPraptisthanaExists) {
            return {
              success: false,
              message: 'Sorry! Praptisthana already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (praptisthanaData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Praptisthana minimum amount is ${praptisthanaData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Praptisthana added.',
                data: {
                  _id: praptisthanaData._id,
                  discountAmount: praptisthanaData['discountAmount'],
                  discountType: praptisthanaData['discountType'],
                  praptisthanaCode: praptisthanaData['praptisthanaCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid contact code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
