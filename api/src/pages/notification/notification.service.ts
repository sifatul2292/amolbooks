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
import { Notification } from '../../interfaces/common/notification.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddNotificationDto,
  FilterAndPaginationNotificationDto,
  OptionNotificationDto,
  UpdateNotificationDto,
} from '../../dto/notification.dto';
import { Product } from '../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class NotificationService {
  private logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addNotification
   * insertManyNotification
   */
  async addNotification(
    addNotificationDto: AddNotificationDto,
  ): Promise<ResponsePayload> {
    const defaultData = {
      // slug: this.utilsService.transformToSlug(name),
      isReadNoti: false,
    };
    const mData = { ...addNotificationDto, ...defaultData };
    const newData = new this.notificationModel(mData);
    try {
      const saveData = await newData.save();
      const data = {
        _id: saveData._id,
      };
      return {
        success: true,
        message: 'Address added successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async insertManyNotification(
    addNotificationsDto: AddNotificationDto[],
    optionNotificationDto: OptionNotificationDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionNotificationDto;
    if (deleteMany) {
      await this.notificationModel.deleteMany({});
    }
    const mData = addNotificationsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.notificationModel.insertMany(mData);
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
   * getAllNotifications
   * getNotificationById
   */
  async getAllNotifications(
    filterNotificationDto: FilterAndPaginationNotificationDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterNotificationDto;
    const { pagination } = filterNotificationDto;
    const { sort } = filterNotificationDto;
    const { select } = filterNotificationDto;

    // Essential Variables
    const aggregateStages = [];
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
      mSelect = { name: 1 };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateStages.push({ $project: mSelect });
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

      aggregateStages.push(mPagination);

      aggregateStages.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.notificationModel.aggregate(
        aggregateStages,
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
        throw new InternalServerErrorException();
      }
    }
  }

  async getNotificationById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.notificationModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateNotificationById
   * updateMultipleNotificationById
   */
  async updateNotificationById(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<ResponsePayload> {
    const { name } = updateNotificationDto;
    let data;
    try {
      data = await this.notificationModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateNotificationDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.notificationModel.findByIdAndUpdate(id, {
        $set: finalData,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleNotificationById(
    ids: string[],
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateNotificationDto.slug) {
      delete updateNotificationDto.slug;
    }

    try {
      await this.notificationModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateNotificationDto },
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
   * deleteNotificationById
   * deleteMultipleNotificationById
   */
  async deleteNotificationById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.notificationModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    if (data.readOnly) {
      throw new NotFoundException('Sorry! Read only data can not be deleted');
    }
    try {
      await this.notificationModel.findByIdAndDelete(id);
      // Reset Product Notification Reference
      if (checkUsage) {
        const defaultNotification = await this.notificationModel.findOne({
          readOnly: true,
        });
        const resetNotification = {
          notification: {
            _id: defaultNotification._id,
            name: defaultNotification.name,
            slug: defaultNotification.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'notification._id': new ObjectId(id) },
          { $set: resetNotification },
        );
      }
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleNotificationById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.notificationModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.notificationModel.deleteMany({ _id: filteredIds });
      // Reset Product Notification Reference
      if (checkUsage) {
        const defaultNotification = await this.notificationModel.findOne({
          readOnly: true,
        });
        const resetNotification = {
          notification: {
            _id: defaultNotification._id,
            name: defaultNotification.name,
            slug: defaultNotification.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'notification._id': { $in: mIds } },
          { $set: resetNotification },
        );
      }
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
