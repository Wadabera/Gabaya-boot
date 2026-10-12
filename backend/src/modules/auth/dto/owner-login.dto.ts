import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendSmsCodeDto {
  @ApiProperty({ example: '+251911223344', description: 'Ethiopian phone number' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?:\+251|251|0)?(9\d{8}|7\d{8})$/, {
    message: 'Invalid Ethiopian phone number. Must be a valid 09... or 07... mobile number',
  })
  phone: string;
}
