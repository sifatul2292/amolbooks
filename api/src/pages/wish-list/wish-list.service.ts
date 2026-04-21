import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Product } from '../../interfaces/common/product.interface';
import { User } from '../../interfaces/user/user.interface';
import {
  AddWishListDto,
  UpdateWishListDto,
  UpdateWishListQty,
} from '../../dto/wish-list.dto';
import { WishList } from '../../interfaces/common/wish-list.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class WishListService {
  private logger = new Logger(WishListService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<WishList>,
    @InjectModel('WishList') private readonly wishListModel: Model<WishList>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * addToWishList()
   * addToWishListMultiple()
   */
  async addToWishList(
    addWishListDto: AddWishListDto,
    user: User,
  ): Promise<ResponsePayload> {
    const userId = user._id;
    const data = addWishListDto;
    const final = { ...data, ...{ user: userId } };

    try {
      const wishListData = await this.wishListModel.findOne({
        user: userId,
        product: addWishListDto.product,
      });
      if (wishListData) {
        await this.wishListModel.findByIdAndUpdate(wishListData._id, {
          $inc: { selectedQty: addWishListDto.selectedQty },
        });
        return {
          success: true,
          message: 'WishList Item Updated Successfully!',
        } as ResponsePayload;
      } else {
        const newData = new this.wishListModel(final);
        const saveData = await newData.save();

        await this.userModel.findOneAndUpdate(
          { _id: userId },
          {
            $push: {
              wishLists: saveData._id,
            },
          },
        );

        return {
          success: true,
          message: 'Added to WishList Successfully!',
        } as ResponsePayload;
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async addToWishListMultiple(
    addWishListDto: AddWishListDto[],
    user: User,
  ): Promise<ResponsePayload> {
    const userId = user._id;

    try {
      for (const data of addWishListDto) {
        const wishListData = await this.wishListModel.findOne({
          user: userId,
          product: data.product,
        });

        if (wishListData) {
          await this.wishListModel.findByIdAndUpdate(wishListData._id, {
            $inc: { selectedQty: data.selectedQty },
          });
        } else {
          const final = { ...data, ...{ user: userId } };
          const newData = new this.wishListModel(final);
          const saveData = await newData.save();

          await this.userModel.findOneAndUpdate(
            { _id: userId },
            {
              $push: {
                wishLists: saveData._id,
              },
            },
          );
        }
      }
      return {
        success: true,
        message: 'Multiple Added to WishList Successfully!',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getWishListByUserId()
   */
  async getWishListByUserId(user: User): Promise<ResponsePayload> {
    try {
      // console.log('user555', user);
      const data = await this.wishListModel
        .find({ user: user._id })
        .populate(
          'product',
          'name slug description salePrice sku tax discountType discountAmount images quantity category subCategory brand tags',
        );

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

  /**
   * deleteWishListById()
   */
  async deleteWishListById(id: string, user: User): Promise<ResponsePayload> {
    try {
      await this.wishListModel.findByIdAndDelete(id);

      await this.userModel.findByIdAndUpdate(user._id, {
        $pull: { wishLists: { $in: id } },
      });

      return {
        success: true,
        message: 'Item Removed Successfully From WishList!',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateWishListDyId()
   */
  async updateWishListById(
    id: string,
    updateWishListDto: UpdateWishListDto,
  ): Promise<ResponsePayload> {
    try {
      console.log('updateWishListDto', updateWishListDto);
      await this.wishListModel.findByIdAndUpdate(id, {
        $set: updateWishListDto,
      });

      return {
        success: true,
        message: 'Item Updated Successfully!',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateWishListQty()
   */
  async updateWishListQty(
    id: string,
    updateWishListQty: UpdateWishListQty,
  ): Promise<ResponsePayload> {
    try {
      if (updateWishListQty.type == 'increment') {
        await this.wishListModel.findByIdAndUpdate(id, {
          $inc: {
            selectedQty: updateWishListQty.selectedQty,
          },
        });
      }

      if (updateWishListQty.type == 'decrement') {
        await this.wishListModel.findByIdAndUpdate(id, {
          $inc: {
            selectedQty: -updateWishListQty.selectedQty,
          },
        });
      }

      return {
        success: true,
        message: 'Quantity Updated Successfully!',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }
}
