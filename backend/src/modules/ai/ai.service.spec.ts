import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { GroundedAiService } from './providers/grounded-ai.service';
import { PrismaService } from '../../database/prisma.service';
import { ConversationStatus, MessageSender, Prisma } from '@prisma/client';
import { NotificationService } from '../../common/services/notification.service';

describe('AiService - Acceptance Tests', () => {
  let service: AiService;
  let prisma: PrismaService;
  let groundedAi: GroundedAiService;

  const mockShop = {
    id: 'shop-1',
    name: 'Bole Fashion',
    area: 'Bole Medhanialem',
    openingHours: '9am - 8pm',
    deliveryAreas: 'Bole, CMC',
    language: 'am',
    isAiEnabled: true,
    subscriptions: [],
  };

  const mockCustomer = {
    id: 'cust-1',
    telegramId: 'tg-999',
    language: 'en',
  };

  const mockConversation = {
    id: 'conv-1',
    shopId: 'shop-1',
    customerId: 'cust-1',
    status: ConversationStatus.BOT,
    isAiEnabled: true,
  };

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        GroundedAiService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              findUnique: jest.fn().mockResolvedValue(mockShop),
              update: jest.fn(),
            },
            customer: {
              findUnique: jest.fn().mockResolvedValue(mockCustomer),
              create: jest.fn().mockResolvedValue(mockCustomer),
            },
            conversation: {
              findUnique: jest.fn().mockResolvedValue(mockConversation),
              create: jest.fn().mockResolvedValue(mockConversation),
              update: jest.fn(),
            },
            message: {
              create: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
            },
            product: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'prod-1',
                  name: 'Designer Shoes',
                  price: new Prisma.Decimal(3200),
                  stock: 8,
                  isOutOfStock: false,
                  options: '40, 41, 42',
                },
              ]),
            },
            shopRule: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'rule-1',
                  questionPattern: 'return policy',
                  approvedAnswer: 'Returns accepted within 3 days with receipt.',
                },
              ]),
            },
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

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
    groundedAi = module.get<GroundedAiService>(GroundedAiService);
  });

  it('Acceptance Test 2: Customer asks for price and receives current database price', async () => {
    const res = await service.handleCustomerMessage('shop-1', 'tg-999', 'What is the price of Designer Shoes?');

    expect(res.isAiAnswer).toBe(true);
    expect(res.reply).toContain('3200 ETB');
    expect(res.isEscalated).toBe(false);
  });

  it('Acceptance Test 3: Customer asks question not in shop data, and owner is notified (escalated)', async () => {
    const convUpdateSpy = jest.spyOn(prisma.conversation, 'update');

    const res = await service.handleCustomerMessage('shop-1', 'tg-999', 'Can you deliver by helicopter to Hawassa?');

    expect(res.isEscalated).toBe(true);
    expect(res.reply).toContain('I am not sure about that. I will ask the shop and reply here');

    expect(convUpdateSpy).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { status: ConversationStatus.WAITING_OWNER },
    });
  });

  it('Acceptance Test 14: Disabling AI prevents further AI-generated responses for the affected scope', async () => {
    // When shop AI is toggled off
    jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue({
      ...mockShop,
      isAiEnabled: false,
    } as any);

    const res = await service.handleCustomerMessage('shop-1', 'tg-999', 'What is the price of Designer Shoes?');

    expect(res.isAiAnswer).toBe(false);
    expect(res.isEscalated).toBe(true);
    expect(res.reply).toContain('forwarded to the shop');
  });
});
