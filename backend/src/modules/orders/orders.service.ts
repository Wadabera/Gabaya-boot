import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create customer order with strict DB price calculation and validation (FR-22, FR-30)
   */
  async createOrder(dto: CreateOrderDto) {
    // 1. Verify Shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // 2. Subscription monthly order quota enforcement (FR-50)
    const activeSub = shop.subscriptions[0];
    if (activeSub?.plan) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyOrdersCount = await this.prisma.order.count({
        where: {
          shopId: shop.id,
          createdAt: { gte: startOfMonth },
        },
      });

      if (monthlyOrdersCount >= activeSub.plan.orderMonthlyLimit) {
        throw new ForbiddenException(
          `Monthly order limit (${activeSub.plan.orderMonthlyLimit}) reached for the shop's plan.`,
        );
      }
    }

    // 3. Find or Create Customer
    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: dto.customerTelegramId },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          telegramId: dto.customerTelegramId,
          name: dto.customerName,
          phone: dto.customerPhone,
          lastArea: dto.deliveryArea || null,
        },
      });
    } else {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: dto.customerName,
          phone: dto.customerPhone,
          lastArea: dto.deliveryArea || customer.lastArea,
        },
      });
    }

    // 4. Validate items against DB, verify prices and availability
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        shopId: shop.id,
        isActive: true,
      },
    });

    if (dbProducts.length !== productIds.length) {
      throw new BadRequestException('One or more selected products are invalid or no longer active');
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let orderTotal = new Prisma.Decimal(0);
    const orderItemsData: {
      productId: string;
      productName: string;
      option?: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }[] = [];

    for (const item of dto.items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      if (dbProduct.isOutOfStock || dbProduct.stock <= 0) {
        throw new BadRequestException(`Product "${dbProduct.name}" is currently out of stock`);
      }

      if (dbProduct.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${dbProduct.name}". Only ${dbProduct.stock} available.`,
        );
      }

      const itemUnitPrice = dbProduct.price;
      const itemTotalPrice = itemUnitPrice.mul(item.quantity);
      orderTotal = orderTotal.add(itemTotalPrice);

      orderItemsData.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        option: item.option || null,
        quantity: item.quantity,
        unitPrice: itemUnitPrice,
        totalPrice: itemTotalPrice,
      });
    }

    // 5. Generate human-readable order number: e.g. #1001, #1002
    const totalOrdersCount = await this.prisma.order.count({
      where: { shopId: shop.id },
    });
    const orderNumber = `#${1001 + totalOrdersCount}`;

    // 6. Create Order and Order Items atomically
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        shopId: shop.id,
        customerId: customer.id,
        total: orderTotal,
        status: OrderStatus.NEW,
        deliveryType: dto.deliveryType,
        deliveryArea: dto.deliveryArea || null,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        notes: dto.notes || null,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: {
            fromStatus: OrderStatus.NEW,
            toStatus: OrderStatus.NEW,
            changedBy: 'CUSTOMER',
            note: 'Order submitted by customer via Telegram',
          },
        },
      },
      include: {
        items: true,
        customer: true,
        shop: {
          select: { id: true, name: true, ownerId: true },
        },
      },
    });

    this.logger.log(`[ORDER] New order ${orderNumber} created for shop ${shop.name} total ${orderTotal} ETB`);

    return order;
  }

  /**
   * Find orders for shop with filtering (O6)
   */
  async findAllByShop(shopId: string, statusCategory?: 'new' | 'active' | 'done', search?: string) {
    const where: Prisma.OrderWhereInput = {
      shopId,
    };

    if (statusCategory === 'new') {
      where.status = OrderStatus.NEW;
    } else if (statusCategory === 'active') {
      where.status = {
        in: [OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY],
      };
    } else if (statusCategory === 'done') {
      where.status = {
        in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single order detail (O7)
   */
  async findOne(shopId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Update order status with atomic stock reduction & valid transitions (FR-31, FR-32, FR-33)
   */
  async updateStatus(
    shopId: string,
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    reason?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.status;

    // Reject no-op
    if (currentStatus === newStatus) {
      return order;
    }

    // Terminal states cannot be changed
    if (currentStatus === OrderStatus.DELIVERED || currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Order is already in terminal state: ${currentStatus}`);
    }

    // Valid state transitions logic
    if (currentStatus === OrderStatus.NEW) {
      if (newStatus !== OrderStatus.CONFIRMED && newStatus !== OrderStatus.CANCELLED) {
        throw new BadRequestException(`Invalid transition: NEW orders can only be CONFIRMED or CANCELLED`);
      }
    } else if (currentStatus === OrderStatus.CONFIRMED) {
      if (newStatus !== OrderStatus.OUT_FOR_DELIVERY && newStatus !== OrderStatus.DELIVERED && newStatus !== OrderStatus.CANCELLED) {
        throw new BadRequestException(`Invalid transition from CONFIRMED`);
      }
    }

    // Execute atomic transaction for status update + stock reduction/restoration
    return this.prisma.$transaction(async (tx) => {
      // 1. If confirming order: Reduce stock atomically (FR-33 / Acceptance Test 5)
      if (currentStatus === OrderStatus.NEW && newStatus === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new BadRequestException(`Product ${item.productName} no longer exists`);
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Cannot confirm order: Insufficient stock for "${product.name}". Remaining: ${product.stock}, required: ${item.quantity}`,
            );
          }

          const updatedStock = product.stock - item.quantity;
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: updatedStock,
              isOutOfStock: updatedStock <= 0,
            },
          });
        }
      }

      // 2. If cancelling an order that had previously been confirmed: Restore stock
      if (currentStatus !== OrderStatus.NEW && newStatus === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              isOutOfStock: false,
            },
          });
        }
      }

      // 3. Update order state
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          rejectionReason: newStatus === OrderStatus.CANCELLED ? reason : order.rejectionReason,
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // 4. Log status change history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy,
          note: reason || `Status updated from ${currentStatus} to ${newStatus}`,
        },
      });

      this.logger.log(`[ORDER] Order ${order.orderNumber} status changed: ${currentStatus} -> ${newStatus}`);
      return updatedOrder;
    });
  }

  /**
   * Customer cancels order (FR-24 / Acceptance Test 6)
   * Only permitted while status is NEW!
   */
  async customerCancelOrder(telegramId: string, orderId: string, reason?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.NEW) {
      throw new BadRequestException(
        'You can only cancel an order before the shop confirms it (FR-24). Please contact the shop directly.',
      );
    }

    return this.updateStatus(order.shopId, order.id, OrderStatus.CANCELLED, 'CUSTOMER', reason || 'Cancelled by buyer');
  }

  /**
   * Owner records whether payment was received (PAY3, FR-65)
   */
  async markPayment(shopId: string, orderId: string, paymentStatus: PaymentStatus, note?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        notes: note ? (order.notes ? `${order.notes} | ${note}` : note) : order.notes,
      },
      include: {
        customer: true,
        items: true,
      },
    });
  }

  /**
   * Customer order history in Telegram (C9 / FR-23)
   */
  async getCustomerOrders(telegramId: string, shopId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId },
    });

    if (!customer) {
      return [];
    }

    const where: Prisma.OrderWhereInput = {
      customerId: customer.id,
    };

    if (shopId) {
      where.shopId = shopId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: true,
        shop: {
          select: { name: true, botLink: true, openingHours: true, area: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
