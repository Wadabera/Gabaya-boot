import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../database/prisma.service';
import { PaymentReviewStatus, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('SubscriptionsService - Unit & Acceptance Tests (PLAN-01, PLAN-02, SUB-01)', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;

  const mockPlanFree = {
    id: 'plan-free',
    name: 'FREE',
    displayName: 'Free Plan',
    priceMonthly: new Prisma.Decimal(0),
    productLimit: 10,
    orderMonthlyLimit: 20,
    aiMonthlyLimit: 50,
    isActive: true,
  };

  const mockPlanBasic = {
    id: 'plan-basic',
    name: 'BASIC',
    displayName: 'Basic Plan',
    priceMonthly: new Prisma.Decimal(500),
    productLimit: 50,
    orderMonthlyLimit: 200,
    aiMonthlyLimit: 500,
    isActive: true,
  };

  const mockShop = {
    id: 'shop-1',
    name: 'Addis Leather',
    subscriptions: [
      {
        id: 'sub-1',
        shopId: 'shop-1',
        planId: 'plan-free',
        status: 'ACTIVE',
        plan: mockPlanFree,
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days left
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              findUnique: jest.fn(),
            },
            subscriptionPlan: {
              findMany: jest.fn().mockResolvedValue([mockPlanFree, mockPlanBasic]),
              findUnique: jest.fn(),
            },
            product: {
              count: jest.fn().mockResolvedValue(4),
            },
            order: {
              count: jest.fn().mockResolvedValue(12),
            },
            message: {
              count: jest.fn().mockResolvedValue(28),
            },
            subscriptionPayment: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('FR-51 / PLAN-02: Retrieve active plans', () => {
    it('returns available subscription plans sorted by price', async () => {
      const plans = await service.getPlans();
      expect(plans).toHaveLength(2);
      expect(plans[0].name).toBe('FREE');
      expect(plans[1].name).toBe('BASIC');
    });
  });

  describe('FR-50, FR-54 / PLAN-01: Shop subscription usage counters', () => {
    it('calculates used vs limit for products, monthly orders, AI answers, and remaining days', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(mockShop as any);

      const usageResult = await service.getShopSubscription('shop-1');

      expect(usageResult.plan?.name).toBe('FREE');
      expect(usageResult.usage.products.used).toBe(4);
      expect(usageResult.usage.products.limit).toBe(10);
      expect(usageResult.usage.ordersThisMonth.used).toBe(12);
      expect(usageResult.usage.ordersThisMonth.limit).toBe(20);
      expect(usageResult.usage.aiAnswersThisMonth.used).toBe(28);
      expect(usageResult.usage.aiAnswersThisMonth.limit).toBe(50);
      expect(usageResult.usage.daysRemaining).toBeGreaterThanOrEqual(14);
    });

    it('throws NotFoundException if shop does not exist', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(null);
      await expect(service.getShopSubscription('invalid-shop')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('FR-52, FR-73 / SUB-01: Submit payment reference for verification', () => {
    it('records a new subscription payment with SUBMITTED status', async () => {
      jest.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlanBasic as any);
      jest.spyOn(prisma.subscriptionPayment, 'create').mockResolvedValue({
        id: 'payment-1',
        shopId: 'shop-1',
        planId: 'plan-basic',
        amount: new Prisma.Decimal(500),
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'CBE-TX-998877',
        status: PaymentReviewStatus.SUBMITTED,
        plan: mockPlanBasic,
      } as any);

      const res = await service.submitPayment('shop-1', {
        planId: 'plan-basic',
        amount: 500,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'CBE-TX-998877',
      });

      expect(res.payment.status).toBe(PaymentReviewStatus.SUBMITTED);
      expect(res.payment.referenceNumber).toBe('CBE-TX-998877');
      expect(prisma.subscriptionPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopId: 'shop-1',
            status: PaymentReviewStatus.SUBMITTED,
          }),
        }),
      );
    });
  });
});
