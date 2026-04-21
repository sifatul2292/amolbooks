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
import { Popup } from '../../../interfaces/common/popup.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddPopupDto,
  FilterAndPaginationPopupDto,
  OptionPopupDto,
  UpdatePopupDto,
} from '../../../dto/popup.dto';
import { Product } from '../../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class PopupService {
  private logger = new Logger(PopupService.name);

  constructor(
    @InjectModel('Popup') private readonly popupModel: Model<Popup>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addPopup
   * insertManyPopup
   */
  async addPopup(addPopupDto: AddPopupDto): Promise<ResponsePayload> {
    const { name } = addPopupDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addPopupDto, ...defaultData };
    const newData = new this.popupModel(mData);
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

  async insertManyPopup(
    addPopupsDto: AddPopupDto[],
    optionPopupDto: OptionPopupDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionPopupDto;
    if (deleteMany) {
      await this.popupModel.deleteMany({});
    }
    const mData = addPopupsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.popupModel.insertMany(mData);
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
   * getAllPopups
   * getPopupById
   */
  async getAllPopups(
    filterPopupDto: FilterAndPaginationPopupDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterPopupDto;
    const { pagination } = filterPopupDto;
    const { sort } = filterPopupDto;
    const { select } = filterPopupDto;

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
      const dataAggregates = await this.popupModel.aggregate(aggregateStages);
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

  async getPopupById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.popupModel.findById(id).select(select);
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
   * updatePopupById
   * updateMultiplePopupById
   */
  async updatePopupById(
    id: string,
    updatePopupDto: UpdatePopupDto,
  ): Promise<ResponsePayload> {
    const { name } = updatePopupDto;
    let data;
    try {
      data = await this.popupModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updatePopupDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.popupModel.findByIdAndUpdate(id, {
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

  async updateMultiplePopupById(
    ids: string[],
    updatePopupDto: UpdatePopupDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updatePopupDto.slug) {
      delete updatePopupDto.slug;
    }

    try {
      await this.popupModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updatePopupDto },
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
   * deletePopupById
   * deleteMultiplePopupById
   */
  async deletePopupById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.popupModel.findById(id);
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
      await this.popupModel.findByIdAndDelete(id);
      // Reset Product Popup Reference
      if (checkUsage) {
        const defaultPopup = await this.popupModel.findOne({
          readOnly: true,
        });
        const resetPopup = {
          popup: {
            _id: defaultPopup._id,
            name: defaultPopup.name,
            slug: defaultPopup.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'popup._id': new ObjectId(id) },
          { $set: resetPopup },
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

  async deleteMultiplePopupById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.popupModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.popupModel.deleteMany({ _id: filteredIds });
      // Reset Product Popup Reference
      if (checkUsage) {
        const defaultPopup = await this.popupModel.findOne({
          readOnly: true,
        });
        const resetPopup = {
          popup: {
            _id: defaultPopup._id,
            name: defaultPopup.name,
            slug: defaultPopup.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'popup._id': { $in: mIds } },
          { $set: resetPopup },
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
