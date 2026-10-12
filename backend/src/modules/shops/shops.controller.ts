import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';
import { GetUser, AuthenticatedUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new shop profile during onboarding (O3)' })
  @ApiResponse({ status: 201, description: 'Shop created successfully' })
  async createShop(@GetUser() user: AuthenticatedUser, @Body() dto: CreateShopDto) {
    return this.shopsService.createShop(user.id, dto);
  }

  @Get('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated owner shop details' })
  async getMyShop(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.getShopByOwner(user.id);
  }

  @Get(':id/qr-code')
  @ApiOperation({ summary: 'Get printable QR code data URL for shop link (O5 / FR-68)' })
  async getQrCode(@Param('id') id: string) {
    const dataUrl = await this.shopsService.getShopQrCode(id);
    return { qrCodeDataUrl: dataUrl };
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Get public shop catalog and information for buyer or bot' })
  async getPublicShop(@Param('id') id: string) {
    return this.shopsService.getPublicShop(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop details by ID (Tenant isolated)' })
  async getShopById(@Param('id') id: string) {
    return this.shopsService.getShopById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop profile, payment details, or settings (D01 / FR-02 / FR-66)' })
  async updateShop(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.updateShop(id, user.id, user.role, dto);
  }
}
