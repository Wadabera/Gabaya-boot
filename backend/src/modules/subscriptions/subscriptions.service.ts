import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitSubscriptionPaymentDto } from './dto/submit-payment.dto';
import { PaymentReviewStatus, Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * List available subscription plans (Plans 1 / D05 / FR-51)
   */
  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  /**
   * Get current shop subscription and usage counters (D00, O13, FR-50)
   */
  async getShopSubscription(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const currentSub = shop.subscriptions[0];
    const plan = currentSub?.plan;

    // Calculate current usage
    const productCount = await this.prisma.product.count({ where: { shopId } });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orderCountThisMonth = await this.prisma.order.count({
      where: {
        shopId,
        createdAt: { gte: startOfMonth },
      },
    });

    const aiCountThisMonth = await this.prisma.message.count({
      where: {
        conversation: { shopId },
        sender: 'AI',
        createdAt: { gte: startOfMonth },
      },
    });

    let daysRemaining: number | null = null;
    if (currentSub?.endDate) {
      const diffTime = currentSub.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      subscription: currentSub,
      plan,
      usage: {
        products: {
          used: productCount,
          limit: plan?.productLimit || 10,
        },
        ordersThisMonth: {
          used: orderCountThisMonth,
          limit: plan?.orderMonthlyLimit || 20,
        },
        aiAnswersThisMonth: {
          used: aiCountThisMonth,
          limit: plan?.aiMonthlyLimit || 50,
        },
        daysRemaining,
      },
    };
  }

  /**
   * Owner submits subscription payment for review (Plans 2 / D06 / FR-52, FR-73)
   */
  async submitPayment(shopId: string, dto: SubmitSubscriptionPaymentDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        shopId,
        planId: plan.id,
        amount: new Prisma.Decimal(dto.amount),
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        receiptUrl: dto.receiptUrl || null,
        status: PaymentReviewStatus.SUBMITTED,
      },
      include: {
        plan: true,
      },
    });

    return {
      message: 'Payment reference submitted. Platform administrators will verify and activate your plan.',
      payment,
    };
  }

  /**
   * Get payment history and status tracking (Plans 3 / D07)
   */
  async getPaymentHistory(shopId: string) {
    return this.prisma.subscriptionPayment.findMany({
      where: { shopId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
