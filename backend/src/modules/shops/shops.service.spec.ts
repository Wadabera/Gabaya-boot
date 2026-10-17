import { Test, TestingModule } from '@nestjs/testing';
import { ShopsService } from './shops.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopStatus } from '@prisma/client';

describe('ShopsService - Unit & Acceptance Tests (SHOP-01, SHOP-02, SHOP-03, QR-01)', () => {
  let service: ShopsService;
  let prisma: PrismaService;

  const mockShop = {
    id: 'shop-uuid-1',
    ownerId: 'owner-uuid-1',
    name: 'Bole Leather Crafts',
    area: 'Bole Medhanialem',
    openingHours: 'Mon-Sat 8:30 AM - 8:00 PM',
    deliveryAreas: 'Bole, CMC, Kazanchis',
    language: 'am',
    status: ShopStatus.PENDING,
    botLink: 'https://t.me/GebeyaShopBot?start=shop_shop-uuid-1',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000123456789',
    bankAccountHolder: 'Bole Leather Crafts',
    mobileMoneyNumber: '+251911223344',
    subscriptions: [],
  };

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        {
          provide: PrismaService,
          useValue: {
            shop: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            subscriptionPlan: {
              findUnique: jest.fn().mockResolvedValue({ id: 'plan-free-1', name: 'FREE' }),
            },
            subscription: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('FR-02 / SHOP-01: Create shop profile', () => {
    it('creates shop in PENDING status, generates deep-link URL and QR code', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shop, 'create').mockResolvedValue({
        ...mockShop,
        id: 'new-shop-id',
      } as any);
      jest.spyOn(prisma.shop, 'update').mockResolvedValue({
        ...mockShop,
        id: 'new-shop-id',
        botLink: 'https://t.me/GebeyaShopBot?start=shop_new-shop-id',
      } as any);

      const dto = {
        name: 'Bole Leather Crafts',
        area: 'Bole Medhanialem',
        openingHours: 'Mon-Sat 8:30 AM - 8:00 PM',
        deliveryAreas: 'Bole, CMC, Kazanchis',
        language: 'am' as const,
      };

      const result = await service.createShop('owner-uuid-1', dto);

      expect(result.botLink).toContain('shop_new-shop-id');
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('rejects creation if owner already has an existing shop', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(mockShop as any);

      await expect(
        service.createShop('owner-uuid-1', {
          name: 'Another Shop',
          area: 'Piassa',
          openingHours: '9am - 5pm',
          deliveryAreas: 'Piassa',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('FR-02, FR-66 / SHOP-02, SHOP-03: Update shop profile and payment details', () => {
    it('allows shop owner to update profile and payment details', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(mockShop as any);
      const updateSpy = jest.spyOn(prisma.shop, 'update').mockResolvedValue({
        ...mockShop,
        bankName: 'Awash Bank',
        mobileMoneyNumber: '+251922334455',
      } as any);

      const res = await service.updateShop('shop-uuid-1', 'owner-uuid-1', 'OWNER', {
        bankName: 'Awash Bank',
        mobileMoneyNumber: '+251922334455',
      });

      expect(res.bankName).toBe('Awash Bank');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-uuid-1' },
          data: expect.objectContaining({
            bankName: 'Awash Bank',
            mobileMoneyNumber: '+251922334455',
          }),
        }),
      );
    });

    it('SHOP-03: forbids non-admin user from editing a shop they do not own', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(mockShop as any);

      await expect(
        service.updateShop('shop-uuid-1', 'different-owner-id', 'OWNER', {
          name: 'Hacked Shop Name',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FR-20, FR-68 / QR-01: QR Code Generation', () => {
    it('generates a valid QR code data URL for shop bot link', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(mockShop as any);

      const qrCode = await service.getShopQrCode('shop-uuid-1');
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    }, 20000);

    it('throws NotFoundException if shop does not exist', async () => {
      jest.spyOn(prisma.shop, 'findUnique').mockResolvedValue(null);

      await expect(service.getShopQrCode('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
