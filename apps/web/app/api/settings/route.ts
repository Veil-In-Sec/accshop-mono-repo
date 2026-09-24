import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

/** Public site settings for deposit/currency display. No auth required. */
export async function GET() {
  try {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } });
  return Response.json({
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
  });
  } catch (e) {
    return routeError(e);
  }
}