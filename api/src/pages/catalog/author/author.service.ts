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
import { Author } from '../../../interfaces/common/author.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddAuthorDto,
  CheckAuthorDto,
  FilterAndPaginationAuthorDto,
  OptionAuthorDto,
  UpdateAuthorDto,
} from '../../../dto/author.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class AuthorService {
  private logger = new Logger(AuthorService.name);

  constructor(
    @InjectModel('Author') private readonly authorModel: Model<Author>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addAuthor
   * insertManyAuthor
   */
  async addAuthor(addAuthorDto: AddAuthorDto): Promise<ResponsePayload> {
    const { name, slug } = addAuthorDto;

    try {
      let finalSlug;
      const fData = await this.authorModel.findOne({ slug: slug });

      if (fData) {
        finalSlug = this.utilsService.transformToSlug(slug, true);
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };
      const mData = { ...addAuthorDto, ...defaultData };
      const newData = new this.authorModel(mData);

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

  async insertManyAuthor(
    addAuthorsDto: AddAuthorDto[],
    optionAuthorDto: OptionAuthorDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionAuthorDto;
    if (deleteMany) {
      await this.authorModel.deleteMany({});
    }
    const mData = addAuthorsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.authorModel.insertMany(mData);
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
   * getAllAuthors
   * getAuthorById
   */
  async getAllAuthorsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.authorModel
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

  async getAllAuthors(
    filterAuthorDto: FilterAndPaginationAuthorDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterAuthorDto;
    const { pagination } = filterAuthorDto;
    const { sort } = filterAuthorDto;
    const { select } = filterAuthorDto;

    // Essential Variables
    const aggregateSauthores = [];
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
      aggregateSauthores.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSauthores.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSauthores.push({ $project: mSelect });
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

      aggregateSauthores.push(mPagination);

      aggregateSauthores.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.authorModel.aggregate(
        aggregateSauthores,
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

  async getAuthorById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.authorModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single author get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getAuthorBySlug(slug: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.authorModel.findOne({ slug: slug }).select(select);
      return {
        success: true,
        message: 'Single author get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateAuthorById
   * updateMultipleAuthorById
   */
  async updateAuthorById(
    id: string,
    updateAuthorDto: UpdateAuthorDto,
  ): Promise<ResponsePayload> {
    try {
      const { name, slug } = updateAuthorDto;

      let finalSlug;
      const fData = await this.authorModel.findById(id);

      // Check Slug
      if (fData.slug !== slug) {
        const fData = await this.authorModel.findOne({ slug: slug });
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

      const finalData = { ...updateAuthorDto, ...defaultData };

      await this.authorModel.findByIdAndUpdate(id, {
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

  async updateMultipleAuthorById(
    ids: string[],
    updateAuthorDto: UpdateAuthorDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.authorModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateAuthorDto },
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
   * deleteAuthorById
   * deleteMultipleAuthorById
   */
  async deleteAuthorById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.authorModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.authorModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleAuthorById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.authorModel.deleteMany({ _id: ids });
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
  async checkAuthorAvailability(
    user: User,
    checkAuthorDto: CheckAuthorDto,
  ): Promise<ResponsePayload> {
    try {
      const { authorCode, subTotal } = checkAuthorDto;

      const authorData = await this.authorModel.findOne({
        authorCode,
      });

      if (authorData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(authorData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(authorData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Author offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Author Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userAuthorExists = await this.userModel.findOne({
            _id: user._id,
            usedAuthors: authorData._id,
          });

          if (userAuthorExists) {
            return {
              success: false,
              message: 'Sorry! Author already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (authorData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Author minimum amount is ${authorData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Author added.',
                data: {
                  _id: authorData._id,
                  discountAmount: authorData['discountAmount'],
                  discountType: authorData['discountType'],
                  authorCode: authorData['authorCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid author code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
