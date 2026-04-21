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
import { ManuscriptSubject } from '../../interfaces/common/manuscript-subject.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddManuscriptSubjectDto,
  FilterAndPaginationManuscriptSubjectDto,
  OptionManuscriptSubjectDto,
  UpdateManuscriptSubjectDto,
} from '../../dto/manuscript-subject.dto';
import { Product } from '../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class ManuscriptSubjectService {
  private logger = new Logger(ManuscriptSubjectService.name);

  constructor(
    @InjectModel('ManuscriptSubject')
    private readonly manuscriptSubjectModel: Model<ManuscriptSubject>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addManuscriptSubject
   * insertManyManuscriptSubject
   */
  async addManuscriptSubject(
    addManuscriptSubjectDto: AddManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    const { name } = addManuscriptSubjectDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addManuscriptSubjectDto, ...defaultData };
    const newData = new this.manuscriptSubjectModel(mData);
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

  async insertManyManuscriptSubject(
    addManuscriptSubjectsDto: AddManuscriptSubjectDto[],
    optionManuscriptSubjectDto: OptionManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionManuscriptSubjectDto;
    if (deleteMany) {
      await this.manuscriptSubjectModel.deleteMany({});
    }
    const mData = addManuscriptSubjectsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.manuscriptSubjectModel.insertMany(mData);
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
   * getAllManuscriptSubjects
   * getManuscriptSubjectById
   */
  async getAllManuscriptSubjects(
    filterManuscriptSubjectDto: FilterAndPaginationManuscriptSubjectDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterManuscriptSubjectDto;
    const { pagination } = filterManuscriptSubjectDto;
    const { sort } = filterManuscriptSubjectDto;
    const { select } = filterManuscriptSubjectDto;

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
      const dataAggregates = await this.manuscriptSubjectModel.aggregate(
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

  async getManuscriptSubjectById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.manuscriptSubjectModel
        .findById(id)
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

  /**
   * updateManuscriptSubjectById
   * updateMultipleManuscriptSubjectById
   */
  async updateManuscriptSubjectById(
    id: string,
    updateManuscriptSubjectDto: UpdateManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    const { name } = updateManuscriptSubjectDto;
    let data;
    try {
      data = await this.manuscriptSubjectModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateManuscriptSubjectDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.manuscriptSubjectModel.findByIdAndUpdate(id, {
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

  async updateMultipleManuscriptSubjectById(
    ids: string[],
    updateManuscriptSubjectDto: UpdateManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateManuscriptSubjectDto.slug) {
      delete updateManuscriptSubjectDto.slug;
    }

    try {
      await this.manuscriptSubjectModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateManuscriptSubjectDto },
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
   * deleteManuscriptSubjectById
   * deleteMultipleManuscriptSubjectById
   */
  async deleteManuscriptSubjectById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.manuscriptSubjectModel.findById(id);
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
      await this.manuscriptSubjectModel.findByIdAndDelete(id);
      // Reset Product ManuscriptSubject Reference
      if (checkUsage) {
        const defaultManuscriptSubject =
          await this.manuscriptSubjectModel.findOne({
            readOnly: true,
          });
        const resetManuscriptSubject = {
          manuscriptSubject: {
            _id: defaultManuscriptSubject._id,
            name: defaultManuscriptSubject.name,
            slug: defaultManuscriptSubject.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'manuscriptSubject._id': new ObjectId(id) },
          { $set: resetManuscriptSubject },
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

  async deleteMultipleManuscriptSubjectById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.manuscriptSubjectModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.manuscriptSubjectModel.deleteMany({ _id: filteredIds });
      // Reset Product ManuscriptSubject Reference
      if (checkUsage) {
        const defaultManuscriptSubject =
          await this.manuscriptSubjectModel.findOne({
            readOnly: true,
          });
        const resetManuscriptSubject = {
          manuscriptSubject: {
            _id: defaultManuscriptSubject._id,
            name: defaultManuscriptSubject.name,
            slug: defaultManuscriptSubject.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'manuscriptSubject._id': { $in: mIds } },
          { $set: resetManuscriptSubject },
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
