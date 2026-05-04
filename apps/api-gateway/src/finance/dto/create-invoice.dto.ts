import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
  Min,
  MaxLength,
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

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'UUID of the contract this invoice is for',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({
    description: 'Invoice amount in major currency units (e.g. 500 = $500.00)',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code (defaults to USD)',
    enum: SUPPORTED_CURRENCIES,
    default: 'USD',
  })
  @IsIn(SUPPORTED_CURRENCIES)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 due date (defaults to 30 days from now)',
    example: '2026-06-01',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Internal notes visible on the invoice (max 1000 chars)',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
