import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'Bole Fashion & Shoes', description: 'Shop business name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bole Medhanialem', description: 'Primary shop location / area' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'Mon - Sat: 9:00 AM - 8:00 PM', description: 'Opening business hours' })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({ example: 'Bole, CMC, Kazanchis, Megenagna', description: 'Supported delivery areas' })
  @IsOptional()
  @IsString()
  deliveryAreas?: string;

  @ApiPropertyOptional({ example: 'am', description: 'Default shop language (am or en)' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Commercial Bank of Ethiopia', description: 'Shop bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1000123456789', description: 'Shop bank account number' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'Abebe Kebede', description: 'Bank account holder name' })
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional({ example: '+251911223344', description: 'Mobile money number (e.g., Telebirr)' })
  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;
}
