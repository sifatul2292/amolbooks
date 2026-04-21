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
import { ActivitiesComment } from '../../interfaces/common/activities-comment.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import {
  AddActivitiesCommentDto,
  FilterAndPaginationActivitiesCommentDto,
  OptionActivitiesCommentDto,
  UpdateActivitiesCommentDto,
} from '../../dto/activities-comment.dto';
import { User } from '../../interfaces/user/user.interface';
import { Activities } from '../../interfaces/common/activities.interface';
import { Review } from '../../interfaces/common/review.interface';
const ObjectId = Types.ObjectId;

@Injectable()
export class ActivitiesCommentService {
  private logger = new Logger(ActivitiesCommentService.name);

  constructor(
    @InjectModel('ActivitiesComment')
    private readonly activitiesCommentModel: Model<Review>,
    @InjectModel('User') private readonly userModel: Model<User>,
    // @InjectModel('Product') private readonly activitiesModel: Model<Product>,
    @InjectModel('Activities')
    private readonly activitiesModel: Model<Activities>,

    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addActivitiesComment
   * insertManyActivitiesComment
   */
  async addActivitiesComment(
    user: User,
    addActivitiesCommentDto: AddActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const activitiesData = await this.activitiesModel
        .findById({ _id: addActivitiesCommentDto.activities })
        .select('name slug image');

      const userData = await this.userModel
        .findById({ _id: user._id })
        .select('name profileImg');

      const mData = {
        ...addActivitiesCommentDto,
        ...{
          activities: {
            _id: activitiesData._id,
            name: activitiesData.name,
            image: activitiesData.image,
            slug: activitiesData.slug,
          },
          user: {
            _id: userData._id,
            name: addActivitiesCommentDto.userName,
            profileImg: userData.profileImg,
          },
        },
      };
      const newData = new this.activitiesCommentModel(mData);
      await newData.save();

      return {
        success: true,
        message: 'activitiesComment Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async addActivitiesCommentByAdmin(
    addActivitiesCommentDto: AddActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const activitiesData = await this.activitiesModel
        .findById({ _id: addActivitiesCommentDto.activities })
        .select('name slug image');

      const mData = {
        ...addActivitiesCommentDto,
        ...{
          activities: {
            _id: activitiesData._id,
            name: activitiesData.name,
            image: activitiesData.image,
            slug: activitiesData.slug,
          },
          user: {
            _id: null,
            name: addActivitiesCommentDto.name,
            profileImg: null,
          },
        },
      };
      const newData = new this.activitiesCommentModel(mData);
      await newData.save();

      await this.activitiesModel.findByIdAndUpdate(
        addActivitiesCommentDto.activities,
        {
          $inc: {
            ratingCount: addActivitiesCommentDto.rating,
            ratingTotal: 1,
            activitiesCommentTotal: 1,
          },
        },
      );

      switch (addActivitiesCommentDto.rating) {
        case 1: {
          await this.activitiesModel.findByIdAndUpdate(
            addActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            addActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            addActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            addActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            addActivitiesCommentDto.activities,
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
        message: 'activitiesComment Added Successfully!',
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getAllActivitiesCommentsByQuery()
   * getAllActivitiesComments()
   * getActivitiesCommentById()
   */
  /**
   * getCartByUserId()
   */
  async getActivitiesCommentByUserId(user: User): Promise<ResponsePayload> {
    console.log(user);

    try {
      const data = await this.activitiesCommentModel
        .find({ 'user._id': user._id })
        .populate('user', 'name phoneNo profileImg username')
        .populate('activities', 'name slug image ')
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

  async getAllActivitiesCommentsByQuery(
    filterActivitiesCommentDto: FilterAndPaginationActivitiesCommentDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterActivitiesCommentDto;
    const { pagination } = filterActivitiesCommentDto;
    const { sort } = filterActivitiesCommentDto;
    const { select } = filterActivitiesCommentDto;
    const { filterGroup } = filterActivitiesCommentDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match

    if (filter) {
      if (filter['activities._id']) {
        filter['activities._id'] = new ObjectId(filter['activities._id']);
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
      const dataAggregates = await this.activitiesCommentModel.aggregate(
        aggregateStages,
      );
      // .populate('user', 'fullName profileImg username')
      //     .populate('activities', 'activitiesName activitiesSlug images categorySlug')
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

  async getAllActivitiesComments(): Promise<ResponsePayload> {
    try {
      const activitiesComments = await this.activitiesCommentModel
        .find()
        .populate('user', 'name phoneNo profileImg username')
        .populate('activities', 'name slug image ')
        .sort({ createdAt: -1 });
      return {
        success: true,
        message: 'Success',
        data: activitiesComments,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getActivitiesCommentById(
    id: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.activitiesCommentModel
        .findById(id)
        .select(select);

      // const activitiesCommentId = req.params.activitiesCommentId;
      // const activitiesComment = await ActivitiesCommentControl.findOne({_id: activitiesCommentId});

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
   * updateActivitiesCommentById
   * updateMultipleActivitiesCommentById
   */
  async updateActivitiesCommentById(
    updateActivitiesCommentDto: UpdateActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.activitiesCommentModel.findById(
        updateActivitiesCommentDto,
      );
      // console.log('data++++', data);

      if (data.status === updateActivitiesCommentDto.status) {
        await this.activitiesCommentModel.updateOne(
          { _id: updateActivitiesCommentDto },
          { $set: updateActivitiesCommentDto },
        );
      } else {
        if (
          data.status === true &&
          updateActivitiesCommentDto.status === false
        ) {
          await this.activitiesCommentModel.updateOne(
            { _id: updateActivitiesCommentDto },
            { $set: updateActivitiesCommentDto },
          );

          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities._id,
            {
              $inc: {
                ratingCount: -updateActivitiesCommentDto.rating,
                ratingTotal: -1,
                activitiesCommentTotal: -1,
              },
            },
          );

          switch (updateActivitiesCommentDto.rating) {
            case 1: {
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
          await this.activitiesCommentModel.updateOne(
            { _id: updateActivitiesCommentDto },
            { $set: updateActivitiesCommentDto },
          );

          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities._id,
            {
              $inc: {
                ratingCount: updateActivitiesCommentDto.rating,
                ratingTotal: 1,
                activitiesCommentTotal: 1,
              },
            },
          );

          switch (updateActivitiesCommentDto.rating) {
            case 1: {
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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
              await this.activitiesModel.findByIdAndUpdate(
                updateActivitiesCommentDto.activities,
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

  async updateActivitiesCommentByIdAndDelete(
    updateActivitiesCommentDto: UpdateActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    try {
      await this.activitiesCommentModel.updateOne(
        { _id: updateActivitiesCommentDto },
        { $set: updateActivitiesCommentDto },
      );

      await this.activitiesModel.findByIdAndUpdate(
        updateActivitiesCommentDto.activities._id,
        {
          $inc: {
            ratingCount: -updateActivitiesCommentDto.rating,
            ratingTotal: -1,
            activitiesCommentTotal: -1,
          },
        },
      );

      switch (updateActivitiesCommentDto.rating) {
        case 1: {
          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities,
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
          await this.activitiesModel.findByIdAndUpdate(
            updateActivitiesCommentDto.activities,
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
   * deleteActivitiesCommentById
   * deleteMultipleActivitiesCommentById
   */
  async deleteActivitiesCommentById(id: string): Promise<ResponsePayload> {
    try {
      await this.activitiesCommentModel.deleteOne({ _id: id });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(
    id: string,
    user: User,
  ): Promise<ResponsePayload> {
    try {
      await this.activitiesCommentModel.deleteOne({
        _id: id,
        'user._id': user._id,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
