import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, DeliveryType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

describe('OrdersService - Acceptance Tests', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockShop = {
    id: 'shop-1',
    name: 'Addis Boutique',
    subscriptions: [],
  };

  const mockProductInStock = {
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Leather Jacket',
    price: new Prisma.Decimal(1500),
    stock: 5,
    isOutOfStock: false,
    isActive: true,
  };

  const mockProductOutOfStock = {
    id: 'prod-out',
    shopId: 'shop-1',
    name: 'Out of Stock Shoes',
    price: new Prisma.Decimal(800),
    stock: 0,
    isOutOfStock: true,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              findUnique: jest.fn().mockResolvedValue(mockShop),
            },
            customer: {
              findUnique: jest.fn(),
              create: jest.fn().mockResolvedValue({ id: 'cust-1', telegramId: 'tg-123' }),
              update: jest.fn().mockResolvedValue({ id: 'cust-1', telegramId: 'tg-123' }),
            },
            product: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            order: {
              count: jest.fn().mockResolvedValue(0),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            orderStatusHistory: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Acceptance Test 4: An out-of-stock product cannot be ordered', async () => {
    jest.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProductOutOfStock as any]);

    const orderDto = {
      shopId: 'shop-1',
      customerTelegramId: 'tg-123',
      customerName: 'Dawit',
      customerPhone: '+251911223344',
      deliveryType: DeliveryType.DELIVERY,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      items: [{ productId: 'prod-out', quantity: 1 }],
    };

    await expect(service.createOrder(orderDto)).rejects.toThrow(BadRequestException);
  });

  it('Acceptance Test 5: When the owner confirms an order, stock decreases correctly', async () => {
    const existingOrder = {
      id: 'order-1',
      orderNumber: '#1001',
      shopId: 'shop-1',
      status: OrderStatus.NEW,
      items: [{ productId: 'prod-1', productName: 'Leather Jacket', quantity: 2 }],
    };

    jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(existingOrder as any);
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ ...mockProductInStock } as any);
    const productUpdateSpy = jest.spyOn(prisma.product, 'update').mockResolvedValue({} as any);
    const orderUpdateSpy = jest.spyOn(prisma.order, 'update').mockResolvedValue({
      ...existingOrder,
      status: OrderStatus.CONFIRMED,
    } as any);

    await service.updateStatus('shop-1', 'order-1', OrderStatus.CONFIRMED, 'OWNER');

    // Verify product stock was reduced: 5 - 2 = 3
    expect(productUpdateSpy).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: {
        stock: 3,
        isOutOfStock: false,
      },
    });

    expect(orderUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      }),
    );
  });

  it('Acceptance Test 6: A customer cannot cancel an order after the owner has confirmed it', async () => {
    jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ id: 'cust-1', telegramId: 'tg-123' } as any);
    jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
      id: 'order-1',
      shopId: 'shop-1',
      customerId: 'cust-1',
      status: OrderStatus.CONFIRMED, // Already confirmed!
    } as any);

    await expect(service.customerCancelOrder('tg-123', 'order-1')).rejects.toThrow(BadRequestException);
  });

  it('Acceptance Test 10: Invalid order-state transitions are rejected', async () => {
    jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
      id: 'order-1',
      shopId: 'shop-1',
      status: OrderStatus.NEW,
      items: [],
    } as any);

    // Cannot jump directly from NEW to DELIVERED without CONFIRMED
    await expect(
      service.updateStatus('shop-1', 'order-1', OrderStatus.DELIVERED, 'OWNER'),
    ).rejects.toThrow(BadRequestException);
  });
});
