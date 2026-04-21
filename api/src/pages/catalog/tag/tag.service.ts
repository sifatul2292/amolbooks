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
import { Tag } from '../../../interfaces/common/tag.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddTagDto,
  FilterAndPaginationTagDto,
  OptionTagDto,
  UpdateTagDto,
} from '../../../dto/tag.dto';
import { Product } from '../../../interfaces/common/product.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class TagService {
  private logger = new Logger(TagService.name);

  constructor(
    @InjectModel('Tag') private readonly tagModel: Model<Tag>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addTag
   * insertManyTag
   */

  async getAllTagForUi(): Promise<ResponsePayload> {
    try {
      const data = await this.tagModel
        .find({ status: 'publish' })
        .select('name slug startDate url image')
        .sort({ priority: -1 });

      return {
        success: true,
        message: 'Success! Data fetch successfully.',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async addTag(addTagDto: AddTagDto): Promise<ResponsePayload> {
    const { name, slug } = addTagDto;

    try {
      let finalSlug;
      const fData = await this.tagModel.findOne({ slug: slug });

      if (fData) {
        finalSlug = this.utilsService.transformToSlug(slug, true);
      } else {
        finalSlug = slug;
      }

      const defaultData = {
        slug: finalSlug,
      };
      const mData = { ...addTagDto, ...defaultData };
      const newData = new this.tagModel(mData);

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

  async insertManyTag(
    addTagsDto: AddTagDto[],
    optionTagDto: OptionTagDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionTagDto;
    if (deleteMany) {
      await this.tagModel.deleteMany({});
    }
    const mData = addTagsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.tagModel.insertMany(mData);
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
   * getAllTags
   * getTagById
   */
  async getAllTagsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 3;
      const data = await this.tagModel
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

  async getAllTags(
    filterTagDto: FilterAndPaginationTagDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterTagDto;
    const { pagination } = filterTagDto;
    const { sort } = filterTagDto;
    const { select } = filterTagDto;

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
      const dataAggregates = await this.tagModel.aggregate(aggregateStages);
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

  async getTagById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.tagModel.findById(id).select(select);
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
   * updateTagById
   * updateMultipleTagById
   */
  async updateTagById(
    id: string,
    updateTagDto: UpdateTagDto,
  ): Promise<ResponsePayload> {
    try {
      const { name, slug } = updateTagDto;

      let finalSlug;
      const fData = await this.tagModel.findById(id);

      // Check Slug
      if (fData.slug !== slug) {
        const fData = await this.tagModel.findOne({ slug: slug });
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

      const finalData = { ...updateTagDto, ...defaultData };

      await this.tagModel.findByIdAndUpdate(id, {
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

  async updateMultipleTagById(
    ids: string[],
    updateTagDto: UpdateTagDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateTagDto.slug) {
      delete updateTagDto.slug;
    }

    try {
      await this.tagModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateTagDto },
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
   * deleteTagById
   * deleteMultipleTagById
   */
  async deleteTagById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.tagModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.tagModel.findByIdAndDelete(id);
      // Reset Product Tag Reference
      if (checkUsage) {
        // Update Product
        await this.productModel.updateMany(
          {},
          {
            $pull: { tags: new ObjectId(id) },
          },
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

  async deleteMultipleTagById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.tagModel.deleteMany({ _id: ids });
      // Reset Product Brand Reference
      if (checkUsage) {
        // Update Product
        await this.productModel.updateMany(
          {},
          { $pull: { tags: { $in: mIds } } },
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
