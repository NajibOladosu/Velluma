import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Structured proposal content — must be a plain object (e.g. TipTap JSON). */
  @IsObject()
  @IsNotEmpty()
  content: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class UpdateProposalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
