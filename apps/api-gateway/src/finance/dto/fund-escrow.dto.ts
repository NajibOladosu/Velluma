import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'SGD',
  'HKD',
  'NZD',
  'MXN',
  'BRL',
  'INR',
  'ZAR',
  'AED',
  'NGN',
] as const;

export class FundEscrowDto {
  @ApiProperty({ description: 'UUID of the milestone to fund', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  milestoneId: string;

  @ApiProperty({
    description: 'Amount to hold in escrow in major currency units',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Tenant ID of the client funding escrow' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'User ID of the client', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code (defaults to USD)',
    enum: SUPPORTED_CURRENCIES,
    default: 'USD',
  })
  @IsIn(SUPPORTED_CURRENCIES)
  @IsOptional()
  currency?: string;
}
