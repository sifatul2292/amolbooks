import { Model } from 'mongoose';
import { AddSettingDto } from './dto/setting.dto';
import { Setting } from './interface/setting.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
export declare class SettingService {
    private readonly settingModel;
    private logger;
    constructor(settingModel: Model<Setting>);
    addSetting(addSettingDto: AddSettingDto): Promise<ResponsePayload>;
    getSetting(select: string): Promise<ResponsePayload>;
    getChatLink(): Promise<ResponsePayload>;
}
