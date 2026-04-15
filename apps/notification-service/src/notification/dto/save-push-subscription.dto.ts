import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SavePushSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class DeletePushSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
