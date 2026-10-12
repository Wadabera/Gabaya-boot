import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CorrectAnswerDto, CreateShopRuleDto } from './dto/correct-answer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';

@ApiTags('AI & Conversations')
@Controller('shops/:shopId/ai')
@UseGuards(JwtAuthGuard, ShopOwnerGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List customer conversations (O10 - Chats)' })
  @ApiQuery({ name: 'filter', required: false, enum: ['waiting', 'ai_answered', 'closed'] })
  async getConversations(
    @Param('shopId') shopId: string,
    @Query('filter') filter?: 'waiting' | 'ai_answered' | 'closed',
  ) {
    return this.aiService.getConversations(shopId, filter);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation history and AI logs (O11)' })
  async getConversation(
    @Param('shopId') shopId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.aiService.getConversation(shopId, conversationId);
  }

  @Post('conversations/:conversationId/reply')
  @ApiOperation({ summary: 'Owner reply to customer and optional rule saving (O11, FR-42, FR-43)' })
  async ownerReply(
    @Param('shopId') shopId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: CorrectAnswerDto,
  ) {
    return this.aiService.ownerReply(shopId, conversationId, dto);
  }

  @Patch('toggle')
  @ApiOperation({ summary: 'Toggle AI for entire shop (D03, FR-44)' })
  async toggleShopAi(
    @Param('shopId') shopId: string,
    @Body('isAiEnabled') isAiEnabled: boolean,
  ) {
    return this.aiService.toggleShopAi(shopId, isAiEnabled);
  }

  @Patch('conversations/:conversationId/toggle')
  @ApiOperation({ summary: 'Toggle AI for single conversation (O11, FR-44)' })
  async toggleConversationAi(
    @Param('shopId') shopId: string,
    @Param('conversationId') conversationId: string,
    @Body('isAiEnabled') isAiEnabled: boolean,
  ) {
    return this.aiService.toggleConversationAi(shopId, conversationId, isAiEnabled);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get approved shop rules (D03, FR-43)' })
  async getShopRules(@Param('shopId') shopId: string) {
    return this.aiService.getShopRules(shopId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Add approved shop rule (D03, FR-43)' })
  async createShopRule(
    @Param('shopId') shopId: string,
    @Body() dto: CreateShopRuleDto,
  ) {
    return this.aiService.createShopRule(shopId, dto);
  }

  @Delete('rules/:ruleId')
  @ApiOperation({ summary: 'Delete approved shop rule' })
  async deleteShopRule(
    @Param('shopId') shopId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.aiService.deleteShopRule(shopId, ruleId);
  }
}
