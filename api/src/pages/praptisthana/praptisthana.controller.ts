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
import { User } from '../../interfaces/user/user.interface';
import { GetTokenUser } from '../../decorator/get-token-user.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import {
  AddPraptisthanaDto,
  CheckPraptisthanaDto,
  FilterAndPaginationPraptisthanaDto,
  OptionPraptisthanaDto,
  UpdatePraptisthanaDto,
} from '../../dto/praptisthana.dto';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { PraptisthanaService } from './praptisthana.service';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';

@Controller('praptisthana')
export class PraptisthanaController {
  private logger = new Logger(PraptisthanaController.name);

  constructor(private praptisthanaService: PraptisthanaService) {}

  /**
   * addPraptisthana
   * insertManyPraptisthana
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addPraptisthana(
    @Body()
    addPraptisthanaDto: AddPraptisthanaDto,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.addPraptisthana(addPraptisthanaDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyPraptisthana(
    @Body()
    body: {
      data: AddPraptisthanaDto[];
      option: OptionPraptisthanaDto;
    },
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.insertManyPraptisthana(
      body.data,
      body.option,
    );
  }

  /**
   * getAllPraptisthanas
   * getPraptisthanaById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllPraptisthanas(
    @Body() filterPraptisthanaDto: FilterAndPaginationPraptisthanaDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.praptisthanaService.getAllPraptisthanas(
      filterPraptisthanaDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllPraptisthanasBasic(): Promise<ResponsePayload> {
    return await this.praptisthanaService.getAllPraptisthanasBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getPraptisthanaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.getPraptisthanaById(id, select);
  }

  /**
   * updatePraptisthanaById
   * updateMultiplePraptisthanaById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updatePraptisthanaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updatePraptisthanaDto: UpdatePraptisthanaDto,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.updatePraptisthanaById(
      id,
      updatePraptisthanaDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultiplePraptisthanaById(
    @Body() updatePraptisthanaDto: UpdatePraptisthanaDto,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.updateMultiplePraptisthanaById(
      updatePraptisthanaDto.ids,
      updatePraptisthanaDto,
    );
  }

  /**
   * deletePraptisthanaById
   * deleteMultiplePraptisthanaById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deletePraptisthanaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.deletePraptisthanaById(
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
  async deleteMultiplePraptisthanaById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.deleteMultiplePraptisthanaById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-contact-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkPraptisthanaAvailability(
    @GetTokenUser() user: User,
    @Body() checkPraptisthanaDto: CheckPraptisthanaDto,
  ): Promise<ResponsePayload> {
    return await this.praptisthanaService.checkPraptisthanaAvailability(
      user,
      checkPraptisthanaDto,
    );
  }
}
