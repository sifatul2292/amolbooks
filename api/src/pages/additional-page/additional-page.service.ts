import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Cache } from 'cache-manager';
import { AdditionalPage } from '../../interfaces/core/additional-page.interface';
import {
  AddAdditionalPageDto,
  UpdateAdditionalPageDto,
} from '../../dto/additional-page.dto';

const ObjectId = Types.ObjectId;

@Injectable()
export class AdditionalPageService {
  private logger = new Logger(AdditionalPageService.name);
  // Cache
  private readonly cacheAllData = 'getAllAdditionalPage';
  private readonly cacheDataCount = 'getCountAdditionalPage';

  constructor(
    @InjectModel('AdditionalPage')
    private readonly additionalPageModel: Model<AdditionalPage>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * addAdditionalPage
   * insertManyAdditionalPage
   */
  async addAdditionalPage(
    addAdditionalPageDto: AddAdditionalPageDto,
  ): Promise<ResponsePayload> {
    try {
      const pageInfo = await this.additionalPageModel.findOne({
        slug: addAdditionalPageDto.slug,
      });
      if (pageInfo) {
        await this.additionalPageModel.findOneAndUpdate(
          { slug: addAdditionalPageDto.slug },
          {
            $set: addAdditionalPageDto,
          },
        );
        return {
          success: true,
          message: 'Data Updated Success',
          data: null,
        } as ResponsePayload;
      } else {
        const newData = new this.additionalPageModel(addAdditionalPageDto);
        const saveData = await newData.save();
        const data = {
          _id: saveData._id,
        };

        return {
          success: true,
          message: 'Data Added Success',
          data,
        } as ResponsePayload;
      }

      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getAllAdditionalPages
   * getAdditionalPageById
   */

  async getAdditionalPageBySlug(
    slug: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.additionalPageModel
        .findOne({ slug })
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
   * updateAdditionalPageById
   * updateMultipleAdditionalPageById
   */
  async updateAdditionalPageBySlug(
    slug: string,
    updateAdditionalPageDto: UpdateAdditionalPageDto,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.additionalPageModel.findOne({ slug });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.additionalPageModel.findOneAndUpdate(
        { slug },
        {
          $set: updateAdditionalPageDto,
        },
      );
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  /**
   * deleteAdditionalPageById
   * deleteMultipleAdditionalPageById
   */
  async deleteAdditionalPageBySlug(
    slug: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      await this.additionalPageModel.findOneAndDelete({ slug });
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
