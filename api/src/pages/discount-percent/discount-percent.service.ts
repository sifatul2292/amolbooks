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
import { DiscountPercent } from '../../interfaces/common/discount-percent.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddDiscountPercentDto,
  FilterAndPaginationDiscountPercentDto,
  OptionDiscountPercentDto,
  UpdateDiscountPercentDto,
} from '../../dto/discount-percent.dto';
import { Product } from '../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class DiscountPercentService {
  private logger = new Logger(DiscountPercentService.name);

  constructor(
    @InjectModel('DiscountPercent') private readonly discountPercentModel: Model<DiscountPercent>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addDiscountPercent
   * insertManyDiscountPercent
   */
  async addDiscountPercent(addDiscountPercentDto: AddDiscountPercentDto): Promise<ResponsePayload> {
    const { discountType } = addDiscountPercentDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(discountType),
    };
    const mData = { ...addDiscountPercentDto, ...defaultData };
    const newData = new this.discountPercentModel(mData);
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

  async insertManyDiscountPercent(
    addDiscountPercentsDto: AddDiscountPercentDto[],
    optionDiscountPercentDto: OptionDiscountPercentDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionDiscountPercentDto;
    if (deleteMany) {
      await this.discountPercentModel.deleteMany({});
    }
    const mData = addDiscountPercentsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.discountType),
        },
      };
    });
    try {
      const saveData = await this.discountPercentModel.insertMany(mData);
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
   * getAllDiscountPercents
   * getDiscountPercentById
   */
  async getAllDiscountPercents(
    filterDiscountPercentDto: FilterAndPaginationDiscountPercentDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterDiscountPercentDto;
    const { pagination } = filterDiscountPercentDto;
    const { sort } = filterDiscountPercentDto;
    const { select } = filterDiscountPercentDto;

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
      mFilter = { ...mFilter, ...{ discountType: new RegExp(searchQuery, 'i') } };
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
      mSelect = { discountType: 1 };
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
      const dataAggregates = await this.discountPercentModel.aggregate(aggregateStages);
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

  async getDiscountPercentById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.discountPercentModel.findById(id).select(select);
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
   * updateDiscountPercentById
   * updateMultipleDiscountPercentById
   */
  async updateDiscountPercentById(
    id: string,
    updateDiscountPercentDto: UpdateDiscountPercentDto,
  ): Promise<ResponsePayload> {
    const { discountType } = updateDiscountPercentDto;
    let data;
    try {
      data = await this.discountPercentModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateDiscountPercentDto };
      // Check Slug
      if (discountType)
        if (discountType && data.discountType !== discountType) {
          finalData.slug = this.utilsService.transformToSlug(discountType, true);
        }

      await this.discountPercentModel.findByIdAndUpdate(id, {
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

  async updateMultipleDiscountPercentById(
    ids: string[],
    updateDiscountPercentDto: UpdateDiscountPercentDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateDiscountPercentDto.slug) {
      delete updateDiscountPercentDto.slug;
    }

    try {
      await this.discountPercentModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateDiscountPercentDto },
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
   * deleteDiscountPercentById
   * deleteMultipleDiscountPercentById
   */
  async deleteDiscountPercentById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.discountPercentModel.findById(id);
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
      await this.discountPercentModel.findByIdAndDelete(id);
      // Reset Product DiscountPercent Reference
      if (checkUsage) {
        const defaultDiscountPercent = await this.discountPercentModel.findOne({
          readOnly: true,
        });
        const resetDiscountPercent = {
          discountPercent: {
            _id: defaultDiscountPercent._id,
            discountType: defaultDiscountPercent.discountType,
            // slug: defaultDiscountPercent.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'discountPercent._id': new ObjectId(id) },
          { $set: resetDiscountPercent },
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

  async deleteMultipleDiscountPercentById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.discountPercentModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.discountPercentModel.deleteMany({ _id: filteredIds });
      // Reset Product DiscountPercent Reference
      if (checkUsage) {
        const defaultDiscountPercent = await this.discountPercentModel.findOne({
          readOnly: true,
        });
        const resetDiscountPercent = {
          discountPercent: {
            _id: defaultDiscountPercent._id,
            discountType: defaultDiscountPercent.discountType,
            // slug: defaultDiscountPercent.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'discountPercent._id': { $in: mIds } },
          { $set: resetDiscountPercent },
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
