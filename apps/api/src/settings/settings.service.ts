import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicSettings() {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    return {
      currencySymbol: settings?.currencySymbol ?? "$",
      usdToLocalRate: settings ? Number(settings.usdToLocalRate) : 1,
      minDepositUsd: settings ? Number(settings.minDepositUsd) : 5,
      minTransferAmount: settings ? Number(settings.minTransferAmount) : 1,
      siteName: settings?.siteName ?? "AccShop",
      supportUrl: settings?.supportUrl ?? "https://t.me",
      heroTitle: settings?.heroTitle ?? "",
      heroSubtitle: settings?.heroSubtitle ?? "",
      footerText: settings?.footerText ?? "",
      heroBadge: settings?.heroBadge ?? "",
      aboutTitle: settings?.aboutTitle ?? "",
      aboutSubtitle: settings?.aboutSubtitle ?? "",
      aboutHeading: settings?.aboutHeading ?? "",
      aboutPara1: settings?.aboutPara1 ?? "",
      aboutPara2: settings?.aboutPara2 ?? "",
      stat1Value: settings?.stat1Value ?? "",
      stat1Label: settings?.stat1Label ?? "",
      stat2Value: settings?.stat2Value ?? "",
      stat2Label: settings?.stat2Label ?? "",
      stat3Value: settings?.stat3Value ?? "",
      stat3Label: settings?.stat3Label ?? "",
      stat4Value: settings?.stat4Value ?? "",
      stat4Label: settings?.stat4Label ?? "",
      trustTitle: settings?.trustTitle ?? "",
      trustDesc: settings?.trustDesc ?? "",
      trustBullets: settings?.trustBullets ?? "",
      valuesTitle: settings?.valuesTitle ?? "",
      valuesSubtitle: settings?.valuesSubtitle ?? "",
      featuresTitle: settings?.featuresTitle ?? "",
      featuresSubtitle: settings?.featuresSubtitle ?? "",
      teamTitle: settings?.teamTitle ?? "",
      teamDescription: settings?.teamDescription ?? "",
      teamStat1Value: settings?.teamStat1Value ?? "",
      teamStat1Label: settings?.teamStat1Label ?? "",
      teamStat2Value: settings?.teamStat2Value ?? "",
      teamStat2Label: settings?.teamStat2Label ?? "",
      teamImageUrl: settings?.teamImageUrl ?? "",
      testimonialsTitle: settings?.testimonialsTitle ?? "",
      testimonialsSubtitle: settings?.testimonialsSubtitle ?? "",
      faqTitle: settings?.faqTitle ?? "",
      ctaBadge: settings?.ctaBadge ?? "",
      ctaTitle: settings?.ctaTitle ?? "",
      ctaSubtitle: settings?.ctaSubtitle ?? "",
      contactPhone: settings?.contactPhone ?? "",
      contactSupportEmail: settings?.contactSupportEmail ?? "",
      contactSalesEmail: settings?.contactSalesEmail ?? "",
    }
  }

  async getAdminSettings() {
    const row = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    return row
      ? {
          currencySymbol: row.currencySymbol,
          usdToLocalRate: Number(row.usdToLocalRate),
          minDepositUsd: Number(row.minDepositUsd),
          minTransferAmount: Number(row.minTransferAmount),
          initialBalance: Number(row.initialBalance),
          siteName: row.siteName,
          supportUrl: row.supportUrl ?? "",
          heroTitle: row.heroTitle ?? "",
          heroSubtitle: row.heroSubtitle ?? "",
          footerText: row.footerText ?? "",
          hotmailApiKey: row.hotmailApiKey ?? "",
          hotmailApiBaseUrl: row.hotmailApiBaseUrl ?? "",
          bulkmailApiKey: (row as { bulkmailApiKey?: string | null }).bulkmailApiKey ?? "",
          bulkmailApiBaseUrl: (row as { bulkmailApiBaseUrl?: string | null }).bulkmailApiBaseUrl ?? "",
          fxLiveEnabled: (row as { fxLiveEnabled?: boolean | null }).fxLiveEnabled ?? true,
          heroBadge: row.heroBadge ?? "",
          aboutTitle: row.aboutTitle ?? "",
          aboutSubtitle: row.aboutSubtitle ?? "",
          aboutHeading: row.aboutHeading ?? "",
          aboutPara1: row.aboutPara1 ?? "",
          aboutPara2: row.aboutPara2 ?? "",
          stat1Value: row.stat1Value ?? "",
          stat1Label: row.stat1Label ?? "",
          stat2Value: row.stat2Value ?? "",
          stat2Label: row.stat2Label ?? "",
          stat3Value: row.stat3Value ?? "",
          stat3Label: row.stat3Label ?? "",
          stat4Value: row.stat4Value ?? "",
          stat4Label: row.stat4Label ?? "",
          trustTitle: row.trustTitle ?? "",
          trustDesc: row.trustDesc ?? "",
          trustBullets: row.trustBullets ?? "",
          valuesTitle: row.valuesTitle ?? "",
          valuesSubtitle: row.valuesSubtitle ?? "",
          featuresTitle: row.featuresTitle ?? "",
          featuresSubtitle: row.featuresSubtitle ?? "",
          teamTitle: row.teamTitle ?? "",
          teamDescription: row.teamDescription ?? "",
          teamStat1Value: row.teamStat1Value ?? "",
          teamStat1Label: row.teamStat1Label ?? "",
          teamStat2Value: row.teamStat2Value ?? "",
          teamStat2Label: row.teamStat2Label ?? "",
          teamImageUrl: row.teamImageUrl ?? "",
          testimonialsTitle: row.testimonialsTitle ?? "",
          testimonialsSubtitle: row.testimonialsSubtitle ?? "",
          faqTitle: row.faqTitle ?? "",
          ctaBadge: row.ctaBadge ?? "",
          ctaTitle: row.ctaTitle ?? "",
          ctaSubtitle: row.ctaSubtitle ?? "",
          contactPhone: row.contactPhone ?? "",
          contactSupportEmail: row.contactSupportEmail ?? "",
          contactSalesEmail: row.contactSalesEmail ?? "",
        }
      : null
  }

  async updateSettings(input: {
    currencySymbol: string
    usdToLocalRate: number
    minDepositUsd: number
    minTransferAmount: number
    initialBalance: number
    siteName: string
    supportUrl?: string
    heroTitle?: string
    heroSubtitle?: string
    footerText?: string
    heroBadge?: string
    aboutTitle?: string
    aboutSubtitle?: string
    aboutHeading?: string
    aboutPara1?: string
    aboutPara2?: string
    stat1Value?: string
    stat1Label?: string
    stat2Value?: string
    stat2Label?: string
    stat3Value?: string
    stat3Label?: string
    stat4Value?: string
    stat4Label?: string
    trustTitle?: string
    trustDesc?: string
    trustBullets?: string
    valuesTitle?: string
    valuesSubtitle?: string
    featuresTitle?: string
    featuresSubtitle?: string
    teamTitle?: string
    teamDescription?: string
    teamStat1Value?: string
    teamStat1Label?: string
    teamStat2Value?: string
    teamStat2Label?: string
    teamImageUrl?: string
    testimonialsTitle?: string
    testimonialsSubtitle?: string
    faqTitle?: string
    ctaBadge?: string
    ctaTitle?: string
    ctaSubtitle?: string
    contactPhone?: string
    contactSupportEmail?: string
    contactSalesEmail?: string
  }) {
    const orNull = (v?: string) => v?.trim() || null
    const settingsData = {
      currencySymbol: input.currencySymbol,
      usdToLocalRate: input.usdToLocalRate.toFixed(12),
      minDepositUsd: input.minDepositUsd.toFixed(2),
      minTransferAmount: input.minTransferAmount.toFixed(2),
      initialBalance: input.initialBalance.toFixed(2),
      siteName: input.siteName,
      supportUrl: input.supportUrl || null,
      heroTitle: input.heroTitle || null,
      heroSubtitle: input.heroSubtitle || null,
      footerText: input.footerText || null,
      heroBadge: orNull(input.heroBadge),
      aboutTitle: orNull(input.aboutTitle),
      aboutSubtitle: orNull(input.aboutSubtitle),
      aboutHeading: orNull(input.aboutHeading),
      aboutPara1: orNull(input.aboutPara1),
      aboutPara2: orNull(input.aboutPara2),
      stat1Value: orNull(input.stat1Value),
      stat1Label: orNull(input.stat1Label),
      stat2Value: orNull(input.stat2Value),
      stat2Label: orNull(input.stat2Label),
      stat3Value: orNull(input.stat3Value),
      stat3Label: orNull(input.stat3Label),
      stat4Value: orNull(input.stat4Value),
      stat4Label: orNull(input.stat4Label),
      trustTitle: orNull(input.trustTitle),
      trustDesc: orNull(input.trustDesc),
      trustBullets: orNull(input.trustBullets),
      valuesTitle: orNull(input.valuesTitle),
      valuesSubtitle: orNull(input.valuesSubtitle),
      featuresTitle: orNull(input.featuresTitle),
      featuresSubtitle: orNull(input.featuresSubtitle),
      teamTitle: orNull(input.teamTitle),
      teamDescription: orNull(input.teamDescription),
      teamStat1Value: orNull(input.teamStat1Value),
      teamStat1Label: orNull(input.teamStat1Label),
      teamStat2Value: orNull(input.teamStat2Value),
      teamStat2Label: orNull(input.teamStat2Label),
      teamImageUrl: orNull(input.teamImageUrl),
      testimonialsTitle: orNull(input.testimonialsTitle),
      testimonialsSubtitle: orNull(input.testimonialsSubtitle),
      faqTitle: orNull(input.faqTitle),
      ctaBadge: orNull(input.ctaBadge),
      ctaTitle: orNull(input.ctaTitle),
      ctaSubtitle: orNull(input.ctaSubtitle),
      contactPhone: orNull(input.contactPhone),
      contactSupportEmail: orNull(input.contactSupportEmail),
      contactSalesEmail: orNull(input.contactSalesEmail),
      updatedAt: new Date(),
    }

    await this.prisma.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...settingsData },
      update: settingsData,
    })

    return { success: true }
  }
}
