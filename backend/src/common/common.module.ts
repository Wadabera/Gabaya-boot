import { Global, Module } from '@nestjs/common';
import { EthiopicCalendarService } from './services/ethiopic-calendar.service';
import { NotificationService } from './services/notification.service';

@Global()
@Module({
  providers: [EthiopicCalendarService, NotificationService],
  exports: [EthiopicCalendarService, NotificationService],
})
export class CommonModule {}
