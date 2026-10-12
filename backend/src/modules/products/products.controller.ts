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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';

@ApiTags('Products')
@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to shop (O4, FR-10)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(
    @Param('shopId') shopId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products for shop with optional category filter (O8, C3)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Param('shopId') shopId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAllByShop(shopId, categoryId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product detail (C4, O9)' })
  async findOne(@Param('shopId') shopId: string, @Param('id') id: string) {
    return this.productsService.findOne(shopId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (O9, FR-10)' })
  async update(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(shopId, id, dto);
  }

  @Patch(':id/stock-toggle')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle product out-of-stock switch (O8, FR-12)' })
  async toggleStock(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body('isOutOfStock') isOutOfStock: boolean,
  ) {
    return this.productsService.toggleStock(shopId, id, isOutOfStock);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ShopOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (O9, FR-10)' })
  async remove(@Param('shopId') shopId: string, @Param('id') id: string) {
    return this.productsService.remove(shopId, id);
  }
}
