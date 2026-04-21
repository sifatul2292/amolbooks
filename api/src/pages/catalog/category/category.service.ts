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
import { Category } from '../../../interfaces/common/category.interface';
import {
  AddCategoryDto,
  FilterAndPaginationCategoryDto,
  OptionCategoryDto,
  UpdateCategoryDto,
} from '../../../dto/category.dto';
import { Product } from '../../../interfaces/common/product.interface';
import { SubCategory } from '../../../interfaces/common/sub-category.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class CategoryService {
  private logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel('Category') private readonly categoryModel: Model<Category>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('SubCategory')
    private readonly subCategoryModel: Model<SubCategory>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addCategory
   * insertManyCategory
   */
  async addCategory(addCategoryDto: AddCategoryDto): Promise<ResponsePayload> {
    const { name, slug } = addCategoryDto;

    try {
      let finalSlug;
      const fData = await this.categoryModel.findOne({ slug: slug });

      if (fData) {
        finalSlug = this.utilsService.transformToSlug(slug, true);
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };
      const mData = { ...addCategoryDto, ...defaultData };
      const newData = new this.categoryModel(mData);

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

  async insertManyCategory(
    addCategorysDto: AddCategoryDto[],
    optionCategoryDto: OptionCategoryDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionCategoryDto;
    if (deleteMany) {
      await this.categoryModel.deleteMany({});
    }
    const mData = addCategorysDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.categoryModel.insertMany(mData);
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
   * getAllCategories
   * getCategoryById
   */
  async getAllCategories(
    filterCategoryDto: FilterAndPaginationCategoryDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterCategoryDto;
    const { pagination } = filterCategoryDto;
    const { sort } = filterCategoryDto;
    const { select } = filterCategoryDto;

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
      const dataAggregates = await this.categoryModel.aggregate(
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

  async getCategoryById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.categoryModel.findById(id).select(select);
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
   * updateCategoryById
   * updateMultipleCategoryById
   */
  async updateCategoryById(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    try {
      const { name, slug } = updateCategoryDto;

      let finalSlug;
      const fData = await this.categoryModel.findById(id);

      // Check Slug
      if (fData.slug !== slug) {
        const fData = await this.categoryModel.findOne({ slug: slug });
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

      const finalData = { ...updateCategoryDto, ...defaultData };

      await this.categoryModel.findByIdAndUpdate(id, {
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

  async updateMultipleCategoryById(
    ids: string[],
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateCategoryDto.slug) {
      delete updateCategoryDto.slug;
    }

    try {
      await this.categoryModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateCategoryDto },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async changeMultipleCategoryStatus(
    ids: string[],
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    const { status } = updateCategoryDto;

    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.categoryModel.updateMany(
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
   * deleteCategoryById
   * deleteMultipleCategoryById
   */
  async deleteCategoryById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.categoryModel.findById(id);
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
      await this.categoryModel.findByIdAndDelete(id);
      // Reset Product Category Reference
      if (checkUsage) {
        const defaultCategory = await this.categoryModel.findOne({
          readOnly: true,
        });
        const defaultSubCategory = await this.subCategoryModel.findOne({
          category: new ObjectId(defaultCategory._id),
        });
        const resetCategory = {
          category: {
            _id: defaultCategory._id,
            name: defaultCategory.name,
            slug: defaultCategory.slug,
          },
          subCategory: {
            _id: defaultSubCategory._id,
            name: defaultSubCategory.name,
            slug: defaultSubCategory.slug,
          },
        };
        // Update Sub Category
        await this.subCategoryModel.updateMany(
          { category: new ObjectId(id) },
          { $set: { category: defaultCategory._id } },
        );
        // Update Product
        await this.productModel.updateMany(
          { 'category._id': new ObjectId(id) },
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

  async deleteMultipleCategoryById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.categoryModel.find({ _id: { $in: mIds } });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.categoryModel.deleteMany({ _id: filteredIds });
      // Reset Product Category Reference
      if (checkUsage) {
        const defaultCategory = await this.categoryModel.findOne({
          readOnly: true,
        });
        const defaultSubCategory = await this.subCategoryModel.findOne({
          category: new ObjectId(defaultCategory._id),
        });
        const resetCategory = {
          category: {
            _id: defaultCategory._id,
            name: defaultCategory.name,
            slug: defaultCategory.slug,
          },
          subCategory: {
            _id: defaultSubCategory._id,
            name: defaultSubCategory.name,
            slug: defaultSubCategory.slug,
          },
        };

        // Update Sub Category
        await this.subCategoryModel.updateMany(
          { category: { $in: mIds } },
          { $set: { category: defaultCategory._id } },
        );
        // Update Product
        await this.productModel.updateMany(
          { 'category._id': { $in: mIds } },
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
