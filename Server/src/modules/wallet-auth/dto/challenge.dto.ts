import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ChallengeDto {
  @IsOptional()
  @IsString()
  @Length(32, 64)
  publicKey?: string;

  @IsString()
  @MaxLength(255)
  domain!: string;

  @IsString()
  @MaxLength(300)
  uri!: string;
}
