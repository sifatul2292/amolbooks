import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AddSettingDto } from './dto/setting.dto';
import { SettingService } from './setting.service';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';

@Controller('setting')
export class SettingController {
  private logger = new Logger(SettingController.name);

  constructor(private settingService: SettingService) {}

  /**
   * addSetting
   * insertManySetting
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async addSetting(
    @Body()
    addSettingDto: AddSettingDto,
  ): Promise<ResponsePayload> {
    return await this.settingService.addSetting(addSettingDto);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get')
  async getSetting(@Query('select') select: string): Promise<ResponsePayload> {
    return await this.settingService.getSetting(select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-chat-link')
  @UsePipes(ValidationPipe)
  async getChatLink(

  ): Promise<ResponsePayload> {
    return await this.settingService.getChatLink();
  }
}
