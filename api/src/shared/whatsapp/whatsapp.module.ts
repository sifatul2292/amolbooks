import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSchema } from '../../schema/admin.schema';
import { OrderSchema } from '../../schema/order.schema';
import { WhatsappChatMessageSchema, WhatsappChatSchema } from './whatsapp-chat.schema';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInboxController } from './whatsapp-inbox.controller';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappService } from './whatsapp.service';

/** Automatic WhatsApp order messages and the staff WhatsApp Inbox (Meta Cloud API). Global so OrderService can use it. */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Admin', schema: AdminSchema },
      { name: 'WhatsappChat', schema: WhatsappChatSchema },
      { name: 'WhatsappChatMessage', schema: WhatsappChatMessageSchema },
    ]),
  ],
  controllers: [WhatsappController, WhatsappInboxController],
  providers: [WhatsappService, WhatsappInboxService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
