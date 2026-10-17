import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopStatus } from '@prisma/client';
import * as QRCode from 'qrcode';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create new shop during onboarding (O3)
   */
  async createShop(ownerId: string, dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (existing) {
      throw new BadRequestException('Shop already exists for this owner');
    }

    // Default bot link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'gebayawa_bot';

    const shop = await this.prisma.shop.create({
      data: {
        ownerId,
        name: dto.name,
        area: dto.area,
        openingHours: dto.openingHours,
        deliveryAreas: dto.deliveryAreas,
        language: dto.language || 'am',
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankAccountHolder: dto.bankAccountHolder,
        mobileMoneyNumber: dto.mobileMoneyNumber,
        status: ShopStatus.PENDING, // Waits for admin approval (FR-60)
      },
    });

    // Update with deep link URL
    const botLink = `https://t.me/${botUsername}?start=shop_${shop.id}`;
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: { botLink },
    });

    // Create Free plan subscription if exists
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: 'FREE' },
    });

    if (freePlan) {
      await this.prisma.subscription.create({
        data: {
          shopId: shop.id,
          planId: freePlan.id,
          status: 'ACTIVE',
        },
      });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(botLink);

    return {
      ...updated,
      qrCodeDataUrl,
    };
  }

  /**
   * Get shop by owner ID
   */
  async getShopByOwner(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!shop) {
      return null;
    }

    const qrCodeDataUrl = shop.botLink ? await QRCode.toDataURL(shop.botLink) : null;

    return {
      ...shop,
      qrCodeDataUrl,
    };
  }

  /**
   * Get shop by ID with tenant checks
   */
  async getShopById(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        categories: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const qrCodeDataUrl = shop.botLink ? await QRCode.toDataURL(shop.botLink) : null;

    return {
      ...shop,
      qrCodeDataUrl,
    };
  }

  /**
   * Update shop profile (D01 / FR-02 / FR-66)
   */
  async updateShop(shopId: string, userId: string, userRole: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (userRole !== 'ADMIN' && shop.ownerId !== userId) {
      throw new ForbiddenException('Unauthorized: You can only edit your own shop');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...dto,
      },
    });
  }

  /**
   * Generate printable QR code (FR-68)
   */
  async getShopQrCode(shopId: string): Promise<string> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'gebayawa_bot';
    const link = shop.botLink || `https://t.me/${botUsername}?start=shop_${shop.id}`;
    return QRCode.toDataURL(link, { width: 400, margin: 2 });
  }

  /**
   * Public shop details for customers/Telegram bot
   */
  async getPublicShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        area: true,
        openingHours: true,
        deliveryAreas: true,
        language: true,
        status: true,
        botLink: true,
        bankName: true,
        bankAccount: true,
        bankAccountHolder: true,
        mobileMoneyNumber: true,
        categories: {
          select: { id: true, name: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  /**
   * List public active shops for simulator and directories
   */
  async getPublicActiveShops() {
    return this.prisma.shop.findMany({
      where: { status: ShopStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        area: true,
        openingHours: true,
        deliveryAreas: true,
        botLink: true,
        language: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
