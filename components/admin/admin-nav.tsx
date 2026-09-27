"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { motion } from "motion/react"
import useSWR from "swr"

import { adminLogout, getProcessingOrdersCount, getSupportUnreadCount } from "@/app/actions/admin"
import { getPendingDepositsCount } from "@/app/actions/deposits"
import { Button } from "@/components/ui/button"
import { springSnappy } from "@/components/reveal"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/payment-methods", label: "Payment Methods" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/settings", label: "Settings" },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: attention } = useSWR("admin-orders-attention", getProcessingOrdersCount, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const processingCount = attention?.count ?? 0
  const { data: supportUnread } = useSWR("admin-support-unread", getSupportUnreadCount, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const supportCount = supportUnread?.unread ?? 0
  const { data: pendingDeposits } = useSWR("admin-deposits-pending", getPendingDepositsCount, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const depositsCount = pendingDeposits?.count ?? 0

  async function handleLogout() {
    await adminLogout()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            pathname === link.href
              ? "text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200",
          )}
        >
          {pathname === link.href && (
            <motion.span
              layoutId="admin-nav-pill"
              transition={springSnappy}
              className="absolute inset-0 rounded-full bg-white"
            />
          )}
          <span className="relative z-10">{link.label}</span>
          {link.href === "/admin/deposits" && depositsCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#5362AD] px-1 text-[10px] font-bold leading-5 text-white shadow-[0_0_10px_rgba(83,98,173,0.7)]">
              {depositsCount > 99 ? "99+" : depositsCount}
            </span>
          )}
          {link.href === "/admin/orders" && processingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]">
              {processingCount > 99 ? "99+" : processingCount}
            </span>
          )}
          {link.href === "/admin/support" && supportCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]">
              {supportCount > 99 ? "99+" : supportCount}
            </span>
          )}
        </Link>
      ))}
      <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2 gap-1.5 rounded-full text-zinc-500 hover:bg-white/10 hover:text-white">
        <LogOut className="size-4" />
        Log out
      </Button>
    </nav>
  )
}
