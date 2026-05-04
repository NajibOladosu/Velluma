import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'New invoice status',
    enum: ['pending', 'completed', 'failed', 'refunded'],
  })
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiPropertyOptional({
    description: 'Updated due date (ISO-8601)',
    example: '2026-07-01',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Updated notes (max 1000 chars)',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
