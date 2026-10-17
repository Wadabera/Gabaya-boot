import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../../common/services/notification.service';
import { ProductsService } from '../products/products.service';
import { TelegramUpdate } from './telegram.types';

describe('TelegramService - Acceptance Tests', () => {
  let service: TelegramService;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let productsService: ProductsService;

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
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
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
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
            },
          },
        },
        {
          provide: OrdersService,
          useValue: {
            createOrder: jest.fn(),
            getCustomerOrders: jest.fn().mockResolvedValue([]),
            customerCancelOrder: jest.fn(),
            updateStatus: jest.fn(),
            markPayment: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            create: jest.fn(),
            findAllByShop: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: {
            handleCustomerMessage: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTelegram: jest.fn().mockResolvedValue(true),
            sendSms: jest.fn().mockResolvedValue(true),
            notifyOwnerNewOrder: jest.fn().mockResolvedValue(true),
            notifyCustomerOrderStatus: jest.fn().mockResolvedValue(true),
            notifyCustomerPaymentStatus: jest.fn().mockResolvedValue(true),
            notifyCustomerOwnerReply: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    prisma = module.get<PrismaService>(PrismaService);
    ordersService = module.get<OrdersService>(OrdersService);
    productsService = module.get<ProductsService>(ProductsService);
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

  it('FR-14: Owner adds a product by sending a photo and short text to the bot, receiving auto-post share buttons', async () => {
    jest.spyOn(productsService, 'create').mockResolvedValue({
      id: 'prod-123',
      shopId: 'shop-1',
      name: 'Leather Oxford Shoes',
      price: 2500 as any,
      stock: 20,
      options: '40, 41, 42',
      isActive: true,
      isOutOfStock: false,
      photoUrl: 'https://example.com/shoes.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
      id: 'user-1',
      telegramId: '999',
      ownedShop: { id: 'shop-1', name: 'Bole Fashion Store', botLink: 'https://t.me/gebayawa_bot?start=shop_1' },
    } as any);

    const message = {
      message_id: 10,
      chat: { id: 999, type: 'private' },
      from: { id: 999, is_bot: false, first_name: 'Shop Owner' },
      date: 1600000000,
      caption: 'Leather Oxford Shoes 2500 ETB 40, 41, 42',
      photo: [
        { file_id: 'https://example.com/shoes.jpg', file_unique_id: 'u1', width: 600, height: 600 },
      ],
    };

    const res = await service.handleMessage(message);

    expect(productsService.create).toHaveBeenCalledWith('shop-1', expect.objectContaining({
      name: expect.stringContaining('Leather Oxford Shoes'),
      price: 2500,
    }));

    expect(res.text).toContain('አዲስ ምርት በተሳካ ሁኔታ ተመዝግቧል');
    expect(res.replyMarkup?.inline_keyboard).toBeDefined();
    // Verify social media share buttons exist
    const hasTgShare = res.replyMarkup?.inline_keyboard.some((row) =>
      row.some((b) => b.text.includes('Share on Telegram')),
    );
    const hasFbShare = res.replyMarkup?.inline_keyboard.some((row) =>
      row.some((b) => b.text.includes('Facebook')),
    );
    expect(hasTgShare).toBe(true);
    expect(hasFbShare).toBe(true);
  });

  it('FR-31: Owner confirms order directly in Telegram reducing stock', async () => {
    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-1',
      orderNumber: '#1001',
      shopId: 'shop-1',
      total: 2500 as any,
    } as any);

    const updateStatusSpy = jest.spyOn(ordersService, 'updateStatus').mockResolvedValue({} as any);

    const callback = {
      id: 'cb_confirm',
      from: { id: 999, is_bot: false, first_name: 'Owner' },
      message: {
        message_id: 20,
        chat: { id: 999, type: 'private' },
        from: { id: 111, is_bot: true, first_name: 'ShopBot' },
        date: 1600000000,
      },
      data: 'owner_confirm_order-1',
    };

    const res = await service.handleCallbackQuery(callback);

    expect(updateStatusSpy).toHaveBeenCalledWith('shop-1', 'order-1', 'CONFIRMED', 'OWNER');
    expect(res.text).toContain('በተሳካ ሁኔታ ተረጋግጧል');
  });
});
