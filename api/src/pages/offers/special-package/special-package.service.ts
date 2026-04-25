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
import { Product } from '../../../interfaces/common/product.interface';
import { SpecialPackage } from '../../../interfaces/common/special-package.interface';
import {
  AddSpecialPackageDto,
  FilterAndPaginationSpecialPackageDto,
  OptionSpecialPackageDto,
  UpdateSpecialPackageDto,
} from '../../../dto/special-package.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';

const ObjectId = Types.ObjectId;

@Injectable()
export class SpecialPackageService {
  private logger = new Logger(SpecialPackageService.name);

  constructor(
    @InjectModel('SpecialPackage')
    private readonly specialPackageModel: Model<SpecialPackage>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private jobSchedulerService: JobSchedulerService,
  ) {}

  /**
   * addSpecialPackage
   * insertManySpecialPackage
   */
  async addSpecialPackage(
    addSpecialPackageDto: AddSpecialPackageDto,
  ): Promise<ResponsePayload> {
    try {
      const { name } = addSpecialPackageDto;
      const { products } = addSpecialPackageDto;

      // Check Single Document
      const checkData = await this.specialPackageModel.findOne({ name: name });
      if (checkData) {
        return {
          success: false,
          message: 'Data Cannot be Added. Its a Single Document Collection',
          data: null,
        } as ResponsePayload;
      }

      // const defaultData = {
      //   slug: this.utilsService.transformToSlug(name),
      // };
      const mData = { ...addSpecialPackageDto };
      const newData = new this.specialPackageModel(mData);

      const saveData = await newData.save();
      /**
       * SCHEDULE DATE
       */

      return {
        success: true,
        message: 'Data Added Success',
        // data,
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

  async insertManySpecialPackage(
    addSpecialPackagesDto: AddSpecialPackageDto[],
    optionSpecialPackageDto: OptionSpecialPackageDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionSpecialPackageDto;
    if (deleteMany) {
      await this.specialPackageModel.deleteMany({});
    }
    const mData = addSpecialPackagesDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.specialPackageModel.insertMany(mData);
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
   * getAllSpecialPackages
   * getSpecialPackageById
   */
  async getAllSpecialPackages(
    filterSpecialPackageDto: FilterAndPaginationSpecialPackageDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterSpecialPackageDto;
    const { pagination } = filterSpecialPackageDto;
    const { sort } = filterSpecialPackageDto;
    const { select } = filterSpecialPackageDto;

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
      const dataAggregates = await this.specialPackageModel.aggregate(
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
  async getSpecialPackageByIds(
    ids: any,
    select: string,
  ): Promise<ResponsePayload> {
    if (!ids?.ids || ids.ids.length === 0) {
      return { success: true, message: 'Success', data: [] } as ResponsePayload;
    }
    try {
      const mIds = ids.ids.map((m) => new ObjectId(m));
      // const data = await this.productModel.find({ _id: { $in: mIds } });
      const data: any[] = await this.specialPackageModel
        .find({ _id: { $in: mIds } })
        .populate(
          'products.product',
          'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // Transform the products for each special package
      const transformedData = data.map((specialPackage) => {
        const transformedProducts = specialPackage.products.map((item) => {
          const transformedProduct = {
            ...item?.product?._doc,
            ...{
              quantity: item?.quantity,
              hasVariations: item?.hasVariations,
              selectedVariation: item?.selectedVariation,
            },
          };

          if (transformedProduct?.hasVariations) {
            let found = null;
            transformedProduct.variationsOptions.forEach((variationOption) => {
              if (
                String(variationOption?._id) ===
                String(transformedProduct?.selectedVariation)
              ) {
                found = variationOption;
              }
            });

            return found
              ? {
                  ...transformedProduct,
                  hasVariations: true,
                  selectedVariation: found,
                }
              : {
                  ...transformedProduct,
                  hasVariations: false,
                  selectedVariation: null,
                };
          } else {
            return transformedProduct;
          }
        });

        return {
          ...specialPackage?._doc,
          products: transformedProducts,
        };
      });

      // Return response
      return {
        success: true,
        message: 'Success',
        data: transformedData,
      } as ResponsePayload;
    } catch (err) {
      console.log('err', err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      let data: any = await this.specialPackageModel
        .findById(id)
        .populate(
          'products.product',
          'name nameEn editionEn translatorNameEn tagline taglineEn description totalPages currentVersion currentVersionEn translatorName publishedDate shortDescription author  salePrice sku tax shortDesc discountType slug edition variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // console.warn(data)

      const newdata: any = await data.products.map((item) => {
        const transFrom = {
          ...item?.product?._doc,
          ...{
            quantity: item?.quantity,
            hasVariations: item?.hasVariations,
            selectedVariation: item?.selectedVariation,
          },
        };
        // console.warn(transFrom.selectedVariation)
        if (transFrom?.hasVariations) {
          let found = null;
          transFrom.variationsOptions.map((item) => {
            if (String(item?._id) == String(transFrom?.selectedVariation)) {
              found = item;
            }
          });
          if (!found) {
            return {
              ...transFrom,
              ...{ hasVariations: false, selectedVariation: null },
            };
            // Code for Delete variation
          } else {
            return {
              ...transFrom,
              ...{ hasVariations: true, selectedVariation: found },
            };
          }
        } else {
          return transFrom;
        }
      });
      data = { ...data?._doc, ...{ products: newdata } };
      // console.warn(data)
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      console.log('err', err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageBySlug(
    slug: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      let data: any = await this.specialPackageModel
        .findOne({ slug: slug })
        .populate(
          'products.product',
          'name description salePrice sku tax shortDesc discountType slug variations hasVariations variationsOptions discountAmount images quantity category subCategory brand tags unit _id',
        )
        .select(select);

      // console.warn(data)

      const newdata: any = await data.products.map((item) => {
        const transFrom = {
          ...item.product._doc,
          ...{
            quantity: item.quantity,
            hasVariations: item.hasVariations,
            selectedVariation: item.selectedVariation,
          },
        };
        // console.warn(transFrom.selectedVariation)
        if (transFrom.hasVariations) {
          let found = null;
          transFrom.variationsOptions.map((item) => {
            if (String(item._id) == String(transFrom.selectedVariation)) {
              found = item;
            }
          });
          if (!found) {
            return {
              ...transFrom,
              ...{ hasVariations: false, selectedVariation: null },
            };
            // Code for Delete variation
          } else {
            return {
              ...transFrom,
              ...{ hasVariations: true, selectedVariation: found },
            };
          }
        } else {
          return transFrom;
        }
      });
      data = { ...data._doc, ...{ products: newdata } };
      // console.warn(data)
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSpecialPackageSingle(select?: string): Promise<ResponsePayload> {
    try {
      const data = await this.specialPackageModel
        .findOne({})
        .populate('products.product')
        .select(select ? select : '');

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
   * updateSpecialPackageById
   * updateMultipleSpecialPackageById
   */
  async updateSpecialPackageById(
    id: string,
    updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    try {
      const { name } = updateSpecialPackageDto;
      const { products } = updateSpecialPackageDto;

      const data = await this.specialPackageModel.findById(id);

      const finalData = { ...updateSpecialPackageDto };
      // Check Slug
      // if (name) {
      //   if (name && data.name !== name) {
      //     finalData.slug = this.utilsService.transformToSlug(name, true);
      //   }
      // }
      await this.specialPackageModel.findByIdAndUpdate(id, {
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

  async updateMultipleSpecialPackageById(
    ids: string[],
    updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateSpecialPackageDto.slug) {
      delete updateSpecialPackageDto.slug;
    }

    try {
      await this.specialPackageModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateSpecialPackageDto },
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
   * deleteSpecialPackageById
   * deleteMultipleSpecialPackageById
   */
  async deleteSpecialPackageById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.specialPackageModel.findById(id);
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
      const defaultSpecialPackage = await this.specialPackageModel.findOne({
        _id: id,
      });

      await this.specialPackageModel.findByIdAndDelete(id);

      const productIds = defaultSpecialPackage
        ? defaultSpecialPackage.products.map((m) => new ObjectId(m))
        : [];

      let resetData = {
        discountStartDateTime: null,
        discountEndDateTime: null,
      };

      if (checkUsage) {
        resetData = {
          ...resetData,
          ...{
            discountType: null,
            discountAmount: null,
          },
        };
      }
      // Update Product
      await this.productModel.updateMany(
        { _id: { $in: productIds } },
        { $set: resetData },
      );
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleSpecialPackageById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.specialPackageModel.find({
        _id: { $in: mIds },
      });

      await this.specialPackageModel.deleteMany({ _id: mIds });
      // Reset Product SpecialPackage Reference
      const mProductsIds = [];

      allCategory.forEach((f) => {
        f.products.forEach((g) => {
          mProductsIds.push(g);
        });
      });
      const productIds = mProductsIds.map((m) => new ObjectId(m));

      let resetData = {
        discountStartDateTime: null,
        discountEndDateTime: null,
      };

      if (checkUsage) {
        resetData = {
          ...resetData,
          ...{
            discountType: null,
            discountAmount: null,
          },
        };
      }
      // Update Product
      await this.productModel.updateMany(
        { _id: { $in: productIds } },
        { $set: resetData },
      );
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
