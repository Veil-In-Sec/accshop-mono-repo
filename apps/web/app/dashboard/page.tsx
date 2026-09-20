"use client"

import * as React from "react"
import useSWR from "swr"
import Link from "next/link"
import { motion } from "motion/react"

import { listPublicCategories } from "@/app/actions/admin"
import { getCatalogProducts } from "@/app/actions/wallet"
import { Reveal, Stagger, StaggerItem, springSnappy } from "@/components/reveal"
import { StatusBadge } from "@/components/status-badge"
import { formatMoney } from "@/lib/format"
import { useAuth } from "@/lib/use-auth"

export default function DashboardOverviewPage() {
  const { user, orders, error: walletError, refresh } = useAuth()
  const { data: categories, error: categoriesError, mutate: mutateCategories } = useSWR("public-categories", listPublicCategories)
  const { data: products, error: productsError, isLoading: productsLoading, mutate: mutateProducts } = useSWR("catalog-products", getCatalogProducts)

  const [activeCategory, setActiveCategory] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) setActiveCategory(categories[0])
  }, [categories, activeCategory])

  const filteredProducts = React.useMemo(() => {
    let list = (products ?? []).filter((p) => !activeCategory || p.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    }
    return list.slice(0, 8)
  }, [products, activeCategory, search])

  const displayName = user?.name || user?.email?.split("@")[0] || "User"
  const firstName = displayName.split(" ")[0]

  return (
    <div className="flex flex-col w-full space-y-8">
      {/* Top Welcome & Financial Status Banner */}
      <Reveal>
      <section className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl p-6 lg:p-8 shadow-xl border border-border">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[#5362AD]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#364389]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
              <span className="text-foreground">Welcome back, </span>
              <span className="text-primary dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-[#b9c3ff] dark:via-[#c0c3f1] dark:to-[#bac3ff]">{firstName}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Browse categories or manage your active orders — instant automated provisioning, guaranteed credentials, and real-time OTP sync.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-6 pt-6 bg-muted/30 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-24 py-3 bg-background text-foreground placeholder:text-muted-foreground text-sm rounded-full outline-none focus:bg-muted transition-colors border border-border"
              placeholder="Search accounts, warm domains, tags, or order ID #..."
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 bg-card px-2 py-0.5 rounded text-[11px] text-muted-foreground">
              <span>Ctrl</span>
              <span>+</span>
              <span>K</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-background hover:bg-muted rounded-full text-xs text-foreground border border-border">↕ Sort: Stock Desc</button>
            <button onClick={() => { void refresh(); void mutateProducts(); void mutateCategories() }} className="flex items-center justify-center w-11 h-11 bg-background hover:bg-muted rounded-full text-foreground border border-border" aria-label="Refresh catalog">
              ↻
            </button>
          </div>
        </div>
      </section>
      </Reveal>

      {(walletError || categoriesError || productsError) && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-200" role="alert">
          Could not load some dashboard data —{" "}
          <button
            type="button"
            className="underline"
            onClick={() => { void refresh(); void mutateProducts(); void mutateCategories() }}
          >
            retry
          </button>
        </p>
      )}

      {/* Category Filter Pills — real data */}
      <Reveal delay={0.05}>
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#5362AD]" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Inventory Catalog</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory(categories?.[0] ?? null)}
            className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs whitespace-nowrap font-semibold ${!activeCategory || activeCategory === categories?.[0] ? "text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {(!activeCategory || activeCategory === categories?.[0]) && (
              <motion.span layoutId="portal-category-pill" transition={springSnappy} className="absolute inset-0 rounded-full bg-[#5362AD] shadow-sm" />
            )}
            <span className="relative z-10">All Categories</span>
          </button>
          {(categories ?? []).slice(0, 6).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`relative px-5 py-2 rounded-full text-xs whitespace-nowrap font-medium transition-colors ${activeCategory === cat ? "text-white font-semibold" : "bg-card hover:bg-muted text-muted-foreground"}`}
            >
              {activeCategory === cat && (
                <motion.span layoutId="portal-category-pill" transition={springSnappy} className="absolute inset-0 rounded-full bg-[#5362AD]" />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Product Inventory Cards — real products.
          Uses mount animation (not scroll-triggered) so cards async-loaded
          via SWR always become visible even if the grid was already in view. */}
      <motion.div
        key={activeCategory ?? "all"}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
      >
        {productsLoading && !products ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col justify-between bg-card/70 rounded-2xl p-6 border border-border animate-pulse">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="h-6 w-20 rounded-full bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
                <div className="h-6 w-3/4 rounded bg-muted mb-2" />
                <div className="h-4 w-1/3 rounded bg-muted mb-6" />
                <div className="h-12 w-full rounded bg-muted mb-6" />
              </div>
              <div className="h-11 w-full rounded-full bg-muted" />
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border bg-card/60 p-12 text-center">
            <p className="text-sm text-muted-foreground">No products found{search ? ` for "${search}"` : activeCategory ? ` in ${activeCategory}` : ""}.</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-3 text-xs text-primary hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((p) => (
            <StaggerItem key={p.id} className="flex flex-col justify-between bg-card/70 hover:bg-card backdrop-blur-md rounded-2xl p-6 transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 shadow-md group border border-border">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#5362AD] text-white">
                    {p.category.slice(0, 12)}
                  </span>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.stock > 0 ? "bg-[#5362AD]" : "bg-zinc-600"}`} />
                    {p.stock.toLocaleString()} in stock
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.name}</h3>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <div className="text-lg font-bold text-primary">{formatMoney(p.price)}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-6">
                  {p.badge || "Verified account with instant delivery and warranty."}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground">Instant Delivery</span>
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground">{p.category}</span>
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground">Clean IP</span>
                </div>
              </div>
              {p.stock > 0 ? (
                <Link
                  href={`/dashboard/pay?productId=${p.id}&name=${encodeURIComponent(p.name)}&price=${p.price}&slug=${p.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-[#5362AD] to-[#364389] hover:from-[#4a59a3] hover:to-[#2d365f] text-white font-bold text-xs tracking-wide shadow-md group-hover:shadow-lg"
                >
                  Buy Now <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              ) : (
                <button disabled className="w-full py-3 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                  Out of Stock
                </button>
              )}
            </StaggerItem>
          ))
        )}
      </motion.div>

      {/* Account Workspace & Tools */}
      <Reveal>
      <section className="flex flex-col space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#bac3ff]" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Account Workspace &amp; Tools</h2>
          </div>
        </div>
        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-5" stagger={0.06}>
          {[
            {
              title: "Orders",
              desc: `Track ${orders.length} purchased accounts, download credential files and inspect warranty counters.`,
              href: "/dashboard/orders",
              badge: `${orders.length} Delivered`,
              icon: "🛒",
            },
            {
              title: "Transactions",
              desc: "Review top-ups, debit slips, bKash / Nagad deposits and invoice history.",
              href: "/dashboard/transactions",
              badge: "Instant Gateway",
              icon: "⇄",
            },
            {
              title: "Get Code",
              desc: "Fetch real-time 2FA, SMS-forwarded tokens and verification codes without delay.",
              href: "/dashboard/gmail-codes",
              badge: "Real-time OTP API",
              icon: "🔑",
            },
          ].map((card) => (
            <StaggerItem key={card.title} className="h-full">
            <Link href={card.href} className="relative group p-6 rounded-2xl bg-card/80 hover:bg-card transition-[transform,background-color,border-color] shadow-md flex flex-col justify-between overflow-hidden border border-border hover:border-border h-full">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#5362AD]/10 group-hover:bg-[#5362AD]/20 blur-xl transition-colors" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#5362AD]/30 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    {card.icon}
                  </div>
                  <span className="text-xs text-primary bg-[#5362AD]/20 px-3 py-1 rounded-full font-semibold">{card.badge}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary mb-2">{card.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">{card.desc}</p>
              </div>
              <div className="flex items-center text-xs font-bold text-primary gap-1 group-hover:gap-2 transition-[gap] duration-200">
                <span>{card.title === "Orders" ? "Open Order Records" : card.title === "Transactions" ? "Inspect Payment Ledgers" : "Fetch Verification Codes"}</span>
                <span>→</span>
              </div>
            </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
      </Reveal>

      {/* Recent Orders */}
      <Reveal>
      <section className="grid grid-cols-1 gap-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-md flex flex-col justify-between border border-border">
          <div>
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Recent Dispatched Orders</h3>
                <p className="text-xs text-muted-foreground">Instant download credentials available for 30 days</p>
              </div>
              <Link href="/dashboard/orders" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View All Orders ›
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="thead-material w-full text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground uppercase text-[10px]">
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Total Cost</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No orders yet. <Link href="#inventory" className="text-primary hover:underline">Browse products</Link>
                      </td>
                    </tr>
                  ) : (
                    orders.slice(0, 3).map((o: any) => (
                      <tr key={o.id} className="hover:bg-muted/50">
                        <td className="py-3.5 px-3 font-mono font-medium text-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3.5 px-3 font-semibold text-foreground">{o.productName}</td>
                        <td className="py-3.5 px-3 font-semibold text-foreground">{formatMoney(o.price)}</td>
                        <td className="py-3.5 px-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <Link href={`/dashboard/orders`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted hover:bg-[#5362AD] text-foreground hover:text-white text-[11px] font-semibold">
                            .TXT
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      </Reveal>
    </div>
  )
}
