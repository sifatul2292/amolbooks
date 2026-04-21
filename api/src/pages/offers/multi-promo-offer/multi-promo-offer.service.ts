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
import { MultiPromoOffer } from '../../../interfaces/common/multi-promo-offer.interface';
import {
  AddMultiPromoOfferDto,
  FilterAndPaginationMultiPromoOfferDto,
  OptionMultiPromoOfferDto,
  UpdateMultiPromoOfferDto,
} from '../../../dto/multi-promo-offer.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';
import { FilterAndPaginationPromoOfferDto } from '../../../dto/promo-offer.dto';

const ObjectId = Types.ObjectId;

@Injectable()
export class MultiPromoOfferService {
  private logger = new Logger(MultiPromoOfferService.name);

  constructor(
    @InjectModel('MultiPromoOffer')
    private readonly multiMultiPromoOfferModel: Model<MultiPromoOffer>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private jobSchedulerService: JobSchedulerService,
  ) {}

  /**
   * addMultiPromoOffer
   * insertManyMultiPromoOffer
   */
  async addMultiPromoOffer(
    addMultiPromoOfferDto: AddMultiPromoOfferDto,
  ): Promise<ResponsePayload> {
    try {
      const { title } = addMultiPromoOfferDto;
      const { products } = addMultiPromoOfferDto;
      const { startDateTime } = addMultiPromoOfferDto;
      const { endDateTime } = addMultiPromoOfferDto;

      // Check Single Document
      // const checkData = await this.multiMultiPromoOfferModel.findOne();
      // if (checkData) {
      //   return {
      //     success: false,
      //     message: 'Data Cannot be Added. Its a Single Document Collection',
      //     data: null,
      //   } as ResponsePayload;
      // }

      const defaultData = {
        slug: this.utilsService.transformToSlug(title),
      };
      const mData = { ...addMultiPromoOfferDto, ...defaultData };
      const newData = new this.multiMultiPromoOfferModel(mData);

      const saveData = await newData.save();

      /**
       * SCHEDULE DATE
       */
      const isStartDate = this.utilsService.getDateDifference(
        new Date(),
        new Date(startDateTime),
        'seconds',
      );

      const isEndDate = this.utilsService.getDateDifference(
        new Date(),
        new Date(endDateTime),
        'seconds',
      );

      if (isEndDate <= 0) {
        console.log('isEndDate is past date');
        return {
          success: false,
          message: 'Data can not be added. Expire date is wrong',
        } as ResponsePayload;
      } else {
        console.log('isEndDate is future date');
        this.jobSchedulerService.addOfferScheduleOnEnd(
          true,
          saveData._id,
          endDateTime,
          products,
        );
      }

      if (isStartDate <= 0) {
        console.log('isStartDate is past date');
        // Update Product Collection
        await this.utilsService.updateProductsOnOfferStart(products);
      } else {
        console.log('isStartDate is future date');
        this.jobSchedulerService.addOfferScheduleOnStart(
          true,
          saveData._id,
          startDateTime,
          products,
        );
      }

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

  async insertManyMultiPromoOffer(
    addMultiPromoOffersDto: AddMultiPromoOfferDto[],
    optionMultiPromoOfferDto: OptionMultiPromoOfferDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionMultiPromoOfferDto;
    if (deleteMany) {
      await this.multiMultiPromoOfferModel.deleteMany({});
    }
    const mData = addMultiPromoOffersDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.title),
        },
      };
    });
    try {
      const saveData = await this.multiMultiPromoOfferModel.insertMany(mData);
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
   * getAllMultiPromoOffers
   * getMultiPromoOfferById
   */

  //
  // async getAllMultiPromoOffers(
  //   filterPromoOfferDto: FilterAndPaginationMultiPromoOfferDto,
  //   searchQuery?: string,
  // ): Promise<ResponsePayload> {
  //   const { filter } = filterPromoOfferDto;
  //   const { pagination } = filterPromoOfferDto;
  //   const { sort } = filterPromoOfferDto;
  //   const { select } = filterPromoOfferDto;
  //
  //   // Essential Variables
  //   const aggregateStages = [];
  //   let mFilter = {};
  //   let mSort = {};
  //   let mSelect = {};
  //   let mPagination = {};
  //
  //   // Match
  //   if (filter) {
  //     mFilter = { ...mFilter, ...filter };
  //   }
  //   if (searchQuery) {
  //     mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
  //   }
  //   // Sort
  //   if (sort) {
  //     mSort = sort;
  //   } else {
  //     mSort = { createdAt: -1 };
  //   }
  //
  //   // Select
  //   if (select) {
  //     mSelect = { ...select };
  //   } else {
  //     mSelect = { name: 1 };
  //   }
  //
  //   // Finalize
  //   if (Object.keys(mFilter).length) {
  //     aggregateStages.push({ $match: mFilter });
  //   }
  //
  //   if (Object.keys(mSort).length) {
  //     aggregateStages.push({ $sort: mSort });
  //   }
  //
  //   if (!pagination) {
  //     aggregateStages.push({ $project: mSelect });
  //   }
  //
  //   // Pagination
  //   if (pagination) {
  //     if (Object.keys(mSelect).length) {
  //       mPagination = {
  //         $facet: {
  //           metadata: [{ $count: 'total' }],
  //           data: [
  //             {
  //               $skip: pagination.pageSize * pagination.currentPage,
  //             } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
  //             { $limit: pagination.pageSize },
  //             { $project: mSelect },
  //           ],
  //         },
  //       };
  //     } else {
  //       mPagination = {
  //         $facet: {
  //           metadata: [{ $count: 'total' }],
  //           data: [
  //             {
  //               $skip: pagination.pageSize * pagination.currentPage,
  //             } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
  //             { $limit: pagination.pageSize },
  //           ],
  //         },
  //       };
  //     }
  //
  //     aggregateStages.push(mPagination);
  //
  //     aggregateStages.push({
  //       $project: {
  //         data: 1,
  //         count: { $arrayElemAt: ['$metadata.total', 0] },
  //       },
  //     });
  //   }
  //
  //   try {
  //     const dataAggregates = await this.multiMultiPromoOfferModel.aggregate(
  //       aggregateStages,
  //     );
  //     if (pagination) {
  //       return {
  //         ...{ ...dataAggregates[0] },
  //         ...{ success: true, message: 'Success' },
  //       } as ResponsePayload;
  //     } else {
  //       return {
  //         data: dataAggregates,
  //         success: true,
  //         message: 'Success',
  //         count: dataAggregates.length,
  //       } as ResponsePayload;
  //     }
  //   } catch (err) {
  //     this.logger.error(err);
  //     if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
  //       throw new BadRequestException('Error! Projection mismatch');
  //     } else {
  //       throw new InternalServerErrorException();
  //     }
  //   }
  // }

  async getAllMultiPromoOffers(
    filterPromoOfferDto: FilterAndPaginationMultiPromoOfferDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterPromoOfferDto;
    const { pagination } = filterPromoOfferDto;
    const { sort } = filterPromoOfferDto;
    const { select } = filterPromoOfferDto;

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

    // Populate products
    aggregateStages.push({
      $lookup: {
        from: 'products', // Product collection name
        localField: 'products.product', // Field in the current collection
        foreignField: '_id', // Field in Product collection
        as: 'productDetails', // Alias for the populated data
      },
    });

    // Optional: Unwind each product detail if needed as separate documents
    aggregateStages.push({
      $unwind: {
        path: '$productDetails',
        preserveNullAndEmptyArrays: true, // Optional: keep documents without matching products
      },
    });

    // Pagination
    if (pagination) {
      mPagination = {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            {
              $skip: pagination.pageSize * (pagination.currentPage - 1),
            },
            { $limit: pagination.pageSize },
            { $project: mSelect },
          ],
        },
      };
      aggregateStages.push(mPagination);

      aggregateStages.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.multiMultiPromoOfferModel.aggregate(
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

  async getMultiPromoOfferById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.multiMultiPromoOfferModel
        .findById(id)
        .populate('products.product')
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

  async getMultiPromoOfferDouble(select?: string): Promise<ResponsePayload> {
    try {
      const data = await this.multiMultiPromoOfferModel
        .find({})
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
   * updateMultiPromoOfferById
   * updateMultipleMultiPromoOfferById
   */
  async updateMultiPromoOfferById(
    id: string,
    updateMultiPromoOfferDto: UpdateMultiPromoOfferDto,
  ): Promise<ResponsePayload> {
    try {
      const { title } = updateMultiPromoOfferDto;
      const { products } = updateMultiPromoOfferDto;
      const { startDateTime } = updateMultiPromoOfferDto;
      const { endDateTime } = updateMultiPromoOfferDto;

      const data = await this.multiMultiPromoOfferModel.findById(id);

      const finalData = { ...updateMultiPromoOfferDto };
      // Check Slug
      if (title) {
        if (title && data.title !== title) {
          finalData.slug = this.utilsService.transformToSlug(title, true);
        }
      }

      // CANCEL EXISTING JOB SCHEDULE
      const jobNameStart = this.configService.get<string>(
        'multiMultiPromoOfferScheduleOnStart',
      );
      const jobNameEnd = this.configService.get<string>(
        'multiMultiPromoOfferScheduleOnEnd',
      );
      await this.jobSchedulerService.cancelOfferJobScheduler(jobNameStart);
      await this.jobSchedulerService.cancelOfferJobScheduler(jobNameEnd);

      /**
       * NEW SCHEDULE DATE
       */
      const isStartDate = this.utilsService.getDateDifference(
        new Date(),
        new Date(startDateTime),
        'seconds',
      );

      const isEndDate = this.utilsService.getDateDifference(
        new Date(),
        new Date(endDateTime),
        'seconds',
      );

      if (isEndDate <= 0) {
        console.log('isEndDate is past date');
        return {
          success: false,
          message: 'Data can not be added. Expire date is wrong',
        } as ResponsePayload;
      } else {
        console.log('isEndDate is future date');
        this.jobSchedulerService.addOfferScheduleOnEnd(
          true,
          id,
          endDateTime,
          products,
        );
      }

      if (isStartDate <= 0) {
        console.log('isStartDate is past date');
        // Update Product Collection
        await this.utilsService.updateProductsOnOfferStart(products);
      } else {
        console.log('isStartDate is future date');
        this.jobSchedulerService.addOfferScheduleOnStart(
          true,
          id,
          startDateTime,
          products,
        );
      }

      await this.multiMultiPromoOfferModel.findByIdAndUpdate(id, {
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

  async updateMultipleMultiPromoOfferById(
    ids: string[],
    updateMultiPromoOfferDto: UpdateMultiPromoOfferDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateMultiPromoOfferDto.slug) {
      delete updateMultiPromoOfferDto.slug;
    }

    try {
      await this.multiMultiPromoOfferModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateMultiPromoOfferDto },
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
   * deleteMultiPromoOfferById
   * deleteMultipleMultiPromoOfferById
   */
  async deleteMultiPromoOfferById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.multiMultiPromoOfferModel.findById(id);
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
      const defaultMultiPromoOffer =
        await this.multiMultiPromoOfferModel.findOne({
          _id: id,
        });

      await this.multiMultiPromoOfferModel.findByIdAndDelete(id);

      const productIds = defaultMultiPromoOffer
        ? defaultMultiPromoOffer.products.map((m) => new ObjectId(m))
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
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleMultiPromoOfferById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.multiMultiPromoOfferModel.find({
        _id: { $in: mIds },
      });

      await this.multiMultiPromoOfferModel.deleteMany({ _id: mIds });
      // Reset Product MultiPromoOffer Reference
      const mProductsIds = [];

      allCategory.forEach((f) => {
        f.products.forEach((g) => {
          mProductsIds.push(g);
        });
      });
      // const productIds = mProductsIds.map((m) => new ObjectId(m));
      //
      // let resetData = {
      //   discountStartDateTime: null,
      //   discountEndDateTime: null,
      // };

      // CANCEL EXISTING JOB SCHEDULE
      const jobNameStart = this.configService.get<string>(
        'multiMultiPromoOfferScheduleOnStart',
      );
      const jobNameEnd = this.configService.get<string>(
        'multiMultiPromoOfferScheduleOnEnd',
      );
      await this.jobSchedulerService.cancelOfferJobScheduler(jobNameStart);
      await this.jobSchedulerService.cancelOfferJobScheduler(jobNameEnd);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
