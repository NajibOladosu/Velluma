import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsIn(['proposal_sent', 'contract_active', 'payment_held'])
  template: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

export class SendSmsDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
