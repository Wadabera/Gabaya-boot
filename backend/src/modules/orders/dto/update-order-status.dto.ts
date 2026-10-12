import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Customer requested cancellation or Out of stock' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MarkPaymentDto {
  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CONFIRMED_PAID })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ example: 'Received via Telebirr' })
  @IsOptional()
  @IsString()
  note?: string;
}
