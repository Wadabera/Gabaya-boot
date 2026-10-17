import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ PostgreSQL Database connected successfully');
        break;
      } catch (err: any) {
        retries--;
        this.logger.warn(`⚠️ Database connection attempt failed (${err.message}). Retries left: ${retries}`);
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
