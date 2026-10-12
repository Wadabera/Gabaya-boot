import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(shopId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: {
        shopId_name: {
          shopId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists for this shop`);
    }

    return this.prisma.category.create({
      data: {
        shopId,
        name: dto.name,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async findAllByShop(shopId: string) {
    return this.prisma.category.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(shopId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, shopId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(shopId: string, id: string) {
    const category = await this.findOne(shopId, id);
    return this.prisma.category.delete({
      where: { id: category.id },
    });
  }
}
