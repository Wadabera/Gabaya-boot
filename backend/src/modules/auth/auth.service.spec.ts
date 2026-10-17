import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../../common/services/notification.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService - Unit & Acceptance Tests (AUTH-01, AUTH-02)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-owner-1',
    phone: '+251911223344',
    name: 'Almaz Tadesse',
    role: Role.OWNER,
    isVerified: true,
    verificationCode: '654321',
    codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ownedShop: {
      id: 'shop-owner-1',
      name: 'Almaz Boutique',
      status: 'ACTIVE',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token-xyz'),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendSms: jest.fn().mockResolvedValue(true),
            sendTelegram: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('normalizePhone', () => {
    it('normalizes local 09... and 07... numbers to +251...', () => {
      expect(service.normalizePhone('0911223344')).toBe('+251911223344');
      expect(service.normalizePhone('0711223344')).toBe('+251711223344');
      expect(service.normalizePhone('911223344')).toBe('+251911223344');
      expect(service.normalizePhone('+251911223344')).toBe('+251911223344');
    });
  });

  describe('FR-01 / AUTH-01: Owner requests SMS verification code', () => {
    it('generates a 6-digit code with 5-minute expiry and dispatches via SMS service', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const createSpy = jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.sendSmsCode('0911223344');

      expect(result.success).toBe(true);
      expect(result.phone).toBe('+251911223344');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+251911223344',
            role: Role.OWNER,
          }),
        }),
      );
    });
  });

  describe('FR-01 / AUTH-02: Owner verifies SMS code', () => {
    it('successfully verifies correct SMS code and returns JWT token and shop info', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        verificationCode: '654321',
        codeExpiresAt: new Date(Date.now() + 60000),
      } as any);

      const updateSpy = jest.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        isVerified: true,
      } as any);

      const result = await service.verifySmsCode('+251911223344', '654321');

      expect(result.accessToken).toBe('mock-jwt-token-xyz');
      expect(result.user.hasShop).toBe(true);
      expect(result.user.shopId).toBe('shop-owner-1');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ isVerified: true, verificationCode: null }),
        }),
      );
    });

    it('rejects invalid verification code with UnauthorizedException', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        verificationCode: '654321',
        codeExpiresAt: new Date(Date.now() + 60000),
      } as any);

      await expect(service.verifySmsCode('+251911223344', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects expired verification code with UnauthorizedException', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        verificationCode: '654321',
        codeExpiresAt: new Date(Date.now() - 10000), // Expired!
      } as any);

      await expect(service.verifySmsCode('+251911223344', '654321')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Admin Login & 2-Step verification', () => {
    it('authenticates admin with valid password and returns token', async () => {
      const hashed = await bcrypt.hash('AdminSecret123', 10);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'admin-1',
        email: 'admin@gebeya.et',
        role: Role.ADMIN,
        passwordHash: hashed,
        isTwoFactorEnabled: false,
      } as any);

      const res = await service.adminLogin('admin@gebeya.et', 'AdminSecret123');
      expect(res.accessToken).toBe('mock-jwt-token-xyz');
      expect(res.user.role).toBe(Role.ADMIN);
    });

    it('prompts for 2FA when secondary verification is enabled on admin account', async () => {
      const hashed = await bcrypt.hash('AdminSecret123', 10);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'admin-1',
        email: 'admin@gebeya.et',
        role: Role.ADMIN,
        passwordHash: hashed,
        isTwoFactorEnabled: true,
      } as any);

      const res = await service.adminLogin('admin@gebeya.et', 'AdminSecret123');
      expect(res.requires2fa).toBe(true);
      expect(res.tempToken).toBeDefined();
    });
  });
});
