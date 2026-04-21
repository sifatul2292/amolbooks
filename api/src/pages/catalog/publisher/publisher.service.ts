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
import { Publisher } from '../../../interfaces/common/publisher.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddPublisherDto,
  CheckPublisherDto,
  FilterAndPaginationPublisherDto,
  OptionPublisherDto,
  UpdatePublisherDto,
} from '../../../dto/publisher.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class PublisherService {
  private logger = new Logger(PublisherService.name);

  constructor(
    @InjectModel('Publisher') private readonly publisherModel: Model<Publisher>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addPublisher
   * insertManyPublisher
   */
  async addPublisher(
    addPublisherDto: AddPublisherDto,
  ): Promise<ResponsePayload> {
    const { name, slug } = addPublisherDto;

    try {
      let finalSlug;
      const fData = await this.publisherModel.findOne({ slug: slug });

      if (fData) {
        finalSlug = this.utilsService.transformToSlug(slug, true);
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };
      const mData = { ...addPublisherDto, ...defaultData };
      const newData = new this.publisherModel(mData);

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

  async insertManyPublisher(
    addPublishersDto: AddPublisherDto[],
    optionPublisherDto: OptionPublisherDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionPublisherDto;
    if (deleteMany) {
      await this.publisherModel.deleteMany({});
    }
    const mData = addPublishersDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.publisherModel.insertMany(mData);
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
   * getAllPublishers
   * getPublisherById
   */
  async getAllPublishersBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.publisherModel
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

  async getAllPublishers(
    filterPublisherDto: FilterAndPaginationPublisherDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterPublisherDto;
    const { pagination } = filterPublisherDto;
    const { sort } = filterPublisherDto;
    const { select } = filterPublisherDto;

    // Essential Variables
    const aggregateSpublisheres = [];
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
      aggregateSpublisheres.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSpublisheres.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSpublisheres.push({ $project: mSelect });
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

      aggregateSpublisheres.push(mPagination);

      aggregateSpublisheres.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.publisherModel.aggregate(
        aggregateSpublisheres,
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

  async getPublisherById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.publisherModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single publisher get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updatePublisherById
   * updateMultiplePublisherById
   */
  async updatePublisherById(
    id: string,
    updatePublisherDto: UpdatePublisherDto,
  ): Promise<ResponsePayload> {
    try {
      const { name, slug } = updatePublisherDto;

      let finalSlug;
      const fData = await this.publisherModel.findById(id);

      // Check Slug
      if (fData.slug !== slug) {
        const fData = await this.publisherModel.findOne({ slug: slug });
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

      const finalData = { ...updatePublisherDto, ...defaultData };

      await this.publisherModel.findByIdAndUpdate(id, {
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

  async updateMultiplePublisherById(
    ids: string[],
    updatePublisherDto: UpdatePublisherDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.publisherModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updatePublisherDto },
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
   * deletePublisherById
   * deleteMultiplePublisherById
   */
  async deletePublisherById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.publisherModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.publisherModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultiplePublisherById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.publisherModel.deleteMany({ _id: ids });
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
  async checkPublisherAvailability(
    user: User,
    checkPublisherDto: CheckPublisherDto,
  ): Promise<ResponsePayload> {
    try {
      const { publisherCode, subTotal } = checkPublisherDto;

      const publisherData = await this.publisherModel.findOne({
        publisherCode,
      });

      if (publisherData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(publisherData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(publisherData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Publisher offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Publisher Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userPublisherExists = await this.userModel.findOne({
            _id: user._id,
            usedPublishers: publisherData._id,
          });

          if (userPublisherExists) {
            return {
              success: false,
              message: 'Sorry! Publisher already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (publisherData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Publisher minimum amount is ${publisherData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Publisher added.',
                data: {
                  _id: publisherData._id,
                  discountAmount: publisherData['discountAmount'],
                  discountType: publisherData['discountType'],
                  publisherCode: publisherData['publisherCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid publisher code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
