import { IsNotEmpty, IsString, IsOptional, IsUrl, IsIn } from 'class-validator';

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
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsNotEmpty()
  fileUrl: string;

  @IsIn(DELIVERABLE_TYPES)
  @IsNotEmpty()
  type: (typeof DELIVERABLE_TYPES)[number];
}
