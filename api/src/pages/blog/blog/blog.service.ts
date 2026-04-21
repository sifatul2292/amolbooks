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
import { Blog } from '../../../interfaces/common/blog.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddBlogDto,
  CheckBlogDto,
  FilterAndPaginationBlogDto,
  OptionBlogDto,
  UpdateBlogDto,
} from '../../../dto/blog.dto';
import { User } from '../../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class BlogService {
  private logger = new Logger(BlogService.name);

  constructor(
    @InjectModel('Blog') private readonly blogModel: Model<Blog>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addBlog
   * insertManyBlog
   */
  async addBlog(addBlogDto: AddBlogDto): Promise<ResponsePayload> {
    const { nameEn } = addBlogDto;

    const defaultData = {
      slug: this.utilsService.transformToSlug(nameEn),
    };
    const mData = { ...addBlogDto, ...defaultData };
    const newData = new this.blogModel(mData);
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

  async insertManyBlog(
    addBlogsDto: AddBlogDto[],
    optionBlogDto: OptionBlogDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionBlogDto;
    if (deleteMany) {
      await this.blogModel.deleteMany({});
    }
    const mData = addBlogsDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.blogModel.insertMany(mData);
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
   * getAllBlogs
   * getBlogById
   */
  async getAllBlogsBasic() {
    try {
      const pageSize = 10;
      const currentPage = 1;

      const data = await this.blogModel
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

  async getAllBlogs(
    filterBlogDto: FilterAndPaginationBlogDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterBlogDto;
    const { pagination } = filterBlogDto;
    const { sort } = filterBlogDto;
    const { select } = filterBlogDto;

    // Essential Variables
    const aggregateSbloges = [];
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
      aggregateSbloges.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateSbloges.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateSbloges.push({ $project: mSelect });
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

      aggregateSbloges.push(mPagination);

      aggregateSbloges.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.blogModel.aggregate(aggregateSbloges);
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

  async getBlogById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.blogModel.findById(id).select(select);
      return {
        success: true,
        message: 'Single profile get Successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async blogViewCount(id: string, user?: string): Promise<ResponsePayload> {
    try {
      await this.blogModel.findByIdAndUpdate(
        id,
        {
          $inc: { totalView: 1 },
        },
        {
          upsert: true,
          new: true,
        },
      );

      // if (user) {
      //   const fData = await this.blogModel.findOne({
      //     product: id,
      //     user: user,
      //   });
      //   if (!fData) {
      //     const fProduct = await this.blogModel.findById(id);
      //     const jProduct = JSON.parse(JSON.stringify(fProduct));
      //     const sData = new this.productViewModel({
      //       ...jProduct,
      //       ...{
      //         user: user,
      //         product: id,
      //         totalView: 1,
      //         _id: null,
      //       },
      //     });
      //     await sData.save();
      //   } else {
      //     await this.productViewModel.findByIdAndUpdate(fData._id, {
      //       $inc: { totalView: 1 },
      //     });
      //   }
      // }

      return {
        success: true,
        message: 'Success',
        data: null,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateBlogById
   * updateMultipleBlogById
   */
  async updateBlogById(
    id: string,
    updateBlogDto: UpdateBlogDto,
  ): Promise<ResponsePayload> {
    const { name } = updateBlogDto;
    let data;
    try {
      data = await this.blogModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      const finalData = { ...updateBlogDto };

      await this.blogModel.findByIdAndUpdate(id, {
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

  async updateMultipleBlogById(
    ids: string[],
    updateBlogDto: UpdateBlogDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    try {
      await this.blogModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateBlogDto },
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
   * deleteBlogById
   * deleteMultipleBlogById
   */
  async deleteBlogById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.blogModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.blogModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Delete Successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleBlogById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.blogModel.deleteMany({ _id: ids });
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
  async checkBlogAvailability(
    user: User,
    checkBlogDto: CheckBlogDto,
  ): Promise<ResponsePayload> {
    try {
      const { blogCode, subTotal } = checkBlogDto;

      const blogData = await this.blogModel.findOne({ blogCode });

      if (blogData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          // new Date(blogData.endDateTime),
          'seconds',
        );

        const isStartDate = this.utilsService.getDateDifference(
          new Date(),
          // new Date(blogData.startDateTime),
          'seconds',
        );

        if (isStartDate > 0) {
          return {
            success: false,
            message: 'Sorry! Blog offer is not start yet',
            data: null,
          } as ResponsePayload;
        }

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Blog Expired',
            data: null,
          } as ResponsePayload;
        } else {
          const userBlogExists = await this.userModel.findOne({
            _id: user._id,
            usedBlogs: blogData._id,
          });

          if (userBlogExists) {
            return {
              success: false,
              message: 'Sorry! Blog already used in your account.',
              data: null,
            } as ResponsePayload;
          } else {
            if (blogData['minimumAmount'] > subTotal) {
              return {
                success: false,
                message: `Sorry! Blog minimum amount is ${blogData['minimumAmount']}`,
                data: null,
              } as ResponsePayload;
            } else {
              return {
                success: true,
                message: 'Success! Blog added.',
                data: {
                  _id: blogData._id,
                  discountAmount: blogData['discountAmount'],
                  discountType: blogData['discountType'],
                  blogCode: blogData['blogCode'],
                },
              } as ResponsePayload;
            }
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid profile code',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAllPublished(): Promise<Blog[]> {
    return this.blogModel.find({ status: 'publish' }).select('slug title').exec();
  }
}
