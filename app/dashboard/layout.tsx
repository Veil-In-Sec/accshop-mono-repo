"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { motion } from "motion/react"

import { Logo } from "@/components/logo"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"
import { SupportChat } from "@/components/dashboard/support-chat"
import { springSnappy } from "@/components/reveal"
import { useAuth } from "@/lib/use-auth"

const navItems = [
  { label: "Dashboard", href: "/dashboard", id: "dashboard" },
  { label: "Deposit", href: "/dashboard/deposit", id: "deposit" },
  { label: "Orders", href: "/dashboard/orders", id: "orders" },
  { label: "Transactions", href: "/dashboard/transactions", id: "transactions" },
  { label: "Get Code", href: "/dashboard/gmail-codes", id: "get-code" },
  { label: "2FA Codes", href: "/dashboard/2fa", id: "2fa" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, balance, isLoading, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-pulse rounded-full bg-muted" />
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
            Loading your account…
          </p>
        </div>
      </div>
    )
  }

  const displayName = user.name || user.email.split("@")[0]
  const firstName = displayName.split(" ")[0] || displayName
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    await logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col antialiased selection:bg-[#5362AD]/30 selection:text-white dark:selection:text-white" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[70rem] h-[32rem] bg-[#5362AD]/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[#364389]/15 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,125,180,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,125,180,0.07)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
      </div>

      {/* Header — floating material chrome, gains weight on scroll */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className={`material-chrome ${scrolled ? "material-chrome--scrolled scroll-edge-b" : ""} transition-shadow`}>
          <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 lg:gap-10">
            <Link href="/dashboard" className="flex items-center gap-2 pressable rounded-xl" aria-label="AccShop dashboard">
              <Logo textClassName="text-foreground" />
            </Link>
            <nav className="hidden xl:flex items-center gap-1 p-1 bg-muted rounded-full" aria-label="Account">
              {navItems.map((item) => {
                const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative px-4 py-2 rounded-full text-xs transition-colors duration-200 ${isActive ? "text-white font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="portal-nav-pill"
                        transition={springSnappy}
                        className="absolute inset-0 rounded-full bg-[#5362AD] shadow-[0_0_16px_rgba(83,98,173,0.25)]"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <Link
              href="/dashboard/deposit"
              className="hidden sm:flex items-center gap-2 rounded-full bg-[#5362AD]/15 px-3.5 py-2 text-xs font-semibold text-primary ring-1 ring-[#5362AD]/25 hover:bg-[#5362AD]/25 transition-colors"
            >
              <span className="tabular-nums">BDT {balance.toFixed(2)}</span>
              <span className="rounded-full bg-[#5362AD] px-2.5 py-0.5 text-[11px] font-bold text-white">
                + Deposit
              </span>
            </Link>
            <div className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-full bg-muted">
              <div className="hidden md:flex flex-col text-right pl-2">
                <span className="text-xs font-semibold text-foreground tracking-tight max-w-[130px] truncate">{user.email}</span>
                <span className="text-[10px] font-medium text-muted-foreground">Verified Buyer</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#5362AD] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#5362AD]/40">
                {initials}
              </div>
              <details className="relative">
                <summary className="flex items-center justify-center text-muted-foreground hover:text-foreground pr-1 cursor-pointer list-none">
                  <span className="text-lg">▾</span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+12px)] w-48 rounded-2xl border border-border bg-popover p-2 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-border mb-2">
                    <div className="text-xs font-semibold text-popover-foreground truncate">{user.email}</div>
                  </div>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-300 hover:bg-red-500/10">
                    Log out
                  </button>
                </div>
              </details>
            </div>
          </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full pt-20 flex-1">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
          <nav className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 xl:hidden">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs transition-colors ${
                    isActive
                      ? "bg-[#5362AD] font-semibold text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          {children}</div>
      </main>

      <footer className="relative z-10 w-full bg-muted/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs text-muted-foreground">© 2024 AccShop Global Marketplace. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      <SupportChat />
    </div>
  )
}
