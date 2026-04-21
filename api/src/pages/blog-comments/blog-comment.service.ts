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
import { BlogComment } from '../../interfaces/common/blog-comment.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddBlogCommentDto,
  FilterAndPaginationBlogCommentDto,
  OptionBlogCommentDto,
  UpdateBlogCommentDto,
} from '../../dto/blog-comment.dto';
import { User } from '../../interfaces/user/user.interface';
import { Blog } from '../../interfaces/common/blog.interface';
import { Review } from '../../interfaces/common/review.interface';
const ObjectId = Types.ObjectId;

@Injectable()
export class BlogCommentService {
  private logger = new Logger(BlogCommentService.name);

  constructor(
    @InjectModel('BlogComment')
    private readonly blogCommentModel: Model<Review>,
    @InjectModel('User') private readonly userModel: Model<User>,
    // @InjectModel('Product') private readonly blogModel: Model<Product>,
    @InjectModel('Blog') private readonly blogModel: Model<Blog>,

    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addBlogComment
   * insertManyBlogComment
   */
  async addBlogComment(
    user: User,
    addBlogCommentDto: AddBlogCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const blogData = await this.blogModel
        .findById({ _id: addBlogCommentDto.blog })
        .select('name slug image');

      const userData = await this.userModel
        .findById({ _id: user._id })
        .select('name profileImg');

      const mData = {
        ...addBlogCommentDto,
        ...{
          blog: {
            _id: blogData._id,
            name: blogData.name,
            image: blogData.image,
            slug: blogData.slug,
          },
          user: userData,
        },
      };
      const newData = new this.blogCommentModel(mData);
      await newData.save();

      return {
        success: true,
        message: 'blogComment Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async addBlogCommentByAdmin(
    addBlogCommentDto: AddBlogCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const blogData = await this.blogModel
        .findById({ _id: addBlogCommentDto.blog })
        .select('name slug image');

      const mData = {
        ...addBlogCommentDto,
        ...{
          blog: {
            _id: blogData._id,
            name: blogData.name,
            image: blogData.image,
            slug: blogData.slug,
          },
          user: {
            _id: null,
            name: addBlogCommentDto.name,
            profileImg: null,
          },
        },
      };
      const newData = new this.blogCommentModel(mData);
      await newData.save();

      await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
        $inc: {
          ratingCount: addBlogCommentDto.rating,
          ratingTotal: 1,
          blogCommentTotal: 1,
        },
      });

      switch (addBlogCommentDto.rating) {
        case 1: {
          await this.blogModel.findByIdAndUpdate(
            addBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.oneStar': 1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 2: {
          await this.blogModel.findByIdAndUpdate(
            addBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.twoStar': 1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 3: {
          await this.blogModel.findByIdAndUpdate(
            addBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.threeStar': 1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 4: {
          await this.blogModel.findByIdAndUpdate(
            addBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.fourStar': 1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 5: {
          await this.blogModel.findByIdAndUpdate(
            addBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.fiveStar': 1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        default: {
          //statements;
          break;
        }
      }

      return {
        success: true,
        message: 'blogComment Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getAllBlogCommentsByQuery()
   * getAllBlogComments()
   * getBlogCommentById()
   */
  /**
   * getCartByUserId()
   */
  async getBlogCommentByUserId(user: User): Promise<ResponsePayload> {
    console.log(user);

    try {
      const data = await this.blogCommentModel
        .find({ 'user._id': user._id })
        .populate('user', 'name phoneNo profileImg username')
        .populate('blog', 'name slug image ')
        .sort({ createdAt: -1 });

      return {
        data: data,
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async getAllBlogCommentsByQuery(
    filterBlogCommentDto: FilterAndPaginationBlogCommentDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterBlogCommentDto;
    const { pagination } = filterBlogCommentDto;
    const { sort } = filterBlogCommentDto;
    const { select } = filterBlogCommentDto;
    const { filterGroup } = filterBlogCommentDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match

    if (filter) {
      if (filter['blog._id']) {
        filter['blog._id'] = new ObjectId(filter['blog._id']);
      }
      mFilter = { ...mFilter, ...filter };
    }
    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { orderId: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ],
      };
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
      const dataAggregates = await this.blogCommentModel.aggregate(
        aggregateStages,
      );
      // .populate('user', 'fullName profileImg username')
      //     .populate('blog', 'blogName blogSlug images categorySlug')
      //     .sort({createdAt: -1})

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

  async getAllBlogComments(): Promise<ResponsePayload> {
    try {
      const blogComments = await this.blogCommentModel
        .find()
        .populate('user', 'name phoneNo profileImg username')
        .populate('blog', 'name slug image ')
        .sort({ createdAt: -1 });
      return {
        success: true,
        message: 'Success',
        data: blogComments,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getBlogCommentById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.blogCommentModel.findById(id).select(select);

      // const blogCommentId = req.params.blogCommentId;
      // const blogComment = await BlogCommentControl.findOne({_id: blogCommentId});

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
   * updateBlogCommentById
   * updateMultipleBlogCommentById
   */
  async updateBlogCommentById(
    updateBlogCommentDto: UpdateBlogCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.blogCommentModel.findById(updateBlogCommentDto);
      // console.log('data++++', data);

      if (data.status === updateBlogCommentDto.status) {
        await this.blogCommentModel.updateOne(
          { _id: updateBlogCommentDto },
          { $set: updateBlogCommentDto },
        );
      } else {
        if (data.status === true && updateBlogCommentDto.status === false) {
          await this.blogCommentModel.updateOne(
            { _id: updateBlogCommentDto },
            { $set: updateBlogCommentDto },
          );

          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog._id,
            {
              $inc: {
                ratingCount: -updateBlogCommentDto.rating,
                ratingTotal: -1,
                blogCommentTotal: -1,
              },
            },
          );

          switch (updateBlogCommentDto.rating) {
            case 1: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.oneStar': -1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 2: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.twoStar': -1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 3: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.threeStar': -1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 4: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.fourStar': -1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 5: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.fiveStar': -1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            default: {
              //statements;
              break;
            }
          }
        } else {
          await this.blogCommentModel.updateOne(
            { _id: updateBlogCommentDto },
            { $set: updateBlogCommentDto },
          );

          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog._id,
            {
              $inc: {
                ratingCount: updateBlogCommentDto.rating,
                ratingTotal: 1,
                blogCommentTotal: 1,
              },
            },
          );

          switch (updateBlogCommentDto.rating) {
            case 1: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.oneStar': 1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 2: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.twoStar': 1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 3: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.threeStar': 1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 4: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.fourStar': 1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            case 5: {
              await this.blogModel.findByIdAndUpdate(
                updateBlogCommentDto.blog,
                {
                  $inc: {
                    'ratingDetails.fiveStar': 1,
                  },
                },
                {
                  upsert: true,
                  new: true,
                },
              );
              break;
            }
            default: {
              //statements;
              break;
            }
          }
        }
      }

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      // console.log('update', err);
      throw new InternalServerErrorException();
    }
  }

  async updateBlogCommentByIdAndDelete(
    updateBlogCommentDto: UpdateBlogCommentDto,
  ): Promise<ResponsePayload> {
    try {
      await this.blogCommentModel.updateOne(
        { _id: updateBlogCommentDto },
        { $set: updateBlogCommentDto },
      );

      await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog._id, {
        $inc: {
          ratingCount: -updateBlogCommentDto.rating,
          ratingTotal: -1,
          blogCommentTotal: -1,
        },
      });

      switch (updateBlogCommentDto.rating) {
        case 1: {
          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.oneStar': -1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 2: {
          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.twoStar': -1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 3: {
          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.threeStar': -1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 4: {
          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.fourStar': -1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        case 5: {
          await this.blogModel.findByIdAndUpdate(
            updateBlogCommentDto.blog,
            {
              $inc: {
                'ratingDetails.fiveStar': -1,
              },
            },
            {
              upsert: true,
              new: true,
            },
          );
          break;
        }
        default: {
          //statements;
          break;
        }
      }
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      // console.log('update', err);
      throw new InternalServerErrorException();
    }
  }

  /**
   * deleteBlogCommentById
   * deleteMultipleBlogCommentById
   */
  async deleteBlogCommentById(id: string): Promise<ResponsePayload> {
    try {
      await this.blogCommentModel.deleteOne({ _id: id });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteBlogCommentByLoggedinUserAndBlogCommentId(
    id: string,
    user: User,
  ): Promise<ResponsePayload> {
    try {
      await this.blogCommentModel.deleteOne({ _id: id, 'user._id': user._id });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
