import {
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateInvoiceDto {
  @IsUUID()
  id: string;

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
