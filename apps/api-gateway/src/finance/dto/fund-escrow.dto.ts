import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
  'SGD', 'HKD', 'NZD', 'MXN', 'BRL', 'INR', 'ZAR', 'AED', 'NGN',
] as const;

export class FundEscrowDto {
  @IsString()
  @IsNotEmpty()
  milestoneId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsIn(SUPPORTED_CURRENCIES)
  @IsOptional()
  currency?: string;
}
