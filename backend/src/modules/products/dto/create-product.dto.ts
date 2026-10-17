import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Leather Oxford Shoes', description: 'Product name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Handmade Ethiopian leather shoes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'category-uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 2500, description: 'Price in ETB' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: '40, 41, 42, 43', description: 'Sizes or options' })
  @IsOptional()
  @IsString()
  options?: string;

  @ApiProperty({ example: 15, description: 'Stock quantity' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/video.mp4' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Array of media items (images and videos)',
    example: [
      { type: 'IMAGE', url: 'https://example.com/1.jpg', isPrimary: true, sortOrder: 0 },
      { type: 'VIDEO', url: 'https://example.com/clip.mp4', isPrimary: false, sortOrder: 1 },
    ],
  })
  @IsOptional()
  media?: Array<{
    type?: 'IMAGE' | 'VIDEO';
    url: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
    sortOrder?: number;
    title?: string;
  }>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;
}
