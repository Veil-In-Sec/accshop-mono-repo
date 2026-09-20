import { Transform, Type } from "class-transformer"
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  password!: string
}

export class UpsertProductDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  slug!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  section!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price!: number

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  originalPrice?: number | null

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock!: number

  @IsOptional()
  @IsString()
  tag?: string

  @IsOptional()
  @IsString()
  badge?: string

  @IsBoolean()
  active!: boolean

  @IsBoolean()
  featured!: boolean

  @IsOptional()
  @IsString()
  @MaxLength(60)
  externalProductType?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  externalAccountType?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplier?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bulkmailProductId?: number | null
}

export class AdjustBalanceDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string
}

export class Hotmail143ConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  apiKey?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: false })
  baseUrl?: string
}

export class BulkMailConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  apiKey?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: false })
  baseUrl?: string
}

export class UpdateFxModeDto {
  @IsBoolean()
  live!: boolean
}

export class BulkMailOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number

  @IsOptional()
  @IsString()
  @IsIn(["pending", "processing", "completed", "cancelled"])
  status?: string
}

export class BulkMailExportQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["txt", "csv", "json"])
  format?: string
}

export class BulkMailCatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  inStock?: boolean

  @IsOptional()
  @IsString()
  @IsIn(["name", "price", "stock_quantity", "created_at"])
  sort?: string

  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  order?: string
}

export class ReplySupportMessageDto {
  @IsString()
  @MinLength(1)
  userId!: string

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string

  @IsOptional()
  @IsBoolean()
  active?: boolean
}
