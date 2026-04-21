import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddSettingDto } from './dto/setting.dto';
import { Setting } from './interface/setting.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';

@Injectable()
export class SettingService {
  private logger = new Logger(SettingService.name);

  constructor(
    @InjectModel('Setting')
    private readonly settingModel: Model<Setting>,
  ) {}

  /**
   * addSetting
   * insertManySetting
   */
  async addSetting(addSettingDto: AddSettingDto): Promise<ResponsePayload> {
    try {
      const settingData = await this.settingModel.findOne({});
      if (settingData) {
        await this.settingModel.findByIdAndUpdate(settingData._id, {
          $set: addSettingDto,
        });
        const data = {
          _id: settingData._id,
        };

        return {
          success: true,
          message: 'Data Updated Success',
          data,
        } as ResponsePayload;
      } else {
        const mData = {
          ...addSettingDto,
        };
        const newData = new this.settingModel(mData);
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
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * getSetting
   * getSettingById
   */

  async getSetting(select: string): Promise<ResponsePayload> {
    try {
      const data = await this.settingModel.findOne().select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getChatLink(): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel
        .findOne({ })
        .select('chats -_id');

      const fChatLink = fSetting?.chats ?? [];
      const chatLink = fChatLink.filter(
        (f) => f.status === 'active',
      );
      return {
        success: true,
        message: 'Success',
        data: chatLink,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

}
