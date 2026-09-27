import { StitchLanding } from "@/components/landing/StitchLanding"
import { getLandingFaqs, getLandingFeatures, getLandingSettings, getLandingTestimonials } from "@/lib/content"

export const dynamic = "force-dynamic"

export default async function Page() {
  // One failing upstream must not 500 the whole landing — fall back per-section.
  const [settings, features, faqs, testimonials] = await Promise.all([
    getLandingSettings().catch(() => null),
    getLandingFeatures().catch(() => []),
    getLandingFaqs().catch(() => []),
    getLandingTestimonials().catch(() => []),
  ]);

  // Get currency symbol from already-fetched settings (avoid duplicate /settings call).
  const currencySymbol = settings?.currencySymbol ?? "BDT"

  return <StitchLanding settings={settings} features={features} faqs={faqs} testimonials={testimonials} currencySymbol={currencySymbol} />
}
