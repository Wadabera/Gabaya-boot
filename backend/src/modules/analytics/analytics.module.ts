import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EthiopicCalendarService } from '../../common/services/ethiopic-calendar.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EthiopicCalendarService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
