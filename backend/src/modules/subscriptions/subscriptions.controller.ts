import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubmitSubscriptionPaymentDto } from './dto/submit-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';

@ApiTags('Subscriptions & Billing')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans (Plans 1 / D05 / FR-51)' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current shop subscription & usage bars (D00, O13, FR-50)' })
  async getShopSubscription(@Param('shopId') shopId: string) {
    return this.subscriptionsService.getShopSubscription(shopId);
  }

  @Post('shop/:shopId/payments')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit subscription payment reference & receipt (Plans 2 / D06 / FR-73)' })
  @ApiResponse({ status: 201, description: 'Payment submitted for admin review' })
  async submitPayment(
    @Param('shopId') shopId: string,
    @Body() dto: SubmitSubscriptionPaymentDto,
  ) {
    return this.subscriptionsService.submitPayment(shopId, dto);
  }

  @Get('shop/:shopId/payments')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment submissions history and status (Plans 3 / D07)' })
  async getPaymentHistory(@Param('shopId') shopId: string) {
    return this.subscriptionsService.getPaymentHistory(shopId);
  }
}
