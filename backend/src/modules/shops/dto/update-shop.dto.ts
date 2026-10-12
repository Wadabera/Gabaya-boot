import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({ example: 'Bole Fashion & Shoes' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Bole Medhanialem' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'Mon - Sat: 9:00 AM - 8:00 PM' })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({ example: 'Bole, CMC, Kazanchis, Megenagna' })
  @IsOptional()
  @IsString()
  deliveryAreas?: string;

  @ApiPropertyOptional({ example: 'am' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: true, description: 'Display dates using Ethiopian Calendar' })
  @IsOptional()
  @IsBoolean()
  useEthiopianCalendar?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Global shop AI assistant toggle' })
  @IsOptional()
  @IsBoolean()
  isAiEnabled?: boolean;

  @ApiPropertyOptional({ example: 'Commercial Bank of Ethiopia' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1000123456789' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'Abebe Kebede' })
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;
}
