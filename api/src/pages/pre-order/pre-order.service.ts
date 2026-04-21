import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreOrder } from '../../interfaces/common/pre-order.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddPreOrderDto, FilterAndPaginationPreOrderDto, UpdatePreOrderStatusDto } from '../../dto/pre-order.dto';
import { UtilsService } from '../../shared/utils/utils.service';

@Injectable()
export class PreOrderService {
  private logger = new Logger(PreOrderService.name);

  constructor(
    @InjectModel('PreOrder')
    private readonly preOrderModel: Model<PreOrder>,
    private readonly utilsService: UtilsService,
  ) {}

  /**
   * Add Pre Order
   */
  async addPreOrder(addPreOrderDto: AddPreOrderDto): Promise<ResponsePayload> {
    try {
      const newPreOrder = new this.preOrderModel(addPreOrderDto);
      const saveData = await newPreOrder.save();

      return {
        success: true,
        message: 'Pre Order Added Successfully',
        data: saveData,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error(`Error adding pre-order: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Get All Pre Orders
   */
  async getAllPreOrders(
    filterPreOrderDto: FilterAndPaginationPreOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterPreOrderDto;
    const { pagination } = filterPreOrderDto;
    const { sort } = filterPreOrderDto;
    const { select } = filterPreOrderDto;

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
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
              { email: { $regex: searchQuery, $options: 'i' } },
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
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (Object.keys(mSelect).length) {
      aggregateStages.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      const pageSize =
        pagination.pageSize && Number(pagination.pageSize) > 0
          ? Number(pagination.pageSize)
          : 25;
      const currentPage =
        pagination.currentPage && Number(pagination.currentPage) > 0
          ? Number(pagination.currentPage)
          : 1;

      mPagination = {
        skip: pageSize * (currentPage - 1),
        limit: pageSize,
      };
      aggregateStages.push({ $skip: mPagination['skip'] });
      aggregateStages.push({ $limit: mPagination['limit'] });
    }

    // Populate
    aggregateStages.push({
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    });
    aggregateStages.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    });
    aggregateStages.push({
      $project: {
        'product.name': 1,
        'product.nameEn': 1,
        'product.images': 1,
        'product.salePrice': 1,
        name: 1,
        _id: 1,
        phoneNo: 1,
        email: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    try {
      const preOrders = await this.preOrderModel.aggregate(aggregateStages);

      // Count total
      const countFilter = mFilter;
      const totalCount = await this.preOrderModel.countDocuments(countFilter);

      return {
        success: true,
        message: 'Pre Orders Retrieved Successfully',
        data: preOrders,
        count: totalCount,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error(`Error getting pre-orders: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Get Single Pre Order By ID
   */
  async getSinglePreOrderById(id: string, select?: string): Promise<ResponsePayload> {
    try {
      let query = this.preOrderModel.findById(id);
      if (select) {
        query = query.select(select);
      }
      const data = await query
        .populate('product', 'name nameEn images salePrice')
        .populate('user', 'name email phoneNo');

      if (!data) {
        throw new NotFoundException('Pre Order not found');
      }

      return {
        success: true,
        message: 'Pre Order Retrieved Successfully',
        data,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error(`Error getting pre-order: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Update Pre Order Status
   */
  async updatePreOrderStatus(
    id: string,
    updatePreOrderStatusDto: UpdatePreOrderStatusDto,
  ): Promise<ResponsePayload> {
    try {
      const preOrder = await this.preOrderModel.findById(id);
      if (!preOrder) {
        throw new NotFoundException('Pre Order not found');
      }

      const updatedData = await this.preOrderModel.findByIdAndUpdate(
        id,
        { $set: updatePreOrderStatusDto },
        { new: true },
      );

      return {
        success: true,
        message: 'Pre Order Status Updated Successfully',
        data: updatedData,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error(`Error updating pre-order status: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Delete Pre Order By ID
   */
  async deletePreOrderById(id: string): Promise<ResponsePayload> {
    try {
      const preOrder = await this.preOrderModel.findById(id);
      if (!preOrder) {
        throw new NotFoundException('Pre Order not found');
      }

      await this.preOrderModel.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Pre Order Deleted Successfully',
      } as ResponsePayload;
    } catch (error) {
      this.logger.error(`Error deleting pre-order: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }
}

