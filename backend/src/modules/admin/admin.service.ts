import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReviewShopDto, ReviewPaymentDto, UpdatePlanDto } from './dto/admin.dto';
import { ShopStatus, PaymentReviewStatus, Prisma, ConversationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * AD0: Overview system counters (FR-61)
   */
  async getDashboardCounters() {
    const activeShops = await this.prisma.shop.count({
      where: { status: ShopStatus.ACTIVE },
    });

    const waitingApproval = await this.prisma.shop.count({
      where: { status: ShopStatus.PENDING },
    });

    const unpaidPlans = await this.prisma.subscriptionPayment.count({
      where: { status: PaymentReviewStatus.SUBMITTED },
    });

    const openComplaints = await this.prisma.complaint.count({
      where: { status: 'OPEN' },
    });

    const failedAiAnswers = await this.prisma.conversation.count({
      where: { status: ConversationStatus.WAITING_OWNER },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ordersThisWeek = await this.prisma.order.count({
      where: { createdAt: { gte: oneWeekAgo } },
    });

    return {
      activeShops,
      waitingApproval,
      unpaidPlans,
      openComplaints,
      failedAiAnswers,
      ordersThisWeek,
    };
  }

  /**
   * AD1: All shops with search and status filters (FR-61)
   */
  async getAllShops(search?: string, status?: ShopStatus) {
    const where: Prisma.ShopWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
        { owner: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.shop.findMany({
      where,
      include: {
        owner: { select: { id: true, phone: true, name: true, isVerified: true } },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * AD2 / AD3: Review a new shop (Approve or Reject with reason) (FR-04, FR-60)
   */
  async reviewShop(adminId: string, shopId: string, dto: ReviewShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { owner: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === ShopStatus.SUSPENDED ? dto.reason : null,
      },
    });

    // Immutable audit logging
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        shopId: shop.id,
        action: `SHOP_${dto.status}`,
        entity: 'Shop',
        entityId: shop.id,
        details: JSON.stringify({ reason: dto.reason, previousStatus: shop.status }),
      },
    });

    this.logger.log(`[ADMIN] Shop "${shop.name}" status updated to ${dto.status} by admin ${adminId}`);
    return updated;
  }

  /**
   * A2 / A3: Review subscription payment submissions with receipt photo (FR-74, FR-75)
   */
  async getAllPayments(status?: PaymentReviewStatus) {
    const where: Prisma.SubscriptionPaymentWhereInput = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.subscriptionPayment.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true, owner: { select: { phone: true } } } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * A3: Approve or reject subscription payment with audit trail (Acceptance Tests 11 & 12)
   */
  async reviewPayment(adminId: string, paymentId: string, dto: ReviewPaymentDto) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { plan: true, shop: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment submission not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: dto.status,
          rejectionReason: dto.status === PaymentReviewStatus.REJECTED ? dto.reason : null,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      // If approved: activate the paid subscription for 30 days!
      if (dto.status === PaymentReviewStatus.APPROVED) {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days active

        await tx.subscription.create({
          data: {
            shopId: payment.shopId,
            planId: payment.planId,
            status: 'ACTIVE',
            startDate,
            endDate,
          },
        });
      }

      // Record in immutable audit log (Acceptance Test 12)
      await tx.auditLog.create({
        data: {
          userId: adminId,
          shopId: payment.shopId,
          action: `PAYMENT_${dto.status}`,
          entity: 'SubscriptionPayment',
          entityId: payment.id,
          details: JSON.stringify({
            amount: Number(payment.amount),
            planName: payment.plan.name,
            reason: dto.reason,
          }),
        },
      });

      this.logger.log(`[ADMIN] Payment ${payment.id} for shop ${payment.shop.name} reviewed: ${dto.status}`);
      return updatedPayment;
    });
  }

  /**
   * AD4: Edit plan pricing and limits (FR-62)
   */
  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: {
        priceMonthly: dto.priceMonthly !== undefined ? new Prisma.Decimal(dto.priceMonthly) : undefined,
        productLimit: dto.productLimit,
        orderMonthlyLimit: dto.orderMonthlyLimit,
        aiMonthlyLimit: dto.aiMonthlyLimit,
      },
    });
  }

  /**
   * AD5: Get complaints
   */
  async getComplaints() {
    return this.prisma.complaint.findMany({
      include: {
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * A2: Get failed AI answers (conversations escalated to owner)
   */
  async getFailedAiAnswers() {
    return this.prisma.conversation.findMany({
      where: { status: ConversationStatus.WAITING_OWNER },
      include: {
        shop: { select: { id: true, name: true } },
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  /**
   * Audit logs
   */
  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, email: true, phone: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
