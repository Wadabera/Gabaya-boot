import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AiService } from '../ai/ai.service';
import { TelegramUpdate } from './telegram.types';

describe('TelegramService - Acceptance Tests', () => {
  let service: TelegramService;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: PrismaService,
          useValue: {
            processedTelegramUpdate: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            customer: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
              updateMany: jest.fn(),
            },
            shop: {
              findUnique: jest.fn().mockResolvedValue({ id: 'shop-1', name: 'Gebeya Shop' }),
            },
            category: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            product: {
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn(),
            },
            order: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: OrdersService,
          useValue: {
            createOrder: jest.fn(),
            getCustomerOrders: jest.fn().mockResolvedValue([]),
            customerCancelOrder: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: {
            handleCustomerMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    prisma = module.get<PrismaService>(PrismaService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('Acceptance Test 9: Duplicate Telegram updates do not create duplicate orders', async () => {
    const update: TelegramUpdate = {
      update_id: 1234567,
      message: {
        message_id: 1,
        chat: { id: 100, type: 'private' },
        from: { id: 100, is_bot: false, first_name: 'Test Buyer' },
        date: 1600000000,
        text: '/start',
      },
    };

    // First time: update is not yet processed
    jest.spyOn(prisma.processedTelegramUpdate, 'findUnique').mockResolvedValue(null);
    const firstCall = await service.processUpdate(update);
    expect(firstCall).not.toBeNull();
    expect(prisma.processedTelegramUpdate.create).toHaveBeenCalledWith({
      data: { updateId: '1234567' },
    });

    // Second time: update is already in database (duplicate retry)
    jest.spyOn(prisma.processedTelegramUpdate, 'findUnique').mockResolvedValue({
      updateId: '1234567',
      processedAt: new Date(),
    });

    const secondCall = await service.processUpdate(update);
    // Duplicate returns null and does not execute handler
    expect(secondCall).toBeNull();
  });

  it('Acceptance Test 16: Customer data deletion anonymizes personal records', async () => {
    const updateManySpy = jest.spyOn(prisma.customer, 'updateMany').mockResolvedValue({ count: 1 });

    const callback = {
      id: 'cb_del',
      from: { id: 555, is_bot: false, first_name: 'Sara' },
      message: {
        message_id: 2,
        chat: { id: 555, type: 'private' },
        from: { id: 111, is_bot: true, first_name: 'ShopBot' },
        date: 1600000000,
      },
      data: 'delete_my_data',
    };

    const res = await service.handleCallbackQuery(callback);

    expect(updateManySpy).toHaveBeenCalledWith({
      where: { telegramId: '555' },
      data: expect.objectContaining({
        name: 'Deleted Customer',
        phone: null,
        isAnonymized: true,
      }),
    });
    expect(res.text).toContain('የግል መረጃዎ በተሳካ ሁኔታ ተሰርዟል');
  });
});
