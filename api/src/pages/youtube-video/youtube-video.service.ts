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
import { YoutubeVideo } from '../../interfaces/common/youtube-video.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddYoutubeVideoDto,
  CheckYoutubeVideoDto,
  FilterAndPaginationYoutubeVideoDto,
  OptionYoutubeVideoDto,
  UpdateYoutubeVideoDto,
} from '../../dto/youtube-video.dto';
import { User } from '../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class YoutubeVideoService {
  private logger = new Logger(YoutubeVideoService.name);

  constructor(
    @InjectModel('YoutubeVideo')
    private readonly youtubeVideoModel: Model<YoutubeVideo>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addYoutubeVideo
   * insertManyYoutubeVideo
   */
  async addYoutubeVideo(
    addYoutubeVideoDto: AddYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    const { name } = addYoutubeVideoDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addYoutubeVideoDto, ...defaultData };
    const newData = new this.youtubeVideoModel(mData);
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

  async insertManyYoutubeVideo(
    addYoutubeVideosDto: AddYoutubeVideoDto[],
    optionYoutubeVideoDto: OptionYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionYoutubeVideoDto;
    if (deleteMany) {
      await this.youtubeVideoModel.deleteMany({});
    }
    const mData = addYoutubeVideosDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.youtubeVideoModel.insertMany(mData);
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
   * getAllYoutubeVideos
   * getYoutubeVideoById
   */
  async getAllYoutubeVideosBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.youtubeVideoModel
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

  async getAllYoutubeVideos(
    filterYoutubeVideoDto: FilterAndPaginationYoutubeVideoDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterYoutubeVideoDto;
    const { pagination } = filterYoutubeVideoDto;
    const { sort } = filterYoutubeVideoDto;
    const { select } = filterYoutubeVideoDto;

    // Essential Variables
    const aggregateSyoutubeVideoes = [];
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
      aggregateSyoutubeVideoes.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSyoutubeVideoes.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSyoutubeVideoes.push({ $project: mSelect });
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

      aggregateSyoutubeVideoes.push(mPagination);

      aggregateSyoutubeVideoes.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.youtubeVideoModel.aggregate(
        aggregateSyoutubeVideoes,
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

  async getYoutubeVideoById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.youtubeVideoModel.findById(id).select(select);
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
   * updateYoutubeVideoById
   * updateMultipleYoutubeVideoById
   */
  async updateYoutubeVideoById(
    id: string,
    updateYoutubeVideoDto: UpdateYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    const { name } = updateYoutubeVideoDto;
    let data;
    try {
      data = await this.youtubeVideoModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateYoutubeVideoDto };

      await this.youtubeVideoModel.findByIdAndUpdate(id, {
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

  async updateMultipleYoutubeVideoById(
    ids: string[],
    updateYoutubeVideoDto: UpdateYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.youtubeVideoModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateYoutubeVideoDto },
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
   * deleteYoutubeVideoById
   * deleteMultipleYoutubeVideoById
   */
  async deleteYoutubeVideoById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.youtubeVideoModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.youtubeVideoModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleYoutubeVideoById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.youtubeVideoModel.deleteMany({ _id: ids });
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
  async checkYoutubeVideoAvailability(
    user: User,
    checkYoutubeVideoDto: CheckYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    try {
      const { youtubeVideoCode, subTotal } = checkYoutubeVideoDto;

      const youtubeVideoData = await this.youtubeVideoModel.findOne({
        youtubeVideoCode,
      });

      if (youtubeVideoData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(youtubeVideoData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(youtubeVideoData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! YoutubeVideo offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! YoutubeVideo Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userYoutubeVideoExists = await this.userModel.findOne({
            _id: user._id,
            usedYoutubeVideos: youtubeVideoData._id,
          });

          if (userYoutubeVideoExists) {
            return {
              success: false,
              message: 'Sorry! YoutubeVideo already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (youtubeVideoData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! YoutubeVideo minimum amount is ${youtubeVideoData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! YoutubeVideo added.',
                data: {
                  _id: youtubeVideoData._id,
                  discountAmount: youtubeVideoData['discountAmount'],
                  discountType: youtubeVideoData['discountType'],
                  youtubeVideoCode: youtubeVideoData['youtubeVideoCode'],
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
