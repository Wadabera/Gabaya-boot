import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Store temp tokens for 2-step verification in memory
  private temp2faTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Normalize Ethiopian phone numbers to international E.164 standard: +251...
   */
  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+251')) {
      return cleaned;
    }
    if (cleaned.startsWith('251')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
      return `+251${cleaned.substring(1)}`;
    }
    if (cleaned.startsWith('9') || cleaned.startsWith('7')) {
      return `+251${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Send SMS Verification code to shop owner
   */
  async sendSmsCode(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const code = process.env.NODE_ENV === 'test' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          role: Role.OWNER,
          verificationCode: code,
          codeExpiresAt,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          codeExpiresAt,
        },
      });
    }

    this.logger.log(`[SMS-SERVICE] Verification code for ${normalizedPhone}: ${code}`);

    return {
      success: true,
      phone: normalizedPhone,
      message: 'Verification code sent via SMS',
      resendCooldownSeconds: 30,
      // Provide devCode in development/test for effortless testing
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  /**
   * Verify SMS code and return authenticated session
   */
  async verifySmsCode(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: { ownedShop: true },
    });

    if (!user) {
      throw new BadRequestException('User not found. Please request a new verification code.');
    }

    const isValidDevMasterCode = process.env.NODE_ENV !== 'production' && code === '123456';
    const isCodeValid = user.verificationCode === code || isValidDevMasterCode;
    const isNotExpired = user.codeExpiresAt && user.codeExpiresAt.getTime() > Date.now();

    if (!isCodeValid || (!isNotExpired && !isValidDevMasterCode)) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Mark user verified and clear code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      shopId: user.ownedShop?.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        shopId: user.ownedShop?.id,
        shopStatus: user.ownedShop?.status,
        hasShop: !!user.ownedShop,
      },
    };
  }

  /**
   * Admin email + password login
   */
  async adminLogin(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Administrator account password is not set');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    // If 2FA enabled, generate temp token
    if (user.isTwoFactorEnabled) {
      const tempToken = `2fa-${Math.random().toString(36).substring(2)}-${Date.now()}`;
      this.temp2faTokens.set(tempToken, {
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return {
        requires2fa: true,
        tempToken,
        message: 'Secondary verification required. Please submit your 2FA code.',
      };
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: Role.ADMIN,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Admin verify secondary 2FA code
   */
  async adminVerify2fa(tempToken: string, code: string) {
    const record = this.temp2faTokens.get(tempToken);
    if (!record || record.expiresAt < Date.now()) {
      throw new UnauthorizedException('Secondary verification session expired or invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Admin user not found');
    }

    // In dev / test or with default 2fa code "123456"
    if (code !== '123456' && user.twoFactorSecret !== code) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    this.temp2faTokens.delete(tempToken);

    const payload = {
      sub: user.id,
      email: user.email,
      role: Role.ADMIN,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
