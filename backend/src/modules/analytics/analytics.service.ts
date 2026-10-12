import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EthiopicCalendarService } from '../../common/services/ethiopic-calendar.service';
import { OrderStatus, ConversationStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private ethiopicCalendar: EthiopicCalendarService,
  ) {}

  /**
   * D00: Owner dashboard home overview summary (FR-70)
   */
  async getDashboardSummary(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: {
          include: { plan: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Orders and income today
    const ordersToday = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startOfToday },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { total: true },
    });

    const ordersTodayCount = ordersToday.length;
    const incomeToday = ordersToday.reduce((acc, curr) => acc + Number(curr.total), 0);

    // 2. Needs attention list
    const newOrdersCount = await this.prisma.order.count({
      where: { shopId, status: OrderStatus.NEW },
    });

    const waitingQuestionsCount = await this.prisma.conversation.count({
      where: { shopId, status: ConversationStatus.WAITING_OWNER },
    });

    const lowStockProductsCount = await this.prisma.product.count({
      where: { shopId, stock: { lte: 3 }, isActive: true },
    });

    // 3. Plan ending banner
    const currentSub = shop.subscriptions[0];
    let planEndsInDays: number | null = null;
    if (currentSub?.endDate) {
      const diff = currentSub.endDate.getTime() - now.getTime();
      planEndsInDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // 4. Ethiopian calendar formatted date
    const todayEthiopic = this.ethiopicCalendar.formatDate(now, shop.useEthiopianCalendar, shop.language);

    return {
      shopName: shop.name,
      planName: currentSub?.plan?.name || 'FREE',
      botStatus: 'RUNNING', // Telegram bot webhook connected
      ordersToday: ordersTodayCount,
      incomeToday,
      planEndsInDays,
      needsAttention: {
        newOrders: newOrdersCount,
        questionsWaiting: waitingQuestionsCount,
        lowStockProducts: lowStockProductsCount,
      },
      currentDateDisplay: todayEthiopic,
    };
  }

  /**
   * O12: Sales summary - Day, Week, Month breakdown and best-selling products (FR-35)
   */
  async getSalesSummary(shopId: string, timeframe: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    let startDate: Date;

    if (timeframe === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeframe === 'week') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startDate },
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED] },
      },
      include: {
        items: true,
      },
    });

    const totalOrders = orders.length;
    const totalIncome = orders.reduce((sum, o) => sum + Number(o.total), 0);

    // Calculate best selling products
    const productSalesMap = new Map<string, { name: string; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const current = productSalesMap.get(item.productId) || { name: item.productName, quantity: 0 };
        current.quantity += item.quantity;
        productSalesMap.set(item.productId, current);
      }
    }

    const bestSelling = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      timeframe,
      totalOrders,
      totalIncome,
      bestSellingProducts: bestSelling,
    };
  }
}
