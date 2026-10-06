import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentLinkDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  amount_minor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  client_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  memo?: string;

  @IsOptional()
  @IsString()
  expires_at?: string;
}
