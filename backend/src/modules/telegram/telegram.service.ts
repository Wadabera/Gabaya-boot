import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AiService } from '../ai/ai.service';
import {
  TelegramUpdate,
  BotResponsePayload,
  InlineKeyboardMarkup,
} from './telegram.types';
import { DeliveryType, PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import axios from 'axios';

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  option?: string;
  quantity: number;
}

interface BuyerSession {
  shopId?: string;
  language: 'am' | 'en';
  cart: CartItem[];
  checkoutStep?: 'NAME' | 'PHONE' | 'DELIVERY_TYPE' | 'AREA';
  checkoutDraft?: {
    name?: string;
    phone?: string;
    deliveryType?: DeliveryType;
    area?: string;
  };
  askMode?: boolean;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  // In-memory sessions (persisted per Telegram User ID)
  private sessions = new Map<string, BuyerSession>();

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private aiService: AiService,
  ) {}

  private getSession(telegramId: string): BuyerSession {
    if (!this.sessions.has(telegramId)) {
      this.sessions.set(telegramId, {
        language: 'am',
        cart: [],
      });
    }
    return this.sessions.get(telegramId)!;
  }

  /**
   * Process webhook update with idempotency protection (Acceptance Test 9)
   */
  async processUpdate(update: TelegramUpdate): Promise<BotResponsePayload | null> {
    const updateId = String(update.update_id);

    // 1. Webhook idempotency guard
    const existing = await this.prisma.processedTelegramUpdate.findUnique({
      where: { updateId },
    });

    if (existing) {
      this.logger.warn(`[TELEGRAM] Duplicate update ${updateId} ignored`);
      return null;
    }

    await this.prisma.processedTelegramUpdate.create({
      data: { updateId },
    });

    // 2. Route update based on type
    if (update.callback_query) {
      return this.handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      return this.handleMessage(update.message);
    }

    return null;
  }

  /**
   * Handle text messages & commands
   */
  async handleMessage(message: any): Promise<BotResponsePayload> {
    const chatId = message.chat.id;
    const telegramId = String(message.from.id);
    const text = message.text?.trim() || '';
    const session = this.getSession(telegramId);

    // Find customer record
    let customer = await this.prisma.customer.findUnique({
      where: { telegramId },
    });

    if (customer?.language) {
      session.language = customer.language as 'am' | 'en';
    }

    // 1. Handle /start command with optional deep-link shop payload
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1 && parts[1].startsWith('shop_')) {
        session.shopId = parts[1].replace('shop_', '');
      }

      // If no customer record yet, ask language first (L01)
      if (!customer) {
        return this.renderLanguagePicker(chatId);
      }

      return this.renderMainMenu(chatId, session);
    }

    // 2. Handle active checkout wizard steps (C6)
    if (session.checkoutStep) {
      return this.handleCheckoutInput(chatId, telegramId, session, text);
    }

    // 3. Handle active question mode (C10 / FR-40)
    if (session.askMode || (!text.startsWith('/') && session.shopId)) {
      return this.handleCustomerQuestion(chatId, telegramId, session, text);
    }

    // Fallback default: show main menu
    return this.renderMainMenu(chatId, session);
  }

  /**
   * Handle inline button callbacks
   */
  async handleCallbackQuery(cb: any): Promise<BotResponsePayload> {
    const chatId = cb.message?.chat.id;
    const telegramId = String(cb.from.id);
    const data = cb.data || '';
    const session = this.getSession(telegramId);

    // Language selection (L01 / FR-25)
    if (data === 'lang_am') {
      session.language = 'am';
      await this.saveCustomerLanguage(telegramId, 'am');
      return this.renderMainMenu(chatId, session);
    }
    if (data === 'lang_en') {
      session.language = 'en';
      await this.saveCustomerLanguage(telegramId, 'en');
      return this.renderMainMenu(chatId, session);
    }

    // Main navigation (C1)
    if (data === 'menu_products') {
      return this.renderCategories(chatId, session);
    }
    if (data === 'menu_orders') {
      return this.renderMyOrders(chatId, telegramId, session);
    }
    if (data === 'menu_ask') {
      session.askMode = true;
      const isAm = session.language === 'am';
      return {
        chatId,
        text: isAm
          ? 'ጥያቄዎን ይጻፉልን (ስለ ዋጋ፣ ክምችት፣ የስራ ሰዓት ወይም መገኛ):'
          : 'Please type your question (about price, stock, hours, or location):',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ተመለስ' : '‹ Back', callback_data: 'menu_main' }]],
        },
      };
    }
    if (data === 'menu_shop_info') {
      return this.renderShopInfo(chatId, session);
    }
    if (data === 'menu_details') {
      return this.renderMyDetails(chatId, telegramId, session);
    }
    if (data === 'menu_main') {
      session.askMode = false;
      session.checkoutStep = undefined;
      return this.renderMainMenu(chatId, session);
    }

    // Category products browsing (C2 -> C3)
    if (data.startsWith('cat_')) {
      const categoryId = data.replace('cat_', '');
      return this.renderProductsInCategory(chatId, session, categoryId);
    }

    // Product detail page (C3 -> C4)
    if (data.startsWith('prod_')) {
      const productId = data.replace('prod_', '');
      return this.renderProductDetail(chatId, session, productId);
    }

    // Add to cart (C4 -> C5)
    if (data.startsWith('add_cart_')) {
      const parts = data.replace('add_cart_', '').split('_');
      const productId = parts[0];
      const option = parts[1] !== 'none' ? parts[1] : undefined;
      return this.addToCart(chatId, session, productId, option);
    }

    // Cart actions (C5)
    if (data === 'cart_view') {
      return this.renderCart(chatId, session);
    }
    if (data === 'cart_clear') {
      session.cart = [];
      const isAm = session.language === 'am';
      return {
        chatId,
        text: isAm ? 'ጋሪዎ ጸድቷል።' : 'Your cart has been cleared.',
        replyMarkup: {
          inline_keyboard: [
            [{ text: isAm ? 'ምርቶች ይመልከቱ' : 'See products', callback_data: 'menu_products' }],
            [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }],
          ],
        },
      };
    }
    if (data === 'cart_checkout') {
      if (session.cart.length === 0) {
        return this.renderCart(chatId, session);
      }
      session.checkoutStep = 'NAME';
      session.checkoutDraft = {};
      const isAm = session.language === 'am';
      return {
        chatId,
        text: isAm ? 'ክፍያ እና ማድረሻ፦ ስምዎ ማን ይባላል?' : 'Checkout: What is your name?',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ተመለስ' : '‹ Back to cart', callback_data: 'cart_view' }]],
        },
      };
    }

    // Checkout delivery vs pickup selection (C6)
    if (data === 'deliver_delivery') {
      session.checkoutDraft = session.checkoutDraft || {};
      session.checkoutDraft.deliveryType = DeliveryType.DELIVERY;
      session.checkoutStep = 'AREA';
      const isAm = session.language === 'am';
      return {
        chatId,
        text: isAm ? 'እባክዎ የማድረሻ አካባቢዎን ይጻፉ (ምሳሌ: ቦሌ፣ ሲኤምሲ፣ መገናኛ):' : 'Please type your delivery area (e.g., Bole, CMC, Megenagna):',
      };
    }
    if (data === 'deliver_pickup') {
      session.checkoutDraft = session.checkoutDraft || {};
      session.checkoutDraft.deliveryType = DeliveryType.PICKUP;
      session.checkoutDraft.area = 'In-Store Pickup';
      session.checkoutStep = undefined;
      return this.renderOrderSummary(chatId, session);
    }

    // Confirm order -> Payment selection (C7 -> PAY1)
    if (data === 'order_confirm_pay') {
      return this.renderPaymentOptions(chatId, session);
    }

    // Payment choice (PAY1 / FR-64)
    if (data.startsWith('pay_method_')) {
      const method = data.replace('pay_method_', '') as PaymentMethod;
      return this.finalizeOrder(chatId, telegramId, session, method);
    }

    // Direct Payment "I have paid" (PAY2 / FR-65)
    if (data.startsWith('i_have_paid_')) {
      const orderId = data.replace('i_have_paid_', '');
      return this.markCustomerPaid(chatId, session, orderId);
    }

    // Cancel order (C9 / FR-24)
    if (data.startsWith('cancel_order_')) {
      const orderId = data.replace('cancel_order_', '');
      return this.handleCustomerCancelOrder(chatId, telegramId, session, orderId);
    }

    // Customer privacy - Delete my data (C12 / FR-69)
    if (data === 'delete_my_data') {
      return this.handleDeleteCustomerData(chatId, telegramId, session);
    }

    return this.renderMainMenu(chatId, session);
  }

  // --- UI SCREEN RENDERERS (MATCHING 19 BUYER UX SCREENS) ---

  /**
   * L01: Choose language
   */
  renderLanguagePicker(chatId: string | number): BotResponsePayload {
    return {
      chatId,
      text: 'ቋንቋ ይምረጡ / Choose your language:',
      replyMarkup: {
        inline_keyboard: [
          [
            { text: 'አማርኛ', callback_data: 'lang_am' },
            { text: 'English', callback_data: 'lang_en' },
          ],
          [{ text: 'Afaan Oromo · coming later', callback_data: 'noop' }],
        ],
      },
    };
  }

  /**
   * C1: Start and menu
   */
  async renderMainMenu(chatId: string | number, session: BuyerSession): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    let shopName = 'ShopBot';

    if (session.shopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
      if (shop) shopName = shop.name;
    }

    const greeting = isAm
      ? `እንኳን ደህና መጡ! ወደ [${shopName}] ሱቅ እንኳን በደህና መጡ። ምን ማድረግ ይፈልጋሉ?`
      : `Welcome to [${shopName}]. Choose what you want to do:`;

    return {
      chatId,
      text: greeting,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: 'አማርኛ', callback_data: 'lang_am' },
            { text: 'English', callback_data: 'lang_en' },
          ],
          [{ text: isAm ? 'ምርቶች · See products' : 'See products · ምርቶች', callback_data: 'menu_products' }],
          [{ text: isAm ? 'ትዕዛዞቼ · My orders' : 'My orders · ትዕዛዞቼ', callback_data: 'menu_orders' }],
          [{ text: isAm ? 'ጥያቄ · Ask a question' : 'Ask a question · ጥያቄ', callback_data: 'menu_ask' }],
          [{ text: isAm ? 'የሱቅ መረጃ · Shop info' : 'Shop info · የሱቅ መረጃ', callback_data: 'menu_shop_info' }],
          [{ text: isAm ? 'የኔ መረጃ · My details' : 'My details · የኔ መረጃ', callback_data: 'menu_details' }],
        ],
      },
    };
  }

  /**
   * C2: Categories
   */
  async renderCategories(chatId: string | number, session: BuyerSession): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    if (!session.shopId) {
      return {
        chatId,
        text: isAm ? 'እባክዎ በመጀመሪያ የሱቁን ሊንክ ይክፈቱ።' : 'Please open the shop using its official link.',
      };
    }

    const categories = await this.prisma.category.findMany({
      where: { shopId: session.shopId },
      orderBy: { sortOrder: 'asc' },
    });

    const keyboard = categories.map((c) => [
      { text: c.name, callback_data: `cat_${c.id}` },
    ]);

    keyboard.push([{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }]);

    return {
      chatId,
      text: isAm ? 'ምድብ ይምረጡ፦' : 'Choose a category:',
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * C3: Products in a category
   */
  async renderProductsInCategory(
    chatId: string | number,
    session: BuyerSession,
    categoryId: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const products = await this.prisma.product.findMany({
      where: { categoryId, shopId: session.shopId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const keyboard = products.map((p) => {
      const outOfStock = p.isOutOfStock || p.stock <= 0;
      const label = outOfStock
        ? `${p.name} · ${isAm ? 'አልቋል' : 'Out of stock'}`
        : `${p.name} · ${p.price} ETB`;

      return [
        {
          text: label,
          callback_data: outOfStock ? 'noop' : `prod_${p.id}`,
        },
      ];
    });

    keyboard.push([{ text: isAm ? '‹ ምድቦች' : '‹ Categories', callback_data: 'menu_products' }]);

    return {
      chatId,
      text: isAm ? 'ምርት ይምረጡ፦' : 'Tap a product to see details and options:',
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * C4: Product page
   */
  async renderProductDetail(
    chatId: string | number,
    session: BuyerSession,
    productId: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const product = await this.prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return { chatId, text: isAm ? 'ምርቱ አልተገኘም።' : 'Product not found.' };
    }

    const options = product.options ? product.options.split(',').map((o) => o.trim()) : [];
    const keyboard: any[] = [];

    if (options.length > 0) {
      // Option selector buttons
      keyboard.push(
        options.map((opt) => ({
          text: `[${opt}]`,
          callback_data: `add_cart_${product.id}_${opt}`,
        })),
      );
    } else {
      keyboard.push([
        {
          text: isAm ? 'ወደ ጋሪ ጨምር · Add to order' : 'Add to order · ወደ ጋሪ ጨምር',
          callback_data: `add_cart_${product.id}_none`,
        },
      ]);
    }

    keyboard.push([
      { text: isAm ? '‹ ተመለስ' : '‹ Back', callback_data: `cat_${product.categoryId}` },
      { text: isAm ? 'ጋሪ ይመልከቱ' : 'View order', callback_data: 'cart_view' },
    ]);

    const statusText = product.isOutOfStock ? (isAm ? 'አልቋል' : 'Out of stock') : (isAm ? 'በክምችት አለ' : 'In stock');

    const desc = `${product.name}
${product.price} ETB · ${statusText}
${product.description || ''}
${options.length > 0 ? (isAm ? 'መጠን ወይም አማራጭ ይምረጡ፦' : 'Pick a size or option:') : ''}`;

    return {
      chatId,
      text: desc,
      photoUrl: product.photoUrl || undefined,
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * Add item to cart (C4 -> C5)
   */
  async addToCart(
    chatId: string | number,
    session: BuyerSession,
    productId: string,
    option?: string,
  ): Promise<BotResponsePayload> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { chatId, text: 'Product not found' };
    }

    const existing = session.cart.find(
      (c) => c.productId === productId && c.option === option,
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      session.cart.push({
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        option,
        quantity: 1,
      });
    }

    return this.renderCart(chatId, session);
  }

  /**
   * C5: Order (Cart)
   */
  renderCart(chatId: string | number, session: BuyerSession): BotResponsePayload {
    const isAm = session.language === 'am';

    if (session.cart.length === 0) {
      return {
        chatId,
        text: isAm ? 'ጋሪዎ ባዶ ነው።' : 'Your cart is empty.',
        replyMarkup: {
          inline_keyboard: [
            [{ text: isAm ? 'ምርቶች ይመልከቱ' : 'See products', callback_data: 'menu_products' }],
            [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }],
          ],
        },
      };
    }

    const total = session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const itemsSummary = session.cart
      .map(
        (item) =>
          `${item.quantity} × ${item.productName}${item.option ? ` (${item.option})` : ''} — ${item.price * item.quantity} ETB`,
      )
      .join('\n');

    const text = `${isAm ? 'የእርስዎ ጋሪ (ትዕዛዝ)፦' : 'Your order (cart):'}
${itemsSummary}

${isAm ? 'ጠቅላላ ድምር፦' : 'Total:'} ${total} ETB`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'ክፈል · Checkout' : 'Checkout · ክፈል', callback_data: 'cart_checkout' }],
          [{ text: isAm ? 'ተጨማሪ ምርቶች ጨምር' : 'Add more products', callback_data: 'menu_products' }],
          [{ text: isAm ? 'ጋሪውን አጽዳ' : 'Clear order', callback_data: 'cart_clear' }],
        ],
      },
    };
  }

  /**
   * C6: Handle checkout wizard steps
   */
  async handleCheckoutInput(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
    text: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    session.checkoutDraft = session.checkoutDraft || {};

    if (session.checkoutStep === 'NAME') {
      session.checkoutDraft.name = text;
      session.checkoutStep = 'PHONE';
      return {
        chatId,
        text: isAm ? 'ስልክ ቁጥርዎን ያስገቡ (ምሳሌ: 0911223344):' : 'Phone number? (e.g., 0911223344):',
      };
    }

    if (session.checkoutStep === 'PHONE') {
      session.checkoutDraft.phone = text;
      session.checkoutStep = 'DELIVERY_TYPE';
      return {
        chatId,
        text: isAm ? 'ማድረሻ ይፈልጋሉ ወይስ እራስዎ መጥተው ይወስዳሉ?' : 'Delivery or pickup?',
        replyMarkup: {
          inline_keyboard: [
            [
              { text: isAm ? 'ማድረሻ (Delivery)' : 'Delivery', callback_data: 'deliver_delivery' },
              { text: isAm ? 'በአካል መውሰድ (Pickup)' : 'Pickup', callback_data: 'deliver_pickup' },
            ],
          ],
        },
      };
    }

    if (session.checkoutStep === 'AREA') {
      session.checkoutDraft.area = text;
      session.checkoutStep = undefined;
      return this.renderOrderSummary(chatId, session);
    }

    return this.renderMainMenu(chatId, session);
  }

  /**
   * C7: Summary and confirm
   */
  renderOrderSummary(chatId: string | number, session: BuyerSession): BotResponsePayload {
    const isAm = session.language === 'am';
    const draft = session.checkoutDraft || {};
    const total = session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const itemsSummary = session.cart
      .map(
        (i) =>
          `${i.quantity} × ${i.productName}${i.option ? ` (${i.option})` : ''} [${i.price * i.quantity} ETB]`,
      )
      .join('\n');

    const text = `${isAm ? 'የትዕዛዝ ማጠቃለያ' : 'Order summary'}:
${itemsSummary}

${isAm ? 'ስም' : 'Name'}: ${draft.name || ''}
${isAm ? 'ስልክ' : 'Phone'}: ${draft.phone || ''}
${isAm ? 'ማድረሻ' : 'Delivery'}: ${draft.deliveryType === DeliveryType.PICKUP ? 'Pickup' : draft.area || ''}

${isAm ? 'ጠቅላላ ድምር' : 'Total'}: ${total} ETB
${isAm ? 'ክፍያ በደረሰኝ ጊዜ በጥሬ ገንዘብ ወይም በቀጥታ ለሱቁ ይከፈላል።' : 'Pay cash on delivery or pay the shop directly.'}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'አረጋግጥ · Confirm' : 'Confirm · አረጋግጥ', callback_data: 'order_confirm_pay' }],
          [{ text: isAm ? 'አስተካክል (Edit)' : 'Edit', callback_data: 'cart_checkout' }],
          [{ text: isAm ? 'ሰርዝ (Cancel)' : 'Cancel', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * PAY1: Choose how to pay (FR-64)
   */
  renderPaymentOptions(chatId: string | number, session: BuyerSession): BotResponsePayload {
    const isAm = session.language === 'am';
    const text = isAm
      ? 'እንዴት መክፈል ይፈልጋሉ? ክፍያው በቀጥታ ለሱቁ ይከፈላል። ሾፕቦት ገንዘብዎን አይይዝም።'
      : 'How do you want to pay? The shop is paid directly. ShopBot never holds your money.';

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'በደረሰኝ ጊዜ በጥሬ ገንዘብ (Cash on delivery)' : 'Cash on delivery', callback_data: 'pay_method_CASH_ON_DELIVERY' }],
          [{ text: isAm ? 'በቀጥታ ለሱቁ (በባንክ ወይም በቴሌብር)' : 'Pay the shop directly (bank or mobile money)', callback_data: 'pay_method_DIRECT_SHOP' }],
          [{ text: isAm ? 'በአካል ሲወስዱ መክፈል (Pay when I pick up)' : 'Pay when I pick up', callback_data: 'pay_method_PICKUP' }],
          [{ text: isAm ? '‹ ወደ ማጠቃለያ ተመለስ' : '‹ Back to summary', callback_data: 'cart_view' }],
        ],
      },
    };
  }

  /**
   * C8 / PAY2: Finalize order creation and display payment details or confirmation
   */
  async finalizeOrder(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
    paymentMethod: PaymentMethod,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const draft = session.checkoutDraft || {};

    // Create the order using OrdersService
    const order = await this.ordersService.createOrder({
      shopId: session.shopId!,
      customerTelegramId: telegramId,
      customerName: draft.name || 'Telegram Buyer',
      customerPhone: draft.phone || 'N/A',
      deliveryType: draft.deliveryType || DeliveryType.DELIVERY,
      deliveryArea: draft.area || null,
      paymentMethod,
      items: session.cart.map((c) => ({
        productId: c.productId,
        option: c.option,
        quantity: c.quantity,
      })),
    });

    // Clear cart & checkout session
    session.cart = [];
    session.checkoutDraft = undefined;
    session.checkoutStep = undefined;

    // If Direct Payment, show PAY2 screen with Shop accounts
    if (paymentMethod === PaymentMethod.DIRECT_SHOP) {
      const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
      const payText = `${isAm ? 'ለሱቁ ይክፈሉ' : 'Pay'} [${shop?.name}]:
${isAm ? 'ባንክ' : 'Bank'}: ${shop?.bankName || 'CBE'}
${isAm ? 'ሂሳብ ቁጥር' : 'Account'}: ${shop?.bankAccount || 'N/A'}
${isAm ? 'ባለቤት' : 'Holder'}: ${shop?.bankAccountHolder || shop?.name}
${isAm ? 'ሞባይል ገንዘብ (ቴሌብር)' : 'Mobile money'}: ${shop?.mobileMoneyNumber || 'N/A'}

${isAm ? 'የሚከፈል መጠን' : 'Amount'}: ${order.total} ETB
${isAm ? 'የትዕዛዝ መለያ ቁጥር' : 'Reference'}: ${order.orderNumber}

${isAm ? 'ለእነዚህ የሱቅ አካውንቶች ብቻ ይክፈሉ። የይለፍ ቃል ወይም የካርድ ቁጥር በጭራሽ በዚህ ውይይት ውስጥ አያጋሩ።' : 'Pay only to these shop accounts. Never share passwords or card numbers in this chat. The shop confirms when the money arrives.'}`;

      return {
        chatId,
        text: payText,
        replyMarkup: {
          inline_keyboard: [
            [{ text: isAm ? 'ከፍያለሁ · I have paid' : 'I have paid · ከፍያለሁ', callback_data: `i_have_paid_${order.id}` }],
            [{ text: isAm ? 'በጥሬ ገንዘብ እከፍላለሁ' : 'Pay cash on delivery instead', callback_data: 'menu_orders' }],
          ],
        },
      };
    }

    // Otherwise show C8: Order sent
    const text = isAm
      ? `ትዕዛዝዎ ተልኳል! የትዕዛዝ ቁጥርዎ ${order.orderNumber} ነው።\nሱቁ ትዕዛዙን እስኪያረጋግጥ ድረስ መሰረዝ ይችላሉ።`
      : `Order sent. Your order number is ${order.orderNumber}.\nYou can cancel until the shop confirms.`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'ትዕዛዜን ተከታተል' : 'Track my order', callback_data: 'menu_orders' }],
          [{ text: isAm ? 'ወደ ዋና ማውጫ' : 'Back to menu', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * PAY2: Buyer clicks "I have paid"
   */
  async markCustomerPaid(
    chatId: string | number,
    session: BuyerSession,
    orderId: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.CUSTOMER_MARKED_PAID },
    });

    return {
      chatId,
      text: isAm
        ? 'ክፍያ መፈጸምዎን ለሱቁ አሳውቀናል። ሱቁ ሂሳቡን ካረጋገጠ በኋላ ትዕዛዝዎ ይላካል።'
        : 'The shop was notified that you paid. The shop will confirm receipt and process your order.',
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'ትዕዛዞቼ' : 'My orders', callback_data: 'menu_orders' }],
          [{ text: isAm ? 'ዋና ማውጫ' : 'Back to menu', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * C9: My orders and status tracker (FR-23, FR-24)
   */
  async renderMyOrders(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const orders = await this.ordersService.getCustomerOrders(telegramId, session.shopId);

    if (orders.length === 0) {
      return {
        chatId,
        text: isAm ? 'ምንም አይነት ትዕዛዝ አላገኙም።' : 'You have no orders yet.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }]],
        },
      };
    }

    let summaryText = isAm ? 'የትዕዛዞችዎ ሁኔታ፦\n' : 'My orders and status:\n';
    const keyboard: any[] = [];

    for (const o of orders.slice(0, 5)) {
      const statusLabel = this.formatStatus(o.status, isAm);
      summaryText += `\n${o.orderNumber} · ${o.total} ETB\n${isAm ? 'ሁኔታ' : 'Status'}: ${statusLabel}\n`;

      if (o.status === OrderStatus.NEW) {
        keyboard.push([
          {
            text: `${isAm ? 'ትዕዛዝ ሰርዝ' : 'Cancel order'} ${o.orderNumber}`,
            callback_data: `cancel_order_${o.id}`,
          },
        ]);
      }
    }

    keyboard.push([{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }]);

    return {
      chatId,
      text: summaryText,
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * C9: Customer cancels order (FR-24 / Acceptance Test 6)
   */
  async handleCustomerCancelOrder(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
    orderId: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    try {
      await this.ordersService.customerCancelOrder(telegramId, orderId);
      return {
        chatId,
        text: isAm ? 'ትዕዛዝዎ በተሳካ ሁኔታ ተሰርዟል።' : 'Your order has been cancelled.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }]],
        },
      };
    } catch (err) {
      return {
        chatId,
        text: err.message,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }]],
        },
      };
    }
  }

  /**
   * C10: Ask question (AI & Shop)
   */
  async handleCustomerQuestion(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
    text: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    if (!session.shopId) {
      return {
        chatId,
        text: isAm ? 'እባክዎ በመጀመሪያ ሱቅ ይምረጡ።' : 'Please select a shop first.',
      };
    }

    const res = await this.aiService.handleCustomerMessage(session.shopId, telegramId, text);

    return {
      chatId,
      text: res.reply,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'ምርቶች ይመልከቱ' : 'See products', callback_data: 'menu_products' }],
          [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * C11: Shop info
   */
  async renderShopInfo(chatId: string | number, session: BuyerSession): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    if (!session.shopId) {
      return { chatId, text: isAm ? 'ሱቅ አልተመረጠም።' : 'No shop selected.' };
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
    if (!shop) {
      return { chatId, text: isAm ? 'ሱቁ አልተገኘም።' : 'Shop not found.' };
    }

    const info = `[${shop.name}]
${isAm ? 'አካባቢ' : 'Area'}: ${shop.area || 'Addis Ababa'}
${isAm ? 'የስራ ሰዓት' : 'Hours'}: ${shop.openingHours || 'Mon-Sat 9am - 8pm'}
${isAm ? 'የማድረሻ ቦታዎች' : 'Delivery'}: ${shop.deliveryAreas || 'Addis Ababa'}
${isAm ? 'ሞባይል' : 'Phone'}: ${shop.mobileMoneyNumber || 'N/A'}`;

    return {
      chatId,
      text: info,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? 'ጥያቄ ጠይቅ' : 'Ask a question', callback_data: 'menu_ask' }],
          [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * C12: My details in the bot (FR-69)
   */
  async renderMyDetails(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const customer = await this.prisma.customer.findUnique({ where: { telegramId } });

    const text = `${isAm ? 'የእኔ መረጃ (My details)' : 'My details'}:
${isAm ? 'ስም' : 'Name'}: ${customer?.name || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'ስልክ' : 'Phone'}: ${customer?.phone || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'የመጨረሻ አካባቢ' : 'Last area'}: ${customer?.lastArea || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'ቋንቋ' : 'Language'}: ${session.language === 'am' ? 'አማርኛ' : 'English'}

${isAm ? 'ለትዕዛዝዎ የሚያስፈልገውን መረጃ ብቻ እናስቀምጣለን።' : 'We keep only what your order needs.'}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: isAm ? 'ስም ቀይር' : 'Change name', callback_data: 'cart_checkout' },
            { text: isAm ? 'ስልክ ቀይር' : 'Change phone', callback_data: 'cart_checkout' },
          ],
          [{ text: isAm ? 'ቋንቋ ቀይር' : 'Change language', callback_data: 'lang_picker' }],
          [{ text: isAm ? 'መረጃዬን ሰርዝ (Delete my data)' : 'Delete my data', callback_data: 'delete_my_data' }],
          [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * C12: Delete customer personal data (FR-69, Privacy)
   */
  async handleDeleteCustomerData(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    await this.prisma.customer.updateMany({
      where: { telegramId },
      data: {
        name: 'Deleted Customer',
        phone: null,
        lastArea: null,
        isAnonymized: true,
      },
    });

    return {
      chatId,
      text: isAm
        ? 'የግል መረጃዎ በተሳካ ሁኔታ ተሰርዟል።'
        : 'Your personal data has been erased in accordance with privacy retention policy.',
      replyMarkup: {
        inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }]],
      },
    };
  }

  private async saveCustomerLanguage(telegramId: string, lang: 'am' | 'en') {
    await this.prisma.customer.upsert({
      where: { telegramId },
      create: { telegramId, language: lang },
      update: { language: lang },
    });
  }

  private formatStatus(status: OrderStatus, isAm: boolean): string {
    switch (status) {
      case OrderStatus.NEW:
        return isAm ? 'አዲስ (New)' : 'New';
      case OrderStatus.CONFIRMED:
        return isAm ? 'የተረጋገጠ (Confirmed)' : 'Confirmed';
      case OrderStatus.OUT_FOR_DELIVERY:
        return isAm ? 'በመላክ ላይ (On the way)' : 'On the way';
      case OrderStatus.DELIVERED:
        return isAm ? 'ደርሷል (Delivered)' : 'Delivered';
      case OrderStatus.CANCELLED:
        return isAm ? 'ተሰርዟል (Cancelled)' : 'Cancelled';
      default:
        return status;
    }
  }
}
