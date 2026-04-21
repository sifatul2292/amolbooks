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
import { Manuscript } from '../../interfaces/common/manuscript.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddManuscriptDto,
  FilterAndPaginationManuscriptDto,
  OptionManuscriptDto,
  UpdateManuscriptDto,
} from '../../dto/manuscript.dto';
import { User } from '../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class ManuscriptService {
  private logger = new Logger(ManuscriptService.name);

  constructor(
    @InjectModel('Manuscript')
    private readonly manuscriptModel: Model<Manuscript>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addManuscript
   * insertManyManuscript
   */
  async addManuscript(
    addManuscriptDto: AddManuscriptDto,
  ): Promise<ResponsePayload> {
    const { name } = addManuscriptDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addManuscriptDto, ...defaultData };
    const newData = new this.manuscriptModel(mData);
    try {
      const saveData = await newData.save();
      const data = {
        _id: saveData._id,
      };
      return {
        success: true,
        message:
          'ধন্যবাদ! আপনার পাণ্ডলিপিটি জমা হয়েছে। শীঘ্রই আপনাকে আমাদের মতামত জানানো হবে ইনশাআল্লাহ!',
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

  async insertManyManuscript(
    addManuscriptsDto: AddManuscriptDto[],
    optionManuscriptDto: OptionManuscriptDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionManuscriptDto;
    if (deleteMany) {
      await this.manuscriptModel.deleteMany({});
    }
    const mData = addManuscriptsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.manuscriptModel.insertMany(mData);
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
   * getAllManuscripts
   * getManuscriptById
   */
  async getAllManuscriptsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.manuscriptModel
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

  async getAllManuscripts(
    filterManuscriptDto: FilterAndPaginationManuscriptDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterManuscriptDto;
    const { pagination } = filterManuscriptDto;
    const { sort } = filterManuscriptDto;
    const { select } = filterManuscriptDto;

    // Essential Variables
    const aggregateSmanuscriptes = [];
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
        email: 1,
        phone: 1,
        message: 1,
      };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateSmanuscriptes.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSmanuscriptes.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSmanuscriptes.push({ $project: mSelect });
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

      aggregateSmanuscriptes.push(mPagination);

      aggregateSmanuscriptes.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.manuscriptModel.aggregate(
        aggregateSmanuscriptes,
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

  async getManuscriptById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.manuscriptModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single manuscript get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateManuscriptById
   * updateMultipleManuscriptById
   */
  async updateManuscriptById(
    id: string,
    updateManuscriptDto: UpdateManuscriptDto,
  ): Promise<ResponsePayload> {
    const { name } = updateManuscriptDto;
    let data;
    try {
      data = await this.manuscriptModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateManuscriptDto };

      await this.manuscriptModel.findByIdAndUpdate(id, {
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

  async updateMultipleManuscriptById(
    ids: string[],
    updateManuscriptDto: UpdateManuscriptDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.manuscriptModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateManuscriptDto },
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
   * deleteManuscriptById
   * deleteMultipleManuscriptById
   */
  async deleteManuscriptById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.manuscriptModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.manuscriptModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleManuscriptById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.manuscriptModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
