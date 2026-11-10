import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from '../../schema/order.schema';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

/** Automatic WhatsApp order messages (Meta Cloud API). Global so OrderService can use it. */
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }])],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
