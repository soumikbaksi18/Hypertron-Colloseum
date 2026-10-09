import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PreparePaymentLinkDto {
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  payer_pubkey!: string;

  @IsOptional()
  @IsString()
  commitment?: string;

  @IsOptional()
  @IsString()
  proof?: string;

  @IsOptional()
  @IsString()
  blob?: string;
}
