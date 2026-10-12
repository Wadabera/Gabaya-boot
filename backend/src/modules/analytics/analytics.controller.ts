import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';

@ApiTags('Analytics & Reports')
@Controller('shops/:shopId/analytics')
@UseGuards(JwtAuthGuard, ShopOwnerGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'D00: Get home dashboard overview metrics & needs-attention (FR-70)' })
  async getDashboardSummary(@Param('shopId') shopId: string) {
    return this.analyticsService.getDashboardSummary(shopId);
  }

  @Get('sales')
  @ApiOperation({ summary: 'O12: Sales summary by Day, Week, Month and best-sellers (FR-35)' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['day', 'week', 'month'] })
  async getSalesSummary(
    @Param('shopId') shopId: string,
    @Query('timeframe') timeframe?: 'day' | 'week' | 'month',
  ) {
    return this.analyticsService.getSalesSummary(shopId, timeframe || 'week');
  }
}
