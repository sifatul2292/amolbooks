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
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddSubCategoryDto,
  FilterAndPaginationSubCategoryDto,
  OptionSubCategoryDto,
  UpdateSubCategoryDto,
} from '../../../dto/sub-category.dto';
import { SubCategory } from '../../../interfaces/common/sub-category.interface';
import { Product } from '../../../interfaces/common/product.interface';
import { UpdateCategoryDto } from '../../../dto/category.dto';

const ObjectId = Types.ObjectId;

@Injectable()
export class SubCategoryService {
  private logger = new Logger(SubCategoryService.name);

  constructor(
    @InjectModel('SubCategory')
    private readonly subCategoryModel: Model<SubCategory>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addSubCategory
   * insertManySubCategory
   */
  async addSubCategory(
    addSubCategoryDto: AddSubCategoryDto,
  ): Promise<ResponsePayload> {
    const { name, slug } = addSubCategoryDto;

    try {
      let finalSlug;
      const fData = await this.subCategoryModel.findOne({ slug: slug });

      if (fData) {
        finalSlug = this.utilsService.transformToSlug(slug, true);
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };
      const mData = { ...addSubCategoryDto, ...defaultData };
      const newData = new this.subCategoryModel(mData);

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

  async insertManySubCategory(
    addSubCategorysDto: AddSubCategoryDto[],
    optionSubCategoryDto: OptionSubCategoryDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionSubCategoryDto;
    if (deleteMany) {
      await this.subCategoryModel.deleteMany({});
    }
    const mData = addSubCategorysDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.subCategoryModel.insertMany(mData);
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
   * getAllSubCategories
   * getSubCategoryById
   */
  async getAllSubCategories(
    filterSubCategoryDto: FilterAndPaginationSubCategoryDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterSubCategoryDto;
    const { pagination } = filterSubCategoryDto;
    const { sort } = filterSubCategoryDto;
    const { select } = filterSubCategoryDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      if (filter['category']) {
        filter['category'] = new ObjectId(filter['category']);
      }
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
              {
                $lookup: {
                  from: 'categories', // This name has always no space and plural string and lower case
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categoryInfo',
                },
              },
              {
                $unwind: '$categoryInfo',
              },
              {
                $project: {
                  ...mSelect,
                  ...{
                    categoryInfo: {
                      name: '$categoryInfo.name',
                      // slug: '$categoryInfo.slug',
                    },
                  },
                  // ...{ categoryInfo: { $arrayElemAt: ['$categoryInfo', 0] } },
                },
              },
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
      const dataAggregates = await this.subCategoryModel.aggregate(
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

  async getSubCategoryById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.subCategoryModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSubCategoriesByCategoryId(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.subCategoryModel
        .find({ category: id })
        .select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSubCategoriesGroupByCategory(): Promise<ResponsePayload> {
    // Essential Variables
    const aggregateStages = [];

    aggregateStages.push({
      $match: {
        readOnly: { $ne: true },
        status: 'publish',
      },
    });

    aggregateStages.push({
      $group: {
        _id: '$category',
        subCategories: {
          $push: '$$ROOT',
        },
      },
    });

    aggregateStages.push({
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    });

    try {
      const dataAggregates = await this.subCategoryModel.aggregate(
        aggregateStages,
      );
      const mDataAggregates = JSON.parse(JSON.stringify(dataAggregates));

      const filteredData: any[] = [];

      mDataAggregates.forEach((m) => {
        if (
          m.category[0]?.status === 'publish' &&
          m.category[0]?.readOnly !== true
        ) {
          const data = {
            _id: m._id,
            name: m.category[0].name,
            image: m.category[0].image,
            slug: m.category[0].slug,
            readOnly: m.category[0].readOnly,
            serial: m.category[0].serial,
            subCategories: m.subCategories,
            status: m.category[0].status,
          };
          filteredData.push(data);
        }
      });
      return {
        data: filteredData,
        success: true,
        message: 'Success',
        count: dataAggregates.length,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  /**
   * updateSubCategoryById
   * updateMultipleSubCategoryById
   */
  async updateSubCategoryById(
    id: string,
    updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<ResponsePayload> {
    try {
      const { name, slug } = updateSubCategoryDto;

      let finalSlug;
      const fData = await this.subCategoryModel.findById(id);

      // Check Slug
      if (fData.slug !== slug) {
        const fData = await this.subCategoryModel.findOne({ slug: slug });
        if (fData) {
          finalSlug = this.utilsService.transformToSlug(slug, true);
        } else {
          finalSlug = slug;
        }
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };

      const finalData = { ...updateSubCategoryDto, ...defaultData };

      await this.subCategoryModel.findByIdAndUpdate(id, {
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

  async updateMultipleSubCategoryById(
    ids: string[],
    updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateSubCategoryDto.slug) {
      delete updateSubCategoryDto.slug;
    }

    try {
      await this.subCategoryModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateSubCategoryDto },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async changeMultipleSubCategoryStatus(
    ids: string[],
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    const { status } = updateCategoryDto;

    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.subCategoryModel.updateMany(
        { _id: { $in: mIds } },
        { $set: { status: status } },
      );

      await this.productModel.updateMany(
        { 'category._id': { $in: mIds } },
        { $set: { status: status } },
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
   * deleteSubCategoryById
   * deleteMultipleSubCategoryById
   */
  async deleteSubCategoryById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.subCategoryModel.findById(id);
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
      await this.subCategoryModel.findByIdAndDelete(id);
      // Reset Product Sub Category Reference
      if (checkUsage) {
        const defaultSubCategory = await this.subCategoryModel.findOne({
          readOnly: true,
        });
        const resetCategory = {
          subCategory: {
            _id: defaultSubCategory._id,
            name: defaultSubCategory.name,
            slug: defaultSubCategory.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'subCategory._id': new ObjectId(id) },
          { $set: resetCategory },
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

  async deleteMultipleSubCategoryById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.subCategoryModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.subCategoryModel.deleteMany({ _id: filteredIds });

      // Reset Product Category Reference
      if (checkUsage) {
        const defaultSubCategory = await this.subCategoryModel.findOne({
          readOnly: true,
        });
        const resetCategory = {
          subCategory: {
            _id: defaultSubCategory._id,
            name: defaultSubCategory.name,
            slug: defaultSubCategory.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'subCategory._id': { $in: mIds } },
          { $set: resetCategory },
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
