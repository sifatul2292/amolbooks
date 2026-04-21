import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import {
  AddPublisherDto,
  CheckPublisherDto,
  FilterAndPaginationPublisherDto,
  OptionPublisherDto,
  UpdatePublisherDto,
} from '../../../dto/publisher.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { PublisherService } from './publisher.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';

@Controller('publisher')
export class PublisherController {
  private logger = new Logger(PublisherController.name);

  constructor(private publisherService: PublisherService) {}

  /**
   * addPublisher
   * insertManyPublisher
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addPublisher(
    @Body()
    addPublisherDto: AddPublisherDto,
  ): Promise<ResponsePayload> {
    return await this.publisherService.addPublisher(addPublisherDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyPublisher(
    @Body()
    body: {
      data: AddPublisherDto[];
      option: OptionPublisherDto;
    },
  ): Promise<ResponsePayload> {
    return await this.publisherService.insertManyPublisher(body.data, body.option);
  }

  /**
   * getAllPublishers
   * getPublisherById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllPublishers(
    @Body() filterPublisherDto: FilterAndPaginationPublisherDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.publisherService.getAllPublishers(
      filterPublisherDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllPublishersBasic(): Promise<ResponsePayload> {
    return await this.publisherService.getAllPublishersBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getPublisherById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.publisherService.getPublisherById(id, select);
  }

  /**
   * updatePublisherById
   * updateMultiplePublisherById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updatePublisherById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updatePublisherDto: UpdatePublisherDto,
  ): Promise<ResponsePayload> {
    // eslint-disable-next-line prettier/prettier
    return await this.publisherService.updatePublisherById(id, updatePublisherDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultiplePublisherById(
    @Body() updatePublisherDto: UpdatePublisherDto,
  ): Promise<ResponsePayload> {
    return await this.publisherService.updateMultiplePublisherById(
      updatePublisherDto.ids,
      updatePublisherDto,
    );
  }

  /**
   * deletePublisherById
   * deleteMultiplePublisherById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deletePublisherById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.publisherService.deletePublisherById(
      id,
      Boolean(checkUsage),
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultiplePublisherById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.publisherService.deleteMultiplePublisherById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-publisher-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkPublisherAvailability(
    @GetTokenUser() user: User,
    @Body() checkPublisherDto: CheckPublisherDto,
  ): Promise<ResponsePayload> {
    return await this.publisherService.checkPublisherAvailability(
      user,
      checkPublisherDto,
    );
  }
}
