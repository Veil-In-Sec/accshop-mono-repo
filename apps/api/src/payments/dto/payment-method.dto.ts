import { Type } from "class-transformer"
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator"

export class UpsertPaymentMethodDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  type!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountName?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string

  @IsBoolean()
  enabled!: boolean

  @Type(() => Number)
  @IsInt()
  sortOrder!: number
}
