import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveIntentDto {
  /// Who approved. In production this comes from the dashboard session rather
  /// than the request body.
  @IsString()
  @MaxLength(128)
  approved_by!: string;

  @IsOptional()
  @IsIn(['approve', 'deny'])
  action?: 'approve' | 'deny';

  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;
}
