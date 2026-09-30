import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIntentDto {
  /// Opaque payee reference. Must be allowlisted for the business.
  @IsString()
  @MaxLength(128)
  payee_ref!: string;

  /// Amount in minor units. Integers only — no floats anywhere in the money path.
  @Type(() => Number)
  @IsInt({ message: 'amount_minor must be an integer number of minor units' })
  @Min(1)
  amount_minor!: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,12}$/, {
    message: 'currency must be an uppercase alphanumeric code',
  })
  currency?: string;

  /// e.g. "invoice #1829"
  @IsOptional()
  @IsString()
  @MaxLength(256)
  reference?: string;
}
