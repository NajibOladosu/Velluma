import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SignContractDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  /** Base64-encoded signature image. */
  @IsString()
  @IsNotEmpty()
  signatureBase64: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class GenerateContractDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;
}

export class RegenerateContractDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}

export class ChangeRequestDto {
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  requesterId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  details: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  proposedChanges?: string;
}
