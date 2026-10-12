import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShopOwnerGuard } from '../../common/guards/shop-owner.guard';
import { GetUser, AuthenticatedUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Categories')
@Controller('shops/:shopId/categories')
@UseGuards(JwtAuthGuard, ShopOwnerGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create new product category for shop (FR-11)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(
    @Param('shopId') shopId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories for shop' })
  async findAll(@Param('shopId') shopId: string) {
    return this.categoriesService.findAllByShop(shopId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  async remove(@Param('shopId') shopId: string, @Param('id') id: string) {
    return this.categoriesService.remove(shopId, id);
  }
}
