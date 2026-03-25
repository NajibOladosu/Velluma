import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

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

  @IsString()
  @IsOptional()
  currency?: string;
}
