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
import { UtilsService } from '../../../shared/utils/utils.service';
import { Activities } from '../../../interfaces/common/activities.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddActivitiesDto,
  CheckActivitiesDto,
  FilterAndPaginationActivitiesDto,
  OptionActivitiesDto,
  UpdateActivitiesDto,
} from '../../../dto/activities.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class ActivitiesService {
  private logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectModel('Activities') private readonly activitiesModel: Model<Activities>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addActivities
   * insertManyActivities
   */
  async addActivities(addActivitiesDto: AddActivitiesDto): Promise<ResponsePayload> {
    const { name } = addActivitiesDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addActivitiesDto, ...defaultData };
    const newData = new this.activitiesModel(mData);
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

  async insertManyActivities(
    addActivitiessDto: AddActivitiesDto[],
    optionActivitiesDto: OptionActivitiesDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionActivitiesDto;
    if (deleteMany) {
      await this.activitiesModel.deleteMany({});
    }
    const mData = addActivitiessDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.activitiesModel.insertMany(mData);
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
   * getAllActivitiess
   * getActivitiesById
   */
  async getAllActivitiessBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.activitiesModel
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

  async getAllActivitiess(
    filterActivitiesDto: FilterAndPaginationActivitiesDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterActivitiesDto;
    const { pagination } = filterActivitiesDto;
    const { sort } = filterActivitiesDto;
    const { select } = filterActivitiesDto;

    // Essential Variables
    const aggregateSactivitieses = [];
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
      aggregateSactivitieses.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSactivitieses.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSactivitieses.push({ $project: mSelect });
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

      aggregateSactivitieses.push(mPagination);

      aggregateSactivitieses.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.activitiesModel.aggregate(aggregateSactivitieses);
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

  async getActivitiesById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.activitiesModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single profile get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }


  async activitiesViewCount(id: string, user?: string): Promise<ResponsePayload> {
    try {
      await this.activitiesModel.findByIdAndUpdate(
        id,
        {
          $inc: { totalView: 1 },
        },
        {
          upsert: true,
          new: true,
        },
      );

      // if (user) {
      //   const fData = await this.activitiesModel.findOne({
      //     product: id,
      //     user: user,
      //   });
      //   if (!fData) {
      //     const fProduct = await this.activitiesModel.findById(id);
      //     const jProduct = JSON.parse(JSON.stringify(fProduct));
      //     const sData = new this.productViewModel({
      //       ...jProduct,
      //       ...{
      //         user: user,
      //         product: id,
      //         totalView: 1,
      //         _id: null,
      //       },
      //     });
      //     await sData.save();
      //   } else {
      //     await this.productViewModel.findByIdAndUpdate(fData._id, {
      //       $inc: { totalView: 1 },
      //     });
      //   }
      // }

      return {
        success: true,
        message: 'Success',
        data: null,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateActivitiesById
   * updateMultipleActivitiesById
   */
  async updateActivitiesById(
    id: string,
    updateActivitiesDto: UpdateActivitiesDto,
  ): Promise<ResponsePayload> {
    const { name } = updateActivitiesDto;
    let data;
    try {
      data = await this.activitiesModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateActivitiesDto };

      await this.activitiesModel.findByIdAndUpdate(id, {
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

  async updateMultipleActivitiesById(
    ids: string[],
    updateActivitiesDto: UpdateActivitiesDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.activitiesModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateActivitiesDto },
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
   * deleteActivitiesById
   * deleteMultipleActivitiesById
   */
  async deleteActivitiesById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.activitiesModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.activitiesModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleActivitiesById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.activitiesModel.deleteMany({ _id: ids });
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
  async checkActivitiesAvailability(
    user: User,
    checkActivitiesDto: CheckActivitiesDto,
  ): Promise<ResponsePayload> {
    try {
      const { activitiesCode, subTotal } = checkActivitiesDto;

      const activitiesData = await this.activitiesModel.findOne({ activitiesCode });

      if (activitiesData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(activitiesData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(activitiesData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Activities offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Activities Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userActivitiesExists = await this.userModel.findOne({
            _id: user._id,
            usedActivitiess: activitiesData._id,
          });

          if (userActivitiesExists) {
            return {
              success: false,
              message: 'Sorry! Activities already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (activitiesData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Activities minimum amount is ${activitiesData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Activities added.',
                data: {
                  _id: activitiesData._id,
                  discountAmount: activitiesData['discountAmount'],
                  discountType: activitiesData['discountType'],
                  activitiesCode: activitiesData['activitiesCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid profile code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
