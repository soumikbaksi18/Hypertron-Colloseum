import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payoutAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  viewPub?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  ownerPk?: string;
}
