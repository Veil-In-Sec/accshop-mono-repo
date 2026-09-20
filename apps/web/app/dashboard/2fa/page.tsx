"use client"

import { Check, KeyRound, Pencil, Plus, RefreshCw, ScanLine, ShieldCheck, Trash2, Copy, X } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import {
  addTotpKey,
  deleteTotpKey,
  fetchTotpCodes,
  listTotpKeys,
  renameTotpKey,
} from "@/app/actions/totp"
import { TotpQrScanner } from "@/components/dashboard/totp-qr-scanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TotpKeyMeta, TotpLiveCode } from "@/lib/api/endpoints"
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

/** Lightweight otpauth:// prefill parser (no crypto — server validates). */
function prefillFromUri(uri: string): { label: string; issuer: string; secret: string } | null {
  try {
    const url = new URL(uri.trim())
    if (url.protocol !== "otpauth:" || url.hostname.toLowerCase() !== "totp") return null
    const secret = url.searchParams.get("secret") ?? ""
    if (!secret) return null
    const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ""))
    let label = rawLabel
    let issuer = (url.searchParams.get("issuer") ?? "").trim()
    if (rawLabel.includes(":")) {
      const [first, ...rest] = rawLabel.split(":")
      if (!issuer) issuer = first.trim()
      label = rest.join(":").trim()
    }
    return { label, issuer, secret }
  } catch {
    return null
  }
}

async function copyText(value: string) {
  return copyToClipboard(value)
}

