import { IsNotEmpty, IsString, IsOptional, IsUrl, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DELIVERABLE_TYPES = [
  'document',
  'image',
  'video',
  'audio',
  'archive',
  'spreadsheet',
  'presentation',
  'other',
] as const;

export class AddDeliverableDto {
  @ApiProperty({ description: 'UUID of the parent project', format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Display name of the deliverable' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the deliverable' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Public URL of the uploaded file', format: 'uri' })
  @IsUrl()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({
    description: 'File type category',
    enum: DELIVERABLE_TYPES,
  })
  @IsIn(DELIVERABLE_TYPES)
  @IsNotEmpty()
  type: (typeof DELIVERABLE_TYPES)[number];
}
