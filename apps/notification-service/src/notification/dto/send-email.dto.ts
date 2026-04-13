import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  /** Handlebars-style template string with {{variable}} placeholders. */
  @IsString()
  @IsNotEmpty()
  template: string;

  /** Key-value map substituted into the template. */
  @IsObject()
  variables: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
