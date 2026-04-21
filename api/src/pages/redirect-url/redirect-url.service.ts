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
import { UtilsService } from '../../shared/utils/utils.service';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import {
  AddRedirectUrlDto,
  CheckRedirectUrlDto,
  FilterAndPaginationRedirectUrlDto,
  OptionRedirectUrlDto,
  UpdateRedirectUrlDto,
} from '../../dto/redirect-url.dto';
import { RedirectUrl } from 'src/interfaces/common/redirect-url.interface';
import { ErrorCodes } from '../../enum/error-code.enum';

const ObjectId = Types.ObjectId;

@Injectable()
export class RedirectUrlService {
  private logger = new Logger(RedirectUrlService.name);

  constructor(
    @InjectModel('RedirectUrl')
    private readonly redirectUrlModel: Model<RedirectUrl>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addRedirectUrl
   * insertManyRedirectUrl
   */
  async addRedirectUrl(
    addRedirectUrlDto: AddRedirectUrlDto,
  ): Promise<ResponsePayload> {
    const { name } = addRedirectUrlDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addRedirectUrlDto, ...defaultData };
    const newData = new this.redirectUrlModel(mData);
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

  async insertManyRedirectUrl(
    addRedirectUrlsDto: AddRedirectUrlDto[],
    optionRedirectUrlDto: OptionRedirectUrlDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionRedirectUrlDto;
    if (deleteMany) {
      await this.redirectUrlModel.deleteMany({});
    }
    const mData = addRedirectUrlsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.redirectUrlModel.insertMany(mData);
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
   * getAllRedirectUrls
   * getRedirectUrlById
   */
  async getAllRedirectUrlsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.redirectUrlModel
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

  async getAllRedirectUrls(
    filterRedirectUrlDto: FilterAndPaginationRedirectUrlDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterRedirectUrlDto;
    const { pagination } = filterRedirectUrlDto;
    const { sort } = filterRedirectUrlDto;
    const { select } = filterRedirectUrlDto;

    // Essential Variables
    const aggregateSredirectUrles = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

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
      aggregateSredirectUrles.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSredirectUrles.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSredirectUrles.push({ $project: mSelect });
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

      aggregateSredirectUrles.push(mPagination);

      aggregateSredirectUrles.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.redirectUrlModel.aggregate(
        aggregateSredirectUrles,
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

  async getRedirectUrlById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.redirectUrlModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single redirectUrl get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateRedirectUrlById
   * updateMultipleRedirectUrlById
   */
  async updateRedirectUrlById(
    id: string,
    updateRedirectUrlDto: UpdateRedirectUrlDto,
  ): Promise<ResponsePayload> {
    const { name } = updateRedirectUrlDto;
    let data;
    try {
      data = await this.redirectUrlModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateRedirectUrlDto };

      await this.redirectUrlModel.findByIdAndUpdate(id, {
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

  async updateMultipleRedirectUrlById(
    ids: string[],
    updateRedirectUrlDto: UpdateRedirectUrlDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.redirectUrlModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateRedirectUrlDto },
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
   * deleteRedirectUrlById
   * deleteMultipleRedirectUrlById
   */
  async deleteRedirectUrlById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.redirectUrlModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.redirectUrlModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleRedirectUrlById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.redirectUrlModel.deleteMany({ _id: ids });
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
  async checkRedirectUrlAvailability(
    user: User,
    checkRedirectUrlDto: CheckRedirectUrlDto,
  ): Promise<ResponsePayload> {
    try {
      const { redirectUrlCode, subTotal } = checkRedirectUrlDto;

      const redirectUrlData = await this.redirectUrlModel.findOne({
        redirectUrlCode,
      });

      if (redirectUrlData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(redirectUrlData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(redirectUrlData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! RedirectUrl offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! RedirectUrl Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userRedirectUrlExists = await this.userModel.findOne({
            _id: user._id,
            usedRedirectUrls: redirectUrlData._id,
          });

          if (userRedirectUrlExists) {
            return {
              success: false,
              message: 'Sorry! RedirectUrl already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (redirectUrlData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! RedirectUrl minimum amount is ${redirectUrlData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! RedirectUrl added.',
                data: {
                  _id: redirectUrlData._id,
                  discountAmount: redirectUrlData['discountAmount'],
                  discountType: redirectUrlData['discountType'],
                  redirectUrlCode: redirectUrlData['redirectUrlCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid redirectUrl code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
