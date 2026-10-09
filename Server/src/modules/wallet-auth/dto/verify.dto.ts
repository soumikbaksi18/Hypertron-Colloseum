import { IsString, Length, MaxLength } from 'class-validator';

export class VerifyDto {
  @IsString()
  @Length(32, 64)
  publicKey!: string;

  @IsString()
  challengeId!: string;

  @IsString()
  signature!: string;

  @IsString()
  @MaxLength(8000)
  signedMessage!: string;
}
