import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../database/prisma.service';
import { EthiopicCalendarService } from '../../common/services/ethiopic-calendar.service';
import { OrderStatus, ConversationStatus, Prisma } from '@prisma/client';

describe('AnalyticsService - Unit & Acceptance Tests (ANALYTICS-01, DASH-01, CAL-01)', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockShop = {
    id: 'shop-1',
    name: 'Addis Leather',
    language: 'am',
    useEthiopianCalendar: true,
    subscriptions: [
      {
        id: 'sub-1',
        plan: { name: 'PRO' },
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        EthiopicCalendarService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              findUnique: jest.fn().mockResolvedValue(mockShop),
            },
            order: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            conversation: {
              count: jest.fn(),
            },
            product: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('FR-70 / DASH-01: Dashboard summary overview', () => {
    it('aggregates orders today, income today, and items needing attention', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([
        { total: new Prisma.Decimal(1200) },
        { total: new Prisma.Decimal(800) },
      ] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(3); // 3 new orders
      jest.spyOn(prisma.conversation, 'count').mockResolvedValue(2); // 2 questions waiting
      jest.spyOn(prisma.product, 'count').mockResolvedValue(1); // 1 low stock

      const summary = await service.getDashboardSummary('shop-1');

      expect(summary.ordersToday).toBe(2);
      expect(summary.incomeToday).toBe(2000);
      expect(summary.needsAttention.newOrders).toBe(3);
      expect(summary.needsAttention.questionsWaiting).toBe(2);
      expect(summary.needsAttention.lowStockProducts).toBe(1);
      expect(summary.currentDateDisplay).toBeDefined();
    });
  });

  describe('FR-35 / ANALYTICS-01: Sales summary & best selling products', () => {
    it('computes sales total and ranks best-selling products correctly', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([
        {
          id: 'ord-1',
          total: new Prisma.Decimal(2500),
          items: [
            { productId: 'p1', productName: 'Leather Bag', quantity: 2 },
            { productId: 'p2', productName: 'Wallet', quantity: 1 },
          ],
        },
        {
          id: 'ord-2',
          total: new Prisma.Decimal(1500),
          items: [
            { productId: 'p1', productName: 'Leather Bag', quantity: 1 },
            { productId: 'p3', productName: 'Belt', quantity: 4 },
          ],
        },
      ] as any);

      const sales = await service.getSalesSummary('shop-1', 'week');

      expect(sales.totalOrders).toBe(2);
      expect(sales.totalIncome).toBe(4000);
      expect(sales.bestSellingProducts).toEqual([
        { name: 'Belt', quantity: 4 },
        { name: 'Leather Bag', quantity: 3 },
        { name: 'Wallet', quantity: 1 },
      ]);
    });
  });
});
