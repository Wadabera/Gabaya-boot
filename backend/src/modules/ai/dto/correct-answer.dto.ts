import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CorrectAnswerDto {
  @ApiProperty({ example: 'Yes, we can deliver before 8:00 PM.' })
  @IsNotEmpty()
  @IsString()
  ownerReply: string;

  @ApiPropertyOptional({ example: true, description: 'Save this correction as a shop rule (FR-43)' })
  @IsOptional()
  @IsBoolean()
  saveAsRule?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Turn AI off for this conversation' })
  @IsOptional()
  @IsBoolean()
  turnAiOff?: boolean;
}

export class CreateShopRuleDto {
  @ApiProperty({ example: 'Do you deliver at night?' })
  @IsNotEmpty()
  @IsString()
  questionPattern: string;

  @ApiProperty({ example: 'Yes, before 8:00 PM.' })
  @IsNotEmpty()
  @IsString()
  approvedAnswer: string;
}
