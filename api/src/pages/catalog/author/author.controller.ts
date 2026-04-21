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
  AddAuthorDto,
  CheckAuthorDto,
  FilterAndPaginationAuthorDto,
  OptionAuthorDto,
  UpdateAuthorDto,
} from '../../../dto/author.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { AuthorService } from './author.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';

@Controller('author')
export class AuthorController {
  private logger = new Logger(AuthorController.name);

  constructor(private authorService: AuthorService) {}

  /**
   * addAuthor
   * insertManyAuthor
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addAuthor(
    @Body()
    addAuthorDto: AddAuthorDto,
  ): Promise<ResponsePayload> {
    console.warn(addAuthorDto);
    return await this.authorService.addAuthor(addAuthorDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyAuthor(
    @Body()
    body: {
      data: AddAuthorDto[];
      option: OptionAuthorDto;
    },
  ): Promise<ResponsePayload> {
    return await this.authorService.insertManyAuthor(body.data, body.option);
  }

  /**
   * getAllAuthors
   * getAuthorById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllAuthors(
    @Body() filterAuthorDto: FilterAndPaginationAuthorDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.authorService.getAllAuthors(filterAuthorDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllAuthorsBasic(): Promise<ResponsePayload> {
    return await this.authorService.getAllAuthorsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/slug/:slug')
  async getAuthorBySlug(
    @Param('slug') slug: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.authorService.getAuthorBySlug(slug, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getAuthorById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.authorService.getAuthorById(id, select);
  }

  /**
   * updateAuthorById
   * updateMultipleAuthorById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateAuthorById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ): Promise<ResponsePayload> {
    return await this.authorService.updateAuthorById(id, updateAuthorDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleAuthorById(
    @Body() updateAuthorDto: UpdateAuthorDto,
  ): Promise<ResponsePayload> {
    return await this.authorService.updateMultipleAuthorById(
      updateAuthorDto.ids,
      updateAuthorDto,
    );
  }

  /**
   * deleteAuthorById
   * deleteMultipleAuthorById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteAuthorById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.authorService.deleteAuthorById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleAuthorById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.authorService.deleteMultipleAuthorById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-author-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkAuthorAvailability(
    @GetTokenUser() user: User,
    @Body() checkAuthorDto: CheckAuthorDto,
  ): Promise<ResponsePayload> {
    return await this.authorService.checkAuthorAvailability(
      user,
      checkAuthorDto,
    );
  }
}
