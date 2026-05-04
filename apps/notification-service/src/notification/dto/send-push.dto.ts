import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';

export class SendPushDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  /** Relative URL to open when the user taps the notification. */
  @IsOptional()
  @IsString()
  url?: string;

  /** Extra key-value payload forwarded to the service worker. */
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class ListUserNotificationsDto {
  @IsUUID()
  userId: string;
}

export class MarkNotificationReadDto {
  @IsUUID()
  id: string;
}
