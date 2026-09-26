"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  deleteFaq,
  deleteFeature,
  deleteTestimonial,
  getBulkmailBalance,
  getBulkmailStock,
  getHotmailBalance,
  getHotmailStock,
  listFaqs,
  listFeatures,
  listTestimonials,
  moveFaq,
  moveFeature,
  moveTestimonial,
  updateAdminSettings,
  updateBulkmailConfig,
  updateFxMode,
  updateHotmailConfig,
  upsertFaq,
  upsertFeature,
  upsertTestimonial,
} from "@/app/actions/admin"
import type { AdminSettings, Faq, Feature, Testimonial } from "@/lib/api/types"
import { clearCurrencySymbolCache } from "@/lib/use-currency"
import { Switch } from "@/components/ui/switch"
import "./settings-studio.css"

type Props = {
  initialSettings: AdminSettings
  initialFeatures: Feature[]
  initialFaqs: Faq[]
  initialTestimonials: Testimonial[]
  hotmail: { apiKey: string; baseUrl: string }
  bulkmail: { apiKey: string; baseUrl: string }
  fxLive: boolean
  hotmailBalance: number | null
  bulkmailBalance: number | null
  bulkmailBalanceUsd: number | null
  bulkmailRate: number | null
  bulkmailRateSource: string
  bulkmailCurrency: string
}

const SECTIONS = [
  { id: "store-general", label: "Store & Currencies", icon: "currency" },
  { id: "hero-content", label: "Hero & Landing Copy", icon: "hero" },
  { id: "about-metrics", label: "About & Statistics", icon: "info" },
  { id: "trust-policies", label: "Trust, Anti-Abuse & Policy", icon: "shield" },
  { id: "support-team", label: "Support & Ops Showcase", icon: "headset" },
  { id: "homepage-features", label: "Features Manager", icon: "list" },
  { id: "faq-manager", label: "FAQ Accordion CMS", icon: "faq" },
  { id: "external-integration", label: "Hotmail143 API Gateway", icon: "terminal" },
  { id: "bulkmail-integration", label: "BulkMail API Gateway", icon: "mail" },
] as const

function SectionIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "w-4 h-4"
  switch (name) {
    case "currency":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "hero":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "info":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "shield":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "headset":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "list":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "faq":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    case "mail":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      )
  }
}

function ActionButtons({
  onUp,
  onDown,
  onEdit,
  onDelete,
  busy,
}: {
  onUp: () => void
  onDown: () => void
  onEdit: () => void
  onDelete: () => void
  busy: boolean
}) {
  const btn = "p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
  return (
    <div className="flex items-center space-x-1 shrink-0">
      <button type="button" className={btn} disabled={busy} onClick={onUp} aria-label="Move up">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </button>
      <button type="button" className={btn} disabled={busy} onClick={onDown} aria-label="Move down">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </button>
      <button type="button" className="p-1.5 text-slate-400 hover:text-brand-300 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40" disabled={busy} onClick={onEdit} aria-label="Edit">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </button>
      <button type="button" className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-40" disabled={busy} onClick={onDelete} aria-label="Delete">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </button>
    </div>
  )
}

