import { applyDecorators } from "@nestjs/common"
import { Type } from "class-transformer"
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"

function OptionalString(maxLength = 2000) {
  return applyDecorators(IsOptional(), IsString(), MaxLength(maxLength))
}

function OptionalUrl(maxLength = 500) {
  return applyDecorators(
    IsOptional(),
    IsString(),
    MaxLength(maxLength),
    IsUrl({ require_tld: false }),
  )
}

export class UpdateSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  currencySymbol!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  usdToLocalRate!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  minDepositUsd!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  minTransferAmount!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  initialBalance!: number

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  siteName!: string

  @OptionalUrl()
  supportUrl?: string

  @OptionalString()
  heroTitle?: string

  @OptionalString()
  heroSubtitle?: string

  @OptionalString()
  footerText?: string

  // --- Landing page content (all optional) ---

  @OptionalString(120)
  heroBadge?: string

  @OptionalString(200)
  aboutTitle?: string

  @OptionalString(500)
  aboutSubtitle?: string

  @OptionalString(200)
  aboutHeading?: string

  @OptionalString(2000)
  aboutPara1?: string

  @OptionalString(2000)
  aboutPara2?: string

  @OptionalString(40)
  stat1Value?: string

  @OptionalString(80)
  stat1Label?: string

  @OptionalString(40)
  stat2Value?: string

  @OptionalString(80)
  stat2Label?: string

  @OptionalString(40)
  stat3Value?: string

  @OptionalString(80)
  stat3Label?: string

  @OptionalString(40)
  stat4Value?: string

  @OptionalString(80)
  stat4Label?: string

  @OptionalString(200)
  trustTitle?: string

  @OptionalString(500)
  trustDesc?: string

  @OptionalString(2000)
  trustBullets?: string

  @OptionalString(200)
  valuesTitle?: string

  @OptionalString(500)
  valuesSubtitle?: string

  @OptionalString(200)
  featuresTitle?: string

  @OptionalString(500)
  featuresSubtitle?: string

  @OptionalString(200)
  teamTitle?: string

  @OptionalString(1000)
  teamDescription?: string

  @OptionalString(80)
  teamStat1Value?: string

  @OptionalString(120)
  teamStat1Label?: string

  @OptionalString(80)
  teamStat2Value?: string

  @OptionalString(120)
  teamStat2Label?: string

  @OptionalString(500)
  teamImageUrl?: string

  @OptionalString(200)
  testimonialsTitle?: string

  @OptionalString(500)
  testimonialsSubtitle?: string

  @OptionalString(120)
  faqTitle?: string

  @OptionalString(200)
  ctaBadge?: string

  @OptionalString(200)
  ctaTitle?: string

  @OptionalString(500)
  ctaSubtitle?: string

  @OptionalString(80)
  contactPhone?: string

  @OptionalString(120)
  contactSupportEmail?: string

  @OptionalString(120)
  contactSalesEmail?: string
}
