import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SignContractDto {
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  signatureBase64: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsIn(['creator', 'client', 'freelancer'])
  role: 'creator' | 'client' | 'freelancer';
}
