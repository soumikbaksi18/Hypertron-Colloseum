import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class WithdrawPaymentLinkDto {
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  destination!: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  root?: string;

  @IsOptional()
  @IsString()
  nullifier?: string;

  @IsOptional()
  @IsString()
  change_cm?: string;

  @IsOptional()
  @IsString()
  proof?: string;
}
