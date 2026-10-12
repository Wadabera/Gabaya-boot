import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitSubscriptionPaymentDto {
  @ApiProperty({ example: 'plan-uuid' })
  @IsNotEmpty()
  @IsString()
  planId: string;

  @ApiProperty({ example: 500, description: 'Amount paid in ETB' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'BANK_TRANSFER', description: 'BANK_TRANSFER or MOBILE_MONEY' })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: 'TXN-9876543210', description: 'Bank or Telebirr reference number' })
  @IsNotEmpty()
  @IsString()
  referenceNumber: string;

  @ApiPropertyOptional({ example: 'https://example.com/receipt.jpg', description: 'Receipt photo URL' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
