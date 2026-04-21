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
import { SeoPage } from '../../interfaces/common/seo-page.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddSeoPageDto,
  FilterAndPaginationSeoPageDto,
  OptionSeoPageDto,
  UpdateSeoPageDto,
} from '../../dto/seo-page.dto';
import { Product } from '../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class SeoPageService {
  private logger = new Logger(SeoPageService.name);

  constructor(
    @InjectModel('SeoPage') private readonly seoPageModel: Model<SeoPage>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addSeoPage
   * insertManySeoPage
   */
  async addSeoPage(addSeoPageDto: AddSeoPageDto): Promise<ResponsePayload> {
    const { name } = addSeoPageDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(name),
    };
    const mData = { ...addSeoPageDto, ...defaultData };
    const newData = new this.seoPageModel(mData);
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

  async insertManySeoPage(
    addSeoPagesDto: AddSeoPageDto[],
    optionSeoPageDto: OptionSeoPageDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionSeoPageDto;
    if (deleteMany) {
      await this.seoPageModel.deleteMany({});
    }
    const mData = addSeoPagesDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.seoPageModel.insertMany(mData);
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
   * getAllSeoPages
   * getSeoPageById
   */
  async getAllSeoPages(
    filterSeoPageDto: FilterAndPaginationSeoPageDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterSeoPageDto;
    const { pagination } = filterSeoPageDto;
    const { sort } = filterSeoPageDto;
    const { select } = filterSeoPageDto;

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
      const dataAggregates = await this.seoPageModel.aggregate(aggregateStages);
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

  async getSeoPageById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.seoPageModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getSeoPageByPage(
    pageName: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.seoPageModel
        .findOne({ pageName: pageName })
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
   * updateSeoPageById
   * updateMultipleSeoPageById
   */
  async updateSeoPageById(
    id: string,
    updateSeoPageDto: UpdateSeoPageDto,
  ): Promise<ResponsePayload> {
    const { name } = updateSeoPageDto;
    let data;
    try {
      data = await this.seoPageModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateSeoPageDto };
      // Check Slug
      if (name)
        if (name && data.name !== name) {
          finalData.slug = this.utilsService.transformToSlug(name, true);
        }

      await this.seoPageModel.findByIdAndUpdate(id, {
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

  async updateMultipleSeoPageById(
    ids: string[],
    updateSeoPageDto: UpdateSeoPageDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateSeoPageDto.slug) {
      delete updateSeoPageDto.slug;
    }

    try {
      await this.seoPageModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateSeoPageDto },
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
   * deleteSeoPageById
   * deleteMultipleSeoPageById
   */
  async deleteSeoPageById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.seoPageModel.findById(id);
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
      await this.seoPageModel.findByIdAndDelete(id);
      // Reset Product SeoPage Reference
      if (checkUsage) {
        const defaultSeoPage = await this.seoPageModel.findOne({
          readOnly: true,
        });
        const resetSeoPage = {
          seoPage: {
            _id: defaultSeoPage._id,
            name: defaultSeoPage.name,
            slug: defaultSeoPage.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'seoPage._id': new ObjectId(id) },
          { $set: resetSeoPage },
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

  async deleteMultipleSeoPageById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      // Remove Read Only Data
      const allCategory = await this.seoPageModel.find({
        _id: { $in: mIds },
      });
      const filteredIds = allCategory
        .filter((f) => f.readOnly !== true)
        .map((m) => m._id);
      await this.seoPageModel.deleteMany({ _id: filteredIds });
      // Reset Product SeoPage Reference
      if (checkUsage) {
        const defaultSeoPage = await this.seoPageModel.findOne({
          readOnly: true,
        });
        const resetSeoPage = {
          seoPage: {
            _id: defaultSeoPage._id,
            name: defaultSeoPage.name,
            slug: defaultSeoPage.slug,
          },
        };
        // Update Product
        await this.productModel.updateMany(
          { 'seoPage._id': { $in: mIds } },
          { $set: resetSeoPage },
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
