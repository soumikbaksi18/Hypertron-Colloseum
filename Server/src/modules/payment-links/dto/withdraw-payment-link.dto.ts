import { IsString, MaxLength, MinLength } from 'class-validator';

export class WithdrawPaymentLinkDto {
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  destination!: string;
}
