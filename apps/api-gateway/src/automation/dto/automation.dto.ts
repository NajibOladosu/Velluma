import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  trigger: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class TriggerEventDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  event: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;
}
