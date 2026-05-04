import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({ description: 'Tenant ID that owns this automation rule' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Event that fires the rule, e.g. "contract.signed"',
    example: 'contract.signed',
  })
  @IsString()
  @IsNotEmpty()
  trigger: string;

  @ApiProperty({
    description: 'Action to perform when triggered, e.g. "send_notification"',
    example: 'send_notification',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    description:
      'Optional key-value conditions that must match the event payload',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;
}

export class TriggerEventDto {
  @ApiProperty({ description: 'Tenant ID in whose context the event is fired' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Event name to evaluate against stored rules',
    example: 'contract.signed',
  })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiPropertyOptional({
    description: 'Contextual data attached to the event',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
