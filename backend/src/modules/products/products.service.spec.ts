import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ProductsService - Acceptance Tests', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            subscription: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'sub-free',
                plan: {
                  name: 'FREE',
                  productLimit: 2, // Limit set to 2 products
                },
              }),
            },
            product: {
              count: jest.fn().mockResolvedValue(2), // Already at limit of 2!
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Acceptance Test 7: Free-plan product limit is enforced when limit is reached', async () => {
    const createDto = {
      name: 'Third Product Exceeding Quota',
      price: 150,
      stock: 5,
    };

    // Attempting to add 3rd product when limit is 2 should throw ForbiddenException
    await expect(service.create('shop-1', createDto)).rejects.toThrow(ForbiddenException);
  });
});
