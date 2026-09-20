import { Type } from "class-transformer"
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from "class-validator"

export class SubmitDepositDto {
  @Type(() => Number)
  @IsInt()
  paymentMethodId!: number

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(1_000_000)
  amount!: number

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  senderAccountNumber!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  transactionReference!: string
}

export class ReviewDepositDto {
  @IsIn(["approved", "rejected"])
  decision!: "approved" | "rejected"

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}
