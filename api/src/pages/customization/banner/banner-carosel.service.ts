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
import { BannerCarosel } from '../../../interfaces/common/banner-carosel.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddBannerCaroselDto,
  CheckBannerCaroselDto,
  FilterAndPaginationBannerCaroselDto,
  OptionBannerCaroselDto,
  UpdateBannerCaroselDto,
} from '../../../dto/banner-carosel.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class BannerCaroselService {
  private logger = new Logger(BannerCaroselService.name);

  constructor(
    @InjectModel('BannerCarosel') private readonly bannerCaroselModel: Model<BannerCarosel>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addBannerCarosel
   * insertManyBannerCarosel
   */
  async addBannerCarosel(addBannerCaroselDto: AddBannerCaroselDto): Promise<ResponsePayload> {
    const { name } = addBannerCaroselDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addBannerCaroselDto, ...defaultData };
    const newData = new this.bannerCaroselModel(mData);
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

  async insertManyBannerCarosel(
    addBannerCaroselsDto: AddBannerCaroselDto[],
    optionBannerCaroselDto: OptionBannerCaroselDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionBannerCaroselDto;
    if (deleteMany) {
      await this.bannerCaroselModel.deleteMany({});
    }
    const mData = addBannerCaroselsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.bannerCaroselModel.insertMany(mData);
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
   * getAllBannerCarosels
   * getBannerCaroselById
   */
  async getAllBannerCaroselsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;
      
      const data = await this.bannerCaroselModel
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

  async getAllBannerCarosels(
    filterBannerCaroselDto: FilterAndPaginationBannerCaroselDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterBannerCaroselDto;
    const { pagination } = filterBannerCaroselDto;
    const { sort } = filterBannerCaroselDto;
    const { select } = filterBannerCaroselDto;

    // Essential Variables
    const aggregateSbannerCaroseles = [];
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
      aggregateSbannerCaroseles.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSbannerCaroseles.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSbannerCaroseles.push({ $project: mSelect });
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

      aggregateSbannerCaroseles.push(mPagination);

      aggregateSbannerCaroseles.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.bannerCaroselModel.aggregate(
        aggregateSbannerCaroseles,
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

  async getBannerCaroselById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.bannerCaroselModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single bannerCarosel get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateBannerCaroselById
   * updateMultipleBannerCaroselById
   */
  async updateBannerCaroselById(
    id: string,
    updateBannerCaroselDto: UpdateBannerCaroselDto,
  ): Promise<ResponsePayload> {
    const { name } = updateBannerCaroselDto;
    let data;
    try {
      data = await this.bannerCaroselModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateBannerCaroselDto };

      await this.bannerCaroselModel.findByIdAndUpdate(id, {
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

  async updateMultipleBannerCaroselById(
    ids: string[],
    updateBannerCaroselDto: UpdateBannerCaroselDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.bannerCaroselModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateBannerCaroselDto },
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
   * deleteBannerCaroselById
   * deleteMultipleBannerCaroselById
   */
  async deleteBannerCaroselById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.bannerCaroselModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.bannerCaroselModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleBannerCaroselById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.bannerCaroselModel.deleteMany({ _id: ids });
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
  async checkBannerCaroselAvailability(
    user: User,
    checkBannerCaroselDto: CheckBannerCaroselDto,
  ): Promise<ResponsePayload> {
    try {
      const { bannerCaroselCode, subTotal } = checkBannerCaroselDto;

      const bannerCaroselData = await this.bannerCaroselModel.findOne({ bannerCaroselCode });

      if (bannerCaroselData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(bannerCaroselData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(bannerCaroselData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! BannerCarosel offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! BannerCarosel Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userBannerCaroselExists = await this.userModel.findOne({
            _id: user._id,
            usedBannerCarosels: bannerCaroselData._id,
          });

          if (userBannerCaroselExists) {
            return {
              success: false,
              message: 'Sorry! BannerCarosel already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (bannerCaroselData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! BannerCarosel minimum amount is ${bannerCaroselData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! BannerCarosel added.',
                data: {
                  _id: bannerCaroselData._id,
                  discountAmount: bannerCaroselData['discountAmount'],
                  discountType: bannerCaroselData['discountType'],
                  bannerCaroselCode: bannerCaroselData['bannerCaroselCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid bannerCarosel code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
