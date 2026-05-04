import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
} from 'class-validator';

export class ListInvoicesDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsOptional()
  contractId?: string;

  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'failed' | 'refunded';

  @IsString()
  @IsOptional()
  search?: string;
}
