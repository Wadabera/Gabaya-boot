import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Send outbound message via official Telegram Bot API
   */
  async sendTelegram(
    chatId: string | number,
    text: string,
    replyMarkup?: any,
    photoUrl?: string,
  ): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token.includes('example') || !token.includes(':')) {
      this.logger.debug(`[TELEGRAM-MOCK] Outbound to ${chatId}: "${text.slice(0, 50)}..."`);
      return false;
    }

    try {
      if (photoUrl) {
        await axios.post(
          `https://api.telegram.org/bot${token}/sendPhoto`,
          {
            chat_id: chatId,
            photo: photoUrl,
            caption: text,
            reply_markup: replyMarkup,
          },
          { timeout: 8000 },
        );
      } else {
        await axios.post(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            chat_id: chatId,
            text,
            reply_markup: replyMarkup,
          },
          { timeout: 8000 },
        );
      }
      return true;
    } catch (err: any) {
      this.logger.error(`[TELEGRAM] Failed to send to ${chatId}: ${err.message}`, err.response?.data);
      return false;
    }
  }

  /**
   * Send SMS via Ethiopian AfroMessage Gateway
   */
  async sendSms(phone: string, message: string): Promise<boolean> {
    const provider = process.env.SMS_PROVIDER;
    const apiKey = process.env.AFROMESSAGE_API_KEY;

    if (provider !== 'afromessage' || !apiKey) {
      this.logger.debug(`[SMS-MOCK] SMS to ${phone}: "${message}"`);
      return false;
    }

    try {
      await axios.post(
        'https://api.afromessage.com/api/send',
        {
          to: phone,
          message,
          sender: process.env.AFROMESSAGE_SENDER_ID || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 8000,
        },
      );
      this.logger.log(`[SMS-AFROMESSAGE] SMS dispatched to ${phone}`);
      return true;
    } catch (err: any) {
      this.logger.error(`[SMS-AFROMESSAGE] Failed to send SMS to ${phone}: ${err.message}`);
      return false;
    }
  }

  /**
   * FR-30: Notify owner at once about each new order (Screen P06)
   */
  async notifyOwnerNewOrder(
    ownerTelegramId: string | null | undefined,
    orderNumber: string,
    customerName: string,
    total: string | number,
    area?: string | null,
    orderId?: string,
  ) {
    if (!ownerTelegramId) return false;

    const message = `🚨 አዲስ ትዕዛዝ ደርሷል! (New Order)
የትዕዛዝ ቁጥር / Order: ${orderNumber}
ደንበኛ / Customer: ${customerName}
ጠቅላላ ድምር / Total: ${total} ETB
አካባቢ / Area: ${area || 'N/A'}

ትዕዛዙን ከታች ባሉት አዝራሮች በቀጥታ ማረጋገጥ ይችላሉ፦`;

    const replyMarkup = orderId
      ? {
          inline_keyboard: [
            [
              { text: '✅ አረጋግጥ · Confirm', callback_data: `owner_confirm_${orderId}` },
              { text: '❌ ሰርዝ · Reject', callback_data: `owner_reject_${orderId}` },
            ],
            [
              { text: '📋 ዝርዝር እይ · View Order', callback_data: `owner_order_view_${orderId}` },
            ],
          ],
        }
      : undefined;

    return this.sendTelegram(ownerTelegramId, message, replyMarkup);
  }

  /**
   * FR-32: Customer is notified at each status change
   */
  async notifyCustomerOrderStatus(
    customerTelegramId: string,
    orderNumber: string,
    status: OrderStatus,
    language: string = 'am',
    reason?: string,
  ) {
    const isAm = language === 'am';
    let message = '';

    switch (status) {
      case OrderStatus.CONFIRMED:
        message = isAm
          ? `✅ የትዕዛዝ ቁጥር ${orderNumber} በሱቁ ተረጋግጧል! እቃዎ በዝግጅት ላይ ነው።`
          : `✅ Order ${orderNumber} has been confirmed by the shop! Your order is being prepared.`;
        break;

      case OrderStatus.OUT_FOR_DELIVERY:
        message = isAm
          ? `🛵 የትዕዛዝ ቁጥር ${orderNumber} ወደ እርስዎ በመጓዝ ላይ ነው!`
          : `🛵 Order ${orderNumber} is on the way to you!`;
        break;

      case OrderStatus.DELIVERED:
        message = isAm
          ? `🎉 የትዕዛዝ ቁጥር ${orderNumber} በተሳካ ሁኔታ ደርሷል። ስለገዙ እናመሰግናለን!`
          : `🎉 Order ${orderNumber} has been delivered. Thank you for shopping with us!`;
        break;

      case OrderStatus.CANCELLED:
        message = isAm
          ? `❌ የትዕዛዝ ቁጥር ${orderNumber} ተሰርዟል።${reason ? ` ምክንያት፦ ${reason}` : ''}`
          : `❌ Order ${orderNumber} was cancelled.${reason ? ` Reason: ${reason}` : ''}`;
        break;

      default:
        return false;
    }

    return this.sendTelegram(customerTelegramId, message);
  }

  /**
   * FR-65: Owner marks order as paid or not received, and buyer is told
   */
  async notifyCustomerPaymentStatus(
    customerTelegramId: string,
    orderNumber: string,
    paymentStatus: PaymentStatus,
    language: string = 'am',
  ) {
    const isAm = language === 'am';
    let message = '';

    if (paymentStatus === PaymentStatus.CONFIRMED_PAID) {
      message = isAm
        ? `💰 የትዕዛዝ ቁጥር ${orderNumber} ክፍያዎ በሱቁ ተረጋግጧል!`
        : `💰 Your payment for order ${orderNumber} has been confirmed by the shop!`;
    } else if (paymentStatus === PaymentStatus.NOT_RECEIVED) {
      message = isAm
        ? `⚠️ የትዕዛዝ ቁጥር ${orderNumber} ክፍያ እንዳልደረሳቸው ሱቁ ገልጿል። እባክዎ ደረሰኝዎን ያረጋግጡ ወይም ለሱቁ ይደውሉ።`
        : `⚠️ The shop reported that payment for order ${orderNumber} was not received. Please check your transaction details or contact the shop.`;
    } else {
      return false;
    }

    return this.sendTelegram(customerTelegramId, message);
  }

  /**
   * FR-42 / O11: Deliver owner reply to customer in Telegram
   */
  async notifyCustomerOwnerReply(
    customerTelegramId: string,
    shopName: string,
    replyText: string,
    language: string = 'am',
  ) {
    const isAm = language === 'am';
    const header = isAm ? `📩 ከ[${shopName}] ሱቅ የተሰጠ ምላሽ፦` : `📩 Reply from [${shopName}]:`;
    const message = `${header}\n${replyText}`;

    return this.sendTelegram(customerTelegramId, message);
  }
}
