import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address', format: 'email' })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Template identifier',
    enum: ['proposal_sent', 'contract_active', 'payment_held'],
  })
  @IsIn(['proposal_sent', 'contract_active', 'payment_held'])
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({
    description: 'Key-value variables substituted into the template',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

export class SendSmsDto {
  @ApiProperty({ description: 'Recipient phone number in E.164 format', example: '+14155552671' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'SMS message body (max 1600 characters)' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
