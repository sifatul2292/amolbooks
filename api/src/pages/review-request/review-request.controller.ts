import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../decorator/get-token-user.decorator';
import { ReviewLoginService } from './review-login.service';
import { ReviewRequestService } from './review-request.service';

const SNIPPETS_DIR = join(__dirname, '..', '..', '..', '..', 'gtm-snippets');
/** Page scripts the storefront loads only where needed (small loaders are in the storefront snippets). */
const PAGE_SCRIPTS = ['order-review.js', 'customer-dashboard.js', 'checkout-location.js'];
/** Served with these files first: the checkout's district picker uses the delivery zone rules the API uses too. */
const PAGE_SCRIPT_PARTS: Record<string, string[]> = {
  'checkout-location.js': ['delivery-zone-core.js', 'checkout-location.js'],
};

/**
 * Serves the storefront's larger page scripts: the review page (/pages/order-review, loaded by
 * gtm-snippets/order-review-loader.html), the customer dashboard (/account/..., loaded by
 * gtm-snippets/customer-dashboard-loader.html) and the checkout's district picker (/checkout,
 * loaded by gtm-snippets/checkout-location-loader.html). Read on each request, so a deploy needs no
 * restart.
 */
@Controller('storefront-page')
export class StorefrontPageController {
  @Version(VERSION_NEUTRAL)
  @Get(':file')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  script(@Param('file') file: string) {
    if (!PAGE_SCRIPTS.includes(String(file || ''))) throw new NotFoundException();
    try {
      return (PAGE_SCRIPT_PARTS[file] || [file]).map((part) => readFileSync(join(SNIPPETS_DIR, part), 'utf8')).join('\n;\n');
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}

/**
 * The review page behind the WhatsApp review request. amolbooks.com/rate/<token> opens
 * /pages/order-review inside the storefront (its own header, footer and login). The secret link is
 * the key and only opens that order's books; login needs an SMS code to the order's number. Staff
 * numbers: admin/stats.
 */
@Controller('order-review')
export class ReviewRequestController {
  constructor(
    private readonly reviewRequests: ReviewRequestService,
    private readonly reviewLogin: ReviewLoginService,
  ) {}

  @Version(VERSION_NEUTRAL)
  @Get('admin/stats')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminMetaRoles(...Object.values(AdminRoles))
  stats(@Query('days') days: any) {
    return this.reviewRequests.stats(days);
  }

  /** Daily limit, today's count and whether the messages are on (Customer Manager page). */
  @Version(VERSION_NEUTRAL)
  @Get('admin/settings')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminMetaRoles(...Object.values(AdminRoles))
  @Header('Cache-Control', 'no-store')
  settings() {
    return this.reviewRequests.settings();
  }

  @Version(VERSION_NEUTRAL)
  @Put('admin/settings')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  saveSettings(@Body() body: any, @Req() request: any) {
    return this.reviewRequests.setDailyLimit(body?.dailyLimit, request.user || request.admin);
  }

  /** The logged-in customer's open review links (dashboard "রিভিউ দিন" opens that order's page). */
  @Version(VERSION_NEUTRAL)
  @Get('mine')
  @UseGuards(UserJwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  mine(@GetTokenUser() user: any) {
    return this.reviewRequests.linksFor(user);
  }

  /** Books to buy next for the logged-in customer (dashboard overview shelf). */
  @Version(VERSION_NEUTRAL)
  @Get('mine/books')
  @UseGuards(UserJwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  mineBooks(@GetTokenUser() user: any) {
    return this.reviewRequests.moreForUser(user);
  }

  @Version(VERSION_NEUTRAL)
  @Get(':token')
  @Header('Cache-Control', 'no-store')
  page(@Param('token') token: string) {
    return this.reviewRequests.page(token);
  }

  @Version(VERSION_NEUTRAL)
  @Post(':token')
  @HttpCode(200)
  submit(@Param('token') token: string, @Body() body: any, @Req() req: Request) {
    return this.reviewRequests.submit(token, body, req.hostname);
  }

  @Version(VERSION_NEUTRAL)
  @Post(':token/login-code')
  @Throttle(3, 60)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  loginCode(@Param('token') token: string, @Body() body: any) {
    return this.reviewLogin.sendCode(token, body?.phone);
  }

  @Version(VERSION_NEUTRAL)
  @Post(':token/login')
  @Throttle(10, 60)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Param('token') token: string, @Body() body: any) {
    return this.reviewLogin.login(token, body?.code);
  }
}