export default function TotpPage() {
  const [keys, setKeys] = React.useState<TotpKeyMeta[] | null>(null)
  const [codes, setCodes] = React.useState<Map<number, TotpLiveCode>>(new Map())
  const [fetchedAt, setFetchedAt] = React.useState(0)
  const [now, setNow] = React.useState(() => Date.now())
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)

  const [showAdd, setShowAdd] = React.useState(false)
  const [showScanner, setShowScanner] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [issuer, setIssuer] = React.useState("")
  const [secret, setSecret] = React.useState("")
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [algorithm, setAlgorithm] = React.useState<"SHA1" | "SHA256" | "SHA512">("SHA1")
  const [digits, setDigits] = React.useState(6)
  const [period, setPeriod] = React.useState(30)
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editLabel, setEditLabel] = React.useState("")
  const [editIssuer, setEditIssuer] = React.useState("")
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null)

  const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadAll = React.useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [keyList, codeRes] = await Promise.all([listTotpKeys(), fetchTotpCodes()])
      setKeys(keyList)
      setLoadError(null)
      if (codeRes.ok) {
        setCodes(new Map(codeRes.data.map((c) => [c.id, c])))
        setFetchedAt(Date.now())
        scheduleRefresh(codeRes.data)
      } else if (!silent) {
        toast.error(codeRes.message)
      }
    } catch {
      setLoadError("Could not load your 2FA keys. Please retry.")
    } finally {
      setRefreshing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleRefresh(liveCodes: TotpLiveCode[]) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    if (liveCodes.length === 0) return
    const minSecs = Math.min(...liveCodes.map((c) => c.secondsRemaining))
    // Refetch just after the next rollover (+0.8s buffer for clock skew).
    refreshTimer.current = setTimeout(() => void loadAll(true), Math.max(1000, minSecs * 1000 + 800))
  }

  React.useEffect(() => {
    void loadAll()
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadAll(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(ticker)
      document.removeEventListener("visibilitychange", onVisible)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [loadAll])

  function remainingFor(code: TotpLiveCode): number {
    const elapsed = Math.floor((now - fetchedAt) / 1000)
    return Math.max(0, code.secondsRemaining - elapsed)
  }

  async function handleCopy(code: string) {
    const ok = await copyText(code.replace(/\D/g, ""))
    if (ok) toast.success("Code copied — paste it before it expires.")
    else toast.error("Could not copy. Long-press the code to copy manually.")
  }

  function handleScanned(text: string) {
    setShowScanner(false)
    const prefill = prefillFromUri(text)
    if (prefill) {
      if (prefill.label) setLabel(prefill.label)
      if (prefill.issuer) setIssuer(prefill.issuer)
      setSecret(prefill.secret)
      setShowAdd(true)
      toast.success("QR decoded — review and save the key.")
    } else {
      setSecret(text.trim())
      setShowAdd(true)
      toast.error("This QR is not a 2FA setup code — pasted as raw text. Check and save carefully.")
    }
  }

  async function handleSave() {
    setFormError(null)
    if (!secret.trim()) {
      setFormError("Paste your secret key or scan a setup QR code first.")
      return
    }
    setSaving(true)
    const res = await addTotpKey({
      label: label.trim() || undefined,
      issuer: issuer.trim() || undefined,
      secret: secret.trim(),
      algorithm,
      digits,
      period,
    })
    setSaving(false)
    if (!res.ok) {
      setFormError(res.message)
      return
    }
    toast.success(`Key saved — current code ${res.data.preview.code}.`)
    setLabel("")
    setIssuer("")
    setSecret("")
    setShowAdvanced(false)
    setAlgorithm("SHA1")
    setDigits(6)
    setPeriod(30)
    setShowAdd(false)
    await loadAll(true)
  }

  async function handleRename(id: number) {
    if (!editLabel.trim()) {
      toast.error("Label cannot be empty.")
      return
    }
    const res = await renameTotpKey(id, { label: editLabel.trim(), issuer: editIssuer.trim() })
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setKeys((prev) => prev?.map((k) => (k.id === id ? res.data : k)) ?? prev)
    setEditingId(null)
    toast.success("Key renamed.")
  }

  async function handleDelete(id: number) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId((v) => (v === id ? null : v)), 4000)
      return
    }
    const res = await deleteTotpKey(id)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setConfirmDeleteId(null)
    setKeys((prev) => prev?.filter((k) => k.id !== id) ?? prev)
    setCodes((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    toast.success("Key deleted.")
  }

  const loading = keys === null && !loadError

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="type-title flex items-center gap-2 text-xl text-foreground">
            <ShieldCheck className="size-5 text-primary" />
            2FA Authenticator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live time-based codes for your accounts — paste a secret key or scan a setup QR.
            Secrets stay encrypted in your vault; only short-lived codes reach your browser.
          </p>
        </div>
        {keys && keys.length > 0 && !showAdd && (
          <Button
            onClick={() => setShowAdd(true)}
            className="rounded-full bg-[#5362AD] font-semibold text-white hover:bg-[#4351a0]"
          >
            <Plus className="size-4" /> Add key
          </Button>
        )}
      </div>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading your keys…</p>}

      {loadError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
          <p className="text-sm text-red-200">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadAll()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      )}

      {keys && keys.length === 0 && !showAdd && (
        <div className="rounded-[20px] border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="size-4 text-primary" /> No keys yet — get codes in 3 steps
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#5362AD]/20 text-xs font-bold text-primary">1</span>Turn on 2FA / authenticator-app on the site you want codes for and reveal the text setup key (or QR).</li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#5362AD]/20 text-xs font-bold text-primary">2</span>Add it below — paste the key or scan the QR with your camera.</li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#5362AD]/20 text-xs font-bold text-primary">3</span>Copy the live 6-digit code before the timer runs out. Codes refresh every 30 seconds.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setShowAdd(true)} className="rounded-full bg-[#5362AD] font-semibold text-white hover:bg-[#4351a0]">
              <Plus className="size-4" /> Add your first key
            </Button>
            <Button variant="outline" onClick={() => setShowScanner(true)} className="rounded-full">
              <ScanLine className="size-4" /> Scan QR instead
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Looking for email OTP codes instead?{" "}
            <Link href="/dashboard/gmail-codes" className="text-primary hover:underline">Open Get Code →</Link>
          </p>
        </div>
      )}

      {showAdd && (
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Add authenticator key</h2>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setFormError(null) }}
              aria-label="Close add key form"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="totp-label" className="text-xs font-medium text-muted-foreground">Label</label>
              <Input id="totp-label" placeholder="e.g. Discord, Gmail, Binance" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="totp-issuer" className="text-xs font-medium text-muted-foreground">Issuer <span className="text-muted-foreground">(optional)</span></label>
              <Input id="totp-issuer" placeholder="e.g. Google" value={issuer} onChange={(e) => setIssuer(e.target.value)} maxLength={80} className="mt-1.5" />
            </div>
          </div>

          <div className="mt-3">
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

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} className="rounded-full">
              <ScanLine className="size-4" /> Scan QR code
            </Button>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? "Hide advanced ▴" : "Advanced (SHA1 · 6 digits · 30s) ▾"}
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-muted p-3">
              <div>
                <label htmlFor="totp-algo" className="text-[11px] font-medium text-muted-foreground">Algorithm</label>
                <select id="totp-algo" value={algorithm} onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)} className="mt-1 h-9 w-full rounded-xl border border-border bg-muted px-2 text-xs text-foreground outline-none">
                  <option value="SHA1">SHA1</option>
                  <option value="SHA256">SHA256</option>
                  <option value="SHA512">SHA512</option>
                </select>
              </div>
              <div>
                <label htmlFor="totp-digits" className="text-[11px] font-medium text-muted-foreground">Digits</label>
                <select id="totp-digits" value={digits} onChange={(e) => setDigits(Number(e.target.value))} className="mt-1 h-9 w-full rounded-xl border border-border bg-muted px-2 text-xs text-foreground outline-none">
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </div>
              <div>
                <label htmlFor="totp-period" className="text-[11px] font-medium text-muted-foreground">Period (s)</label>
                <select id="totp-period" value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="mt-1 h-9 w-full rounded-xl border border-border bg-muted px-2 text-xs text-foreground outline-none">
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
            </div>
          )}

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
            {saving ? "Verifying & saving…" : "Verify & save key"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">The key is validated and encrypted server-side before anything is stored.</p>
        </div>
      )}

      {keys && keys.length > 0 && (
        <div className="flex flex-col gap-3">
          {refreshing && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="size-3 animate-spin" /> Syncing codes…</p>
          )}
          {keys.map((key) => {
            const live = codes.get(key.id)
            const remaining = live ? remainingFor(live) : null
            const urgent = remaining !== null && remaining <= 5
            const pct = live ? Math.max(0, Math.min(100, (remaining! / live.period) * 100)) : 0
            const isEditing = editingId === key.id
            return (
              <div key={key.id} className="rounded-[20px] border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={80} placeholder="Label" className="h-8 w-40 text-xs" />
                        <Input value={editIssuer} onChange={(e) => setEditIssuer(e.target.value)} maxLength={80} placeholder="Issuer" className="h-8 w-32 text-xs" />
                        <button type="button" onClick={() => void handleRename(key.id)} aria-label="Save rename" className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25">
                          <Check className="size-4" />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename" className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-foreground">{key.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {key.issuer || "No issuer"} · {key.algorithm} · {key.digits} digits · {key.period}s
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingId(key.id); setEditLabel(key.label); setEditIssuer(key.issuer) }}
                        aria-label={`Rename ${key.label}`}
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(key.id)}
                        aria-label={confirmDeleteId === key.id ? "Confirm delete" : `Delete ${key.label}`}
                        className={`flex h-8 items-center justify-center rounded-full text-xs font-semibold ${confirmDeleteId === key.id ? "bg-red-500/20 px-3 text-red-200 hover:bg-red-500/30" : "w-8 text-muted-foreground hover:bg-muted hover:text-red-300"}`}
                      >
                        {confirmDeleteId === key.id ? "Confirm?" : <Trash2 className="size-3.5" />}
                      </button>
                    </div>
                  )}
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
                <p className="mt-1.5 text-[11px] text-muted-foreground">Tap the code to copy it instantly.</p>
              </div>
            )
          })}
        </div>
      )}

      {showScanner && (
        <TotpQrScanner onDetected={handleScanned} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
