import { AddSettingDto } from './dto/setting.dto';
import { SettingService } from './setting.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
export declare class SettingController {
    private settingService;
    private logger;
    constructor(settingService: SettingService);
    addSetting(addSettingDto: AddSettingDto): Promise<ResponsePayload>;
    getSetting(select: string): Promise<ResponsePayload>;
    getChatLink(): Promise<ResponsePayload>;
}
