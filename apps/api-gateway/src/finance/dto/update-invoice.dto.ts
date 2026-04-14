import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateInvoiceDto {
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
