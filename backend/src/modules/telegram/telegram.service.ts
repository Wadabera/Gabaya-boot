import { Injectable, Logger, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../../common/services/notification.service';
import {
  TelegramUpdate,
  BotResponsePayload,
  InlineKeyboardMarkup,
  TelegramMessage,
} from './telegram.types';
import { DeliveryType, PaymentMethod, PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import axios from 'axios';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  option?: string;
  quantity: number;
}

export interface BuyerSession {
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

  // Interactive Product detail browsing selection (C4)
  viewingProductId?: string;
  selectedOption?: string;
  selectedQuantity?: number;

  // Add product mode (FR-14)
  addProductStep?: 'WAITING_DETAILS' | 'WAITING_PHOTO';
  addProductDraft?: {
    name?: string;
    price?: number;
    options?: string;
    categoryName?: string;
    photoUrl?: string;
  };

  // Receipt upload mode
  lastOrderIdForReceipt?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  // In-memory sessions (persisted per Telegram User ID)
  private sessions = new Map<string, BuyerSession>();
  private isPolling = false;
  private pollOffset = 0;

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private aiService: AiService,
    private notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const forcePolling = process.env.TELEGRAM_POLLING === 'true';

    if (!token || token.includes('example') || !token.includes(':')) {
      return;
    }

    if (!forcePolling && webhookUrl && !webhookUrl.includes('localhost') && webhookUrl.startsWith('https://')) {
      try {
        const res = await axios.post(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            url: webhookUrl,
            secret_token: secret,
          },
          { timeout: 8000 },
        );
        this.logger.log(`[TELEGRAM] Webhook successfully registered: ${res.data?.description || 'OK'}`);
      } catch (err: any) {
        this.logger.warn(`[TELEGRAM] Failed to set webhook with Telegram: ${err.message}`);
      }
    } else {
      // Local development or polling mode: clear any existing webhook and start polling
      try {
        await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`, {}, { timeout: 8000 });
        this.logger.log('[TELEGRAM] Webhook cleared, activating live polling mode');
      } catch {}
      this.startPolling(token);
    }
  }

  onModuleDestroy() {
    this.isPolling = false;
  }

  private async startPolling(token: string) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.logger.log(`[TELEGRAM] Active polling started for @${process.env.TELEGRAM_BOT_USERNAME || 'bot'}`);

    const pollLoop = async () => {
      while (this.isPolling) {
        try {
          const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
            params: {
              offset: this.pollOffset,
              timeout: 10,
            },
            timeout: 15000,
          });

          if (response.data?.ok && Array.isArray(response.data.result)) {
            for (const update of response.data.result) {
              this.pollOffset = update.update_id + 1;
              try {
                await this.processUpdate(update);
              } catch (err: any) {
                this.logger.error(`[TELEGRAM] Error handling update ${update.update_id}: ${err.message}`);
              }
            }
          }
        } catch (err: any) {
          if (err.code !== 'ECONNABORTED' && !axios.isCancel(err)) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }
    };

    pollLoop();
  }

  public getSession(telegramId: string): BuyerSession {
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
    let response: BotResponsePayload | null = null;
    if (update.callback_query) {
      response = await this.handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      response = await this.handleMessage(update.message);
    }

    if (response) {
      await this.notificationService.sendTelegram(
        response.chatId,
        response.text,
        response.replyMarkup,
        response.photoUrl,
      );
    }

    return response;
  }

  /**
   * Helper: Resolve Telegram photo URL from PhotoSize
   */
  async resolveTelegramPhotoUrl(fileId: string): Promise<string> {
    if (!fileId) return '';
    if (fileId.startsWith('http://') || fileId.startsWith('https://') || fileId.startsWith('data:')) {
      return fileId;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token.includes('example') || !token.includes(':')) {
      return 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600';
    }

    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      const filePath = res.data?.result?.file_path;
      if (filePath) {
        return `https://api.telegram.org/file/bot${token}/${filePath}`;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to resolve Telegram file URL: ${err.message}`);
    }

    return 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600';
  }

  /**
   * Handle text messages, photo uploads & commands (FR-14, FR-20, FR-30, FR-40, FR-64)
   */
  async handleMessage(message: TelegramMessage): Promise<BotResponsePayload> {
    const chatId = message.chat.id;
    const telegramId = String(message.from.id);
    const rawText = message.text?.trim() || message.caption?.trim() || '';
    const hasPhoto = message.photo && message.photo.length > 0;
    const session = this.getSession(telegramId);

    // Find customer record
    let customer = await this.prisma.customer.findUnique({
      where: { telegramId },
    });

    if (customer?.language) {
      session.language = customer.language as 'am' | 'en';
    }

    // Check if user is an owner of any shop
    const ownerUser = await this.prisma.user.findFirst({
      where: { telegramId },
      include: { ownedShop: true },
    });

    const isAm = session.language === 'am';

    // -------------------------------------------------------------
    // PHOTO MESSAGE HANDLING (FR-14 Product Creation & Receipts)
    // -------------------------------------------------------------
    if (hasPhoto) {
      const bestPhoto = message.photo![message.photo!.length - 1];
      const photoUrl = await this.resolveTelegramPhotoUrl(bestPhoto.file_id);

      // A) Check if customer is uploading a payment receipt (PAY2)
      if (session.lastOrderIdForReceipt || rawText.toLowerCase().includes('receipt') || rawText.includes('ደረሰኝ') || rawText.includes('ከፍያለሁ')) {
        let orderId = session.lastOrderIdForReceipt;
        if (!orderId && customer) {
          const latestOrder = await this.prisma.order.findFirst({
            where: { customerId: customer.id, paymentStatus: { not: PaymentStatus.CONFIRMED_PAID } },
            orderBy: { createdAt: 'desc' },
          });
          orderId = latestOrder?.id;
        }

        if (orderId) {
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: PaymentStatus.CUSTOMER_MARKED_PAID,
              notes: `Receipt uploaded: ${photoUrl}`,
            },
          });

          session.lastOrderIdForReceipt = undefined;

          // Notify owner on Telegram
          const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { shop: { include: { owner: true } } },
          });

          if (order?.shop?.owner?.telegramId) {
            await this.notificationService.sendTelegram(
              order.shop.owner.telegramId,
              `📸 የክፍያ ደረሰኝ ከደንበኛ ደርሷል!\nየትዕዛዝ ቁጥር: ${order.orderNumber}\nየተከፈለ: ${order.total} ETB`,
              {
                inline_keyboard: [
                  [{ text: '✅ ክፍያ አረጋግጥ · Mark Paid', callback_data: `owner_paid_${order.id}` }],
                  [{ text: '📋 ዝርዝር እይ · View Order', callback_data: `owner_order_view_${order.id}` }],
                ],
              },
              photoUrl,
            );
          }

          return {
            chatId,
            text: isAm
              ? '📸 ደረሰኝዎ በተሳካ ሁኔታ ደርሷል! ሱቁ ሂሳቡን ካረጋገጠ በኋላ እቃዎ ይላካል።'
              : '📸 Your payment receipt has been received! The shop will verify and dispatch your order.',
            replyMarkup: {
              inline_keyboard: [
                [{ text: isAm ? 'ትዕዛዜን ተከታተል' : 'Track order', callback_data: 'menu_orders' }],
                [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }],
              ],
            },
          };
        }
      }

      // B) FR-14: Owner / User adds a product via Photo + Caption
      // Determine target shop: owner's shop, or active session shop
      const targetShopId = ownerUser?.ownedShop?.id || session.shopId;
      const looksLikeProduct =
        session.addProductStep ||
        rawText.startsWith('/addproduct') ||
        /\b\d+\s*(?:etb|birr|ብር)?/i.test(rawText) ||
        rawText.length > 3;

      if (targetShopId && looksLikeProduct) {
        return this.handleCreateProductFromBot(chatId, session, targetShopId, rawText, photoUrl);
      }

      // If photo was sent without clear caption, save photoUrl and prompt for details
      if (targetShopId && ownerUser) {
        session.addProductDraft = { photoUrl };
        session.addProductStep = 'WAITING_DETAILS';
        return {
          chatId,
          text: isAm
            ? '📸 የምርት ፎቶ ተቀብለናል!\nአሁን እባክዎ የምርቱን ስም፣ ዋጋ እና አማራጮች ይጻፉልን፦\n(ምሳሌ፦ የቆዳ ጫማ 2500 ETB 40,41,42)'
            : '📸 Photo received!\nNow please type the product name, price in ETB, and options:\n(e.g., Leather Shoes 2500 ETB S,M,L)',
          replyMarkup: {
            inline_keyboard: [[{ text: isAm ? '‹ ሰርዝ' : '‹ Cancel', callback_data: 'owner_menu' }]],
          },
        };
      }
    }

    // -------------------------------------------------------------
    // TEXT-BASED ADD PRODUCT STEP (FR-14)
    // -------------------------------------------------------------
    if (session.addProductStep === 'WAITING_DETAILS' && rawText) {
      const targetShopId = ownerUser?.ownedShop?.id || session.shopId;
      if (targetShopId) {
        const photoUrl = session.addProductDraft?.photoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600';
        return this.handleCreateProductFromBot(chatId, session, targetShopId, rawText, photoUrl);
      }
    }

    // -------------------------------------------------------------
    // COMMAND: /owner, /dashboard (Owner Mobile Portal)
    // -------------------------------------------------------------
    if (rawText === '/owner' || rawText === '/dashboard' || rawText === '/ባለቤት') {
      return this.renderOwnerPortal(chatId, telegramId, session);
    }

    // -------------------------------------------------------------
    // COMMAND: /addproduct [name], [price], [options] (FR-14)
    // -------------------------------------------------------------
    if (rawText.startsWith('/addproduct') || rawText.startsWith('/አዲስ_እቃ')) {
      const targetShopId = ownerUser?.ownedShop?.id || session.shopId;
      if (!targetShopId) {
        return {
          chatId,
          text: isAm
            ? 'እባክዎ መጀመሪያ ሱቅዎን በስልክ ቁጥርዎ ያገናኙ፦ /connect 0911000000'
            : 'Please connect your shop account first: /connect 0911000000',
        };
      }

      const cleanText = rawText.replace(/^\/(?:addproduct|አዲስ_እቃ)\s*/i, '').trim();
      if (!cleanText) {
        session.addProductStep = 'WAITING_DETAILS';
        return {
          chatId,
          text: isAm
            ? `📸 አዲስ ምርት መመዝገቢያ (FR-14)፦\n\nየምርቱን ፎቶ ከነ ዋጋው እና ስሙ ይላኩ!\nምሳሌ ፎቶ ልከው በፅሁፉ፦\n"የቆዳ ቦርሳ - 1800 ETB - S, M, L"\n\nወይም አሁኑኑ ፅሁፍ ይላኩ፦\n/addproduct [ስም], [ዋጋ], [ምድብ], [መጠኖች]`
            : `📸 Add New Product (FR-14):\n\nSend a photo with a caption including name and price!\ne.g. "Leather Bag 1800 ETB S,M,L"\n\nOr type details now:\n/addproduct [name], [price], [category], [options]`,
        };
      }

      return this.handleCreateProductFromBot(chatId, session, targetShopId, cleanText);
    }

    // -------------------------------------------------------------
    // COMMAND: /orders
    // -------------------------------------------------------------
    if (rawText === '/orders' || rawText === '/ትዕዛዞች') {
      if (ownerUser?.ownedShop) {
        return this.renderOwnerOrders(chatId, ownerUser.ownedShop.id, session);
      }
      return this.renderMyOrders(chatId, telegramId, session);
    }

    // -------------------------------------------------------------
    // COMMAND: /sales
    // -------------------------------------------------------------
    if (rawText === '/sales' || rawText === '/ሽያጭ') {
      if (ownerUser?.ownedShop) {
        return this.renderOwnerSales(chatId, ownerUser.ownedShop.id, session);
      }
    }

    // -------------------------------------------------------------
    // COMMAND: /connect <phone> or /owner <phone>
    // -------------------------------------------------------------
    if (rawText.startsWith('/connect') || rawText.startsWith('/owner')) {
      const parts = rawText.split(' ');
      const phoneInput = parts[1]?.trim();
      if (!phoneInput) {
        return {
          chatId,
          text: isAm
            ? 'እባክዎ ስልክ ቁጥርዎን ያስገቡ፦ /connect 0911000000'
            : 'Please provide your registered phone number: /connect 0911000000',
        };
      }
      const cleaned = phoneInput.replace(/[\s\-\(\)]/g, '');
      const normalizedPhone = cleaned.startsWith('0')
        ? `+251${cleaned.substring(1)}`
        : cleaned.startsWith('9') || cleaned.startsWith('7')
        ? `+251${cleaned}`
        : cleaned;

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ phone: normalizedPhone }, { phone: phoneInput }],
        },
        include: { ownedShop: true },
      });

      if (!user) {
        return {
          chatId,
          text: isAm
            ? 'በዚህ ስልክ ቁጥር የተመዘገበ የሱቅ አካውንት አልተገኘም።'
            : 'No shop owner account found matching this phone number.',
        };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { telegramId },
      });

      session.shopId = user.ownedShop?.id;

      return {
        chatId,
        text: isAm
          ? `🎉 እንኳን ደስ አለዎት ${user.name || ''}! የቴሌግራም አካውንትዎ ከ [${user.ownedShop?.name || 'ሱቅዎ'}] ጋር ተገናኝቷል።\nአዳዲስ ትዕዛዞች ወዲያውኑ እዚህ ይደርስዎታል፤ ምርት መመዝገብም ይችላሉ።`
          : `🎉 Success ${user.name || ''}! Your Telegram account is linked to [${user.ownedShop?.name || 'your shop'}].\nYou will receive order alerts and can manage your shop directly here.`,
        replyMarkup: {
          inline_keyboard: [
            [{ text: isAm ? '👑 የሱቅ መቆጣጠሪያ · Owner Portal' : '👑 Owner Portal', callback_data: 'owner_menu' }],
            [{ text: isAm ? '🛍️ የደንበኛ እይታ · Buyer Menu' : '🛍️ Buyer Menu', callback_data: 'menu_main' }],
          ],
        },
      };
    }

    // -------------------------------------------------------------
    // COMMAND: /shops
    // -------------------------------------------------------------
    if (rawText === '/shops' || rawText === '/stores' || rawText === '/ሱቆች') {
      return this.renderShopPicker(chatId, session);
    }

    // -------------------------------------------------------------
    // COMMAND: /language
    // -------------------------------------------------------------
    if (rawText === '/language' || rawText === '/lang' || rawText === '/ቋንቋ') {
      return this.renderLanguagePicker(chatId);
    }

    // -------------------------------------------------------------
    // COMMAND: /cart
    // -------------------------------------------------------------
    if (rawText === '/cart' || rawText === '/ጋሪ') {
      return this.renderCart(chatId, session);
    }

    // -------------------------------------------------------------
    // COMMAND: /start
    // -------------------------------------------------------------
    if (rawText.startsWith('/start')) {
      const parts = rawText.split(' ');
      if (parts.length > 1) {
        const rawParam = parts[1].trim();
        if (rawParam.startsWith('prod_')) {
          const prodId = rawParam.replace('prod_', '');
          const prod = await this.prisma.product.findUnique({ where: { id: prodId } });
          if (prod) {
            session.shopId = prod.shopId;
            return this.renderProductDetail(chatId, session, prod.id);
          }
        } else {
          const identifier = rawParam.startsWith('shop_') ? rawParam.replace('shop_', '') : rawParam;
          const resolved = await this.resolveShop(identifier);
          if (resolved) {
            session.shopId = resolved.id;
          }
        }
      }

      // If no customer record yet, ask language first (L01)
      if (!customer) {
        return this.renderLanguagePicker(chatId);
      }

      return this.renderMainMenu(chatId, session);
    }

    // -------------------------------------------------------------
    // CHECKOUT WIZARD STEP
    // -------------------------------------------------------------
    if (session.checkoutStep) {
      return this.handleCheckoutInput(chatId, telegramId, session, rawText);
    }

    // -------------------------------------------------------------
    // NATURAL SEARCH: Check if user typed a product keyword in shop catalog
    // -------------------------------------------------------------
    if (session.shopId && rawText.length >= 2 && !rawText.startsWith('/')) {
      const matchingProducts = await this.prisma.product.findMany({
        where: {
          shopId: session.shopId,
          isActive: true,
          OR: [
            { name: { contains: rawText, mode: 'insensitive' } },
            { description: { contains: rawText, mode: 'insensitive' } },
            { category: { name: { contains: rawText, mode: 'insensitive' } } },
          ],
        },
        take: 4,
      });

      if (matchingProducts.length > 0) {
        const keyboard = matchingProducts.map((p) => [
          {
            text: `🛍️ ${p.name} - ${p.price} ETB ${p.isOutOfStock ? '(አልቋል)' : ''}`,
            callback_data: `prod_${p.id}`,
          },
        ]);
        keyboard.push([{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }]);

        return {
          chatId,
          text: isAm
            ? `🔎 ለ"${rawText}" የተገኙ ምርቶች፦\nእባክዎ ማዘዝ የሚፈልጉትን ምርት ይምረጡ፦`
            : `🔎 Products matching "${rawText}":\nSelect a product to see details and order:`,
          replyMarkup: { inline_keyboard: keyboard },
        };
      }
    }

    // -------------------------------------------------------------
    // ACTIVE QUESTION / AI ASSISTANT (C10 / FR-40)
    // -------------------------------------------------------------
    if (session.askMode || (!rawText.startsWith('/') && session.shopId)) {
      return this.handleCustomerQuestion(chatId, telegramId, session, rawText);
    }

    // Fallback default: show main menu
    return this.renderMainMenu(chatId, session);
  }

  /**
   * FR-14: Parse product details and create product in shop catalog, then provide 1-click social media auto-post
   */
  async handleCreateProductFromBot(
    chatId: string | number,
    session: BuyerSession,
    shopId: string,
    text: string,
    photoUrl?: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    session.addProductStep = undefined;
    session.addProductDraft = undefined;

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { categories: true },
    });

    if (!shop) {
      return { chatId, text: isAm ? 'ሱቁ አልተገኘም።' : 'Shop not found.' };
    }

    // 1. Parse Price
    let price = 1500;
    const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:etb|birr|ብር)?/i);
    if (priceMatch) {
      const parsed = parseFloat(priceMatch[1].replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed;
      }
    }

    // 2. Parse Options (e.g., S, M, L or 40,41,42)
    let options = 'S, M, L';
    const optionsMatch = text.match(/\b([SMLXL]{1,3}(?:\s*,\s*[SMLXL]{1,3})*|\d{2}(?:\s*,\s*\d{2})+)\b/i);
    if (optionsMatch) {
      options = optionsMatch[1];
    }

    // 3. Clean Name: Remove price & options from text
    let name = text
      .replace(new RegExp(priceMatch ? priceMatch[0] : '', 'i'), '')
      .replace(new RegExp(optionsMatch ? optionsMatch[0] : '', 'i'), '')
      .replace(/^(?:addproduct|አዲስ_እቃ|ምርት|product)[\s:,-]*/i, '')
      .trim();

    if (!name || name.length < 2) {
      name = isAm ? 'አዲስ ምርት' : 'New Product';
    }

    // 4. Default Photo if none provided
    const resolvedPhoto = photoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600';

    // 5. Create in database using ProductsService (respects plan quotas)
    let createdProduct: any;
    try {
      createdProduct = await this.productsService.create(shop.id, {
        name,
        price,
        stock: 20,
        options,
        photoUrl: resolvedPhoto,
        description: isAm
          ? `${name} በጥራት የተዘጋጀ ምርት። አሁኑኑ በቴሌግራም ይዘዙ።`
          : `High quality ${name}. Order directly inside Telegram with fast delivery.`,
      });
    } catch (err: any) {
      return {
        chatId,
        text: `⚠️ ${err.message || 'Failed to create product'}`,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
        },
      };
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'gebayawa_bot';
    const productLink = `https://t.me/${botUsername}?start=prod_${createdProduct.id}`;
    const shopLink = shop.botLink || `https://t.me/${botUsername}?start=shop_${shop.id}`;

    // Auto-generated social media caption (FR-67, FR-68)
    const caption = `🔥 አዲስ እቃ ገብቷል! ${createdProduct.name}
💰 ዋጋ፦ ${createdProduct.price} ETB
📏 መጠኖች / አማራጮች፦ ${createdProduct.options || 'All sizes'}

🛒 አሁኑኑ በቴሌግራም በቀጥታ ይዘዙ፦
👉 ${productLink}

📍 ${shop.area || 'አዲስ አበባ'} | ⏰ ${shop.openingHours || '8:00 AM - 8:00 PM'}
🚚 ፈጣን ማድረሻ አለን (Fast Delivery & In-Store Pickup)`;

    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(productLink)}&text=${encodeURIComponent(caption)}`;
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}`;

    const responseText = isAm
      ? `🎉 አዲስ ምርት በተሳካ ሁኔታ ተመዝግቧል! (FR-14)

📦 ምርት፦ ${createdProduct.name}
💰 ዋጋ፦ ${createdProduct.price} ETB
📏 አማራጮች፦ ${createdProduct.options}
📦 ስቶክ፦ ${createdProduct.stock}

📢 አሁኑኑ በማህበራዊ ሚዲያ በቀላሉ ያጋሩ (Auto-Post & Share)፦`
      : `🎉 Product created successfully! (FR-14)

📦 Name: ${createdProduct.name}
💰 Price: ${createdProduct.price} ETB
📏 Options: ${createdProduct.options}
📦 Stock: ${createdProduct.stock}

📢 Instantly share & post to social media:`;

    return {
      chatId,
      text: responseText,
      photoUrl: resolvedPhoto,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📢 Share on Telegram Channel (1-Click)', url: telegramShareUrl }],
          [{ text: '📱 Post on Facebook (P02)', url: fbShareUrl }],
          [{ text: isAm ? '🛒 በካታሎግ ውስጥ እይ' : '🛒 View in Shop Catalog', callback_data: `prod_${createdProduct.id}` }],
          [
            { text: isAm ? '➕ ሌላ እቃ መዝግብ' : '➕ Add Another Product', callback_data: 'owner_add_product' },
            { text: isAm ? '👑 የሱቅ መቆጣጠሪያ' : '👑 Owner Menu', callback_data: 'owner_menu' },
          ],
        ],
      },
    };
  }

  /**
   * Handle inline button callbacks
   */
  async handleCallbackQuery(cb: any): Promise<BotResponsePayload> {
    const chatId = cb.message?.chat.id;
    const telegramId = String(cb.from.id);
    const data = cb.data || '';
    const session = this.getSession(telegramId);
    const isAm = session.language === 'am';

    // -------------------------------------------------------------
    // LANGUAGE SELECTION (L01 / FR-25)
    // -------------------------------------------------------------
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
    if (data === 'lang_picker') {
      return this.renderLanguagePicker(chatId);
    }

    // -------------------------------------------------------------
    // OWNER MANAGEMENT ACTIONS (PORTAL, ORDERS, CONFIRM, REJECT, SALES)
    // -------------------------------------------------------------
    if (data === 'owner_menu') {
      return this.renderOwnerPortal(chatId, telegramId, session);
    }
    if (data === 'owner_add_product') {
      session.addProductStep = 'WAITING_DETAILS';
      return {
        chatId,
        text: isAm
          ? `📸 አዲስ ምርት መመዝገቢያ (FR-14)፦\n\nየምርቱን ፎቶ ከነ ፅሁፉ (Caption) ይላኩ!\nምሳሌ ፎቶ ልከው በፅሁፉ፦\n"የቆዳ ጫማ 2500 ETB 40,41,42"\n\nወይም ፅሁፍ ብቻ ለመመዝገብ፦\n/addproduct [ስም], [ዋጋ], [ምድብ], [መጠኖች]`
          : `📸 Add New Product (FR-14):\n\nSend a product photo with caption including name and price!\ne.g. "Leather Shoes 2500 ETB 40,41,42"\n\nOr type details now:\n/addproduct [name], [price], [category], [options]`,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ተመለስ' : '‹ Back', callback_data: 'owner_menu' }]],
        },
      };
    }
    if (data === 'owner_orders_pending') {
      const ownerUser = await this.prisma.user.findFirst({
        where: { telegramId },
        include: { ownedShop: true },
      });
      const shopId = ownerUser?.ownedShop?.id || session.shopId;
      if (shopId) {
        return this.renderOwnerOrders(chatId, shopId, session);
      }
    }
    if (data === 'owner_sales') {
      const ownerUser = await this.prisma.user.findFirst({
        where: { telegramId },
        include: { ownedShop: true },
      });
      const shopId = ownerUser?.ownedShop?.id || session.shopId;
      if (shopId) {
        return this.renderOwnerSales(chatId, shopId, session);
      }
    }
    if (data === 'owner_chats_waiting') {
      return this.renderOwnerWaitingChats(chatId, telegramId, session);
    }
    if (data === 'owner_toggle_ai') {
      return this.handleOwnerToggleAi(chatId, telegramId, session);
    }
    if (data === 'owner_social_share') {
      return this.renderOwnerSocialShare(chatId, telegramId, session);
    }
    if (data.startsWith('owner_confirm_')) {
      const orderId = data.replace('owner_confirm_', '');
      return this.handleOwnerConfirmOrder(chatId, orderId, session);
    }
    if (data.startsWith('owner_out_delivery_')) {
      const orderId = data.replace('owner_out_delivery_', '');
      return this.handleOwnerStatusChange(chatId, orderId, OrderStatus.OUT_FOR_DELIVERY, session);
    }
    if (data.startsWith('owner_delivered_')) {
      const orderId = data.replace('owner_delivered_', '');
      return this.handleOwnerStatusChange(chatId, orderId, OrderStatus.DELIVERED, session);
    }
    if (data.startsWith('owner_reject_')) {
      const orderId = data.replace('owner_reject_', '');
      return this.handleOwnerStatusChange(chatId, orderId, OrderStatus.CANCELLED, session, 'Rejected by shop owner');
    }
    if (data.startsWith('owner_paid_')) {
      const orderId = data.replace('owner_paid_', '');
      return this.handleOwnerMarkPaid(chatId, orderId, session);
    }
    if (data.startsWith('owner_order_view_')) {
      const orderId = data.replace('owner_order_view_', '');
      return this.renderOwnerOrderDetail(chatId, orderId, session);
    }

    // -------------------------------------------------------------
    // MAIN BUYER NAVIGATION (C1)
    // -------------------------------------------------------------
    if (data === 'menu_main') {
      session.askMode = false;
      session.checkoutStep = undefined;
      return this.renderMainMenu(chatId, session);
    }
    if (data === 'menu_products') {
      return this.renderCategories(chatId, session);
    }
    if (data === 'menu_orders') {
      return this.renderMyOrders(chatId, telegramId, session);
    }
    if (data === 'menu_ask') {
      session.askMode = true;
      return {
        chatId,
        text: isAm
          ? 'ጥያቄዎን ይጻፉልን (ስለ ዋጋ፣ ክምችት፣ የስራ ሰዓት ወይም መገኛ)፦'
          : 'Please type your question (about price, stock, hours, or location):',
        replyMarkup: {
          inline_keyboard: [
            [
              { text: isAm ? '💰 ዋጋ' : '💰 Price', callback_data: 'ask_faq_price' },
              { text: isAm ? '📦 ክምችት' : '📦 Stock', callback_data: 'ask_faq_stock' },
            ],
            [
              { text: isAm ? '⏰ የስራ ሰዓት' : '⏰ Hours', callback_data: 'ask_faq_hours' },
              { text: isAm ? '📍 አድራሻ' : '📍 Location', callback_data: 'ask_faq_location' },
            ],
            [{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }],
          ],
        },
      };
    }
    if (data === 'ask_faq_price') {
      return this.handleCustomerQuestion(chatId, telegramId, session, 'የእቃዎቹ ዋጋ ስንት ነው?');
    }
    if (data === 'ask_faq_stock') {
      return this.handleCustomerQuestion(chatId, telegramId, session, 'ምን ምን እቃዎች በክምችት አሉ?');
    }
    if (data === 'ask_faq_hours') {
      return this.handleCustomerQuestion(chatId, telegramId, session, 'የስራ ሰዓታችሁ መቼ ነው?');
    }
    if (data === 'ask_faq_location') {
      return this.handleCustomerQuestion(chatId, telegramId, session, 'ሱቃችሁ የት ነው የሚገኘው?');
    }
    if (data === 'menu_shop_info') {
      return this.renderShopInfo(chatId, session);
    }
    if (data === 'menu_details') {
      return this.renderMyDetails(chatId, telegramId, session);
    }
    if (data === 'menu_switch_shop') {
      return this.renderShopPicker(chatId, session);
    }
    if (data.startsWith('select_shop_')) {
      const selectedShopId = data.replace('select_shop_', '');
      const shop = await this.prisma.shop.findUnique({ where: { id: selectedShopId } });
      if (shop) {
        session.shopId = shop.id;
        session.cart = [];
      }
      return this.renderMainMenu(chatId, session);
    }

    // -------------------------------------------------------------
    // CATEGORY & PRODUCT BROWSING (C2 -> C3 -> C4)
    // -------------------------------------------------------------
    if (data.startsWith('cat_')) {
      const categoryId = data.replace('cat_', '');
      return this.renderProductsInCategory(chatId, session, categoryId);
    }

    if (data.startsWith('prod_')) {
      const productId = data.replace('prod_', '');
      session.viewingProductId = productId;
      session.selectedQuantity = 1;
      return this.renderProductDetail(chatId, session, productId);
    }

    // Interactive Option Selection in C4 (e.g. S, M, L)
    if (data.startsWith('sel_opt_')) {
      const opt = data.replace('sel_opt_', '');
      session.selectedOption = opt;
      if (session.viewingProductId) {
        return this.renderProductDetail(chatId, session, session.viewingProductId);
      }
    }

    // Interactive Quantity Buttons in C4 (- 1 +)
    if (data === 'qty_minus') {
      session.selectedQuantity = Math.max(1, (session.selectedQuantity || 1) - 1);
      if (session.viewingProductId) {
        return this.renderProductDetail(chatId, session, session.viewingProductId);
      }
    }
    if (data === 'qty_plus') {
      session.selectedQuantity = (session.selectedQuantity || 1) + 1;
      if (session.viewingProductId) {
        return this.renderProductDetail(chatId, session, session.viewingProductId);
      }
    }

    // Add current selection to cart
    if (data === 'add_to_cart_confirm') {
      if (session.viewingProductId) {
        return this.addToCart(
          chatId,
          session,
          session.viewingProductId,
          session.selectedOption,
          session.selectedQuantity || 1,
        );
      }
    }

    // Direct add cart with single click
    if (data.startsWith('add_cart_')) {
      const parts = data.replace('add_cart_', '').split('_');
      const productId = parts[0];
      const option = parts[1] !== 'none' ? parts[1] : undefined;
      return this.addToCart(chatId, session, productId, option, 1);
    }

    // -------------------------------------------------------------
    // CART ACTIONS (C5)
    // -------------------------------------------------------------
    if (data === 'cart_view') {
      return this.renderCart(chatId, session);
    }
    if (data === 'cart_clear') {
      session.cart = [];
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
    if (data.startsWith('cart_inc_')) {
      const idx = parseInt(data.replace('cart_inc_', ''), 10);
      if (session.cart[idx]) session.cart[idx].quantity += 1;
      return this.renderCart(chatId, session);
    }
    if (data.startsWith('cart_dec_')) {
      const idx = parseInt(data.replace('cart_dec_', ''), 10);
      if (session.cart[idx]) {
        session.cart[idx].quantity -= 1;
        if (session.cart[idx].quantity <= 0) session.cart.splice(idx, 1);
      }
      return this.renderCart(chatId, session);
    }
    if (data.startsWith('cart_rem_')) {
      const idx = parseInt(data.replace('cart_rem_', ''), 10);
      if (session.cart[idx]) session.cart.splice(idx, 1);
      return this.renderCart(chatId, session);
    }

    // -------------------------------------------------------------
    // CHECKOUT FLOW (C6)
    // -------------------------------------------------------------
    if (data === 'cart_checkout') {
      if (session.cart.length === 0) {
        return this.renderCart(chatId, session);
      }
      session.checkoutStep = 'NAME';
      session.checkoutDraft = {};
      return {
        chatId,
        text: isAm ? 'ክፍያ እና ማድረሻ፦ ስምዎ ማን ይባላል?' : 'Checkout: What is your name?',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ተመለስ' : '‹ Back to cart', callback_data: 'cart_view' }]],
        },
      };
    }

    if (data === 'deliver_delivery') {
      session.checkoutDraft = session.checkoutDraft || {};
      session.checkoutDraft.deliveryType = DeliveryType.DELIVERY;
      session.checkoutStep = 'AREA';

      // Parse shop delivery areas for quick selection buttons (C6)
      const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
      const rawAreas = shop?.deliveryAreas ? shop.deliveryAreas.split(/[,;\n]+/).map((a) => a.trim()).filter(Boolean) : [];

      const keyboard: any[] = [];
      for (let i = 0; i < rawAreas.length; i += 2) {
        const row = [
          { text: `📍 ${rawAreas[i]}`, callback_data: `area_select_${encodeURIComponent(rawAreas[i])}` },
        ];
        if (rawAreas[i + 1]) {
          row.push({ text: `📍 ${rawAreas[i + 1]}`, callback_data: `area_select_${encodeURIComponent(rawAreas[i + 1])}` });
        }
        keyboard.push(row);
      }

      keyboard.push([
        { text: isAm ? '✍️ ሌላ ቦታ መጻፍ እፈልጋለሁ' : '✍️ Type another area', callback_data: 'area_type_custom' },
      ]);
      keyboard.push([{ text: isAm ? '‹ ተመለስ' : '‹ Back', callback_data: 'cart_view' }]);

      return {
        chatId,
        text: isAm
          ? 'እባክዎ የማድረሻ አካባቢዎን ይምረጡ ወይም ይጻፉ፦'
          : 'Please choose or type your delivery area:',
        replyMarkup: { inline_keyboard: keyboard },
      };
    }

    if (data.startsWith('area_select_')) {
      const selectedArea = decodeURIComponent(data.replace('area_select_', ''));
      session.checkoutDraft = session.checkoutDraft || {};
      session.checkoutDraft.area = selectedArea;
      session.checkoutStep = undefined;
      return this.renderOrderSummary(chatId, session);
    }

    if (data === 'area_type_custom') {
      session.checkoutStep = 'AREA';
      return {
        chatId,
        text: isAm
          ? 'እባክዎ የማድረሻ አካባቢዎን በፅሁፍ ይላኩ (ምሳሌ: ቦሌ ሜድሃኒዓለም፣ ሲኤምሲ):'
          : 'Please type your delivery area (e.g., Bole Medhanialem, CMC):',
      };
    }

    if (data === 'deliver_pickup') {
      session.checkoutDraft = session.checkoutDraft || {};
      session.checkoutDraft.deliveryType = DeliveryType.PICKUP;
      session.checkoutDraft.area = 'In-Store Pickup (ሱቅ መጥቶ መውሰድ)';
      session.checkoutStep = undefined;
      return this.renderOrderSummary(chatId, session);
    }

    // -------------------------------------------------------------
    // SUMMARY -> PAYMENT CHOICE (C7 -> PAY1)
    // -------------------------------------------------------------
    if (data === 'order_confirm_pay') {
      return this.renderPaymentOptions(chatId, session);
    }

    // Payment method choice (PAY1 / FR-64)
    if (data.startsWith('pay_method_')) {
      const method = data.replace('pay_method_', '') as PaymentMethod;
      return this.finalizeOrder(chatId, telegramId, session, method);
    }

    // Direct Payment "I have paid" (PAY2 / FR-65)
    if (data.startsWith('i_have_paid_')) {
      const orderId = data.replace('i_have_paid_', '');
      session.lastOrderIdForReceipt = orderId;
      return this.markCustomerPaid(chatId, session, orderId);
    }

    // Customer cancel order (C9 / FR-24)
    if (data.startsWith('cancel_order_')) {
      const orderId = data.replace('cancel_order_', '');
      return this.handleCustomerCancelOrder(chatId, telegramId, session, orderId);
    }

    // Privacy data erasure (C12 / FR-69)
    if (data === 'delete_my_data') {
      return this.handleDeleteCustomerData(chatId, telegramId, session);
    }

    return this.renderMainMenu(chatId, session);
  }

  // --- UI SCREEN RENDERERS (MATCHING SRS SCREENS) ---

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
   * Helper: Resolve shop by ID, botLink, or Name
   */
  async resolveShop(identifier: string) {
    if (!identifier) return null;
    let shop = await this.prisma.shop.findUnique({
      where: { id: identifier },
    });
    if (shop) return shop;

    shop = await this.prisma.shop.findFirst({
      where: {
        OR: [
          { botLink: { contains: identifier } },
          { botLink: { contains: `shop_${identifier}` } },
          { name: { contains: identifier, mode: 'insensitive' } },
        ],
      },
    });
    return shop;
  }

  /**
   * Interactive Shop Picker
   */
  async renderShopPicker(chatId: string | number, session: BuyerSession): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const shops = await this.prisma.shop.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (shops.length === 0) {
      return {
        chatId,
        text: isAm ? 'በአሁኑ ሰዓት ምንም ክፍት ሱቅ አልተገኘም።' : 'No active shops found at the moment.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }]],
        },
      };
    }

    const buttons = shops.map((s) => [
      { text: `🛍️ ${s.name} (${s.area || 'Addis Ababa'})`, callback_data: `select_shop_${s.id}` },
    ]);

    return {
      chatId,
      text: isAm
        ? '🛍️ እንኳን ወደ ገበያ ቦት (Gebeya Boot) በደህና መጡ!\nእባክዎ መግዛት የሚፈልጉትን ሱቅ ይምረጡ፦'
        : '🛍️ Welcome to Gebeya Shop Assistant!\nPlease select a shop to start shopping:',
      replyMarkup: { inline_keyboard: buttons },
    };
  }

  /**
   * C1: Start and menu
   */
  async renderMainMenu(chatId: string | number, session: BuyerSession): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    let shopName = 'Gebeya Boot';

    if (session.shopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
      if (shop) {
        shopName = shop.name;
      } else {
        session.shopId = undefined;
      }
    }

    if (!session.shopId) {
      const activeShops = await this.prisma.shop.findMany({
        where: { status: 'ACTIVE' },
        take: 5,
      });
      if (activeShops.length === 1) {
        session.shopId = activeShops[0].id;
        shopName = activeShops[0].name;
      } else if (activeShops.length > 1) {
        return this.renderShopPicker(chatId, session);
      }
    }

    const cartCount = session.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartLabel = cartCount > 0 ? ` 🛒 (${cartCount})` : '';

    const greeting = isAm
      ? `እንኳን ደህና መጡ! ወደ [${shopName}] ሱቅ እንኳን በደህና መጡ።\nምን ማድረግ ይፈልጋሉ?`
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
          [{ text: isAm ? `ምርቶች · See products` : `See products · ምርቶች`, callback_data: 'menu_products' }],
          [{ text: isAm ? `ትዕዛዞቼ${cartLabel} · My orders` : `My orders${cartLabel} · ትዕዛዞቼ`, callback_data: 'menu_orders' }],
          [{ text: isAm ? 'ጥያቄ ጠይቅ (AI) · Ask a question' : 'Ask a question (AI) · ጥያቄ', callback_data: 'menu_ask' }],
          [{ text: isAm ? 'የሱቅ መረጃ · Shop info' : 'Shop info · የሱቅ መረጃ', callback_data: 'menu_shop_info' }],
          [{ text: isAm ? 'የኔ መረጃ · My details' : 'My details · የኔ መረጃ', callback_data: 'menu_details' }],
          [
            { text: isAm ? '👑 የሱቅ ባለቤት ማውጫ' : '👑 Owner Portal', callback_data: 'owner_menu' },
            { text: isAm ? '🏪 ሱቆች ዝርዝር' : '🏪 Switch Shop', callback_data: 'menu_switch_shop' },
          ],
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
      return this.renderShopPicker(chatId, session);
    }

    const categories = await this.prisma.category.findMany({
      where: { shopId: session.shopId },
      orderBy: { sortOrder: 'asc' },
    });

    const keyboard: any[] = categories.map((c) => [
      { text: `📁 ${c.name}`, callback_data: `cat_${c.id}` },
    ]);

    // Add option to view all products
    const allProductsCount = await this.prisma.product.count({
      where: { shopId: session.shopId, isActive: true },
    });

    if (allProductsCount > 0) {
      keyboard.unshift([
        { text: isAm ? `📦 ሁሉም ምርቶች (${allProductsCount})` : `📦 All Products (${allProductsCount})`, callback_data: 'cat_all' },
      ]);
    }

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
    const whereClause: any = { shopId: session.shopId, isActive: true };
    if (categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    if (products.length === 0) {
      return {
        chatId,
        text: isAm ? 'በዚህ ምድብ ውስጥ ምንም ምርት አልተገኘም።' : 'No products found in this category.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ምድቦች' : '‹ Categories', callback_data: 'menu_products' }]],
        },
      };
    }

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
   * C4: Interactive Product page (Size Options, Quantity Buttons, Add to Order)
   */
  async renderProductDetail(
    chatId: string | number,
    session: BuyerSession,
    productId: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, media: true },
    });

    if (!product) {
      return { chatId, text: isAm ? 'ምርቱ አልተገኘም።' : 'Product not found.' };
    }

    const options = product.options
      ? product.options.split(/[,;\/]+/).map((o) => o.trim()).filter(Boolean)
      : [];

    if (!session.selectedOption && options.length > 0) {
      session.selectedOption = options[0];
    }
    const quantity = session.selectedQuantity || 1;
    const unitPrice = Number(product.price);
    const subtotal = unitPrice * quantity;

    const keyboard: any[] = [];

    // 1. Size / Option selector row
    if (options.length > 0) {
      const optionButtons = options.map((opt) => ({
        text: session.selectedOption === opt ? `🔘 [${opt}]` : opt,
        callback_data: `sel_opt_${opt}`,
      }));
      keyboard.push(optionButtons);
    }

    // 2. Quantity selector row [-] [ 1 ] [+]
    keyboard.push([
      { text: '➖', callback_data: 'qty_minus' },
      { text: `${quantity}`, callback_data: 'noop' },
      { text: '➕', callback_data: 'qty_plus' },
    ]);

    // 3. Add to order button with live subtotal
    keyboard.push([
      {
        text: isAm
          ? `🛒 ወደ ጋሪ ጨምር (${subtotal} ETB)`
          : `🛒 Add to order (${subtotal} ETB)`,
        callback_data: 'add_to_cart_confirm',
      },
    ]);

    // 4. Navigation
    keyboard.push([
      { text: isAm ? '‹ ተመለስ' : '‹ Back', callback_data: product.categoryId ? `cat_${product.categoryId}` : 'menu_products' },
      { text: isAm ? '🛍️ ጋሪ እይ' : '🛍️ View cart', callback_data: 'cart_view' },
    ]);

    const statusText = product.isOutOfStock ? (isAm ? '❌ አልቋል' : '❌ Out of stock') : (isAm ? `✅ በክምችት አለ (${product.stock})` : `✅ In stock (${product.stock})`);

    const desc = `📦 ${product.name}
💰 ${product.price} ETB · ${statusText}
${product.description ? `\n📝 ${product.description}` : ''}
${options.length > 0 ? `\n📏 የተመረጠ መጠን/አማራጭ: ${session.selectedOption || 'N/A'}` : ''}`;

    const photo = product.photoUrl || product.media?.[0]?.url;

    return {
      chatId,
      text: desc,
      photoUrl: photo || undefined,
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * Add item to cart with quantity & option (C4 -> C5)
   */
  async addToCart(
    chatId: string | number,
    session: BuyerSession,
    productId: string,
    option?: string,
    quantity: number = 1,
  ): Promise<BotResponsePayload> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { chatId, text: 'Product not found' };
    }

    const existing = session.cart.find(
      (c) => c.productId === productId && c.option === option,
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      session.cart.push({
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        option,
        quantity,
      });
    }

    return this.renderCart(chatId, session);
  }

  /**
   * C5: Interactive Cart
   */
  renderCart(chatId: string | number, session: BuyerSession): BotResponsePayload {
    const isAm = session.language === 'am';

    if (session.cart.length === 0) {
      return {
        chatId,
        text: isAm ? '🛒 ጋሪዎ ባዶ ነው።' : '🛒 Your cart is empty.',
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
        (item, idx) =>
          `${idx + 1}. ${item.productName}${item.option ? ` (${item.option})` : ''}\n   ${item.quantity} × ${item.price} = ${item.price * item.quantity} ETB`,
      )
      .join('\n\n');

    const text = `🛍️ ${isAm ? 'የእርስዎ ጋሪ (ትዕዛዝ)፦' : 'Your order (cart):'}
${itemsSummary}

-------------------------
${isAm ? '💰 ጠቅላላ ድምር፦' : '💰 Total:'} ${total} ETB`;

    const keyboard: any[] = [];

    // Row for each cart item controls (- / + / remove)
    session.cart.forEach((item, idx) => {
      keyboard.push([
        { text: `➖`, callback_data: `cart_dec_${idx}` },
        { text: `${item.productName.slice(0, 15)} (${item.quantity})`, callback_data: 'noop' },
        { text: `➕`, callback_data: `cart_inc_${idx}` },
        { text: `❌`, callback_data: `cart_rem_${idx}` },
      ]);
    });

    // Main checkout buttons
    keyboard.push([{ text: isAm ? '✅ ክፈል · Checkout' : '✅ Checkout · ክፈል', callback_data: 'cart_checkout' }]);
    keyboard.push([
      { text: isAm ? '➕ ተጨማሪ እቃዎች ጨምር' : '➕ Add more products', callback_data: 'menu_products' },
      { text: isAm ? '🗑️ ጋሪውን አጽዳ' : '🗑️ Clear cart', callback_data: 'cart_clear' },
    ]);
    keyboard.push([{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Main Menu', callback_data: 'menu_main' }]);

    return {
      chatId,
      text,
      replyMarkup: { inline_keyboard: keyboard },
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
              { text: isAm ? '🚚 ማድረሻ (Delivery)' : '🚚 Delivery', callback_data: 'deliver_delivery' },
              { text: isAm ? '🏬 በአካል መውሰድ (Pickup)' : '🏬 Pickup', callback_data: 'deliver_pickup' },
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
          `• ${i.quantity} × ${i.productName}${i.option ? ` (${i.option})` : ''} [${i.price * i.quantity} ETB]`,
      )
      .join('\n');

    const text = `📋 ${isAm ? 'የትዕዛዝ ማጠቃለያ' : 'Order summary'}:
${itemsSummary}

👤 ${isAm ? 'ስም' : 'Name'}: ${draft.name || ''}
📞 ${isAm ? 'ስልክ' : 'Phone'}: ${draft.phone || ''}
🚚 ${isAm ? 'ማድረሻ' : 'Delivery'}: ${draft.deliveryType === DeliveryType.PICKUP ? '🏬 Pickup' : `📍 ${draft.area || ''}`}

💰 ${isAm ? 'ጠቅላላ ድምር' : 'Total'}: ${total} ETB
💡 ${isAm ? 'ክፍያ በደረሰኝ ጊዜ በጥሬ ገንዘብ ወይም በቀጥታ ለሱቁ ይከፈላል።' : 'Pay cash on delivery or pay the shop directly.'}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '✅ አረጋግጥ · Confirm' : '✅ Confirm · አረጋግጥ', callback_data: 'order_confirm_pay' }],
          [{ text: isAm ? '✏️ አስተካክል (Edit)' : '✏️ Edit', callback_data: 'cart_checkout' }],
          [{ text: isAm ? '❌ ሰርዝ (Cancel)' : '❌ Cancel', callback_data: 'menu_main' }],
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
      ? '💳 እንዴት መክፈል ይፈልጋሉ?\nክፍያው በቀጥታ ለሱቁ ይከፈላል። ገበያ ቦት ገንዘብዎን አይይዝም።'
      : '💳 How do you want to pay?\nThe shop is paid directly. Gebeya Boot never holds your money.';

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '💵 በደረሰኝ ጊዜ በጥሬ ገንዘብ (Cash on delivery)' : '💵 Cash on delivery', callback_data: 'pay_method_CASH_ON_DELIVERY' }],
          [{ text: isAm ? '📱 በቀጥታ ለሱቁ (በባንክ ወይም በቴሌብር)' : '📱 Pay shop directly (Bank / Mobile money)', callback_data: 'pay_method_DIRECT_SHOP' }],
          [{ text: isAm ? '🏬 በአካል ሲወስዱ መክፈል (Pay when I pick up)' : '🏬 Pay when I pick up', callback_data: 'pay_method_PICKUP' }],
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

    session.cart = [];
    session.checkoutDraft = undefined;
    session.checkoutStep = undefined;

    // Direct Payment (PAY2)
    if (paymentMethod === PaymentMethod.DIRECT_SHOP) {
      session.lastOrderIdForReceipt = order.id;
      const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
      const payText = `🏦 ${isAm ? 'ለሱቁ ይክፈሉ' : 'Pay'} [${shop?.name}]:

🏛️ ${isAm ? 'ባንክ' : 'Bank'}: ${shop?.bankName || 'CBE (የኢትዮጵያ ንግድ ባንክ)'}
🔢 ${isAm ? 'ሂሳብ ቁጥር' : 'Account'}: ${shop?.bankAccount || '1000123456789'}
👤 ${isAm ? 'ባለቤት' : 'Holder'}: ${shop?.bankAccountHolder || shop?.name}
📱 ${isAm ? 'ሞባይል ገንዘብ (ቴሌብር)' : 'Mobile money (Telebirr)'}: ${shop?.mobileMoneyNumber || '0911000000'}

💰 ${isAm ? 'የሚከፈል መጠን' : 'Amount'}: ${order.total} ETB
🏷️ ${isAm ? 'የትዕዛዝ መለያ ቁጥር' : 'Reference'}: ${order.orderNumber}

⚠️ ${isAm ? 'ለእነዚህ የሱቅ አካውንቶች ብቻ ይክፈሉ። የይለፍ ቃል ወይም የካርድ ቁጥር በጭራሽ በዚህ ውይይት ውስጥ አያጋሩ። ደረሰኝ ፎቶ ካለዎት እዚህ መላክ ይችላሉ።' : 'Pay only to these verified accounts. Never share passwords or PINs. If you have a receipt screenshot, you can send it here.'}`;

      return {
        chatId,
        text: payText,
        replyMarkup: {
          inline_keyboard: [
            [{ text: isAm ? '✅ ከፍያለሁ · I have paid' : '✅ I have paid · ከፍያለሁ', callback_data: `i_have_paid_${order.id}` }],
            [{ text: isAm ? '💵 በጥሬ ገንዘብ እከፍላለሁ' : 'Pay cash on delivery instead', callback_data: 'menu_orders' }],
          ],
        },
      };
    }

    // C8: Order sent
    const text = isAm
      ? `🎉 ትዕዛዝዎ ተልኳል!
የትዕዛዝ ቁጥርዎ ${order.orderNumber} ነው።
ሱቁ ትዕዛዙን እስኪያረጋግጥ ድረስ መሰረዝ ይችላሉ። ሱቁ ወዲያውኑ ተነግሮታል።`
      : `🎉 Order sent!
Your order number is ${order.orderNumber}.
You can cancel until the shop confirms. The shop has been notified.`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '🛵 ትዕዛዜን ተከታተል' : '🛵 Track my order', callback_data: 'menu_orders' }],
          [{ text: isAm ? '‹ ወደ ዋና ማውጫ' : '‹ Back to menu', callback_data: 'menu_main' }],
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
        ? '✅ ክፍያ መፈጸምዎን ለሱቁ አሳውቀናል። ሱቁ ሂሳቡን ካረጋገጠ በኋላ ትዕዛዝዎ ይላካል። የደረሰኝ ፎቶ ካለዎት አሁኑኑ እዚህ መላክ ይችላሉ።'
        : '✅ The shop was notified that you paid. The shop will confirm receipt and process your order. You can send a photo of your receipt here anytime.',
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

    let summaryText = isAm ? '📦 የትዕዛዞችዎ ሁኔታ፦\n' : '📦 My orders and status:\n';
    const keyboard: any[] = [];

    for (const o of orders.slice(0, 5)) {
      const progressBar = this.getStatusProgressBar(o.status, isAm);
      summaryText += `\n#${o.orderNumber} · ${o.total} ETB\n${progressBar}\n`;

      if (o.status === OrderStatus.NEW) {
        keyboard.push([
          {
            text: `❌ ${isAm ? 'ትዕዛዝ ሰርዝ' : 'Cancel'} #${o.orderNumber}`,
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

  private getStatusProgressBar(status: OrderStatus, isAm: boolean): string {
    switch (status) {
      case OrderStatus.NEW:
        return isAm
          ? '● አዲስ ── ○ ተረጋገጠ ── ○ በመላክ ላይ ── ○ ደረሰ'
          : '● New ── ○ Confirmed ── ○ On the way ── ○ Delivered';
      case OrderStatus.CONFIRMED:
        return isAm
          ? '✓ አዲስ ── ● ተረጋገጠ ── ○ በመላክ ላይ ── ○ ደረሰ'
          : '✓ New ── ● Confirmed ── ○ On the way ── ○ Delivered';
      case OrderStatus.OUT_FOR_DELIVERY:
        return isAm
          ? '✓ አዲስ ── ✓ ተረጋገጠ ── ● በመላክ ላይ ── ○ ደረሰ'
          : '✓ New ── ✓ Confirmed ── ● On the way ── ○ Delivered';
      case OrderStatus.DELIVERED:
        return isAm
          ? '✓ አዲስ ── ✓ ተረጋገጠ ── ✓ በመላክ ላይ ── ● ደርሷል 🎉'
          : '✓ New ── ✓ Confirmed ── ✓ On the way ── ● Delivered 🎉';
      case OrderStatus.CANCELLED:
        return isAm ? '❌ ትዕዛዙ ተሰርዟል (Cancelled)' : '❌ Cancelled';
      default:
        return status;
    }
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
        text: isAm ? '✅ ትዕዛዝዎ በተሳካ ሁኔታ ተሰርዟል።' : '✅ Your order has been cancelled.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ዋና ማውጫ' : '‹ Menu', callback_data: 'menu_main' }]],
        },
      };
    } catch (err: any) {
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
      return this.renderShopPicker(chatId, session);
    }

    const res = await this.aiService.handleCustomerMessage(session.shopId, telegramId, text);

    return {
      chatId,
      text: res.reply,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '🛍️ ምርቶች ይመልከቱ' : '🛍️ See products', callback_data: 'menu_products' }],
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
      return this.renderShopPicker(chatId, session);
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: session.shopId } });
    if (!shop) {
      return { chatId, text: isAm ? 'ሱቁ አልተገኘም።' : 'Shop not found.' };
    }

    const info = `🏪 [${shop.name}]
📍 ${isAm ? 'አካባቢ' : 'Area'}: ${shop.area || 'Addis Ababa'}
⏰ ${isAm ? 'የስራ ሰዓት' : 'Hours'}: ${shop.openingHours || 'Mon-Sat 9am - 8pm'}
🚚 ${isAm ? 'የማድረሻ ቦታዎች' : 'Delivery'}: ${shop.deliveryAreas || 'Addis Ababa'}
📞 ${isAm ? 'ስልክ/ሞባይል' : 'Phone'}: ${shop.mobileMoneyNumber || 'N/A'}`;

    return {
      chatId,
      text: info,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '❓ ጥያቄ ጠይቅ' : '❓ Ask a question', callback_data: 'menu_ask' }],
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

    const text = `👤 ${isAm ? 'የእኔ መረጃ (My details)' : 'My details'}:
${isAm ? 'ስም' : 'Name'}: ${customer?.name || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'ስልክ' : 'Phone'}: ${customer?.phone || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'የመጨረሻ አካባቢ' : 'Last area'}: ${customer?.lastArea || (isAm ? 'አልተመዘገበም' : 'Not set')}
${isAm ? 'ቋንቋ' : 'Language'}: ${session.language === 'am' ? 'አማርኛ' : 'English'}

💡 ${isAm ? 'ለትዕዛዝዎ የሚያስፈልገውን መረጃ ብቻ እናስቀምጣለን።' : 'We keep only what your order needs.'}`;

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
          [{ text: isAm ? '🗑️ መረጃዬን ሰርዝ (Delete my data)' : '🗑️ Delete my data', callback_data: 'delete_my_data' }],
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

  // --- OWNER MANAGEMENT PORTAL IN TELEGRAM (FR-14, FR-30, FR-31, FR-35, FR-67) ---

  /**
   * Render Owner Mobile Portal inside Telegram
   */
  async renderOwnerPortal(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const user = await this.prisma.user.findFirst({
      where: { telegramId },
      include: { ownedShop: true },
    });

    if (!user || !user.ownedShop) {
      return {
        chatId,
        text: isAm
          ? `⚠️ ይህን የቴሌግራም አካውንት ከሱቅዎ ጋር አላገናኙትም።\nለማገናኘት ስልክ ቁጥርዎን ያስገቡ፦\n/connect 0911000000`
          : `⚠️ Your Telegram account is not yet linked to a shop.\nLink your account with your phone number:\n/connect 0911000000`,
      };
    }

    const shop = user.ownedShop;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrdersCount, todayRevenueAgg, pendingOrdersCount, waitingChatsCount] = await Promise.all([
      this.prisma.order.count({ where: { shopId: shop.id, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { shopId: shop.id, createdAt: { gte: today }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { shopId: shop.id, status: OrderStatus.NEW } }),
      this.prisma.conversation.count({ where: { shopId: shop.id, status: 'WAITING_OWNER' } }),
    ]);

    const revenue = todayRevenueAgg._sum.total || 0;

    const portalText = `👑 ${isAm ? 'የሱቅ ባለቤት መቆጣጠሪያ' : 'Shop Owner Portal'} [${shop.name}]

📊 ${isAm ? 'የዛሬ አጠቃላይ ሁኔታ' : "Today's Summary"}:
• ${isAm ? 'አዳዲስ ትዕዛዞች' : 'New orders'}: ${pendingOrdersCount}
• ${isAm ? 'የዛሬ ጠቅላላ ትዕዛዞች' : "Today's orders"}: ${todayOrdersCount}
• ${isAm ? 'የዛሬ ገቢ' : "Today's income"}: ${revenue} ETB
• ${isAm ? 'ያልተመለሱ ጥያቄዎች' : 'Waiting questions'}: ${waitingChatsCount}
• ${isAm ? 'AI ረዳት' : 'AI Assistant'}: ${shop.isAiEnabled ? (isAm ? '✅ በርቷል' : '✅ Active') : (isAm ? '❌ ጠፍቷል' : '❌ Off')}`;

    return {
      chatId,
      text: portalText,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: `📦 ${isAm ? 'ትዕዛዞች' : 'Orders'} (${pendingOrdersCount})`, callback_data: 'owner_orders_pending' },
            { text: `➕ ${isAm ? 'እቃ መዝግብ (FR-14)' : 'Add Product'}`, callback_data: 'owner_add_product' },
          ],
          [
            { text: `📊 ${isAm ? 'የሽያጭ ሪፖርት' : 'Sales Report'}`, callback_data: 'owner_sales' },
            { text: `💬 ${isAm ? 'ጥያቄዎች' : 'Chats'} (${waitingChatsCount})`, callback_data: 'owner_chats_waiting' },
          ],
          [
            { text: `📢 ${isAm ? 'ማህበራዊ ሚዲያ (Auto-Post)' : 'Social Share'}`, callback_data: 'owner_social_share' },
            { text: `🤖 ${isAm ? 'AI ረዳት ቀይር' : 'Toggle AI'}`, callback_data: 'owner_toggle_ai' },
          ],
          [{ text: isAm ? '🛍️ ወደ ደንበኛ እይታ ተመለስ' : '🛍️ Buyer View', callback_data: 'menu_main' }],
        ],
      },
    };
  }

  /**
   * Owner: View pending orders with instant Confirm / Reject
   */
  async renderOwnerOrders(
    chatId: string | number,
    shopId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const orders = await this.prisma.order.findMany({
      where: { shopId, status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY] } },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (orders.length === 0) {
      return {
        chatId,
        text: isAm ? 'ምንም አይነት በመጠባበቅ ላይ ያለ ትዕዛዝ የለም።' : 'No pending orders at the moment.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
        },
      };
    }

    let text = `📦 ${isAm ? 'በመጠባበቅ ላይ ያሉ ትዕዛዞች' : 'Active & Pending Orders'}:\n`;
    const keyboard: any[] = [];

    for (const o of orders) {
      text += `\n#${o.orderNumber} · ${o.customer?.name || 'Customer'} · ${o.total} ETB\n${isAm ? 'ሁኔታ' : 'Status'}: ${o.status}\n`;

      if (o.status === OrderStatus.NEW) {
        keyboard.push([
          { text: `✅ አረጋግጥ #${o.orderNumber}`, callback_data: `owner_confirm_${o.id}` },
          { text: `❌ ሰርዝ`, callback_data: `owner_reject_${o.id}` },
        ]);
      } else if (o.status === OrderStatus.CONFIRMED) {
        keyboard.push([
          { text: `🛵 ለላክ ወጥቷል #${o.orderNumber}`, callback_data: `owner_out_delivery_${o.id}` },
          { text: `📦 ደርሷል`, callback_data: `owner_delivered_${o.id}` },
        ]);
      } else if (o.status === OrderStatus.OUT_FOR_DELIVERY) {
        keyboard.push([
          { text: `📦 ደርሷል #${o.orderNumber}`, callback_data: `owner_delivered_${o.id}` },
        ]);
      }
    }

    keyboard.push([{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]);

    return {
      chatId,
      text,
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * Owner: Confirm an order directly in Telegram (FR-31, FR-33)
   */
  async handleOwnerConfirmOrder(
    chatId: string | number,
    orderId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      await this.ordersService.updateStatus(order.shopId, order.id, OrderStatus.CONFIRMED, 'OWNER');

      return {
        chatId,
        text: `✅ ትዕዛዝ #${order.orderNumber} በተሳካ ሁኔታ ተረጋግጧል!\nስቶክ ቀንሷል፣ ለደንበኛውም መልእክት ተልኳል።`,
        replyMarkup: {
          inline_keyboard: [
            [
              { text: `🛵 ለላክ ወጥቷል (Out for delivery)`, callback_data: `owner_out_delivery_${order.id}` },
              { text: `📦 ደርሷል (Delivered)`, callback_data: `owner_delivered_${order.id}` },
            ],
            [{ text: isAm ? '‹ ትዕዛዞች ዝርዝር' : '‹ Orders List', callback_data: 'owner_orders_pending' }],
          ],
        },
      };
    } catch (err: any) {
      return {
        chatId,
        text: `⚠️ ${err.message}`,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ትዕዛዞች' : '‹ Orders', callback_data: 'owner_orders_pending' }]],
        },
      };
    }
  }

  /**
   * Owner: Update status (Out for delivery, Delivered, Cancelled)
   */
  async handleOwnerStatusChange(
    chatId: string | number,
    orderId: string,
    status: OrderStatus,
    session: BuyerSession,
    reason?: string,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      await this.ordersService.updateStatus(order.shopId, order.id, status, 'OWNER', reason);

      return {
        chatId,
        text: `✅ የትዕዛዝ #${order.orderNumber} ሁኔታ ወደ [${status}] ተቀይሯል። ለደንበኛውም መልእክት ደርሷል።`,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ትዕዛዞች ዝርዝር' : '‹ Orders List', callback_data: 'owner_orders_pending' }]],
        },
      };
    } catch (err: any) {
      return {
        chatId,
        text: `⚠️ ${err.message}`,
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ትዕዛዞች' : '‹ Orders', callback_data: 'owner_orders_pending' }]],
        },
      };
    }
  }

  /**
   * Owner: Mark payment received (FR-65)
   */
  async handleOwnerMarkPaid(
    chatId: string | number,
    orderId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { chatId, text: 'Order not found' };

    await this.ordersService.markPayment(order.shopId, order.id, PaymentStatus.CONFIRMED_PAID);

    return {
      chatId,
      text: `💰 የትዕዛዝ #${order.orderNumber} ክፍያ ተረጋግጧል! ለደንበኛውም መልእክት ተልኳል።`,
      replyMarkup: {
        inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
      },
    };
  }

  /**
   * Owner: View single order detail in Telegram
   */
  async renderOwnerOrderDetail(
    chatId: string | number,
    orderId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });

    if (!order) return { chatId, text: 'Order not found' };

    const items = order.items.map((i) => `• ${i.quantity} × ${i.productName} (${i.totalPrice} ETB)`).join('\n');

    const text = `📋 የትዕዛዝ ዝርዝር #${order.orderNumber}:
👤 ደንበኛ: ${order.customer?.name || 'Customer'}
📞 ስልክ: ${order.customer?.phone || 'N/A'}
🚚 ማድረሻ: ${order.deliveryArea || 'Pickup'}
💳 ክፍያ: ${order.paymentMethod} (${order.paymentStatus})

እቃዎች፦
${items}

💰 ድምር: ${order.total} ETB
ሁኔታ: ${order.status}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '✅ አረጋግጥ · Confirm', callback_data: `owner_confirm_${order.id}` },
            { text: '❌ ሰርዝ · Reject', callback_data: `owner_reject_${order.id}` },
          ],
          [{ text: isAm ? '‹ ትዕዛዞች' : '‹ Orders', callback_data: 'owner_orders_pending' }],
        ],
      },
    };
  }

  /**
   * Owner: View today's sales report (FR-35)
   */
  async renderOwnerSales(
    chatId: string | number,
    shopId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, todayRev, bestProducts] = await Promise.all([
      this.prisma.order.count({ where: { shopId, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { shopId, createdAt: { gte: today }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: { shopId, createdAt: { gte: today } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 3,
      }),
    ]);

    const rev = todayRev._sum.total || 0;
    const bestList = bestProducts
      .map((p, i) => `${i + 1}. ${p.productName} (${p._sum.quantity} የተሸጠ)`)
      .join('\n');

    const text = `📊 ${isAm ? 'የዛሬ የሽያጭ ሪፖርት' : "Today's Sales Report"}:

