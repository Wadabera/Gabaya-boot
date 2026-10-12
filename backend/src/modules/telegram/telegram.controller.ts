import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.types';

@ApiTags('Telegram Bot')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Official Telegram Bot API Webhook Endpoint' })
  @ApiResponse({ status: 200, description: 'Update acknowledged' })
  async handleWebhook(
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string,
    @Body() update: TelegramUpdate,
  ) {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret && secretHeader && secretHeader !== configuredSecret) {
      throw new UnauthorizedException('Invalid Telegram webhook secret token');
    }

    await this.telegramService.processUpdate(update);
    return { ok: true };
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate Telegram Bot update for local testing and evaluation' })
  async simulateUpdate(@Body() body: any) {
    let update: TelegramUpdate;

    if (body.update_id) {
      update = body as TelegramUpdate;
    } else {
      const fromId = body.fromId || 987654321;
      const chatId = body.chatId || 987654321;

      if (body.callbackData) {
        update = {
          update_id: Math.floor(Math.random() * 10000000),
          callback_query: {
            id: `cb_${Date.now()}`,
            from: { id: fromId, is_bot: false, first_name: 'Simulated User' },
            message: {
              message_id: 1,
              chat: { id: chatId, type: 'private' },
              from: { id: 111, is_bot: true, first_name: 'ShopBot' },
              date: Math.floor(Date.now() / 1000),
            },
            data: body.callbackData,
          },
        };
      } else {
        update = {
          update_id: Math.floor(Math.random() * 10000000),
          message: {
            message_id: 1,
            chat: { id: chatId, type: 'private' },
            from: { id: fromId, is_bot: false, first_name: 'Simulated User' },
            date: Math.floor(Date.now() / 1000),
            text: body.messageText || '/start',
          },
        };
      }
    }

    return this.telegramService.processUpdate(update);
  }
}
