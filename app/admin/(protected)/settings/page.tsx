import { getAdminSettings, listFaqs, listFeatures, listTestimonials, getBulkmailBalance, getHotmailBalance } from "@/app/actions/admin"
import { SettingsStudio } from "@/components/admin/settings-studio"

export default async function AdminSettingsPage() {
  const [settings, features, faqs, testimonials, bulkmailBal, hotmailBal] = await Promise.all([
    getAdminSettings(),
    listFeatures(),
    listFaqs(),
    listTestimonials(),
    getBulkmailBalance(),
    getHotmailBalance(),
  ])

  return (
    <SettingsStudio
      initialSettings={
        settings ?? {
          currencySymbol: "BDT",
          usdToLocalRate: 1,
          minDepositUsd: 5,
          minTransferAmount: 1,
          initialBalance: 0,
          siteName: "AccShop",
          supportUrl: "",
          heroTitle: "",
          heroSubtitle: "",
          footerText: "",
          heroBadge: "",
          aboutTitle: "",
          aboutSubtitle: "",
          aboutHeading: "",
          aboutPara1: "",
          aboutPara2: "",
          stat1Value: "",
          stat1Label: "",
          stat2Value: "",
          stat2Label: "",
          stat3Value: "",
          stat3Label: "",
          stat4Value: "",
          stat4Label: "",
          trustTitle: "",
          trustDesc: "",
          trustBullets: "",
          valuesTitle: "",
          valuesSubtitle: "",
          featuresTitle: "",
          featuresSubtitle: "",
          teamTitle: "",
          teamDescription: "",
          teamStat1Value: "",
          teamStat1Label: "",
          teamStat2Value: "",
          teamStat2Label: "",
          teamImageUrl: "",
          testimonialsTitle: "",
          testimonialsSubtitle: "",
          faqTitle: "",
          ctaBadge: "",
          ctaTitle: "",
          ctaSubtitle: "",
          contactPhone: "",
          contactSupportEmail: "",
          contactSalesEmail: "",
          hotmailApiKey: "",
          hotmailApiBaseUrl: "https://www.hotmail143.com/api/v1",
          bulkmailApiKey: "",
          bulkmailApiBaseUrl: "https://bulkmail.shop/api/v2",
        }
      }
      initialFeatures={features}
      initialFaqs={faqs}
      initialTestimonials={testimonials}
      hotmail={{
        apiKey: settings?.hotmailApiKey ?? "",
        baseUrl: settings?.hotmailApiBaseUrl ?? "https://www.hotmail143.com/api/v1",
      }}
      bulkmail={{
        apiKey: settings?.bulkmailApiKey ?? "",
        baseUrl: settings?.bulkmailApiBaseUrl ?? "https://bulkmail.shop/api/v2",
      }}
      fxLive={settings?.fxLiveEnabled ?? true}
      hotmailBalance={hotmailBal.ok ? Number(hotmailBal.balance) : null}
      bulkmailBalance={bulkmailBal.ok ? Number(bulkmailBal.balance) : null}
      bulkmailBalanceUsd={bulkmailBal.ok ? Number(bulkmailBal.balanceUsd ?? 0) : null}
      bulkmailRate={bulkmailBal.ok ? (bulkmailBal.rate ?? null) : null}
      bulkmailRateSource={bulkmailBal.ok ? (bulkmailBal.rateSource ?? "manual") : "manual"}
      bulkmailCurrency={bulkmailBal.ok ? (bulkmailBal.currency ?? "BDT") : "BDT"}
    />
  )
}
