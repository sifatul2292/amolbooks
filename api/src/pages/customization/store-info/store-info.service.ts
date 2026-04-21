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
import { StoreInfo } from '../../../interfaces/common/store-info.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddStoreInfoDto,
  FilterAndPaginationStoreInfoDto,
  OptionStoreInfoDto,
  UpdateStoreInfoDto,
} from '../../../dto/store-info.dto';
import { Product } from '../../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class StoreInfoService {
  private logger = new Logger(StoreInfoService.name);

  constructor(
    @InjectModel('StoreInfo') private readonly storeInfoModel: Model<StoreInfo>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addStoreInfo
   * insertManyStoreInfo
   */
  async addStoreInfo(
    addStoreInfoDto: AddStoreInfoDto,
  ): Promise<ResponsePayload> {
    const mData = { ...addStoreInfoDto };
    const newData = new this.storeInfoModel(mData);
    try {
      const saveData = await newData.save();
      const data = {
        _id: saveData._id,
      };
      return {
        success: true,
        message: 'Data Added Success',
        data,
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

  async insertManyStoreInfo(
    addStoreInfosDto: AddStoreInfoDto[],
    optionStoreInfoDto: OptionStoreInfoDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionStoreInfoDto;
    if (deleteMany) {
      await this.storeInfoModel.deleteMany({});
    }
    const mData = addStoreInfosDto.map((m) => {
      return {
        ...m,
      };
    });
    try {
      const saveData = await this.storeInfoModel.insertMany(mData);
      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
      } as ResponsePayload;
    } catch (error) {
      // console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException();
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  /**
   * getAllStoreInfos
   * getStoreInfoById
   */
  async getAllStoreInfosBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;
      const data = await this.storeInfoModel
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

  async getAllStoreInfos(
    filterStoreInfoDto: FilterAndPaginationStoreInfoDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterStoreInfoDto;
    const { pagination } = filterStoreInfoDto;
    const { sort } = filterStoreInfoDto;
    const { select } = filterStoreInfoDto;

    // Essential Variables
    const aggregateSstoreInfoes = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }
    if (searchQuery) {
      mFilter = { ...mFilter, ...{ title: new RegExp(searchQuery, 'i') } };
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
      mSelect = { title: 1 };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateSstoreInfoes.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSstoreInfoes.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSstoreInfoes.push({ $project: mSelect });
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

      aggregateSstoreInfoes.push(mPagination);

      aggregateSstoreInfoes.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.storeInfoModel.aggregate(
        aggregateSstoreInfoes,
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

  async getStoreInfoById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.storeInfoModel.findById(id).select(select);
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
   * updateStoreInfoById
   * updateMultipleStoreInfoById
   */
  async updateStoreInfoById(
    id: string,
    updateStoreInfoDto: UpdateStoreInfoDto,
  ): Promise<ResponsePayload> {
    const { title } = updateStoreInfoDto;
    let data;
    try {
      data = await this.storeInfoModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateStoreInfoDto };

      await this.storeInfoModel.findByIdAndUpdate(id, {
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

  async updateMultipleStoreInfoById(
    ids: string[],
    updateStoreInfoDto: UpdateStoreInfoDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data

    try {
      await this.storeInfoModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateStoreInfoDto },
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
   * deleteStoreInfoById
   * deleteMultipleStoreInfoById
   */
  async deleteStoreInfoById(id: string): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.storeInfoModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.storeInfoModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleStoreInfoById(ids: string[]): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.storeInfoModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
