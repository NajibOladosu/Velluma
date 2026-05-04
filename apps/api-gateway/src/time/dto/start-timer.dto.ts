import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartTimerDto {
  @ApiProperty({
    description: 'UUID of the project/contract to track time against',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'UUID of the user starting the timer',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Tenant ID of the user' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
