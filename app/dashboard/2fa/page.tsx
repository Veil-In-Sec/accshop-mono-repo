"use client"

import { Copy, ScanLine, ShieldCheck, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  deleteTotpKey,
  listTotpKeys,
  previewTotpCode,
} from "@/app/actions/totp"
import { TotpQrScanner } from "@/components/dashboard/totp-qr-scanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TotpPreviewResult } from "@/lib/api/endpoints"
import { copyToClipboard } from "@/lib/clipboard"

/** Display grouping: 6 → "123 456", 8 → "1234 5678". Copy uses raw digits. */
function formatCode(code: string): string {
  const digits = code.replace(/\D/g, "")
  if (digits.length <= 4) return digits
  if (digits.length % 2 === 0) {
    const half = digits.length / 2
    return `${digits.slice(0, half)} ${digits.slice(half)}`
  }
  return `${digits.slice(0, 3)} ${digits.slice(3)}`
}

async function copyText(value: string) {
  return copyToClipboard(value)
}

type Session = {
  secret: string
}

/**
 * One-time 2FA tool — fully stateless.
 * Paste a secret → live code with countdown → when the timer ends everything
 * vanishes from memory and the input invites the next one.
 * NOTHING is ever saved: no vault rows, no persistence.
 */
export default function TotpPage() {
  const [session, setSession] = React.useState<Session | null>(null)
  const [live, setLive] = React.useState<TotpPreviewResult | null>(null)
  const [fetchedAt, setFetchedAt] = React.useState(0)
  const [now, setNow] = React.useState(() => Date.now())
  const [loaded, setLoaded] = React.useState(false)

  const [showScanner, setShowScanner] = React.useState(false)
  const [secret, setSecret] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiringRef = React.useRef(false)
  const sessionRef = React.useRef<Session | null>(null)
  sessionRef.current = session

  const clearAll = React.useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    setSession(null)
    setLive(null)
    resetForm()
  }, [])

  // One-time cleanup: drop any keys saved by the old version — this tool stores nothing.
  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const olds = await listTotpKeys()
        if (olds.length > 0) {
          await Promise.all(olds.map((k) => deleteTotpKey(k.id)))
          if (!cancelled) toast.info(`Cleared ${olds.length} old saved key${olds.length === 1 ? "" : "s"} — codes are never stored now.`)
        }
      } catch {
        /* best effort — tool works stateless regardless */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      cancelled = true
      clearInterval(ticker)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [])

  async function refreshPreview(active: Session) {
    const res = await previewTotpCode({
      secret: active.secret,
    })
    // Session may have been cleared while the request was in flight.
    if (sessionRef.current === null) return
    if (!res.ok) {
      toast.error(res.message)
      clearAll()
      return
    }
    setLive(res.data)
    setFetchedAt(Date.now())
    scheduleRefresh(res.data.secondsRemaining)
  }

  function scheduleRefresh(secondsRemaining: number) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    // Re-preview just after the rollover (+0.8s buffer for clock skew).
    refreshTimer.current = setTimeout(
      () => {
        const active = sessionRef.current
        if (active) void refreshPreview(active)
      },
      Math.max(1000, secondsRemaining * 1000 + 800),
    )
  }

  const remaining = React.useMemo(() => {
    if (!live) return null
    const elapsed = Math.floor((now - fetchedAt) / 1000)
    return Math.max(0, live.secondsRemaining - elapsed)
  }, [live, now, fetchedAt])

  // Timer ended → everything vanishes: secret wiped from memory, invite the next one.
  React.useEffect(() => {
    if (!loaded || !session || remaining === null || remaining > 0 || expiringRef.current) return
    expiringRef.current = true
    clearAll()
    expiringRef.current = false
    toast.info("Code expired and cleared — nothing was saved. Add another one when ready.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, session, remaining])

  async function handleCopy(code: string) {
    const ok = await copyText(code.replace(/\D/g, ""))
    if (ok) toast.success("Code copied — paste it before it expires.")
    else toast.error("Could not copy. Long-press the code to copy manually.")
  }

  function handleScanned(text: string) {
    setShowScanner(false)
    const trimmed = text.trim()
    if (!trimmed) return
    setSecret(trimmed)
    setFormError(null)
    toast.success("QR decoded — tap Add to get your code.")
  }

  function resetForm() {
    setSecret("")
    setFormError(null)
  }

  async function handleSave() {
    setFormError(null)
    if (!secret.trim()) {
      setFormError("Paste your secret key or scan a setup QR code first.")
      return
    }
    setSaving(true)
    const active: Session = {
      secret: secret.trim(),
    }
    const res = await previewTotpCode({
      secret: active.secret,
    })
    setSaving(false)
    if (!res.ok) {
      setFormError(res.message)
      return
    }
    toast.success(`Code ready — ${res.data.code}. Nothing is saved; it vanishes when the timer ends.`)
    resetForm()
    setSession(active)
    setLive(res.data)
    setFetchedAt(Date.now())
    scheduleRefresh(res.data.secondsRemaining)
  }

  function handleDiscard() {
    clearAll()
    toast.success("Cleared — nothing was saved. Add another code when ready.")
  }

  const urgent = remaining !== null && remaining <= 5
  const pct =
    live && remaining !== null
      ? Math.max(0, Math.min(100, (remaining / live.period) * 100))
      : 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="type-title flex items-center gap-2 text-xl text-foreground">
          <ShieldCheck className="size-5 text-primary" />
          2FA Authenticator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time codes — paste a secret, get the live code. Nothing is ever saved; it all vanishes when the timer ends.
        </p>
      </div>

      {!loaded && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {loaded && !session && (
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div>
            <label htmlFor="totp-secret" className="text-xs font-medium text-muted-foreground">Secret key <span className="text-muted-foreground">(Base32, or full otpauth:// URI)</span></label>
            <Input
              id="totp-secret"
              placeholder="JBSW Y3DP EHPK 3PXP — spaces are fine"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 font-mono text-xs"
            />
          </div>

          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} className="w-full rounded-full sm:w-auto">
              <ScanLine className="size-4" /> Scan QR code
            </Button>
          </div>

          {formError && (
            <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-500/20" role="alert">
              {formError}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !secret.trim()}
            className="mt-4 w-full rounded-full bg-[#5362AD] font-semibold text-white hover:bg-[#4351a0] disabled:opacity-50"
          >
            {saving ? "Verifying…" : "Add"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Nothing is saved — the secret only lives in this tab until the timer ends.</p>
        </div>
      )}

      {loaded && session && (
        <div className="rounded-[20px] border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{live?.label || "One-time code"}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {(live?.issuer || "No issuer")} · {live?.digits ?? 6} digits · {live?.period ?? 30}s · not saved
              </p>
            </div>
            <button
              type="button"
              onClick={handleDiscard}
              className="flex h-8 shrink-0 items-center rounded-full bg-muted px-3 text-xs font-semibold text-muted-foreground hover:text-red-300"
            >
              <X className="size-3.5" /> Discard
            </button>
          </div>

          <button
            type="button"
            onClick={() => live && void handleCopy(live.code)}
            disabled={!live}
            className="group mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3.5 text-left ring-1 ring-white/[0.06] hover:ring-[#5362AD]/50 disabled:opacity-60"
          >
            <span className={`font-mono text-[28px] font-bold leading-none tracking-[0.18em] tabular-nums ${urgent ? "text-red-300" : "text-foreground"}`}>
              {live ? formatCode(live.code) : "······"}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground group-hover:text-foreground">
              <span className={`text-xs font-bold tabular-nums ${urgent ? "text-red-300" : ""}`}>
                {remaining !== null ? `${remaining}s` : ""}
              </span>
              <Copy className="size-4" />
            </span>
          </button>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? "bg-red-400" : "bg-[#5362AD]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Tap the code to copy it. It vanishes when the timer hits zero — then add another one.</p>
        </div>
      )}

      {showScanner && (
        <TotpQrScanner onDetected={handleScanned} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
