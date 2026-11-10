import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { GetAdmin } from '../../decorator/get-admin.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { WhatsappInboxService } from './whatsapp-inbox.service';

const ALL_STAFF = Object.values(AdminRoles);

/**
 * WhatsApp Inbox for staff (every route needs a staff login). The page polls the list and the
 * open chat; staff in the office share one internet address, so the reads skip the per-address
 * limit like the staff board does.
 */
@Controller('whatsapp-inbox')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class WhatsappInboxController {
  constructor(private readonly inbox: WhatsappInboxService) {}

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Get('chats')
  @AdminMetaRoles(...ALL_STAFF)
  chats(@Query() query: any, @GetAdmin() admin: any) {
    return this.inbox.chats(query, admin);
  }

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Get('chats/:wa')
  @AdminMetaRoles(...ALL_STAFF)
  messages(@Param('wa') wa: string, @Query() query: any, @GetAdmin() admin: any) {
    return this.inbox.messages(wa, query, admin);
  }

  @Version(VERSION_NEUTRAL)
  @Post('chats/:wa/reply')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  reply(@Param('wa') wa: string, @Body() body: any, @GetAdmin() admin: any) {
    return this.inbox.reply(wa, body, admin);
  }

  /** Staff handled the customer's "more books" / "change" request. */
  @Version(VERSION_NEUTRAL)
  @Post('chats/:wa/request-done')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  requestDone(@Param('wa') wa: string, @GetAdmin() admin: any) {
    return this.inbox.requestDone(wa, admin);
  }

  /** "Karim is typing…" for the others in this chat. */
  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Post('chats/:wa/typing')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  typing(@Param('wa') wa: string, @GetAdmin() admin: any) {
    return this.inbox.typing(wa, admin);
  }

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Post('chats/:wa/leave')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  leave(@Param('wa') wa: string, @GetAdmin() admin: any) {
    return this.inbox.leave(wa, admin);
  }

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Get('media/:id')
  @AdminMetaRoles(...ALL_STAFF)
  async media(@Param('id') id: string, @Res() res: any) {
    const file = await this.inbox.media(id);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.buffer);
  }
}
