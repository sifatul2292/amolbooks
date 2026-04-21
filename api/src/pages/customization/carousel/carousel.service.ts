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
import { Carousel } from '../../../interfaces/common/carousel.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddCarouselDto,
  CheckCarouselDto,
  FilterAndPaginationCarouselDto,
  OptionCarouselDto,
  UpdateCarouselDto,
} from '../../../dto/carousel.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class CarouselService {
  private logger = new Logger(CarouselService.name);

  constructor(
    @InjectModel('Carousel') private readonly carouselModel: Model<Carousel>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addCarousel
   * insertManyCarousel
   */
  async addCarousel(addCarouselDto: AddCarouselDto): Promise<ResponsePayload> {
    const { name } = addCarouselDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addCarouselDto, ...defaultData };
    const newData = new this.carouselModel(mData);
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

  async insertManyCarousel(
    addCarouselsDto: AddCarouselDto[],
    optionCarouselDto: OptionCarouselDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionCarouselDto;
    if (deleteMany) {
      await this.carouselModel.deleteMany({});
    }
    const mData = addCarouselsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.carouselModel.insertMany(mData);
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
   * getAllCarousels
   * getCarouselById
   */
  async getAllCarouselsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.carouselModel
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

  async getAllCarousels(
    filterCarouselDto: FilterAndPaginationCarouselDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterCarouselDto;
    const { pagination } = filterCarouselDto;
    const { sort } = filterCarouselDto;
    const { select } = filterCarouselDto;

    // Essential Variables
    const aggregateScarouseles = [];
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
      aggregateScarouseles.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateScarouseles.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateScarouseles.push({ $project: mSelect });
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

      aggregateScarouseles.push(mPagination);

      aggregateScarouseles.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.carouselModel.aggregate(
        aggregateScarouseles,
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

  async getCarouselById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.carouselModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single contact get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateCarouselById
   * updateMultipleCarouselById
   */
  async updateCarouselById(
    id: string,
    updateCarouselDto: UpdateCarouselDto,
  ): Promise<ResponsePayload> {
    const { name } = updateCarouselDto;
    let data;
    try {
      data = await this.carouselModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateCarouselDto };

      await this.carouselModel.findByIdAndUpdate(id, {
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

  async updateMultipleCarouselById(
    ids: string[],
    updateCarouselDto: UpdateCarouselDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.carouselModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateCarouselDto },
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
   * deleteCarouselById
   * deleteMultipleCarouselById
   */
  async deleteCarouselById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.carouselModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.carouselModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleCarouselById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.carouselModel.deleteMany({ _id: ids });
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
  async checkCarouselAvailability(
    user: User,
    checkCarouselDto: CheckCarouselDto,
  ): Promise<ResponsePayload> {
    try {
      const { carouselCode, subTotal } = checkCarouselDto;

      const carouselData = await this.carouselModel.findOne({ carouselCode });

      if (carouselData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(carouselData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(carouselData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Carousel offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Carousel Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userCarouselExists = await this.userModel.findOne({
            _id: user._id,
            usedCarousels: carouselData._id,
          });

          if (userCarouselExists) {
            return {
              success: false,
              message: 'Sorry! Carousel already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (carouselData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Carousel minimum amount is ${carouselData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Carousel added.',
                data: {
                  _id: carouselData._id,
                  discountAmount: carouselData['discountAmount'],
                  discountType: carouselData['discountType'],
                  carouselCode: carouselData['carouselCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid contact code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
