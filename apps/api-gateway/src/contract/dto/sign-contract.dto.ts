import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignContractDto {
  @ApiProperty({ description: 'UUID of the contract to sign', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ description: 'UUID of the signing user', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Base64-encoded signature image' })
  @IsString()
  @IsNotEmpty()
  signatureBase64: string;

  @ApiProperty({ description: 'Tenant ID of the signing user' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Role of the signer',
    enum: ['creator', 'client', 'freelancer'],
  })
  @IsIn(['creator', 'client', 'freelancer'])
  role: 'creator' | 'client' | 'freelancer';
}
