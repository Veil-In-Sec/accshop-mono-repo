"use client"

import { DollarSign, PackageCheck, Users, Clock, Calendar, CalendarDays, TrendingUp, Wallet } from "lucide-react"
import useSWR from "swr"

import { getAdminOverview } from "@/app/actions/admin"
import { ClientTimeNow } from "@/components/client-date"
import { RecentActivity } from "@/components/admin/recent-activity"
import { RevenueChart } from "@/components/admin/revenue-chart"
import { Reveal, Stagger, StaggerItem } from "@/components/reveal"

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
  sub?: string
}) {
  return (
    <div
      className={
        accent
          ? "relative overflow-hidden rounded-[20px] border border-[#5362AD]/30 bg-gradient-to-b from-[#5362AD]/15 to-zinc-900 p-[1px]"
          : "rounded-[20px] border border-white/[0.06] bg-zinc-900 p-5"
      }
    >
      <div className={accent ? "rounded-[19px] bg-zinc-900 p-5 flex items-center gap-4" : "flex items-center gap-4"}>
        <div
          className={
            accent
              ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#5362AD] text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)]"
              : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 ring-1 ring-white/10"
          }
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading, mutate } = useSWR("admin-overview", getAdminOverview, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  })

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="type-title text-2xl text-white">Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">Loading live store performance…</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-[20px] border border-white/5 bg-zinc-900/60" />
          ))}
        </div>
      </div>
    )
  }

  const totalSales = stats.totalSales ?? stats.totalCustomerAmount ?? 0
  const salesToday = stats.salesToday ?? 0
  const salesWeek = stats.salesWeek ?? 0
  const salesMonth = stats.salesMonth ?? 0
  const salesYear = stats.salesYear ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="type-title text-2xl text-white">Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">Realtime total sales from customer orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
          <button
            onClick={() => mutate()}
            className="pressable rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
        <StaggerItem><StatCard icon={Users} label="Total users" value={stats.userCount.toLocaleString()} /></StaggerItem>
        <StaggerItem><StatCard icon={PackageCheck} label="Total orders" value={stats.orderCount.toLocaleString()} /></StaggerItem>
        <StaggerItem><StatCard icon={DollarSign} label="Total sales" accent value={`BDT ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></StaggerItem>
      </Stagger>

      {/* Sales by period — day / week / month / year (realtime, total order amount) */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-white mb-3">Sales breakdown</h2>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
          <StaggerItem><StatCard icon={Clock} label="Today sales" value={`BDT ${salesToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></StaggerItem>
          <StaggerItem><StatCard icon={Calendar} label="This week sales" value={`BDT ${salesWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></StaggerItem>
          <StaggerItem><StatCard icon={CalendarDays} label="This month sales" value={`BDT ${salesMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></StaggerItem>
          <StaggerItem><StatCard icon={TrendingUp} label="This year sales" accent value={`BDT ${salesYear.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /></StaggerItem>
        </Stagger>
        <p className="mt-2 text-xs text-zinc-500">Sales = customer order (price × quantity) • completed orders • auto-updates every 5s</p>
      </div>

      {/* Supplier balances — live wallets behind instant fulfillment */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-white mb-3">Supplier balances</h2>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.06}>
          <StaggerItem><StatCard
            icon={Wallet}
            label="Hotmail143 balance"
            value={
              stats.presentHotmailBalance !== null && stats.presentHotmailBalance !== undefined
                ? `BDT ${stats.presentHotmailBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "—"
            }
          /></StaggerItem>
          <StaggerItem><StatCard
            icon={Wallet}
            label="BulkMail balance"
            accent
            value={
              stats.presentBulkmailBalance !== null && stats.presentBulkmailBalance !== undefined
                ? `${stats.bulkmailCurrency ?? "BDT"} ${stats.presentBulkmailBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "—"
            }
            sub={
              stats.presentBulkmailBalanceUsd !== null && stats.presentBulkmailBalanceUsd !== undefined
                ? `≈ $${stats.presentBulkmailBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${stats.bulkmailRateSource === "live" ? "live rate" : stats.bulkmailRateSource === "flat" ? "flat rate" : "manual rate"}`
                : undefined
            }
          /></StaggerItem>
        </Stagger>
      </div>

      <Reveal>
        <RevenueChart data={stats.revenueByDay} />
      </Reveal>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
        Auto-refreshing every 5s • Last sync: <ClientTimeNow /> • Sales = Σ(price×qty)
      </div>

      <Reveal>
        <RecentActivity />
      </Reveal>
    </div>
  )
}
