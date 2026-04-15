import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsUrl,
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

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------

export class PushSubscribeDto {
  @ApiProperty({ description: 'Browser push endpoint URL provided by the browser Push API' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'P-256 DH public key from the PushSubscription keys map' })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: 'Auth secret from the PushSubscription keys map' })
  @IsString()
  @IsNotEmpty()
  auth: string;

  @ApiPropertyOptional({ description: 'User-Agent string for labelling the subscription' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @ApiProperty({ description: 'Browser push endpoint URL to remove' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}

export class SendPushDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification body text' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'URL to open when the notification is clicked' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'Extra data forwarded to the service worker',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
