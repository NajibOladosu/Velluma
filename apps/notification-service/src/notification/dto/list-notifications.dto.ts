import { IsString, IsNotEmpty } from 'class-validator';

export class ListNotificationsDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
