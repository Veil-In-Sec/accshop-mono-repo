import { redirect } from "next/navigation"
import Link from "next/link"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { Logo } from "@/components/logo"

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdminAuthenticated()
  if (!authed) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-background relative flex flex-col antialiased" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[70rem] h-[32rem] bg-[#5362AD]/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[#364389]/15 rounded-full blur-[160px]" />
      </div>
      <header className="sticky top-4 z-30 px-4">
        <div className="material-chrome relative mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2 pressable rounded-xl" aria-label="AccShop admin">
            <Logo textClassName="text-foreground" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              <span className="font-normal text-muted-foreground">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="relative z-10 w-full flex-1 pt-6">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 py-8">{children}</div>
      </main>
    </div>
  )
}
