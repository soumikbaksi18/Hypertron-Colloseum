import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const WORKSPACE_TYPES = [
  'web3-startup',
  'dao',
  'agency',
  'foundation',
  'infrastructure',
  'service-company',
  'enterprise',
  'other',
] as const;

export const TEAM_SIZES = ['1-5', '5-20', '20-50', '50+'] as const;

export class InvitedMemberDto {
  @IsString()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MaxLength(80)
  nickname!: string;

  @IsString()
  @MaxLength(40)
  role!: string;

  @IsString()
  @MaxLength(40)
  permission!: string;
}

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsIn(WORKSPACE_TYPES)
  workspaceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsIn(TEAM_SIZES)
  teamSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600_000)
  logoDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  logoName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  companyContext?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => InvitedMemberDto)
  invitedMembers?: InvitedMemberDto[];
}
