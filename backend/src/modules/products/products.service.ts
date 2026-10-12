import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add new product with plan quota enforcement (FR-10, FR-50)
   */
  async create(shopId: string, dto: CreateProductDto) {
    // 1. Verify subscription quota
    const subscription = await this.prisma.subscription.findFirst({
      where: { shopId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription && subscription.plan) {
      const currentProductCount = await this.prisma.product.count({
        where: { shopId },
      });

      if (currentProductCount >= subscription.plan.productLimit) {
        throw new ForbiddenException(
          `Product limit of ${subscription.plan.productLimit} reached for the ${subscription.plan.name} plan. Please upgrade your subscription to add more products.`,
        );
      }
    }

    // 2. Verify category belongs to shop if supplied
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, shopId },
      });
      if (!category) {
        throw new BadRequestException('Invalid category for this shop');
      }
    }

    const isOutOfStock = dto.isOutOfStock !== undefined ? dto.isOutOfStock : dto.stock <= 0;

    return this.prisma.product.create({
      data: {
        shopId,
        categoryId: dto.categoryId || null,
        name: dto.name,
        description: dto.description || null,
        price: new Prisma.Decimal(dto.price),
        options: dto.options || null,
        stock: dto.stock,
        photoUrl: dto.photoUrl || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        isOutOfStock,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Find products by shop with optional category filtering
   */
  async findAllByShop(shopId: string, categoryId?: string, search?: string) {
    const where: Prisma.ProductWhereInput = {
      shopId,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find one product by ID and verify shop ownership
   */
  async findOne(shopId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this shop');
    }

    return product;
  }

  /**
   * Update product (FR-10)
   */
  async update(shopId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(shopId, id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, shopId },
      });
      if (!category) {
        throw new BadRequestException('Invalid category for this shop');
      }
    }

    let isOutOfStock = dto.isOutOfStock;
    if (isOutOfStock === undefined && dto.stock !== undefined) {
      isOutOfStock = dto.stock <= 0;
    }

    return this.prisma.product.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        options: dto.options,
        stock: dto.stock,
        photoUrl: dto.photoUrl,
        isActive: dto.isActive,
        isOutOfStock,
      },
      include: { category: true },
    });
  }

  /**
   * Toggle out-of-stock switch (O8, FR-12)
   */
  async toggleStock(shopId: string, id: string, isOutOfStock: boolean) {
    const existing = await this.findOne(shopId, id);
    return this.prisma.product.update({
      where: { id: existing.id },
      data: { isOutOfStock },
    });
  }

  /**
   * Remove product (FR-10)
   */
  async remove(shopId: string, id: string) {
    const existing = await this.findOne(shopId, id);
    return this.prisma.product.delete({
      where: { id: existing.id },
    });
  }
}
