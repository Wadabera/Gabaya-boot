import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@gebeya-boot.et', description: 'Administrator email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminGebeya2026!Secure', description: 'Administrator password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminVerify2faDto {
  @ApiProperty({ example: 'temp-token-uuid', description: 'Temporary token from initial login' })
  @IsNotEmpty()
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: '2FA code or secondary verification' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
