"use client"

import { Eye, EyeOff, Lock, Mail, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { authClient } from "@/lib/auth-client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [remember, setRemember] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const { error: signInError } = await authClient.signIn.email({
      email: email.trim(),
      password,
      rememberMe: remember,
    })
    if (!signInError) {
      // Use window.location for hard navigation so the new session cookie is sent
      window.location.href = "/dashboard"
    } else {
      setError("Invalid email or password.")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background relative flex flex-col overflow-x-hidden selection:bg-[#5362AD]/30 selection:text-white">
      <SiteHeader variant="solid" />

      {/* Ambient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[550px] w-[700px] -translate-x-1/2 rounded-full bg-[#5362AD]/20 blur-[150px]" />
        <div className="absolute left-[-128px] top-[35%] h-[550px] w-[550px] rounded-full bg-[#5c69b1]/15 blur-[160px]" />
        <div className="absolute bottom-[-100px] right-[-80px] h-[500px] w-[500px] rounded-full bg-[#3f37c9]/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6 py-10 md:py-14">
        <div className="w-full max-w-[480px]">
          <div className="relative flex flex-col gap-6 rounded-[28px] border border-border bg-card/80 p-7 sm:p-9 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(83,98,173,0.18)] backdrop-blur-[20px]">
            {/* header */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#5362AD]/25 bg-muted px-4 py-2.5 shadow-[0_8px_24px_rgba(83,98,173,0.18)] backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5362AD]/20 bg-[#5362AD]/15 p-2 shadow-inner">
                  <img src="/accshop-logo.svg" alt="AccShop logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-foreground">AccShop</span>
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-foreground leading-tight" style={{ fontFamily: "var(--font-sans), 'Outfit', sans-serif" }}>
                Welcome Back
              </h1>
              <p className="mt-1.5 max-w-xs text-xs sm:text-sm leading-relaxed text-muted-foreground">Access your verified accounts &amp; instant delivery dashboard</p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && (
                <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-200">
                  <TriangleAlert />
                  <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
                  <AlertDescription className="text-red-600/80 dark:text-red-200/80">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5 text-left">
                <label htmlFor="email-input" className="ml-1 block text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <InputGroup className="h-12 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                  <InputGroupAddon className="text-muted-foreground">
                    <Mail className="size-[19px]" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email-input"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                  />
                </InputGroup>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="mx-1 flex items-center justify-between">
                  <label htmlFor="password-input" className="block text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <Link href="#" className="text-[11px] font-medium text-primary hover:text-foreground">
                    Forgot password?
                  </Link>
                </div>
                <InputGroup className="h-12 rounded-xl border-border bg-muted focus-within:border-primary/50 focus-within:bg-muted">
                  <InputGroupAddon className="text-muted-foreground">
                    <Lock className="size-[19px]" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your secret key"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-[19px]" /> : <Eye className="size-[19px]" />}
                  </button>
                </InputGroup>
              </div>

              <div className="flex items-center justify-between px-1 pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    className="size-4 rounded border-border bg-muted data-[state=checked]:border-[#5362AD] data-[state=checked]:bg-[#5362AD]"
                  />
                  <span className="text-xs text-muted-foreground">Keep me signed in for 30 days</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5362AD] text-xs sm:text-sm font-bold text-white shadow-[0_4px_24px_rgba(83,98,173,0.4)] hover:bg-[#4351a0] border-0 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard <span className="text-sm">→</span>
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link href="/register" className="ml-1 font-semibold text-primary underline-offset-4 hover:text-foreground hover:underline">
                Create an account
              </Link>
            </div>

          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full border-t border-border bg-card/80 py-6 backdrop-blur-[20px]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 text-center sm:flex-row sm:text-left">
          <div className="text-xs text-muted-foreground">
            © 2026 <span className="font-medium text-foreground">AccShop</span> — All Rights Reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
