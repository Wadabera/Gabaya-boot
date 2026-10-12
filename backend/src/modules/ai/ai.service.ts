import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GroundedAiService } from './providers/grounded-ai.service';
import { CorrectAnswerDto, CreateShopRuleDto } from './dto/correct-answer.dto';
import { ConversationStatus, MessageSender } from '@prisma/client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private groundedAi: GroundedAiService,
  ) {}

  /**
   * Process customer message, query grounded AI or escalate to merchant (FR-40, FR-41, FR-45)
   */
  async handleCustomerMessage(shopId: string, customerTelegramId: string, text: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
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

    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: customerTelegramId },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          telegramId: customerTelegramId,
          language: shop.language || 'am',
        },
      });
    }

    // Get or create conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        shopId_customerId: {
          shopId,
          customerId: customer.id,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          shopId,
          customerId: customer.id,
          status: ConversationStatus.BOT,
          isAiEnabled: true,
        },
      });
    }

    // Log the incoming customer message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.CUSTOMER,
        text,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Check if AI is disabled globally or for this chat (FR-44 / Acceptance Test 14)
    if (!shop.isAiEnabled || !conversation.isAiEnabled) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: ConversationStatus.WAITING_OWNER },
      });

      const disabledNotice = customer.language === 'am'
        ? 'መልእክትዎ ወደ ሱቁ ተልኳል። ሱቁ በቅርቡ ይመልስልዎታል።'
        : 'Your message has been forwarded to the shop. The owner will reply shortly.';

      return {
        reply: disabledNotice,
        isAiAnswer: false,
        isEscalated: true,
        conversationId: conversation.id,
      };
    }

    // Check AI monthly usage quota (FR-50)
    const activeSub = shop.subscriptions[0];
    if (activeSub?.plan) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyAiCount = await this.prisma.message.count({
        where: {
          conversation: { shopId: shop.id },
          sender: MessageSender.AI,
          createdAt: { gte: startOfMonth },
        },
      });

      if (monthlyAiCount >= activeSub.plan.aiMonthlyLimit) {
        // AI quota reached: escalate directly to owner (FR-71)
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: ConversationStatus.WAITING_OWNER },
        });

        const limitNotice = customer.language === 'am'
          ? 'መልእክትዎ በቀጥታ ለሱቁ ባለቤት ተላልፏል።'
          : 'Your question has been forwarded directly to the shop owner.';

        return {
          reply: limitNotice,
          isAiAnswer: false,
          isEscalated: true,
          conversationId: conversation.id,
        };
      }
    }

    // Build grounded context strictly from current DB state
    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        name: true,
        price: true,
        options: true,
        stock: true,
        isOutOfStock: true,
      },
    });

    const rules = await this.prisma.shopRule.findMany({
      where: { shopId, isActive: true },
      select: { questionPattern: true, approvedAnswer: true },
    });

    const context = {
      shopId: shop.id,
      shopName: shop.name,
      area: shop.area || undefined,
      openingHours: shop.openingHours || undefined,
      deliveryAreas: shop.deliveryAreas || undefined,
      language: customer.language,
      products: products.map((p) => ({
        name: p.name,
        price: Number(p.price),
        options: p.options || undefined,
        stock: p.stock,
        isOutOfStock: p.isOutOfStock,
      })),
      rules,
    };

    const answerResult = await this.groundedAi.answerQuestion(text, context, customer.language);

    // Save AI response
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.AI,
        text: answerResult.text,
        metadata: JSON.stringify({
          source: answerResult.source,
          isConfident: answerResult.isConfident,
          isEscalated: answerResult.isEscalated,
        }),
      },
    });

    if (answerResult.isEscalated) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: ConversationStatus.WAITING_OWNER },
      });
      this.logger.log(`[AI] Question escalated to owner for shop ${shop.name}: "${text}"`);
    }

    return {
      reply: answerResult.text,
      isAiAnswer: true,
      isEscalated: answerResult.isEscalated,
      conversationId: conversation.id,
    };
  }

  /**
   * List conversations for shop owner dashboard (O10)
   */
  async getConversations(shopId: string, filter?: 'waiting' | 'ai_answered' | 'closed') {
    const where: any = { shopId };

    if (filter === 'waiting') {
      where.status = ConversationStatus.WAITING_OWNER;
    } else if (filter === 'closed') {
      where.status = ConversationStatus.CLOSED;
    } else if (filter === 'ai_answered') {
      where.status = ConversationStatus.BOT;
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  /**
   * Get single conversation with message history (O11)
   */
  async getConversation(shopId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, shopId },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Owner replies to escalated question and optionally saves rule (O11, FR-42, FR-43)
   */
  async ownerReply(shopId: string, conversationId: string, dto: CorrectAnswerDto) {
    const conversation = await this.getConversation(shopId, conversationId);

    // Save owner message
    const ownerMsg = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.OWNER,
        text: dto.ownerReply,
      },
    });

    // Update conversation status and AI setting
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: ConversationStatus.CLOSED,
        isAiEnabled: dto.turnAiOff !== undefined ? !dto.turnAiOff : conversation.isAiEnabled,
        lastMessageAt: new Date(),
      },
    });

    // If requested, save as shop rule for next time (FR-43 / Acceptance Test 3)
    if (dto.saveAsRule) {
      // Find the last customer question
      const lastCustMsg = [...conversation.messages]
        .reverse()
        .find((m) => m.sender === MessageSender.CUSTOMER);

      if (lastCustMsg) {
        await this.prisma.shopRule.create({
          data: {
            shopId,
            questionPattern: lastCustMsg.text,
            approvedAnswer: dto.ownerReply,
            isActive: true,
          },
        });
        this.logger.log(`[RULES] New shop rule saved for shop ${shopId}: "${lastCustMsg.text}" -> "${dto.ownerReply}"`);
      }
    }

    return {
      message: ownerMsg,
      conversationId: conversation.id,
      savedRule: !!dto.saveAsRule,
    };
  }

  /**
   * Toggle AI for whole shop (D03, FR-44)
   */
  async toggleShopAi(shopId: string, isAiEnabled: boolean) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { isAiEnabled },
    });
  }

  /**
   * Toggle AI for a single conversation (O11, FR-44)
   */
  async toggleConversationAi(shopId: string, conversationId: string, isAiEnabled: boolean) {
    const conv = await this.getConversation(shopId, conversationId);
    return this.prisma.conversation.update({
      where: { id: conv.id },
      data: { isAiEnabled },
    });
  }

  /**
   * Shop rules management (D03, FR-43)
   */
  async getShopRules(shopId: string) {
    return this.prisma.shopRule.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShopRule(shopId: string, dto: CreateShopRuleDto) {
    return this.prisma.shopRule.create({
      data: {
        shopId,
        questionPattern: dto.questionPattern,
        approvedAnswer: dto.approvedAnswer,
      },
    });
  }

  async deleteShopRule(shopId: string, ruleId: string) {
    const rule = await this.prisma.shopRule.findFirst({
      where: { id: ruleId, shopId },
    });
    if (!rule) {
      throw new NotFoundException('Shop rule not found');
    }
    return this.prisma.shopRule.delete({ where: { id: rule.id } });
  }
}
