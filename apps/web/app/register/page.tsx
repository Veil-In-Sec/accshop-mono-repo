"use client"

import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { initializeAccount } from "@/app/actions/wallet"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { authClient } from "@/lib/auth-client"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [agreed, setAgreed] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const strength = React.useMemo(() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])
  const strengthLabels = ["Minimum 8 characters", "Weak strength", "Fair security", "Strong password", "Enterprise grade"]
  const strengthLabel = strengthLabels[strength]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!agreed) { toast.error("Please agree to the Terms of Service and Privacy Policy."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    setIsSubmitting(true)
    const { error: signUpError } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() || email.trim().split("@")[0] })
    if (signUpError) { setError(signUpError.message ?? "Could not create your account."); setIsSubmitting(false); return }
    try {
      await initializeAccount()
    } catch (error) {
      // Wallet init failure must not leave a silent zero-balance mystery.
      setError(error instanceof Error ? error.message : "Account created, but wallet setup failed. Please sign in again.")
      setIsSubmitting(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background relative flex flex-col overflow-x-hidden selection:bg-[#5362AD]/30 selection:text-white">
      <SiteHeader variant="solid" />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[#5362AD]/18 blur-[150px]" />
        <div className="absolute left-[-128px] top-[35%] h-[550px] w-[550px] rounded-full bg-[#5c69b1]/14 blur-[160px]" />
        <div className="absolute bottom-[5%] right-[-96px] h-[550px] w-[650px] rounded-full bg-[#3f37c9]/15 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:28px_28px] opacity-60" />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-[500px] rounded-[28px] border border-border bg-card/80 p-7 sm:p-9 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75),0_0_50px_-10px_rgba(83,98,173,0.22)] backdrop-blur-[28px] relative">
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#5362AD]/60 to-transparent" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#5362AD]/25 bg-muted px-4 py-2.5 shadow-[0_8px_24px_rgba(83,98,173,0.18)] backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5362AD]/20 bg-[#5362AD]/15 p-2 shadow-inner">
                <img src="/accshop-logo.svg" alt="AccShop logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-foreground">AccShop</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
              Create Account
            </h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-200">
                <AlertTitle>Couldn&apos;t create your account</AlertTitle>
                <AlertDescription className="text-red-200/80">{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="reg-fullname" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground">
                Work Identity / Full Name
              </label>
              <InputGroup className="h-11 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                <InputGroupAddon className="text-muted-foreground">
                  <User className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="reg-fullname"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                />
              </InputGroup>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground">
                Work Email Address
              </label>
              <InputGroup className="h-11 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                <InputGroupAddon className="text-muted-foreground">
                  <Mail className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="reg-email"
                  type="email"
                  placeholder="alex@enterprise-cloud.io"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                />
              </InputGroup>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="reg-password" className="block text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  Set Master Password
                </label>
                <span className="text-[11px] text-muted-foreground">{strengthLabel}</span>
              </div>
              <InputGroup className="h-11 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                <InputGroupAddon className="text-muted-foreground">
                  <Lock className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create robust passphrase"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 p-1 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </InputGroup>
              <div className="mt-2 grid grid-cols-4 gap-1.5 px-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-colors ${i < strength ? (strength === 1 ? "bg-red-400" : strength === 2 ? "bg-amber-400" : "bg-[#5362AD]") : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground">
                Confirm Passphrase
              </label>
              <InputGroup className="h-11 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                <InputGroupAddon className="text-muted-foreground">
                  <ShieldCheck className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 p-1 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </InputGroup>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-muted-foreground cursor-pointer">
              <Checkbox
                id="reg-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5 size-4 rounded border-border bg-muted data-[state=checked]:border-[#5362AD] data-[state=checked]:bg-[#5362AD]"
                required
              />
              <span>
                I agree to the <Link href="#" className="font-medium text-primary hover:underline">Terms of Service</Link>,{" "}
                <Link href="#" className="font-medium text-primary hover:underline">Privacy Policy</Link>, and verify legitimate business application.
              </span>
            </label>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5362AD] py-3.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-[0_4px_25px_rgba(83,98,173,0.35)] hover:bg-[#5e6ec0] border-0 disabled:opacity-70"
            >
              <span>{isSubmitting ? "Creating account..." : "Complete Registration"}</span>
              {!isSubmitting && <span>→</span>}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Already possess an AccShop account?{" "}
              <Link href="/login" className="ml-1 font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground">
                Log In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex max-w-md items-center justify-center gap-3 text-center opacity-75">
          <div className="flex -space-x-2">
            <div className="flex size-6 items-center justify-center rounded-full bg-[#5362AD]/40 text-[9px] font-bold text-white ring-2 ring-background">AR</div>
            <div className="flex size-6 items-center justify-center rounded-full bg-[#6b7bd4]/50 text-[9px] font-bold text-white ring-2 ring-background">SK</div>
            <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-2 ring-background">ML</div>
          </div>
          <p className="text-left text-[11px] leading-snug text-muted-foreground">Trusted by lead-generation specialists, growth engineers, and digital marketing leaders globally.</p>
        </div>
      </div>

      <footer className="relative z-10 w-full border-t border-border bg-background/80 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 text-center md:flex-row md:text-left">
          <div className="text-xs text-muted-foreground">© 2026 AccShop — All Rights Reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
