import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ShopStatus, PaymentReviewStatus } from '@prisma/client';

export class ReviewShopDto {
  @ApiProperty({ enum: ShopStatus, example: ShopStatus.ACTIVE })
  @IsNotEmpty()
  @IsEnum(ShopStatus)
  status: ShopStatus;

  @ApiPropertyOptional({ example: 'Required information is clear and verified' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewPaymentDto {
  @ApiProperty({ enum: PaymentReviewStatus, example: PaymentReviewStatus.APPROVED })
  @IsNotEmpty()
  @IsEnum(PaymentReviewStatus)
  status: PaymentReviewStatus;

  @ApiPropertyOptional({ example: 'Payment receipt verified against bank records' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 600, description: 'Monthly price in ETB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  productLimit?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  orderMonthlyLimit?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  aiMonthlyLimit?: number;
}
