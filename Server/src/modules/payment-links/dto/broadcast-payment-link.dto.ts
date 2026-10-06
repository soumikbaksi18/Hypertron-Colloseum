import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BroadcastPaymentLinkDto {
  @IsString()
  @MinLength(64)
  @MaxLength(8192)
  signed_transaction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payer_pubkey?: string;
}
