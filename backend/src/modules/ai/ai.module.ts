import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GroundedAiService } from './providers/grounded-ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService, GroundedAiService],
  exports: [AiService, GroundedAiService],
})
export class AiModule {}
