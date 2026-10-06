import { IsString, MaxLength, MinLength } from 'class-validator';

export class PreparePaymentLinkDto {
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  payer_pubkey!: string;
}
