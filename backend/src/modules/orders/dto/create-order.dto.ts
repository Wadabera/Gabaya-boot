import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsString()
  option?: string;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'shop-uuid' })
  @IsNotEmpty()
  @IsString()
  shopId: string;

  @ApiProperty({ example: 'telegram-user-12345678' })
  @IsNotEmpty()
  @IsString()
  customerTelegramId: string;

  @ApiProperty({ example: 'Abebe Kebede' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ example: '+251911223344' })
  @IsNotEmpty()
  @IsString()
  customerPhone: string;

  @ApiProperty({ enum: DeliveryType, example: DeliveryType.DELIVERY })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiPropertyOptional({ example: 'Bole Medhanialem' })
  @IsOptional()
  @IsString()
  deliveryArea?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Please call before arriving' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
