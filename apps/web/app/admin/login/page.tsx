import { redirect } from "next/navigation"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { AdminLoginForm } from "@/components/admin/admin-login-form"

export default async function AdminLoginPage() {
  const authed = await isAdminAuthenticated()
  if (authed) redirect("/admin")

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#0f0f12] px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5362AD]/[0.10] blur-[80px]" />
      </div>
      <div className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/[0.07] bg-zinc-900 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-[#5362AD] text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)]">
          <span className="text-sm font-bold">A</span>
        </div>
        <h1 className="mt-4 text-center text-lg font-semibold tracking-tight text-white">Admin Access</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Enter the administrator password to continue.
        </p>
        <AdminLoginForm />
      </div>
    </main>
  )
}
