import { IsString, Length } from 'class-validator';

export class VerifyDto {
  @IsString()
  @Length(32, 64)
  publicKey!: string;

  @IsString()
  challengeId!: string;

  @IsString()
  signature!: string;
}
