import { serverApi } from "@/lib/api/endpoints"
import type { Faq, Feature, Settings, Testimonial } from "@/lib/api/endpoints"

export async function getLandingSettings(): Promise<Settings | null> {
  return serverApi.settings.getPublic()
}

export async function getLandingFeatures(): Promise<Feature[]> {
  return serverApi.content.landingFeatures()
}

export async function getLandingFaqs(): Promise<Faq[]> {
  return serverApi.content.landingFaqs()
}

export async function getLandingTestimonials(): Promise<Testimonial[]> {
  return serverApi.content.landingTestimonials()
}

export async function getCurrencySymbol(): Promise<string> {
  const settings = await serverApi.settings.getPublic()
  return settings?.currencySymbol ?? "BDT"
}
