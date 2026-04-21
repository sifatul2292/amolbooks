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
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddFileFolderDto,
  FilterAndPaginationFileFolderDto,
  OptionFileFolderDto,
  UpdateFileFolderDto,
} from '../../dto/file-folder.dto';
import { FileFolder } from '../../interfaces/gallery/file-folder.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class FileFolderService {
  private logger = new Logger(FileFolderService.name);

  constructor(
    @InjectModel('FileFolder')
    private readonly fileFolderModel: Model<FileFolder>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addFileFolder
   * insertManyFileFolder
   */
  async addFileFolder(
    addFileFolderDto: AddFileFolderDto,
  ): Promise<ResponsePayload> {
    const { name } = addFileFolderDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addFileFolderDto, ...defaultData };
    const newData = new this.fileFolderModel(mData);
    try {
      const saveData = await newData.save();
      const data = {
        _id: saveData._id,
      };
      return {
        success: true,
        message: 'Data Added Success',
        data,
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

  async insertManyFileFolder(
    addFileFoldersDto: AddFileFolderDto[],
    optionFileFolderDto: OptionFileFolderDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionFileFolderDto;
    if (deleteMany) {
      await this.fileFolderModel.deleteMany({});
    }
    const mData = addFileFoldersDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.fileFolderModel.insertMany(mData);
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
   * getAllFileFolders
   * getFileFolderById
   */
  async getAllFileFolders(
    filterFileFolderDto: FilterAndPaginationFileFolderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterFileFolderDto;
    const { pagination } = filterFileFolderDto;
    const { sort } = filterFileFolderDto;
    const { select } = filterFileFolderDto;

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
      const dataAggregates = await this.fileFolderModel.aggregate(
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

  async getFileFolderById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.fileFolderModel.findById(id).select(select);
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
   * updateFileFolderById
   * updateMultipleFileFolderById
   */
  async updateFileFolderById(
    id: string,
    updateFileFolderDto: UpdateFileFolderDto,
  ): Promise<ResponsePayload> {
    const { name } = updateFileFolderDto;
    let data;
    try {
      data = await this.fileFolderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateFileFolderDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.fileFolderModel.findByIdAndUpdate(id, {
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

  async updateMultipleFileFolderById(
    ids: string[],
    updateFileFolderDto: UpdateFileFolderDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateFileFolderDto.slug) {
      delete updateFileFolderDto.slug;
    }

    try {
      await this.fileFolderModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateFileFolderDto },
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
   * deleteFileFolderById
   * deleteMultipleFileFolderById
   */
  async deleteFileFolderById(id: string): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.fileFolderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.fileFolderModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleFileFolderById(ids: string[]): Promise<ResponsePayload> {
    try {
      await this.fileFolderModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
