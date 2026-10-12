import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, MarkPaymentDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';
import { GetUser, AuthenticatedUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new order from Telegram bot or client (FR-22)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List shop orders by filter category (new, active, done) (O6, FR-31)' })
  @ApiQuery({ name: 'category', required: false, enum: ['new', 'active', 'done'] })
  @ApiQuery({ name: 'search', required: false })
  async findAllByShop(
    @Param('shopId') shopId: string,
    @Query('category') category?: 'new' | 'active' | 'done',
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAllByShop(shopId, category, search);
  }

  @Get('customer/:telegramId')
  @ApiOperation({ summary: 'List orders for a customer by Telegram ID (C9, FR-23)' })
  async getCustomerOrders(
    @Param('telegramId') telegramId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.ordersService.getCustomerOrders(telegramId, shopId);
  }

  @Get(':id/shop/:shopId')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single order details for shop owner (O7)' })
  async findOne(@Param('shopId') shopId: string, @Param('id') id: string) {
    return this.ordersService.findOne(shopId, id);
  }

  @Patch(':id/shop/:shopId/status')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status with stock reduction/history (O7, FR-31, FR-33)' })
  async updateStatus(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(shopId, id, dto.status, user.role, dto.reason);
  }

  @Patch(':id/shop/:shopId/payment')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark direct payment received or not received (PAY3, FR-65)' })
  async markPayment(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: MarkPaymentDto,
  ) {
    return this.ordersService.markPayment(shopId, id, dto.paymentStatus, dto.note);
  }

  @Post(':id/customer-cancel')
  @ApiOperation({ summary: 'Customer cancels order before shop confirms it (C9, FR-24)' })
  async customerCancel(
    @Param('id') id: string,
    @Body('telegramId') telegramId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.customerCancelOrder(telegramId, id, reason);
  }
}
