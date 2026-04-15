import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Tenant ID the client belongs to' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Full name of the client' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Client email address', format: 'email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Company or organisation name' })
  @IsString()
  @IsOptional()
  company?: string;
}
