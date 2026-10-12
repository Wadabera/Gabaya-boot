import { PrismaClient, Role, ShopStatus, DeliveryType, PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Gebeya Boot database...');

  // 1. Seed Subscription Plans (FR-50, FR-51)
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      displayName: 'Free Plan',
      priceMonthly: 0,
      productLimit: 10,
      orderMonthlyLimit: 20,
      aiMonthlyLimit: 50,
      isActive: true,
      features: JSON.stringify(['10 products', '20 orders / month', '50 AI answers / month']),
    },
  });

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'BASIC' },
    update: {},
    create: {
      name: 'BASIC',
      displayName: 'Basic Plan',
      priceMonthly: 500,
      productLimit: 50,
      orderMonthlyLimit: 200,
      aiMonthlyLimit: 500,
      isActive: true,
      features: JSON.stringify(['50 products', '200 orders / month', '500 AI answers / month']),
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      displayName: 'Pro Plan',
      priceMonthly: 1500,
      productLimit: 500,
      orderMonthlyLimit: 1000,
      aiMonthlyLimit: 2000,
      isActive: true,
      features: JSON.stringify(['500 products', '1000 orders / month', '2000 AI answers / month', 'Staff accounts', 'Sales analytics']),
    },
  });

  console.log('✅ Subscription plans seeded: FREE, BASIC, PRO');

  // 2. Seed Initial Platform Administrator
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@gebeya-boot.et';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminGebeya2026!Secure';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: '+251911000000' },
    update: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isVerified: true,
    },
    create: {
      phone: '+251911000000',
      email: adminEmail,
      name: 'Platform Administrator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  console.log(`✅ Platform Admin seeded: ${admin.email}`);

  // 3. Seed Pilot Shop 1: "Bole Elegant Leather"
  const owner1 = await prisma.user.upsert({
    where: { phone: '+251911111111' },
    update: {},
    create: {
      phone: '+251911111111',
      name: 'Abebe Kebede',
      role: Role.OWNER,
      isVerified: true,
    },
  });

  const shop1 = await prisma.shop.upsert({
    where: { ownerId: owner1.id },
    update: {},
    create: {
      ownerId: owner1.id,
      name: 'Bole Elegant Leather',
      area: 'Bole Medhanialem, Edna Mall Area',
      openingHours: 'Mon - Sat: 9:00 AM - 8:00 PM',
      deliveryAreas: 'Bole, CMC, Kazanchis, Megenagna, Sarbet',
      language: 'am',
      status: ShopStatus.ACTIVE,
      botLink: 'https://t.me/GebeyaShopBot?start=shop_bole',
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      bankAccount: '1000123456789',
      bankAccountHolder: 'Abebe Kebede',
      mobileMoneyNumber: '0911111111',
      isAiEnabled: true,
      useEthiopianCalendar: true,
    },
  });

  // Assign Free Plan to Shop 1
  await prisma.subscription.create({
    data: {
      shopId: shop1.id,
      planId: freePlan.id,
      status: 'ACTIVE',
    },
  });

  // Categories for Shop 1
  const catShoes = await prisma.category.upsert({
    where: { shopId_name: { shopId: shop1.id, name: 'ጫማዎች (Shoes)' } },
    update: {},
    create: { shopId: shop1.id, name: 'ጫማዎች (Shoes)', sortOrder: 1 },
  });

  const catBags = await prisma.category.upsert({
    where: { shopId_name: { shopId: shop1.id, name: 'ቦርሳዎች (Bags)' } },
    update: {},
    create: { shopId: shop1.id, name: 'ቦርሳዎች (Bags)', sortOrder: 2 },
  });

  // Products for Shop 1
  const prodShoes = await prisma.product.create({
    data: {
      shopId: shop1.id,
      categoryId: catShoes.id,
      name: 'Classic Oxford Leather Shoes',
      description: 'Handmade Ethiopian genuine leather shoes.',
      price: 3500,
      stock: 12,
      options: '40, 41, 42, 43',
      isActive: true,
      isOutOfStock: false,
    },
  });

  const prodBag = await prisma.product.create({
    data: {
      shopId: shop1.id,
      categoryId: catBags.id,
      name: 'Pure Leather Handbag',
      description: 'Elegant genuine leather shoulder bag.',
      price: 2800,
      stock: 6,
      options: 'Brown, Black',
      isActive: true,
      isOutOfStock: false,
    },
  });

  // Out of stock product
  await prisma.product.create({
    data: {
      shopId: shop1.id,
      categoryId: catShoes.id,
      name: 'Vintage Slip-On Loafers',
      description: 'Out of stock showcase product.',
      price: 2200,
      stock: 0,
      options: '41, 42',
      isActive: true,
      isOutOfStock: true,
    },
  });

  // Approved shop rules for Shop 1 (FR-43)
  await prisma.shopRule.create({
    data: {
      shopId: shop1.id,
      questionPattern: 'deliver at night',
      approvedAnswer: 'Yes, we deliver before 8:00 PM in Bole and CMC areas.',
      isActive: true,
    },
  });

  await prisma.shopRule.create({
    data: {
      shopId: shop1.id,
      questionPattern: 'return',
      approvedAnswer: 'Items can be exchanged within 48 hours with original receipt.',
      isActive: true,
    },
  });

  console.log(`✅ Pilot Shop 1 seeded: ${shop1.name}`);

  // 4. Seed Pilot Shop 2: "Piassa Spices & Coffee" (for multi-tenant isolation verification)
  const owner2 = await prisma.user.upsert({
    where: { phone: '+251922222222' },
    update: {},
    create: {
      phone: '+251922222222',
      name: 'Tigist Haile',
      role: Role.OWNER,
      isVerified: true,
    },
  });

  const shop2 = await prisma.shop.upsert({
    where: { ownerId: owner2.id },
    update: {},
    create: {
      ownerId: owner2.id,
      name: 'Piassa Spices & Coffee',
      area: 'Piassa, Arada Subcity',
      openingHours: 'Mon - Sun: 8:00 AM - 7:00 PM',
      deliveryAreas: 'Piassa, Arat Kilo, Sidist Kilo',
      language: 'en',
      status: ShopStatus.ACTIVE,
      botLink: 'https://t.me/GebeyaShopBot?start=shop_piassa',
      isAiEnabled: true,
    },
  });

  await prisma.subscription.create({
    data: {
      shopId: shop2.id,
      planId: basicPlan.id,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Pilot Shop 2 seeded: ${shop2.name}`);

  // 5. Seed sample completed orders for Shop 1 (for analytics summary testing)
  const sampleCustomer = await prisma.customer.upsert({
    where: { telegramId: 'sample-buyer-999' },
    update: {},
    create: {
      telegramId: 'sample-buyer-999',
      name: 'Almaz Tefera',
      phone: '+251933333333',
      lastArea: 'Bole',
      language: 'am',
    },
  });

  await prisma.order.upsert({
    where: { orderNumber: '#1001' },
    update: {},
    create: {
      orderNumber: '#1001',
      shopId: shop1.id,
      customerId: sampleCustomer.id,
      total: 3500,
      status: OrderStatus.DELIVERED,
      deliveryType: DeliveryType.DELIVERY,
      deliveryArea: 'Bole',
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      paymentStatus: PaymentStatus.CONFIRMED_PAID,
      items: {
        create: [
          {
            productId: prodShoes.id,
            productName: prodShoes.name,
            quantity: 1,
            unitPrice: 3500,
            totalPrice: 3500,
          },
        ],
      },
      statusHistory: {
        create: {
          fromStatus: OrderStatus.NEW,
          toStatus: OrderStatus.DELIVERED,
          changedBy: 'OWNER',
          note: 'Sample delivered order for sales analytics',
        },
      },
    },
  });

  console.log('🏁 Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
