import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmPaymentLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(192)
  tx_signature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payer_pubkey?: string;
}