const FEATURE_STYLES = [
  {
    box: "bg-indigo-500/10 border-indigo-500/20 text-brand-400",
    path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    box: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    path: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    box: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    path: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    box: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    path: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
]

function snapshot(s: AdminSettings) {
  return {
    siteName: s.siteName ?? "",
    currencySymbol: s.currencySymbol ?? "",
    usdToLocalRate: String(s.usdToLocalRate ?? 1),
    minDepositUsd: String(s.minDepositUsd ?? 0),
    minTransferAmount: String(s.minTransferAmount ?? 0),
    initialBalance: String(s.initialBalance ?? 0),
    supportUrl: s.supportUrl ?? "",
    heroBadge: s.heroBadge ?? "",
    heroTitle: s.heroTitle ?? "",
    heroSubtitle: s.heroSubtitle ?? "",
    aboutTitle: s.aboutTitle ?? "",
    aboutSubtitle: s.aboutSubtitle ?? "",
    aboutHeading: s.aboutHeading ?? "",
    aboutPara1: s.aboutPara1 ?? "",
    aboutPara2: s.aboutPara2 ?? "",
    stat1Value: s.stat1Value ?? "",
    stat1Label: s.stat1Label ?? "",
    stat2Value: s.stat2Value ?? "",
    stat2Label: s.stat2Label ?? "",
    stat3Value: s.stat3Value ?? "",
    stat3Label: s.stat3Label ?? "",
    stat4Value: s.stat4Value ?? "",
    stat4Label: s.stat4Label ?? "",
    trustTitle: s.trustTitle ?? "",
    trustDesc: s.trustDesc ?? "",
    trustBullets: s.trustBullets ?? "",
    featuresTitle: s.featuresTitle ?? "",
    featuresSubtitle: s.featuresSubtitle ?? "",
    teamTitle: s.teamTitle ?? "",
    teamImageUrl: s.teamImageUrl ?? "",
    teamDescription: s.teamDescription ?? "",
    teamStat1Value: s.teamStat1Value ?? "",
    teamStat1Label: s.teamStat1Label ?? "",
    teamStat2Value: s.teamStat2Value ?? "",
    teamStat2Label: s.teamStat2Label ?? "",
    contactSupportEmail: s.contactSupportEmail ?? "",
    contactSalesEmail: s.contactSalesEmail ?? "",
    footerText: s.footerText ?? "",
  }
}

type FormState = ReturnType<typeof snapshot>

export function SettingsStudio({
  initialSettings,
  initialFeatures,
  initialFaqs,
  initialTestimonials,
  hotmail,
  bulkmail,
  fxLive,
  hotmailBalance,
  bulkmailBalance,
  bulkmailBalanceUsd,
  bulkmailRate,
  bulkmailRateSource,
  bulkmailCurrency,
}: Props) {
  const [form, setForm] = React.useState<FormState>(() => snapshot(initialSettings))
  const [saving, setSaving] = React.useState(false)
  const [active, setActive] = React.useState<string>("store-general")

  const [features, setFeatures] = React.useState(initialFeatures)
  const [faqs, setFaqs] = React.useState(initialFaqs)
  const [testimonials, setTestimonials] = React.useState(initialTestimonials)
  const [busy, setBusy] = React.useState(false)

  const [featureForm, setFeatureForm] = React.useState<Partial<Feature> | null>(null)
  const [faqForm, setFaqForm] = React.useState<Partial<Faq> | null>(null)
  const [testimonialForm, setTestimonialForm] = React.useState<Partial<Testimonial> | null>(null)

  const [apiKey, setApiKey] = React.useState(hotmail.apiKey)
  const [baseUrl, setBaseUrl] = React.useState(hotmail.baseUrl)
  const [showKey, setShowKey] = React.useState(false)
  const [hmBusy, setHmBusy] = React.useState(false)
  const [balance, setBalance] = React.useState<number | null>(hotmailBalance)
  const [gatewayOk, setGatewayOk] = React.useState<boolean | null>(hotmailBalance !== null)

  // BulkMail
  const [bmApiKey, setBmApiKey] = React.useState(bulkmail.apiKey)
  const [bmBaseUrl, setBmBaseUrl] = React.useState(bulkmail.baseUrl)
  const [bmShowKey, setBmShowKey] = React.useState(false)
  const [bmBusy, setBmBusy] = React.useState(false)
  const [bmBalance, setBmBalance] = React.useState<number | null>(bulkmailBalance)
  const [bmBalanceUsd, setBmBalanceUsd] = React.useState<number | null>(bulkmailBalanceUsd)
  const [bmRate, setBmRate] = React.useState<number | null>(bulkmailRate)
  const [bmRateSource, setBmRateSource] = React.useState<string>(bulkmailRateSource)
  const [liveFx, setLiveFx] = React.useState(fxLive)
  const [bmGatewayOk, setBmGatewayOk] = React.useState<boolean | null>(bulkmailBalance !== null)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  // Scroll spy for the quick nav
  React.useEffect(() => {
    const ids = SECTIONS.map((s) => s.id)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  async function checkBalance(silent = false) {
    if (!silent) setHmBusy(true)
    const res = await getHotmailBalance()
    if (!silent) setHmBusy(false)
    if (res.ok) {
      setBalance(Number(res.balance))
      setGatewayOk(true)
    } else {
      setGatewayOk(false)
      if (!silent) toast.error(res.message)
    }
  }

  async function checkBulkmailBalance(silent = false) {
    if (!silent) setBmBusy(true)
    const res = await getBulkmailBalance()
    if (!silent) setBmBusy(false)
    if (res.ok) {
      setBmBalance(Number(res.balance))
      setBmBalanceUsd(res.balanceUsd != null ? Number(res.balanceUsd) : null)
      if (res.rate != null) setBmRate(Number(res.rate))
      if (res.rateSource) setBmRateSource(res.rateSource)
      setBmGatewayOk(true)
    } else {
      setBmGatewayOk(false)
      if (!silent) toast.error(res.message)
    }
  }

  React.useEffect(() => {
    checkBalance(true)
    checkBulkmailBalance(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    setSaving(true)
    const result = await updateAdminSettings({
      currencySymbol: form.currencySymbol,
      usdToLocalRate: Number.parseFloat(form.usdToLocalRate) || 1,
      minDepositUsd: Number.parseFloat(form.minDepositUsd) || 0,
      minTransferAmount: Number.parseFloat(form.minTransferAmount) || 0,
      initialBalance: Number.parseFloat(form.initialBalance) || 0,
      siteName: form.siteName,
      supportUrl: form.supportUrl,
      heroTitle: form.heroTitle,
      heroSubtitle: form.heroSubtitle,
      footerText: form.footerText,
      heroBadge: form.heroBadge,
      aboutTitle: form.aboutTitle,
      aboutSubtitle: form.aboutSubtitle,
      aboutHeading: form.aboutHeading,
      aboutPara1: form.aboutPara1,
      aboutPara2: form.aboutPara2,
      stat1Value: form.stat1Value,
      stat1Label: form.stat1Label,
      stat2Value: form.stat2Value,
      stat2Label: form.stat2Label,
      stat3Value: form.stat3Value,
      stat3Label: form.stat3Label,
      stat4Value: form.stat4Value,
      stat4Label: form.stat4Label,
      trustTitle: form.trustTitle,
      trustDesc: form.trustDesc,
      trustBullets: form.trustBullets,
      featuresTitle: form.featuresTitle,
      featuresSubtitle: form.featuresSubtitle,
      teamTitle: form.teamTitle,
      teamDescription: form.teamDescription,
      teamStat1Value: form.teamStat1Value,
      teamStat1Label: form.teamStat1Label,
      teamStat2Value: form.teamStat2Value,
      teamStat2Label: form.teamStat2Label,
      teamImageUrl: form.teamImageUrl,
      contactSupportEmail: form.contactSupportEmail,
      contactSalesEmail: form.contactSalesEmail,
    })
    setSaving(false)
    if (result.success) {
      clearCurrencySymbolCache()
      toast.success("Settings saved.")
    }
    else toast.error((result as { message?: string }).message ?? "Could not save settings.")
  }

  function handleDiscard() {
    setForm(snapshot(initialSettings))
    toast.success("Changes discarded.")
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  async function refreshContent() {
    const [f, q, t] = await Promise.all([listFeatures(), listFaqs(), listTestimonials()])
    setFeatures(f)
    setFaqs(q)
    setTestimonials(t)
    setBusy(false)
  }

  async function saveFeature() {
    if (!featureForm?.title?.trim() || !featureForm.description?.trim()) {
      toast.error("Title and description are required.")
      return
    }
    setBusy(true)
    const res = await upsertFeature({
      id: featureForm.id,
      icon: featureForm.icon?.trim() || "Sparkles",
      title: featureForm.title!.trim(),
      description: featureForm.description!.trim(),
    })
    if (!res.success) {
      setBusy(false)
      toast.error(res.message ?? "Could not save feature.")
      return
    }
    setFeatureForm(null)
    await refreshContent()
    toast.success("Feature saved.")
  }

  async function saveFaq() {
    if (!faqForm?.question?.trim() || !faqForm.answer?.trim()) {
      toast.error("Question and answer are required.")
      return
    }
    setBusy(true)
    const res = await upsertFaq({
      id: faqForm.id,
      question: faqForm.question!.trim(),
      answer: faqForm.answer!.trim(),
    })
    if (!res.success) {
      setBusy(false)
      toast.error(res.message ?? "Could not save FAQ.")
      return
    }
    setFaqForm(null)
    await refreshContent()
    toast.success("FAQ saved.")
  }

  async function saveTestimonial() {
    if (!testimonialForm?.quote?.trim() || !testimonialForm.name?.trim()) {
      toast.error("Quote and name are required.")
      return
    }
    setBusy(true)
    const res = await upsertTestimonial({
      id: testimonialForm.id,
      stars: Number(testimonialForm.stars) || 5,
      tag: testimonialForm.tag?.trim() || "",
      quote: testimonialForm.quote!.trim(),
      name: testimonialForm.name!.trim(),
      role: testimonialForm.role?.trim() || "",
      avatar: testimonialForm.avatar?.trim() || "",
    })
    if (!res.success) {
      setBusy(false)
      toast.error(res.message ?? "Could not save testimonial.")
      return
    }
    setTestimonialForm(null)
    await refreshContent()
    toast.success("Testimonial saved.")
  }

  async function saveProviderConfig() {
    setHmBusy(true)
    const res = await updateHotmailConfig({ apiKey, baseUrl })
    setHmBusy(false)
    if (res.success) {
      toast.success("Hotmail143 config saved.")
      checkBalance(true)
    } else toast.error(res.message)
  }

  async function saveBulkmailConfig() {
    setBmBusy(true)
    const res = await updateBulkmailConfig({ apiKey: bmApiKey, baseUrl: bmBaseUrl })
    setBmBusy(false)
    if (res.success) {
      toast.success("BulkMail config saved.")
      checkBulkmailBalance(true)
    } else toast.error(res.message)
  }

  async function toggleFxLive(v: boolean) {
    setLiveFx(v)
    setBmBusy(true)
    const res = await updateFxMode(v)
    setBmBusy(false)
    if (res.success) {
      toast.success(v ? "Live internet rate enabled." : "Flat rate enabled.")
      checkBulkmailBalance(true)
    } else {
      toast.error(res.message)
      setLiveFx(!v)
    }
  }

  async function verifyStock() {
    setHmBusy(true)
    const res = await getHotmailStock()
    setHmBusy(false)
    if (res.ok) {
      const count = Object.keys(res.data ?? {}).length
      toast.success(`Live stock verified — ${count} product entries.`)
    } else toast.error(res.message)
  }

  async function verifyBulkmailStock() {
    setBmBusy(true)
    const res = await getBulkmailStock()
    setBmBusy(false)
    if (res.ok) {
      const data = res.data as { data?: Array<{ product_id: number }> } | Array<{ product_id: number }>
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      toast.success(`Live stock verified — ${list.length} product entries.`)
    } else toast.error(res.message)
  }

  const inputCls = "glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-white"
  const labelCls = "block text-xs font-semibold text-slate-300 mb-1.5"
  const hintCls = "text-[11px] text-slate-500 mt-1 block"

  return (
    <div className="settings-studio min-h-screen bg-obsidian-950 text-slate-200 antialiased selection:bg-brand-500/30 selection:text-brand-100 relative bg-micro-grid -m-6 lg:-m-12 p-6 lg:p-12">
      <div className="fixed top-0 left-1/4 w-[750px] h-[550px] radial-glow-1 pointer-events-none -z-10 blur-3xl"></div>
      <div className="fixed top-1/2 right-10 w-[600px] h-[600px] radial-glow-2 pointer-events-none -z-10 blur-3xl"></div>
      <div className="fixed bottom-0 left-1/3 w-[800px] h-[450px] radial-glow-1 pointer-events-none -z-10 blur-3xl"></div>

      <section className="border-b border-white/[0.06] bg-obsidian-900/40 relative -mx-6 lg:-mx-12 -mt-6 lg:-mt-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Site Settings
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
                Configure global currency, deposit thresholds, homepage landing CMS copy, trust badges, support channels, and Hotmail143 vendor synchronization.
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] transition-all flex items-center space-x-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span>Discard</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 hover:from-brand-500 hover:to-indigo-500 shadow-glow-md border border-brand-400/40 hover:border-brand-300 transition-all flex items-center space-x-2 disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span>{saving ? "Saving…" : "Save All Settings"}</span>
                <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90">Ctrl+S</kbd>
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-4">
            <div className="glass-panel rounded-2xl p-3 border border-white/10 shadow-xl">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Settings Sections</div>
              <nav className="space-y-1">
                {SECTIONS.map((s) => {
                  const isActive = active === s.id
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      onClick={() => setActive(s.id)}
                      className={
                        isActive
                          ? "flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600/20 border border-brand-500/30"
                          : "flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                      }
                    >
                      <span className={isActive ? "text-brand-400" : ""}>
                        <SectionIcon name={s.icon} />
                      </span>
                      <span>{s.label}</span>
                    </a>
                  )
                })}
              </nav>
            </div>
            <div className="glass-panel rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">Environment</span>
                <span className="text-[10px] font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">Production</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Hotmail143 Gateway</span>
                  {gatewayOk === true ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
                    </span>
                  ) : gatewayOk === false ? (
                    <span className="text-rose-400 font-semibold">Offline</span>
                  ) : (
                    <span className="text-slate-500 font-semibold">Checking…</span>
                  )}
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>BulkMail Gateway</span>
                  {bmGatewayOk === true ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
                    </span>
                  ) : bmGatewayOk === false ? (
                    <span className="text-rose-400 font-semibold">Offline</span>
                  ) : (
                    <span className="text-slate-500 font-semibold">Checking…</span>
                  )}
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Currency Base</span>
                  <span className="text-white font-mono">USD / {form.currencySymbol || "—"}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Features</span>
                  <span className="text-white font-mono">{features.length} items</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-8">
            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden scroll-mt-28" id="store-general">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>General Store &amp; Currency Rules</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Primary identification, localized fiat exchange rates, and wallet transaction limits.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg">Financial Core</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Site Name</label>
                  <input className={inputCls} placeholder="e.g. AccShop" type="text" value={form.siteName} onChange={set("siteName")} />
                  <span className={hintCls}>Branding displayed on title bars, emails and invoices.</span>
                </div>
                <div>
                  <label className={labelCls}>Currency Symbol</label>
                  <div className="relative">
                    <input className={`${inputCls} uppercase font-mono`} placeholder="BDT / USD / EUR" type="text" value={form.currencySymbol} onChange={set("currencySymbol")} />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">ISO</span>
                  </div>
                  <span className={hintCls}>Visible prefix across all customer-facing checkout pricing.</span>
                </div>
                <div>
                  <label className={labelCls}>USD to Local Rate</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">1 USD =</span>
                    <input className={`${inputCls} pl-20 font-mono`} step="0.01" type="number" value={form.usdToLocalRate} onChange={set("usdToLocalRate")} />
                  </div>
                  <span className={hintCls}>Flat USD→local value — used for BulkMail when the live rate is off, and as fallback when unreachable. Also used for non-USD deposits.</span>
                </div>
                <div>
                  <label className={labelCls}>Minimum Deposit (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">$</span>
                    <input className={`${inputCls} pl-8 font-mono`} type="number" value={form.minDepositUsd} onChange={set("minDepositUsd")} />
                  </div>
                  <span className={hintCls}>Smallest allowable wallet top-up increment.</span>
                </div>
                <div>
                  <label className={labelCls}>Minimum Transfer Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">$</span>
                    <input className={`${inputCls} pl-8 font-mono`} type="number" value={form.minTransferAmount} onChange={set("minTransferAmount")} />
                  </div>
                  <span className={hintCls}>Inter-user wallet balance transfer minimum.</span>
                </div>
                <div>
                  <label className={labelCls}>Initial Wallet Balance (New Users)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400">$</span>
                    <input className={`${inputCls} pl-8 font-mono`} type="number" value={form.initialBalance} onChange={set("initialBalance")} />
                  </div>
                  <span className={hintCls}>Starting balance for new user wallets.</span>
                </div>
                <div>
                  <label className={labelCls}>Support Telegram URL</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-brand-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"></path></svg>
                    </span>
                    <input className={`${inputCls} pl-10`} placeholder="https://t.me/username" type="url" value={form.supportUrl} onChange={set("supportUrl")} />
                  </div>
                  <span className={hintCls}>Direct Telegram route for escalations and order inquiries.</span>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="hero-content">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Homepage Hero Banner</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Top of the public landing page. Supports dynamic gradient lines and badge chips.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">Hero CMS</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Hero Badge Suffix (After Site Name)</label>
                  <input className={inputCls} type="text" value={form.heroBadge} onChange={set("heroBadge")} placeholder="Premium Email Accounts Marketplace" />
                  <span className={hintCls}>Renders inside the top glowing chip (e.g. &ldquo;AccShop • Premium Email Accounts Marketplace&rdquo;).</span>
                </div>
                <div>
                  <label className={labelCls}>Hero Title (Use line breaks for multiple lines)</label>
                  <input className={`${inputCls} font-medium`} type="text" value={form.heroTitle} onChange={set("heroTitle")} />
                </div>
                <div>
                  <label className={labelCls}>Hero Subtitle</label>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.heroSubtitle} onChange={set("heroSubtitle")} />
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="about-metrics">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">About Section &amp; Metric Counters</h2>
                  <p className="text-xs text-slate-400 mt-0.5">The primary &ldquo;About AccShop&rdquo; mission block and performance tally cards.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">Metrics &amp; Story</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Section Title</label>
                    <input className={inputCls} type="text" value={form.aboutTitle} onChange={set("aboutTitle")} />
                  </div>
                  <div>
                    <label className={labelCls}>Section Subtitle</label>
                    <input className={inputCls} type="text" value={form.aboutSubtitle} onChange={set("aboutSubtitle")} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Card Heading</label>
                  <input className={inputCls} type="text" value={form.aboutHeading} onChange={set("aboutHeading")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Paragraph 1</label>
                    <textarea className={`${inputCls} resize-none`} rows={3} value={form.aboutPara1} onChange={set("aboutPara1")} />
                  </div>
                  <div>
                    <label className={labelCls}>Paragraph 2</label>
                    <textarea className={`${inputCls} resize-none`} rows={3} value={form.aboutPara2} onChange={set("aboutPara2")} />
                  </div>
                </div>
                <div className="pt-3 border-t border-white/[0.06]">
                  <label className="block text-xs font-bold text-slate-300 mb-3">Stats Grid (4 Counter Units)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {(
                      [
                        ["stat1Value", "stat1Label"],
                        ["stat2Value", "stat2Label"],
                        ["stat3Value", "stat3Label"],
                        ["stat4Value", "stat4Label"],
                      ] as const
                    ).map(([vKey, lKey], i) => (
                      <div key={vKey} className="bg-obsidian-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[10px] font-mono text-brand-400 uppercase font-semibold">Stat Slot 0{i + 1}</span>
                        <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-bold text-white font-mono" placeholder="Value" type="text" value={form[vKey]} onChange={set(vKey)} />
                        <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300" placeholder="Label" type="text" value={form[lKey]} onChange={set(lKey)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="trust-policies">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Trust, Anti-Abuse &amp; Buyer Guarantee</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Configure trust banners, replacement warranty guidelines, and compliance rules.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">Security &amp; Trust</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Card Title</label>
                  <input className={inputCls} type="text" value={form.trustTitle} onChange={set("trustTitle")} />
                </div>
                <div>
                  <label className={labelCls}>Card Description</label>
                  <input className={inputCls} type="text" value={form.trustDesc} onChange={set("trustDesc")} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Checklist Bullets (One per line)</label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {form.trustBullets.split("\n").filter((b) => b.trim()).length} items configured
                    </span>
                  </div>
                  <textarea className={`${inputCls} font-mono leading-relaxed resize-none`} rows={4} value={form.trustBullets} onChange={set("trustBullets")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className={labelCls}>&ldquo;Why Trust Us&rdquo; Section Title</label>
                    <input className={inputCls} type="text" value={form.featuresTitle} onChange={set("featuresTitle")} />
                  </div>
                  <div>
                    <label className={labelCls}>&ldquo;Why Trust Us&rdquo; Subtitle</label>
                    <input className={inputCls} type="text" value={form.featuresSubtitle} onChange={set("featuresSubtitle")} />
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="support-team">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Support &amp; Operations Team</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Present human assistance metrics and support desk SLA commitments.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg">Help Desk</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Section Title</label>
                    <input className={inputCls} type="text" value={form.teamTitle} onChange={set("teamTitle")} />
                  </div>
                  <div>
                    <label className={labelCls}>Team Showcase Image URL</label>
                    <input className={`${inputCls} font-mono`} type="text" value={form.teamImageUrl} onChange={set("teamImageUrl")} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.teamDescription} onChange={set("teamDescription")} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-obsidian-900/50 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] font-semibold text-brand-400 uppercase">Metric 1</span>
                    <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-bold text-white font-mono" placeholder="Value" type="text" value={form.teamStat1Value} onChange={set("teamStat1Value")} />
                    <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300" placeholder="Label" type="text" value={form.teamStat1Label} onChange={set("teamStat1Label")} />
                  </div>
                  <div className="p-3 bg-obsidian-900/50 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] font-semibold text-brand-400 uppercase">Metric 2</span>
                    <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-bold text-white font-mono" placeholder="Value" type="text" value={form.teamStat2Value} onChange={set("teamStat2Value")} />
                    <input className="glass-input w-full rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300" placeholder="Label" type="text" value={form.teamStat2Label} onChange={set("teamStat2Label")} />
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="homepage-features">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Features List CMS</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Items displayed in the &ldquo;Why Choose AccShop&rdquo; feature grid.</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFeatureForm({ icon: "Sparkles", title: "", description: "" })}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm transition-all disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Add Feature</span>
                </button>
              </div>
              <div className="space-y-2.5">
                {features.map((f, i) => {
                  const style = FEATURE_STYLES[i % FEATURE_STYLES.length]
                  return (
                    <div key={f.id}>
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900/70 border border-white/[0.07] hover:border-brand-500/30 transition-all group">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${style.box}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={style.path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="truncate">{f.title}</span>
                              <span className="text-[10px] font-mono font-normal text-slate-500 shrink-0">Icon: {f.icon}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-md">{f.description}</p>
                          </div>
                        </div>
                        <ActionButtons
                          busy={busy}
                          onUp={async () => { setBusy(true); await moveFeature(f.id, "up"); await refreshContent() }}
                          onDown={async () => { setBusy(true); await moveFeature(f.id, "down"); await refreshContent() }}
                          onEdit={() => setFeatureForm({ ...f })}
                          onDelete={async () => {
                            setBusy(true)
                            const res = await deleteFeature(f.id)
                            if (!res.success) { setBusy(false); toast.error(res.message ?? "Could not delete.") ; return }
                            await refreshContent()
                            toast.success("Feature deleted.")
                          }}
                        />
                      </div>
                      {featureForm?.id === f.id && (
                        <div className="mt-2 p-4 rounded-xl bg-obsidian-900/70 border border-brand-500/25 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                            <div>
                              <label className={labelCls}>Title</label>
                              <input className={inputCls} value={featureForm.title ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })} />
                            </div>
                            <div>
                              <label className={labelCls}>Icon (Lucide name)</label>
                              <input className={inputCls} value={featureForm.icon ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })} />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>Description</label>
                            <textarea className={`${inputCls} resize-none`} rows={2} value={featureForm.description ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" disabled={busy} onClick={() => setFeatureForm(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button>
                            <button type="button" disabled={busy} onClick={saveFeature} className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 disabled:opacity-50">Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {features.length === 0 && !featureForm && (
                  <p className="text-center text-xs text-slate-500 py-6">No features yet.</p>
                )}
                {featureForm && !featureForm.id && (
                  <div className="p-4 rounded-xl bg-obsidian-900/70 border border-brand-500/25 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                      <div>
                        <label className={labelCls}>Title</label>
                        <input className={inputCls} value={featureForm.title ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Icon (Lucide name)</label>
                        <input className={inputCls} placeholder="Sparkles" value={featureForm.icon ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Description</label>
                      <textarea className={`${inputCls} resize-none`} rows={2} value={featureForm.description ?? ""} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={busy} onClick={() => setFeatureForm(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button>
                      <button type="button" disabled={busy} onClick={saveFeature} className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 disabled:opacity-50">Save</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="faq-manager">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Accordion entries shown in the customer help and purchase guide.</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFaqForm({ question: "", answer: "" })}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm transition-all disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Add FAQ</span>
                </button>
              </div>
              <div className="space-y-2.5">
                {faqs.map((q) => (
                  <div key={q.id}>
                    <div className="p-3.5 rounded-xl bg-obsidian-900/70 border border-white/[0.07] hover:border-brand-500/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 pr-4 min-w-0">
                          <span className="text-xs font-bold text-white">{q.question}</span>
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{q.answer}</p>
                        </div>
                        <ActionButtons
                          busy={busy}
                          onUp={async () => { setBusy(true); await moveFaq(q.id, "up"); await refreshContent() }}
                          onDown={async () => { setBusy(true); await moveFaq(q.id, "down"); await refreshContent() }}
                          onEdit={() => setFaqForm({ ...q })}
                          onDelete={async () => {
                            setBusy(true)
                            const res = await deleteFaq(q.id)
                            if (!res.success) { setBusy(false); toast.error(res.message ?? "Could not delete."); return }
                            await refreshContent()
                            toast.success("FAQ deleted.")
                          }}
                        />
                      </div>
                    </div>
                    {faqForm?.id === q.id && (
                      <div className="mt-2 p-4 rounded-xl bg-obsidian-900/70 border border-brand-500/25 space-y-3">
                        <div>
                          <label className={labelCls}>Question</label>
                          <input className={inputCls} value={faqForm.question ?? ""} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelCls}>Answer</label>
                          <textarea className={`${inputCls} resize-none`} rows={3} value={faqForm.answer ?? ""} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" disabled={busy} onClick={() => setFaqForm(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button>
                          <button type="button" disabled={busy} onClick={saveFaq} className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 disabled:opacity-50">Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {faqs.length === 0 && !faqForm && (
                  <p className="text-center text-xs text-slate-500 py-6">No FAQs yet.</p>
                )}
                {faqForm && !faqForm.id && (
                  <div className="p-4 rounded-xl bg-obsidian-900/70 border border-brand-500/25 space-y-3">
                    <div>
                      <label className={labelCls}>Question</label>
                      <input className={inputCls} value={faqForm.question ?? ""} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Answer</label>
                      <textarea className={`${inputCls} resize-none`} rows={3} value={faqForm.answer ?? ""} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={busy} onClick={() => setFaqForm(null)} className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button>
                      <button type="button" disabled={busy} onClick={saveFaq} className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 disabled:opacity-50">Save</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="testimonials-manager">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Testimonials &amp; Reviews</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Rendered in the homepage &ldquo;Wall of Love&rdquo; section.</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTestimonialForm({ stars: 5, tag: "", quote: "", name: "", role: "", avatar: "" })}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm transition-all disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Add Testimonial</span>
                </button>
              </div>
              {testimonials.length === 0 && !testimonialForm ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-white/10 bg-obsidian-900/30">
                  <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  </svg>
                  <p className="text-xs text-slate-400 font-medium">No published customer reviews yet.</p>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Click &ldquo;+ Add Testimonial&rdquo; to spotlight client feedback on your store.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {testimonials.map((t) => (
                    <div key={t.id}>
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900/70 border border-white/[0.07] hover:border-brand-500/30 transition-all group">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 overflow-hidden">
                            {t.avatar ? (
                              <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path></svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="truncate">{t.name}</span>
                              <span className="text-[10px] font-mono font-normal text-slate-500 shrink-0">{"★".repeat(Math.min(5, Math.max(1, t.stars)))}{t.tag ? ` · ${t.tag}` : ""}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-md">{t.quote}</p>
                          </div>
                        </div>
                        <ActionButtons
                          busy={busy}
                          onUp={async () => { setBusy(true); await moveTestimonial(t.id, "up"); await refreshContent() }}
                          onDown={async () => { setBusy(true); await moveTestimonial(t.id, "down"); await refreshContent() }}
                          onEdit={() => setTestimonialForm({ ...t })}
                          onDelete={async () => {
                            setBusy(true)
                            const res = await deleteTestimonial(t.id)
                            if (!res.success) { setBusy(false); toast.error(res.message ?? "Could not delete."); return }
                            await refreshContent()
                            toast.success("Testimonial deleted.")
                          }}
                        />
                      </div>
                      {testimonialForm?.id === t.id && (
                        <TestimonialEditor form={testimonialForm} onChange={setTestimonialForm} onCancel={() => setTestimonialForm(null)} onSave={saveTestimonial} busy={busy} inputCls={inputCls} labelCls={labelCls} />
                      )}
                    </div>
                  ))}
                  {testimonialForm && !testimonialForm.id && (
                    <TestimonialEditor form={testimonialForm} onChange={setTestimonialForm} onCancel={() => setTestimonialForm(null)} onSave={saveTestimonial} busy={busy} inputCls={inputCls} labelCls={labelCls} />
                  )}
                </div>
              )}
            </section>

            <section className="glass-panel rounded-2xl border border-white/10 p-6 shadow-xl scroll-mt-28" id="footer-contact">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Footer &amp; Contact Meta</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Public channels, inquiry destinations, and copyright statement.</p>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg">Footer Meta</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Customer Support Email</label>
                  <input className={inputCls} type="email" value={form.contactSupportEmail} onChange={set("contactSupportEmail")} />
                </div>
                <div>
                  <label className={labelCls}>Sales / Enterprise Inquiries Email</label>
                  <input className={inputCls} type="email" value={form.contactSalesEmail} onChange={set("contactSalesEmail")} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Footer Copyright Subtext</label>
                <input className={inputCls} type="text" value={form.footerText} onChange={set("footerText")} />
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-brand-500/25 p-6 shadow-xl relative overflow-hidden scroll-mt-28" id="external-integration">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-600/15 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <span>Hotmail143 Provider Integration</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Automated account fulfillment gateway mapping external Hotmail &amp; Outlook stock.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Balance: {balance !== null ? `$${balance.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Vendor API Secret Key</label>
                  <div className="relative">
                    <input className={`${inputCls} font-mono tracking-wider pr-10`} type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    <button type="button" className="absolute right-3 top-2.5 text-slate-400 hover:text-white" title="Toggle Visibility" onClick={() => setShowKey((v) => !v)}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>
                  </div>
                  <span className={`${hintCls} font-mono`}>Secured with AES-256 server-side encryption.</span>
                </div>
                <div>
                  <label className={labelCls}>API Base Endpoint</label>
                  <input className={`${inputCls} font-mono`} type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    disabled={hmBusy}
                    onClick={saveProviderConfig}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-glow-sm transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Save Provider Config</span>
                  </button>
                  <button
                    type="button"
                    disabled={hmBusy}
                    onClick={() => checkBalance(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Check Balance</span>
                  </button>
                  <button
                    type="button"
                    disabled={hmBusy}
                    onClick={verifyStock}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Verify Live Stock</span>
                  </button>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border border-brand-500/25 p-6 shadow-xl relative overflow-hidden scroll-mt-28" id="bulkmail-integration">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-600/15 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <span>BulkMail Provider Integration</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">BulkMail account provider (X-API-Key). Products fulfilled via BulkMail when mapped by product ID.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Balance: {bmBalance !== null ? `${bulkmailCurrency} ${bmBalance.toFixed(2)}` : "—"}
                    {bmBalanceUsd !== null && bmBalanceUsd !== undefined ? ` (≈ $${bmBalanceUsd.toFixed(2)})` : ""}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[11px] text-slate-400">
                  Exchange rate:{" "}
                  <span className="font-mono text-slate-200">
                    1 USD = {bmRate != null ? bmRate : "—"} {bulkmailCurrency}
                  </span>
                  <span className={!liveFx ? "text-sky-400" : bmRateSource === "live" ? "text-emerald-400" : "text-amber-400"}>
                    {!liveFx
                      ? " · flat rate (locked)"
                      : bmRateSource === "live"
                        ? " · live from internet"
                        : " · manual setting (internet unreachable)"}
                  </span>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  <span>
                    <span className="block text-xs font-semibold text-slate-200">Use live internet rate</span>
                    <span className="block text-[11px] text-slate-500">Off = always use the flat USD→{bulkmailCurrency} value from Store settings.</span>
                  </span>
                  <Switch checked={liveFx} onCheckedChange={(v) => void toggleFxLive(v)} />
                </label>
                <div>
                  <label className={labelCls}>Vendor API Secret Key (X-API-Key)</label>
                  <div className="relative">
                    <input className={`${inputCls} font-mono tracking-wider pr-10`} type={bmShowKey ? "text" : "password"} value={bmApiKey} onChange={(e) => setBmApiKey(e.target.value)} />
                    <button type="button" className="absolute right-3 top-2.5 text-slate-400 hover:text-white" title="Toggle Visibility" onClick={() => setBmShowKey((v) => !v)}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>
                  </div>
                  <span className={`${hintCls} font-mono`}>Secured with AES-256 server-side encryption.</span>
                </div>
                <div>
                  <label className={labelCls}>API Base Endpoint</label>
                  <input className={`${inputCls} font-mono`} type="url" value={bmBaseUrl} onChange={(e) => setBmBaseUrl(e.target.value)} placeholder="https://bulkmail.shop/api/v2" />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    disabled={bmBusy}
                    onClick={saveBulkmailConfig}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-glow-sm transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Save Provider Config</span>
                  </button>
                  <button
                    type="button"
                    disabled={bmBusy}
                    onClick={() => checkBulkmailBalance(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Check Balance</span>
                  </button>
                  <button
                    type="button"
                    disabled={bmBusy}
                    onClick={verifyBulkmailStock}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center space-x-1.5 disabled:opacity-60"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Verify Live Stock</span>
                  </button>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-white/10">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span>Changes made to currencies and deposit limits take immediate effect across checkout flows.</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl border border-white/10 hover:bg-white/5 transition-all"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-glow-md border border-brand-400/30 transition-all flex items-center space-x-2 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>{saving ? "Publishing…" : "Publish All Settings"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>AccShop Admin Console • Version 2.8.4</div>
          <div className="flex items-center space-x-4">
            <a className="hover:text-slate-300 transition-colors" href="#">API Docs</a>
            <a className="hover:text-slate-300 transition-colors" href="#">Security Audits</a>
            <a className="hover:text-slate-300 transition-colors" href="#">Telegram Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TestimonialEditor({
  form,
  onChange,
  onCancel,
  onSave,
  busy,
  inputCls,
  labelCls,
}: {
  form: Partial<Testimonial>
  onChange: (form: Partial<Testimonial>) => void
  onCancel: () => void
  onSave: () => void
  busy: boolean
  inputCls: string
  labelCls: string
}) {
  return (
    <div className="mt-2 p-4 rounded-xl bg-obsidian-900/70 border border-brand-500/25 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px] gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={form.name ?? ""} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Role / company</label>
          <input className={inputCls} value={form.role ?? ""} onChange={(e) => onChange({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Stars</label>
          <input className={inputCls} type="number" min={1} max={5} value={form.stars ?? 5} onChange={(e) => onChange({ ...form, stars: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tag (e.g. Cold Outreach)</label>
          <input className={inputCls} value={form.tag ?? ""} onChange={(e) => onChange({ ...form, tag: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Avatar image URL</label>
          <input className={inputCls} value={form.avatar ?? ""} onChange={(e) => onChange({ ...form, avatar: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Quote</label>
        <textarea className={`${inputCls} resize-none`} rows={3} value={form.quote ?? ""} onChange={(e) => onChange({ ...form, quote: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button>
        <button type="button" disabled={busy} onClick={onSave} className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 disabled:opacity-50">Save</button>
      </div>
    </div>
  )
}
