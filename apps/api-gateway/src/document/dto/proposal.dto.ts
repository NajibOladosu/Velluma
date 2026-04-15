import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ description: 'Proposal title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Short summary shown in the proposal list' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Structured proposal content (TipTap JSON document)',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  content: Record<string, unknown>;

  @ApiProperty({ description: 'UUID of the client this proposal is for', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Tenant ID of the proposal creator' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class UpdateProposalDto {
  @ApiPropertyOptional({ description: 'Updated proposal title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated proposal content (TipTap JSON document)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
