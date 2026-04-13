import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

export class SendSmsDto {
  /** Destination phone number in E.164 format, e.g. +14155550100 */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'to must be a valid E.164 phone number (e.g. +14155550100)',
  })
  to: string;

  /** SMS body — Twilio concatenates messages over 160 chars automatically. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1600)
  message: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
