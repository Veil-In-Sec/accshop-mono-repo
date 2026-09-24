"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/use-auth"
import { getLucideIcon } from "@/lib/icons"
import { Mount } from "@/components/reveal"
import type { Feature, Faq, Testimonial } from "@/lib/api/endpoints"
import { AmbientElements } from "@/components/landing/AmbientElements"
import "./landing.css"

type LandingSettings = {
  siteName?: string
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
} | null

type Props = {
  settings?: LandingSettings
  features?: Feature[]
  faqs?: Pick<Faq, "id" | "question" | "answer">[]
  testimonials?: Pick<Testimonial, "id" | "stars" | "tag" | "quote" | "name" | "role" | "avatar">[]
  currencySymbol?: string
}

/** Editable landing text with fallback to the built-in default. */
function pick(value: string | undefined | null, fallback: string): string {
  return value && value.trim() ? value : fallback
}

export function StitchLanding({ settings, features, faqs, testimonials }: Props) {
  const siteName = pick(settings?.siteName, "AccShop")
  const heroTitle = pick(settings?.heroTitle, "Premium Email Accounts,\nBuilt for Your Success")
  const heroSubtitle = pick(settings?.heroSubtitle, "Secure, trusted Hotmail, Outlook, and Gmail accounts to power your growth. Instant delivery, no personal data required.")
  const footerText = pick(settings?.footerText, "AccShop provides enterprise-grade, verified email infrastructure at genuine marketplace rates with instant delivery.")
  const heroBadge = pick(settings?.heroBadge, "Email Marketplace")
  const aboutTitle = pick(settings?.aboutTitle, "Pioneering Reliable & Transparent Email Infrastructure")
  const aboutSubtitle = pick(settings?.aboutSubtitle, "Empowering developers, growth marketers, and modern businesses with securely aged, authentic mail accounts.")
  const aboutHeading = pick(settings?.aboutHeading, "Who We Are & What Drives Us")
  const aboutPara1 = pick(settings?.aboutPara1, "AccShop was founded with a direct mandate: eliminate sketchy marketplaces and inconsistent account vendors by creating a high-integrity, automated provisioning platform. We serve high-velocity teams demanding verified, pre-warmed, and resilient Hotmail, Outlook, and Gmail profiles.")
  const aboutPara2 = pick(settings?.aboutPara2, "Every account is provisioned following industry-compliant procedures with no recycled identities or hijacked credentials, giving you enterprise stability for cold outreach, test suites, and operational scale.")
  const stats = [
    { value: pick(settings?.stat1Value, "3K+"), label: pick(settings?.stat1Label, "Clients Globally") },
    { value: pick(settings?.stat2Value, "100K+"), label: pick(settings?.stat2Label, "Delivered") },
    { value: pick(settings?.stat3Value, "99.9%"), label: pick(settings?.stat3Label, "Uptime Guarantee") },
    { value: pick(settings?.stat4Value, "24/7"), label: pick(settings?.stat4Label, "Human Support") },
  ]
  const trustTitle = pick(settings?.trustTitle, "Our Anti-Abuse & Trust Policy")
  const trustDesc = pick(settings?.trustDesc, "We uphold strict compliance to keep our infrastructure secure, reputable, and resilient.")
  const trustBullets = (settings?.trustBullets && settings.trustBullets.trim()
    ? settings.trustBullets.split("\n").map((b) => b.trim()).filter(Boolean)
    : [
        "Zero tolerance for malicious phishing, spam, or abusive activities.",
        "Authentic virgin proxies utilized during all initial provisioning.",
        "Comprehensive 48-hour replacement warranty on non-login states.",
        "Privacy first: Instant credential wiping from checkout servers.",
      ])
  const valuesTitle = pick(settings?.valuesTitle, "Core Values That Guide Us")
  const valuesSubtitle = pick(settings?.valuesSubtitle, "The foundational pillars built into every account and client interaction")
  const featuresTitle = pick(settings?.featuresTitle, "Why Trust Us")
  const featuresSubtitle = pick(settings?.featuresSubtitle, "Reliable glassmorphic email solutions engineered for scale and speed")
  const teamTitle = pick(settings?.teamTitle, "Meet Our Dedicated Support Team")
  const teamDescription = pick(settings?.teamDescription, "Our specialized engineers monitor account deliverability, authentication handshakes, and anti-abuse hygiene 24/7.")
  const teamStat1Value = pick(settings?.teamStat1Value, "< 15 min")
  const teamStat1Label = pick(settings?.teamStat1Label, "Average Support Response Time")
  const teamStat2Value = pick(settings?.teamStat2Value, "100% Human")
  const teamStat2Label = pick(settings?.teamStat2Label, "Dedicated Account Engineers")
  const rawTeamImage = pick(settings?.teamImageUrl, "/accshop-logo.svg")
  const teamImageUrl = /^(\/|https?:\/\/)/i.test(rawTeamImage) ? rawTeamImage : "/accshop-logo.svg"
  const testimonialsTitle = pick(settings?.testimonialsTitle, "Trusted by 3,000+ Growth Teams")
  const testimonialsSubtitle = pick(settings?.testimonialsSubtitle, "Authentic stories from scaling agencies, SaaS founders, and outreach leaders.")
  const faqTitle = pick(settings?.faqTitle, "FAQ")
  const ctaBadge = pick(settings?.ctaBadge, "Empower Your Infrastructure Today")
  const ctaTitle = pick(settings?.ctaTitle, "Ready to Power Your Campaigns With Verified Accounts?")
  const ctaSubtitle = pick(settings?.ctaSubtitle, "Experience instant automated delivery, 48-hour warranties, and top-tier support.")
  const contactPhone = pick(settings?.contactPhone, "+1 122345 7890")
  const contactSupportEmail = pick(settings?.contactSupportEmail, "support@accshop.com")
  const contactSalesEmail = pick(settings?.contactSalesEmail, "info@accshop.com")

  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const [scrolled, setScrolled] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState("home")
  const heroMediaRef = React.useRef<HTMLDivElement>(null)

  // freeze harness ?state=hover & ?t=N
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const state = p.get("state")
    if (state) document.documentElement.dataset.state = state
    const t = p.get("t")
    if (t !== null) {
      const secs = parseFloat(t)
      document.getAnimations().forEach((a) => { try { (a as any).currentTime = secs * 1000; (a as any).pause() } catch {} })
      const svg = document.querySelector("svg")
      try { (svg as any)?.pauseAnimations?.(); (svg as any)?.setCurrentTime?.(secs) } catch {}
      ;(window as any).__ready = true
    } else { (window as any).__ready = true }
  }, [])

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Scroll-spy wayfinding — nav always answers "where am I"
  React.useEffect(() => {
    const ids = ["home", "about", "values", "features", "team", "testimonials", "faq"]
    if (!("IntersectionObserver" in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id)
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    const els = document.querySelectorAll(".stitch-landing [data-reveal]")
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target) } }) }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" })
      els.forEach((el) => io.observe(el))
      return () => io.disconnect()
    } else els.forEach((el) => el.classList.add("in-view"))
  }, [])

  React.useEffect(() => {
    const el = heroMediaRef.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const hasHover = window.matchMedia("(hover: hover)").matches
    if (!hasHover || reduce) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.015)`
    }
    const onLeave = () => { el.style.transform = "" }
    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", onLeave)
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave) }
  }, [])

  async function handleLogout() { await logout(); router.push("/") }

  const defaultFeatures: Array<{ icon: string; title: string; description: string }> = [
    { icon: "ShieldCheck", title: "Secure & Private", description: "Bank-grade encrypted delivery. Protect your operations with pristine, non-recycled accounts guarded under strict privacy standards." },
    { icon: "Zap", title: "Instant Delivery", description: "Automated checkout dispatch. Receive live verified credentials and recovery data directly to your dashboard and inbox instantly." },
    { icon: "Users", title: "24/7 Human Support", description: "Dedicated technical specialists standby around the clock via live chat and ticket support to guarantee seamless continuity." },
  ]
  const displayFeatures = features && features.length > 0 ? features.map((f) => ({ icon: f.icon, title: f.title, description: f.description })) : defaultFeatures
  const defaultTestimonials: Array<{ stars: number; tag: string; quote: string; name: string; role: string; avatar: string }> = [
    { stars: 5, tag: "Cold Outreach", quote: "Game-changer for our outbound campaigns. The Outlook accounts were warmed cleanly with pristine IP histories. We hit 84% inbox placement from day one.", name: "Sarah K.", role: "Lead Generation Specialist, RevScale", avatar: "" },
    { stars: 5, tag: "Growth Ops", quote: "Exceptional speed and customer care! When one mailbox tripped an unexpected 2FA flag at 2 AM, support replaced it in 8 minutes flat.", name: "Messa B.", role: "Growth Marketing Director, HyperFunnel", avatar: "" },
    { stars: 5, tag: "SaaS Founder", quote: "AccShop completely saved our automated pipeline. Getting 500+ tested Gmail and Outlook seats instantly via API cut our onboarding time by weeks.", name: "Elena R.", role: "Founder & CEO, MetricPulse", avatar: "" },
    { stars: 5, tag: "QA Engineering", quote: "Our test automation suites require fresh, deterministic credentials every cycle. Zero recycled accounts are unparalleled.", name: "David P.", role: "QA Automation Lead, CloudGrid", avatar: "" },
    { stars: 5, tag: "E-Commerce", quote: "Managing multiple storefront notifications was a nightmare before AccShop. Reliable, cleanly segregated accounts with zero headaches.", name: "Marcus T.", role: "E-commerce Director, OmniBrands", avatar: "" },
    { stars: 5, tag: "Agency Lead", quote: "The 48-hour warranty gives us peace of mind. We buy in batches of 200+ monthly; deliverability is rock-solid.", name: "Julian V.", role: "Managing Partner, Apex Outreach", avatar: "" },
  ]
  const displayTestimonials = testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials
  const displayFaqs = faqs && faqs.length > 0 ? faqs : [
    { id: -1, question: "What are verified email accounts?", answer: "Verified email accounts are fully configured, secure accounts ready for corporate outreach, marketing, or general business use without waiting periods." },
    { id: -2, question: "How does instant delivery work?", answer: "Upon successful checkout, automated dispatch delivers credentials and connection instructions straight to your email in under 60 seconds." },
    { id: -3, question: "How long do these email accounts last?", answer: "Accounts have unlimited validity provided they abide by our fair usage guidelines and respective provider policies." },
    { id: -4, question: "What is your replacement & refund policy?", answer: "We provide a 48-hour warranty on all orders. In the rare case of non-working credentials, we replace them instantly." },
  ]
  function resolveIcon(name: string) { try { return getLucideIcon(name) } catch { return getLucideIcon("ShieldCheck") } }
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || ""
  const initials = displayName ? displayName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() : ""
  const heroLines = heroTitle.split("\n")

  // Smooth scroll for anchor links
  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="stitch-landing">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="liquid-glass">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves={2} seed={3} result="noise">
            <animate attributeName="baseFrequency" dur="18s" values="0.008 0.012;0.012 0.008;0.008 0.012" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={22} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <AmbientElements />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header — floating material chrome, gains weight on scroll */}
        <header className="sticky top-4 z-30">
          <div className={`material-chrome relative mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-6 py-3 ${scrolled ? "material-chrome--scrolled" : ""}`}>
            <Link href="#top" className="flex items-center gap-2 pressable rounded-xl">
              <img src="/accshop-logo.svg" alt={`${siteName} logo`} className="h-7 w-7 object-contain" />
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">{siteName}</span>
            </Link>

          <nav className="hidden xl:flex items-center px-2 py-1.5 rounded-full glass-panel border border-border text-sm font-medium text-muted-foreground shadow-lg" style={{ padding: "6px 8px", borderRadius: 999 }} aria-label="Sections">
            {[
              ["home", "Home"],
              ["about", "About Us"],
              ["values", "Values"],
              ["features", "Why Trust Us"],
              ["team", "Our Team"],
              ["testimonials", "Reviews"],
              ["faq", "FAQ"],
            ].map(([id, label]) => (
              <a
                key={id}
                onClick={(e) => handleAnchor(e, id)}
                href={`#${id}`}
                aria-current={activeSection === id ? "true" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${activeSection === id ? "bg-muted text-foreground" : "hover:text-foreground text-muted-foreground"}`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
              {user ? (
              <>
                <Link href="/dashboard" className="hidden sm:inline-flex items-center px-4 py-2 rounded-full glass-btn text-xs font-semibold text-foreground hover:text-foreground">Dashboard</Link>
                <details className="relative">
                  <summary style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 999, padding: "6px 10px 6px 6px", backdropFilter: "blur(12px)" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 999, background: "linear-gradient(135deg,#5362AD 0%,#6b7ac8 60%,#a5a8d4 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#ffffff" }}>{initials}</span>
                    <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                  </summary>
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#1a1d2f", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 8, minWidth: 180, zIndex: 50, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{user.email}</div>
                    </div>
                    <Link href="/dashboard" style={{ display: "block", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "#e5e7eb" }}>Dashboard</Link>
                    <button onClick={handleLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "#fda4af", background: "transparent", border: "none" }}>Log out</button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground px-3">Login</Link>
                <Link href="/register" className="inline-flex items-center px-5 py-2 rounded-full glass-btn text-xs font-semibold text-foreground hover:text-foreground">Get Started Now</Link>
              </>
            )}
          </div>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-8 pb-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="home" data-reveal>
          <div className="lg:col-span-6 space-y-6 text-left">
            <Mount y={18} delay={0.06}>
              <h1 className="type-display text-3xl sm:text-4xl lg:text-[2.9rem] text-foreground" style={{ whiteSpace: "pre-line" }}>
                {heroLines.map((line, i) => (<span key={i}>{line}{i < heroLines.length - 1 && <br />}</span>))}
              </h1>
            </Mount>
            <Mount y={16} delay={0.12}>
              <p className="type-body text-sm sm:text-[15px] text-muted-foreground max-w-md">{heroSubtitle}</p>
            </Mount>
            <Mount y={14} delay={0.15}>
              <p className="text-xs sm:text-[13px] text-muted-foreground max-w-md leading-relaxed">
                AccShop sells verified Hotmail, Outlook, and Gmail accounts with instant automated
                delivery and a 48-hour replacement warranty. No personal data is required, checkout
                takes minutes, and 24/7 human support covers every order — trusted by 3,000+ growth
                teams for outreach, testing, and operations.
              </p>
            </Mount>
            <Mount y={12} delay={0.18}>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link href="/register" className="hero-btn-gradient pressable px-6 py-3 rounded-full text-xs sm:text-sm font-bold tracking-wide">Get Started Now</Link>
                <Link href="/dashboard" className="inline-flex items-center px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-8 decoration-border">View Products</Link>
              </div>
            </Mount>
          </div>
          <div className="lg:col-span-6 relative flex justify-center items-center" data-reveal data-i="1">
            <div ref={heroMediaRef} className="relative rounded-3xl overflow-hidden hero-media-liquid w-full max-w-lg p-2 will-change-transform" style={{ transition: "transform .15s ease-out" }}>
              <div className="rounded-2xl overflow-hidden relative">
                <img alt="Verified Hotmail, Outlook and Gmail accounts delivered instantly by AccShop" className="w-full h-80 sm:h-[384px] object-cover object-center" src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80" />
                <div className="scrim absolute inset-0 pointer-events-none" />
              </div>
              <div className="sweep" aria-hidden />
            </div>
            <div className="absolute -bottom-6 -right-2 sm:right-2 w-28 h-28 rounded-2xl glass-chip p-3 hidden sm:flex flex-col justify-end shadow-xl" data-reveal data-i="2">
              <div className="sweep" aria-hidden />
              <div className="w-8 h-8 rounded-full bg-[#5362ad]/25 border border-[#a5a8d4]/40 flex items-center justify-center mb-2"><svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <span className="text-[10px] font-semibold text-foreground tracking-wide">Verified Quality</span>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12 md:py-16" id="about" data-reveal>
          <div className="max-w-xl mx-auto mb-10 text-center space-y-2">
            <h2 className="type-title text-2xl sm:text-3xl lg:text-4xl text-foreground">{aboutTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{aboutSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 glass-panel p-8 rounded-3xl flex flex-col justify-between space-y-6" data-reveal>
              <div className="sweep" aria-hidden />
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground tracking-tight">{aboutHeading}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{aboutPara1}</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{aboutPara2}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                {stats.map((s) => (
                  <div key={s.label} className="p-3 rounded-2xl bg-muted border border-border text-center"><div className="text-xl font-extrabold text-primary">{s.value}</div><div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div></div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 glass-panel p-8 rounded-3xl flex flex-col justify-between space-y-6 relative overflow-hidden" data-reveal data-i="1">
              <div className="sweep" aria-hidden />
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5362ad]/20 rounded-full blur-[60px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#5362ad]/20 border border-[#a5a8d4]/30 flex items-center justify-center mb-4"><svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="text-lg font-bold text-foreground mb-2">{trustTitle}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{trustDesc}</p>
                <ul className="space-y-3 text-xs text-muted-foreground">
                  {trustBullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5"><svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{b}</span></li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Policy Status: Active</span><span className="text-[11px] font-semibold text-primary flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /><span>Audited &amp; Enforced</span></span></div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 md:py-16" id="values" data-reveal>
          <div className="max-w-xl mx-auto mb-10 text-center space-y-2">
            <h2 className="type-title text-2xl sm:text-3xl text-foreground">{valuesTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{valuesSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-7 rounded-3xl flex flex-col group" data-reveal><div className="sweep" aria-hidden /><div className="w-12 h-12 rounded-2xl bg-[#5362ad]/15 border border-[#a5a8d4]/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"><svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" /></svg></div><h3 className="text-base font-bold text-foreground mb-2">Security First</h3><p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">We never compromise on account integrity. Multi-factor safety, clean recovery parameters, and zero credential reuse strictly enforced.</p></div>
            <div className="glass-panel p-7 rounded-3xl flex flex-col group" data-reveal data-i="1"><div className="sweep" aria-hidden /><div className="w-12 h-12 rounded-2xl bg-[#5362ad]/15 border border-[#a5a8d4]/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"><svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.25 2.25L15 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div><h3 className="text-base font-bold text-foreground mb-2">Predictable Scalability</h3><p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Whether you require 10 or 5,000 in bulk, our inventory guarantees instant provisioning without throttling.</p></div>
            <div className="glass-panel p-7 rounded-3xl flex flex-col group" data-reveal data-i="2"><div className="sweep" aria-hidden /><div className="w-12 h-12 rounded-2xl bg-[#5362ad]/15 border border-[#a5a8d4]/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"><svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" strokeLinecap="round" strokeLinejoin="round" /></svg></div><h3 className="text-base font-bold text-foreground mb-2">Human Partnership</h3><p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Behind automated provisioning stands a dedicated squad of specialists ensuring uptime.</p></div>
          </div>
        </section>

        {/* Why Trust Us */}
        <section className="py-12 md:py-16 text-center" id="features" data-reveal>
          <div className="max-w-xl mx-auto mb-10 space-y-2"><h2 className="type-title text-2xl sm:text-3xl text-foreground">{featuresTitle}</h2><p className="text-xs sm:text-sm text-muted-foreground">{featuresSubtitle}</p></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {displayFeatures.slice(0, 3).map((f, i) => {
              const Icon = resolveIcon(f.icon)
              return (
                <div key={f.title + i} className="glass-panel p-7 rounded-3xl group" data-reveal data-i={String(i)} data-sweep style={{ "--i": String(i) } as React.CSSProperties}>
                  <div className="sweep" aria-hidden />
                  <div className="w-12 h-12 rounded-2xl bg-[#5362ad]/15 border border-[#a5a8d4]/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"><Icon /></div>
                  <h3 className="text-[15px] font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Team */}
        <section className="py-12 md:py-16" id="team" data-reveal>
          <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="sweep" aria-hidden />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6 text-left">
                <h2 className="type-title text-2xl sm:text-3xl lg:text-4xl text-foreground">{teamTitle}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{teamDescription}</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-muted border border-border"><div className="text-lg font-bold text-foreground mb-1">{teamStat1Value}</div><div className="text-xs text-muted-foreground">{teamStat1Label}</div></div>
                  <div className="p-4 rounded-2xl bg-muted border border-border"><div className="text-lg font-bold text-foreground mb-1">{teamStat2Value}</div><div className="text-xs text-muted-foreground">{teamStat2Label}</div></div>
                </div>
              </div>
              <div className="lg:col-span-6 relative">
                <div className="rounded-2xl overflow-hidden border border-border shadow-2xl group relative"><img alt="AccShop support engineers monitoring email account deliverability" className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition duration-700" src={teamImageUrl} /><div className="absolute inset-0 bg-gradient-to-t from-[#0e1117]/70 via-transparent to-transparent pointer-events-none" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials — 6 cards */}
        <section className="py-16 md:py-20 text-center" id="testimonials" data-reveal>
          <div className="max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="type-title text-2xl sm:text-3xl lg:text-4xl text-foreground">{testimonialsTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{testimonialsSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left items-stretch">
            {displayTestimonials.map((t, i) => (
              <div key={i} className="glass-panel p-7 rounded-3xl flex flex-col justify-between group" data-reveal data-i={String(i % 3)}>
                <div className="sweep" aria-hidden />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 text-[#5362AD]">
                      {Array.from({ length: Math.min(5, Math.max(1, t.stars ?? 5)) }).map((_, s) => (<svg key={s} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>))}
                    </div>
                    {t.tag ? (<span className="text-[11px] font-semibold text-primary bg-muted px-2.5 py-1 rounded-full border border-border">{t.tag}</span>) : null}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">“{t.quote}”</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
                  <div className="w-10 h-10 rounded-full border-2 border-[#5362AD]/50 overflow-hidden shrink-0 bg-[#5362AD]/20 flex items-center justify-center">
                    {t.avatar && /^https?:\/\//i.test(t.avatar) ? (<img alt={t.name} className="w-full h-full object-cover" src={t.avatar} />) : (<span className="text-xs font-bold text-primary">{t.name.slice(0, 2).toUpperCase()}</span>)}
                  </div>
                  <div><h4 className="text-xs font-bold text-foreground">{t.name}</h4><p className="text-[11px] text-muted-foreground">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-10" data-reveal>
            <span className="text-muted-foreground text-xs select-none">‹</span>
            <span className="w-5 h-1.5 rounded-full bg-[#a5a8d4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            <span className="text-muted-foreground text-xs select-none">›</span>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 max-w-3xl mx-auto" id="faq" data-reveal>
          <div className="text-center mb-8"><h2 className="type-title text-2xl sm:text-3xl text-foreground">{faqTitle}</h2></div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: displayFaqs.slice(0, 4).map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: { "@type": "Answer", text: faq.answer },
                })),
              }),
            }}
          />
          <div className="space-y-3">
            {displayFaqs.slice(0, 4).map((faq, idx) => (
              <details key={faq.id} className="glass-panel group" data-reveal data-i={String(idx)}>
                <div className="sweep" aria-hidden />
                <summary><h3 style={{ margin: 0, fontSize: "inherit", fontWeight: 600 }}>{faq.question}</h3><svg className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg></summary>
                <div className="faq-body">{faq.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 md:py-16 text-center" id="contact" data-reveal>
          <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden max-w-5xl mx-auto">
            <div className="sweep" aria-hidden />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#5362ad]/25 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted border border-border"><span className="text-xs font-semibold text-primary">{ctaBadge}</span></div>
              <h2 className="type-display text-3xl sm:text-4xl text-foreground">{ctaTitle}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{ctaSubtitle}</p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link href="/register" className="hero-btn-gradient px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold tracking-wide">Get Started Now</Link>
                <a href={`mailto:${contactSalesEmail}`} className="glass-btn px-6 py-3.5 rounded-full text-xs sm:text-sm font-medium text-foreground">Contact Sales &amp; Custom Orders</a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 mb-8 glass-panel rounded-3xl p-8 sm:p-10" data-reveal>
          <div className="sweep" aria-hidden />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-muted border border-[#5362AD]/20 flex items-center justify-center p-1"><img src="/accshop-logo.svg" alt={`${siteName} logo`} className="w-full h-full object-contain" /></div><h3 className="text-xl font-bold text-foreground tracking-tight">{siteName}</h3></div>
              <p className="text-xs text-muted-foreground leading-relaxed">{footerText}</p>
              <div className="flex items-center gap-3 pt-1">
                <a aria-label="Facebook" className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" href="#"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" /></svg></a>
                <a aria-label="Twitter" className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" href="#"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
                <a aria-label="Instagram" className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" href="#"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
              </div>
            </div>
            <div className="space-y-3"><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social links</h4><ul className="space-y-2 text-xs text-muted-foreground"><li><Link href="/#about" className="hover:text-foreground">About us</Link></li><li><a href="#" className="hover:text-foreground">Twitter</a></li><li><Link href="/#contact" className="hover:text-foreground">Contact</Link></li></ul></div>
            <div className="space-y-3"><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact info</h4><ul className="space-y-2 text-xs text-muted-foreground"><li>{contactPhone}</li><li>{contactSupportEmail}</li><li>{contactSalesEmail}</li></ul></div>
            <div className="glass-panel rounded-2xl p-3 flex flex-col items-center justify-center text-center" style={{ padding: "12px" }}><div className="sweep" aria-hidden /><div className="rounded-xl overflow-hidden mb-2.5 w-full h-24"><img alt="AccShop Support Team" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=500&q=80" /></div><span className="text-[11px] font-medium text-muted-foreground">We&apos;re here with our support team</span></div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center"><div className="text-xs text-muted-foreground">© 2026 {siteName}. All rights reserved.</div><div className="mt-2"><a href="https://veilinsec.netlify.app" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-4 hover:text-foreground">Develop by VIS Softs</a></div></div>
        </footer>
      </div>
    </div>
  )
}
