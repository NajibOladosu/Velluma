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

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
  'SGD', 'HKD', 'NZD', 'MXN', 'BRL', 'INR', 'ZAR', 'AED', 'NGN',
] as const;

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsIn(SUPPORTED_CURRENCIES)
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
