import {
  Controller,
  Get,
  Query,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ResponsePayload } from './interfaces/core/response-payload.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Version(VERSION_NEUTRAL)
  @Get('backup')
  async backupDatabase(
    @Query('password') password: string,
  ): Promise<ResponsePayload> {
    return await this.appService.backupDatabase(password);
  }

  @Version(VERSION_NEUTRAL)
  @Get('restore')
  async restoreDatabase(
    @Query('password') password: string,
  ): Promise<ResponsePayload> {
    return await this.appService.restoreDatabase(password);
  }
}
