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
import { ReaderClass } from '../../interfaces/common/reader-class.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddReaderClassDto,
  FilterAndPaginationReaderClassDto,
  OptionReaderClassDto,
  UpdateReaderClassDto,
} from '../../dto/reader-class.dto';
import { Product } from '../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class ReaderClassService {
  private logger = new Logger(ReaderClassService.name);

  constructor(
    @InjectModel('ReaderClass') private readonly readerClassModel: Model<ReaderClass>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addReaderClass
   * insertManyReaderClass
   */
  async addReaderClass(addReaderClassDto: AddReaderClassDto): Promise<ResponsePayload> {
    const { name } = addReaderClassDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addReaderClassDto, ...defaultData };
    const newData = new this.readerClassModel(mData);
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

  async insertManyReaderClass(
    addReaderClasssDto: AddReaderClassDto[],
    optionReaderClassDto: OptionReaderClassDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionReaderClassDto;
    if (deleteMany) {
      await this.readerClassModel.deleteMany({});
    }
    const mData = addReaderClasssDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.readerClassModel.insertMany(mData);
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
   * getAllReaderClasss
   * getReaderClassById
   */
  async getAllReaderClasss(
    filterReaderClassDto: FilterAndPaginationReaderClassDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterReaderClassDto;
    const { pagination } = filterReaderClassDto;
    const { sort } = filterReaderClassDto;
    const { select } = filterReaderClassDto;

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
      const dataAggregates = await this.readerClassModel.aggregate(aggregateStages);
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

  async getReaderClassById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.readerClassModel.findById(id).select(select);
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
   * updateReaderClassById
   * updateMultipleReaderClassById
   */
  async updateReaderClassById(
    id: string,
    updateReaderClassDto: UpdateReaderClassDto,
  ): Promise<ResponsePayload> {
    const { name } = updateReaderClassDto;
    let data;
    try {
      data = await this.readerClassModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateReaderClassDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.readerClassModel.findByIdAndUpdate(id, {
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

  async updateMultipleReaderClassById(
    ids: string[],
    updateReaderClassDto: UpdateReaderClassDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateReaderClassDto.slug) {
      delete updateReaderClassDto.slug;
    }

    try {
      await this.readerClassModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateReaderClassDto },
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
   * deleteReaderClassById
   * deleteMultipleReaderClassById
   */
  async deleteReaderClassById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.readerClassModel.findById(id);
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
      await this.readerClassModel.findByIdAndDelete(id);
      // Reset Product ReaderClass Reference
      if (checkUsage) {
        const defaultReaderClass = await this.readerClassModel.findOne({
          readOnly: true,
        });
        const resetReaderClass = {
          readerClass: {
            _id: defaultReaderClass._id,
            name: defaultReaderClass.name,
            slug: defaultReaderClass.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'readerClass._id': new ObjectId(id) },
          { $set: resetReaderClass },
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

  async deleteMultipleReaderClassById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.readerClassModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.readerClassModel.deleteMany({ _id: filteredIds });
      // Reset Product ReaderClass Reference
      if (checkUsage) {
        const defaultReaderClass = await this.readerClassModel.findOne({
          readOnly: true,
        });
        const resetReaderClass = {
          readerClass: {
            _id: defaultReaderClass._id,
            name: defaultReaderClass.name,
            slug: defaultReaderClass.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'readerClass._id': { $in: mIds } },
          { $set: resetReaderClass },
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
