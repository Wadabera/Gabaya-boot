import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShopsModule } from './modules/shops/shops.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AiModule } from './modules/ai/ai.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StorageModule } from './modules/storage/storage.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    AuthModule,
    ShopsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    TelegramModule,
    AiModule,
    SubscriptionsModule,
    AdminModule,
    AnalyticsModule,
    StorageModule,
  ],
})
export class AppModule {}
