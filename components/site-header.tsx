"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { useAuth } from "@/lib/use-auth"
import "@/components/landing/landing.css"

const navItems = [
  { label: "Home", href: "/#home", id: "home" },
  { label: "About Us", href: "/#about", id: "about" },
  { label: "Values", href: "/#values", id: "values" },
  { label: "Why Trust Us", href: "/#features", id: "features" },
  { label: "Our Team", href: "/#team", id: "team" },
  { label: "Reviews", href: "/#testimonials", id: "testimonials" },
  { label: "FAQ", href: "/#faq", id: "faq" },
]

export function SiteHeader({
  variant = "overlay",
  siteName = "AccShop",
}: {
  variant?: "overlay" | "solid"
  siteName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  async function handleLogout() {
    await logout()
    router.push("/")
  }

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || ""
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : ""

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // if already on home, smooth scroll; otherwise navigate to /#id
    if (pathname === "/") {
      e.preventDefault()
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      // also push hash
      history.pushState(null, "", `/#${id}`)
    }
  }

  return (
    <header className={`sticky top-4 z-30 px-4 transition-all ${scrolled ? "opacity-100" : "opacity-100"}`}>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent pointer-events-none" aria-hidden />
        <Link href="/#home" onClick={(e) => handleAnchor(e, "home")} className="flex items-center gap-2">
          <img src="/accshop-logo.svg" alt={`${siteName} logo`} className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-foreground" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
            {siteName}
          </span>
        </Link>

        <nav className="hidden xl:flex items-center px-2 py-1.5 rounded-full glass-panel border border-border text-sm font-medium text-muted-foreground shadow-lg" style={{ padding: "6px 8px", borderRadius: 999 }}>
          {navItems.map((item) => {
            const isActive = pathname === "/" && item.id === "home" ? true : false
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleAnchor(e, item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all ${isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex items-center px-4 py-2 rounded-full glass-btn text-xs font-semibold text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <details className="relative">
                <summary
                  style={{
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "6px 10px 6px 6px",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: "linear-gradient(135deg,#5362AD 0%,#6b7ac8 60%,#a5a8d4 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    {initials}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline text-foreground">{displayName}</span>
                </summary>
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 10px)",
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 8,
                    minWidth: 180,
                    zIndex: 50,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--popover-foreground)" }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{user.email}</div>
                  </div>
                  <Link href="/dashboard" style={{ display: "block", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--popover-foreground)" }}>
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "#fda4af", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    Log out
                  </button>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground px-3">
                Login
              </Link>
              <Link href="/register" className="inline-flex items-center px-5 py-2 rounded-full glass-btn text-xs font-semibold text-muted-foreground hover:text-foreground">
                Get Started Now
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
