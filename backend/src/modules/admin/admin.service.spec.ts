import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { PaymentReviewStatus, Prisma } from '@prisma/client';

describe('AdminService - Acceptance Tests', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPayment = {
    id: 'pay-1',
    shopId: 'shop-1',
    planId: 'plan-basic',
    amount: new Prisma.Decimal(500),
    status: PaymentReviewStatus.SUBMITTED,
    plan: { id: 'plan-basic', name: 'BASIC' },
    shop: { id: 'shop-1', name: 'Test Shop' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            subscriptionPayment: {
              findUnique: jest.fn().mockResolvedValue(mockPayment),
              update: jest.fn().mockImplementation(({ data }) => ({
                ...mockPayment,
                ...data,
              })),
            },
            subscription: {
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Acceptance Test 11: Failed/Rejected payment submissions do not activate paid plans', async () => {
    const subCreateSpy = jest.spyOn(prisma.subscription, 'create');

    const result = await service.reviewPayment('admin-1', 'pay-1', {
      status: PaymentReviewStatus.REJECTED,
      reason: 'Invalid transaction reference number',
    });

    expect(result.status).toBe(PaymentReviewStatus.REJECTED);
    // Paid subscription must NOT be activated when rejected!
    expect(subCreateSpy).not.toHaveBeenCalled();
  });

  it('Acceptance Test 12: Administrator payment decisions are recorded in audit log', async () => {
    const auditSpy = jest.spyOn(prisma.auditLog, 'create');

    await service.reviewPayment('admin-1', 'pay-1', {
      status: PaymentReviewStatus.APPROVED,
    });

    expect(auditSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin-1',
        shopId: 'shop-1',
        action: 'PAYMENT_APPROVED',
        entity: 'SubscriptionPayment',
      }),
    });
  });
});
