import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ReviewShopDto, ReviewPaymentDto, UpdatePlanDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ShopStatus, PaymentReviewStatus } from '@prisma/client';
import { GetUser, AuthenticatedUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Platform Administration')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('counters')
  @ApiOperation({ summary: 'AD0: Overview system counters' })
  async getCounters() {
    return this.adminService.getDashboardCounters();
  }

  @Get('shops')
  @ApiOperation({ summary: 'AD1: Search and filter all shops' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ShopStatus })
  async getAllShops(
    @Query('search') search?: string,
    @Query('status') status?: ShopStatus,
  ) {
    return this.adminService.getAllShops(search, status);
  }

  @Patch('shops/:shopId/review')
  @ApiOperation({ summary: 'AD3: Review new shop (Approve or Reject with reason) (FR-04, FR-60)' })
  async reviewShop(
    @Param('shopId') shopId: string,
    @GetUser() admin: AuthenticatedUser,
    @Body() dto: ReviewShopDto,
  ) {
    return this.adminService.reviewShop(admin.id, shopId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'A2: List subscription payment submissions' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentReviewStatus })
  async getAllPayments(@Query('status') status?: PaymentReviewStatus) {
    return this.adminService.getAllPayments(status);
  }

  @Patch('payments/:paymentId/review')
  @ApiOperation({ summary: 'A3: Approve or reject subscription payment (FR-75)' })
  async reviewPayment(
    @Param('paymentId') paymentId: string,
    @GetUser() admin: AuthenticatedUser,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.adminService.reviewPayment(admin.id, paymentId, dto);
  }

  @Patch('plans/:planId')
  @ApiOperation({ summary: 'AD4: Edit plan pricing and limits (FR-62)' })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlan(planId, dto);
  }

  @Get('complaints')
  @ApiOperation({ summary: 'AD5: List customer/merchant complaints (FR-63)' })
  async getComplaints() {
    return this.adminService.getComplaints();
  }

  @Get('failed-ai-answers')
  @ApiOperation({ summary: 'A2: Review failed AI answers and escalations' })
  async getFailedAiAnswers() {
    return this.adminService.getFailedAiAnswers();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Inspect immutable system audit logs' })
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}
