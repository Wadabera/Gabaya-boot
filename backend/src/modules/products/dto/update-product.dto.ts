import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Leather Oxford Shoes' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Handmade Ethiopian leather shoes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'category-uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: '40, 41, 42, 43' })
  @IsOptional()
  @IsString()
  options?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

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
  })
  @IsOptional()
  media?: Array<{
    id?: string;
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
