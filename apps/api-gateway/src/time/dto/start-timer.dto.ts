import { IsNotEmpty, IsString } from 'class-validator';

export class StartTimerDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
