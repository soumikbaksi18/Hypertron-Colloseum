import { IsString, Length } from 'class-validator';

export class ChallengeDto {
  @IsString()
  @Length(32, 64)
  publicKey!: string;
}
