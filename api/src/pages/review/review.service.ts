/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddReviewDto,
  FilterAndPaginationReviewDto,
  UpdateReviewDto,
} from '../../dto/review.dto';
import { Product } from '../../interfaces/common/product.interface';
import { Review } from 'src/interfaces/common/review.interface';
import { User } from '../../interfaces/user/user.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class ReviewService {
  private logger = new Logger(ReviewService.name);

  constructor(
    @InjectModel('Review') private readonly reviewModel: Model<Review>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addReview
   * insertManyReview
   */
  async addReview(
    user: User,
    addReviewDto: AddReviewDto,
  ): Promise<ResponsePayload> {
    try {
      const productData = await this.productModel
        .findById({ _id: addReviewDto.product })
        .select('name slug images');

      const userData = await this.userModel
        .findById({ _id: user._id })
        .select('name profileImg');

      const mData = {
        ...addReviewDto,
        ...{
          product: {
            _id: productData._id,
            name: productData.name,
            images: productData.images,
            slug: productData.slug,
          },
          user: {
            _id: userData._id,
            name: addReviewDto.name,
            profileImg: userData.profileImg,
          },
        },
      };
      const newData = new this.reviewModel(mData);
      await newData.save();

      return {
        success: true,
        message: 'review Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async addReviewByAdmin(addReviewDto: AddReviewDto): Promise<ResponsePayload> {
    try {
      const productData = await this.productModel
        .findById({ _id: addReviewDto.product })
        .select('name slug images');

      const mData = {
        ...addReviewDto,
        ...{
          product: {
            _id: productData._id,
            name: productData.name,
            images: productData.images,
            slug: productData.slug,
          },
          user: {
            _id: null,
            name: addReviewDto.name,
            profileImg: null,
          },
        },
      };
      const newData = new this.reviewModel(mData);
      await newData.save();

      await this.productModel.findByIdAndUpdate(addReviewDto.product, {
        $inc: {
          ratingCount: addReviewDto.rating,
          ratingTotal: 1,
          reviewTotal: 1,
        },
      });

      switch (addReviewDto.rating) {
        case 1: {
          await this.productModel.findByIdAndUpdate(
            addReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            addReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            addReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            addReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            addReviewDto.product,
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
        message: 'review Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getAllReviewsByQuery()
   * getAllReviews()
   * getReviewById()
   */
  /**
   * getCartByUserId()
   */
  async getReviewByUserId(user: User): Promise<ResponsePayload> {
    // console.log(user);

    try {
      const data = await this.reviewModel
        .find({ 'user._id': user._id })
        .populate('user', 'name phoneNo profileImg username')
        .populate('product', 'name slug images ')
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

  async getAllReviewsByQuery(
    filterReviewDto: FilterAndPaginationReviewDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterReviewDto;
    const { pagination } = filterReviewDto;
    const { sort } = filterReviewDto;
    const { select } = filterReviewDto;
    const { filterGroup } = filterReviewDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match

    if (filter) {
      if (filter['product._id']) {
        filter['product._id'] = new ObjectId(filter['product._id']);
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
      const dataAggregates = await this.reviewModel.aggregate(aggregateStages);
      // .populate('user', 'fullName profileImg username')
      //     .populate('product', 'productName productSlug images categorySlug')
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

  async getAllReviews(): Promise<ResponsePayload> {
    try {
      const reviews = await this.reviewModel
        .find()
        .populate('user', 'name phoneNo profileImg username')
        .populate('product', 'name slug images ')
        .sort({ createdAt: -1 });
      return {
        success: true,
        message: 'Success',
        data: reviews,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getReviewById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.reviewModel.findById(id).select(select);

      // const reviewId = req.params.reviewId;
      // const review = await ReviewControl.findOne({_id: reviewId});

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
   * updateReviewById
   * updateMultipleReviewById
   */
  async updateReviewById(
    updateReviewDto: UpdateReviewDto,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.reviewModel.findById(updateReviewDto);
      // console.log('data++++', data);

      if (data.status === updateReviewDto.status) {
        await this.reviewModel.updateOne(
          { _id: updateReviewDto },
          { $set: updateReviewDto },
        );
      } else {
        if (data.status === true && updateReviewDto.status === false) {
          await this.reviewModel.updateOne(
            { _id: updateReviewDto },
            { $set: updateReviewDto },
          );

          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product._id,
            {
              $inc: {
                ratingCount: -updateReviewDto.rating,
                ratingTotal: -1,
                reviewTotal: -1,
              },
            },
          );

          switch (updateReviewDto.rating) {
            case 1: {
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
          await this.reviewModel.updateOne(
            { _id: updateReviewDto },
            { $set: updateReviewDto },
          );

          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product._id,
            {
              $inc: {
                ratingCount: updateReviewDto.rating,
                ratingTotal: 1,
                reviewTotal: 1,
              },
            },
          );

          switch (updateReviewDto.rating) {
            case 1: {
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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
              await this.productModel.findByIdAndUpdate(
                updateReviewDto.product,
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

  async updateReviewByIdAndDelete(
    updateReviewDto: UpdateReviewDto,
  ): Promise<ResponsePayload> {
    try {
      await this.reviewModel.updateOne(
        { _id: updateReviewDto },
        { $set: updateReviewDto },
      );

      await this.productModel.findByIdAndUpdate(updateReviewDto.product._id, {
        $inc: {
          ratingCount: -updateReviewDto.rating,
          ratingTotal: -1,
          reviewTotal: -1,
        },
      });

      switch (updateReviewDto.rating) {
        case 1: {
          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product,
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
          await this.productModel.findByIdAndUpdate(
            updateReviewDto.product,
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
   * deleteReviewById
   * deleteMultipleReviewById
   */
  async deleteReviewById(id: string): Promise<ResponsePayload> {
    try {
      await this.reviewModel.deleteOne({ _id: id });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteReviewByLoggedinUserAndReviewId(
    id: string,
    user: User,
  ): Promise<ResponsePayload> {
    try {
      await this.reviewModel.deleteOne({ _id: id, 'user._id': user._id });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