• ${isAm ? 'የትዕዛዝ ብዛት' : 'Orders Count'}: ${todayCount}
• ${isAm ? 'ጠቅላላ ገቢ' : 'Total Revenue'}: ${rev} ETB

${bestList ? `🏆 ${isAm ? 'ተወዳጅ ምርቶች' : 'Best Sellers'}:\n${bestList}` : ''}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: isAm ? '➕ አዲስ ምርት መዝግብ' : '➕ Add Product', callback_data: 'owner_add_product' }],
          [{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }],
        ],
      },
    };
  }

  /**
   * Owner: View waiting customer questions
   */
  async renderOwnerWaitingChats(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const user = await this.prisma.user.findFirst({
      where: { telegramId },
      include: { ownedShop: true },
    });
    if (!user?.ownedShop) return { chatId, text: 'Shop not found' };

    const convs = await this.prisma.conversation.findMany({
      where: { shopId: user.ownedShop.id, status: 'WAITING_OWNER' },
      include: { customer: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      take: 5,
    });

    if (convs.length === 0) {
      return {
        chatId,
        text: isAm ? 'ምንም አይነት በመጠባበቅ ላይ ያለ የደንበኛ ጥያቄ የለም።' : 'No customer questions waiting for reply.',
        replyMarkup: {
          inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
        },
      };
    }

    let text = `💬 ${isAm ? 'መልስ የሚጠብቁ የደንበኞች ጥያቄዎች' : 'Questions Waiting for Owner'}:\n`;
    for (const c of convs) {
      const lastMsg = c.messages[0]?.text || 'No message';
      text += `\n👤 ${c.customer.name || 'Customer'}: "${lastMsg}"\n`;
    }

    text += `\n${isAm ? 'እባክዎ በዳሽቦርድ ገብተው ይመልሱ።' : 'Please reply via your merchant dashboard.'}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
      },
    };
  }

  /**
   * Owner: Toggle AI Assistant on/off
   */
  async handleOwnerToggleAi(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const user = await this.prisma.user.findFirst({
      where: { telegramId },
      include: { ownedShop: true },
    });
    if (!user?.ownedShop) return { chatId, text: 'Shop not found' };

    const newSetting = !user.ownedShop.isAiEnabled;
    await this.prisma.shop.update({
      where: { id: user.ownedShop.id },
      data: { isAiEnabled: newSetting },
    });

    return {
      chatId,
      text: newSetting
        ? (isAm ? '🤖 AI ረዳት ለሱቅዎ በርቷል! አሁን የደንበኞችን ጥያቄ ይመልሳል።' : '🤖 AI Assistant is now ENABLED for your shop.')
        : (isAm ? '🤖 AI ረዳት ጠፍቷል! ጥያቄዎች በቀጥታ ለእርስዎ ይተላለፋሉ።' : '🤖 AI Assistant is now DISABLED. Questions will escalate directly to you.'),
      replyMarkup: {
        inline_keyboard: [[{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }]],
      },
    };
  }

  /**
   * Owner: Social media post kit preview & share links (P01, FR-67)
   */
  async renderOwnerSocialShare(
    chatId: string | number,
    telegramId: string,
    session: BuyerSession,
  ): Promise<BotResponsePayload> {
    const isAm = session.language === 'am';
    const user = await this.prisma.user.findFirst({
      where: { telegramId },
      include: { ownedShop: true },
    });
    if (!user?.ownedShop) return { chatId, text: 'Shop not found' };

    const shop = user.ownedShop;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'gebayawa_bot';
    const shopLink = shop.botLink || `https://t.me/${botUsername}?start=shop_${shop.id}`;

    const promoCaption = `🛍️ ወደ [${shop.name}] የቴሌግራም ሱቅ እንኳን በደህና መጡ!
በቀላሉ እቃዎችን ይመልከቱ፣ በቴሌግራም ይዘዙ፣ ፈጣን ማድረሻ አለን።

👉 አሁኑኑ እዚህ ይዘዙ፦ ${shopLink}
📍 ${shop.area || 'Addis Ababa'} | ⏰ ${shop.openingHours || 'Mon-Sat 9am - 8pm'}`;

    const tgShare = `https://t.me/share/url?url=${encodeURIComponent(shopLink)}&text=${encodeURIComponent(promoCaption)}`;
    const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopLink)}`;

    const text = `📢 ${isAm ? 'የማህበራዊ ሚዲያ ማስተዋወቂያ' : 'Social Media Share Kit'}:

🔗 ${shopLink}

${promoCaption}`;

    return {
      chatId,
      text,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📢 Share to Telegram Channel', url: tgShare }],
          [{ text: '📱 Share on Facebook (P02)', url: fbShare }],
          [{ text: isAm ? '‹ ባለቤት ማውጫ' : '‹ Owner Menu', callback_data: 'owner_menu' }],
        ],
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
}
