import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class UpsertFeatureDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number

  @IsString()
  @MaxLength(40)
  icon!: string

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string
}

export class UpsertFaqDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question!: string

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer!: string
}

export class UpsertTestimonialDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  stars?: number

  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  quote!: string

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string
}

export class MoveDto {
  @IsString()
  @IsIn(["up", "down"])
  direction!: "up" | "down"
}
