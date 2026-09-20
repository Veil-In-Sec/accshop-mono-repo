import { Type } from "class-transformer"
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"

export class CreateTotpKeyDto {
  /** Display name. Optional when an otpauth:// URI already carries a label. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuer?: string

  /** Raw Base32 secret OR a full otpauth://totp/... URI from a QR scan. */
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  secret!: string

  @IsOptional()
  @IsIn(["SHA1", "SHA256", "SHA512"])
  algorithm?: "SHA1" | "SHA256" | "SHA512"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(8)
  digits?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(120)
  period?: number
}

export class UpdateTotpKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuer?: string
}
