import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { OrdersModule } from '../orders/orders.module';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [OrdersModule, AiModule, ProductsModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
