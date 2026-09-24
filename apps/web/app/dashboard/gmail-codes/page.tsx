"use client"

import { AtSign, CheckCircle2, Copy, Grid2x2, Loader2, Mail } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  fetchGmailCode,
  fetchHotmailCode,
} from "@/app/actions/verification-codes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"
import type {
  GmailCodeResponse,
  GraphCodeResponse,
  HotmailCodeResponse,
  HotmailLookupResponse,
  OutlookCodeResponse,
} from "@/lib/api/endpoints"

type Tab = "gmail" | "hotmail-outlook"

async function copyCode(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value)
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) toast.success(`Copied: ${text}`)
  else toast.error("Could not copy to clipboard.")
}

/**
 * Seconds to wait before auto-retrying, or null when the lookup is final.
 * Retries every "not yet" state (including empty `data`) but never an
 * expired address (`code === -3`) or an explicit `shouldRetry: false`.
 */
function retryAfterSeconds(
  result: HotmailCodeResponse | OutlookCodeResponse | GraphCodeResponse,
): number | null {
  const data = result.data
  if (result.successful && data?.code) return null
  if (result.code === -3) return null
  if (data && data.shouldRetry === false) return null
  return data?.retryAfter ?? 10
}

/** Max automatic re-polls per manual fetch (~10s apart, so ~1 minute). */
const MAX_AUTO_RETRIES = 6

export default function GetCodePage() {
  const [tab, setTab] = React.useState<Tab>("gmail")
  const [gmailEmail, setGmailEmail] = React.useState("")
  // Credentials line from the order (email|password|refresh_token|client_id).
  // Looked up via the GraphMail API. A bare email works when the order
  // already stores refresh_token + client_id for that address.
  const [hoLine, setHoLine] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [retryIn, setRetryIn] = React.useState<number | null>(null)
  const [gmailRes, setGmailRes] = React.useState<GmailCodeResponse | null>(null)
  const [outlookRes, setOutlookRes] = React.useState<OutlookCodeResponse | null>(null)
  const [hotmailRes, setHotmailRes] = React.useState<HotmailCodeResponse | null>(null)
  const [graphRes, setGraphRes] = React.useState<GraphCodeResponse | null>(null)

  function clearHoResults() {
    setOutlookRes(null)
    setHotmailRes(null)
    setGraphRes(null)
  }

  function scheduleRetry(seconds?: number) {
    setRetryIn(Math.max(3, Math.min(120, Math.floor(seconds ?? 10))))
  }

  // Docs retry flow: shouldRetry + retryAfter -> countdown then auto-refetch.
  // Guarded to MAX_AUTO_RETRIES to avoid infinite charged loops.
  const autoRetries = React.useRef(0)
  React.useEffect(() => {
    if (retryIn === null) return
    if (retryIn <= 0) {
      setRetryIn(null)
      if (autoRetries.current < MAX_AUTO_RETRIES) {
        autoRetries.current += 1
        void onGetCode(true)
      }
      return
    }
    const t = setTimeout(() => setRetryIn((v) => (v === null ? null : v - 1)), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryIn])

  async function onGetCode(isAutoRetry = false) {
    if (loading && !isAutoRetry) return
    if (!isAutoRetry) autoRetries.current = 0
    setLoading(true)
    if (!isAutoRetry) setRetryIn(null)
    try {
      if (tab === "gmail") {
        const email = gmailEmail.trim()
        if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
          toast.error("Enter a valid Gmail address (@gmail.com).")
          return
        }
        const res = await fetchGmailCode(email)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        setGmailRes(res.data)
        if (res.data.successful && res.data.data?.code) toast.success("Code retrieved.")
        else if (!isAutoRetry) toast.info("No OTP yet — auto-retrying. Trigger the code on the source site first.")
        if (!res.data.successful && !res.data.data?.code) scheduleRetry(10)
        return
      }

      const line = hoLine.trim()
      if (!line) {
        toast.error("Paste your credentials line first.")
        return
      }
      const emailPart = line.split("|")[0]?.trim() ?? ""
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPart)) {
        toast.error("Enter a valid Hotmail/Outlook email or credentials line.")
        return
      }
      clearHoResults()

      // One endpoint handles every line shape via the GraphMail API.
      // The response envelope tells us which backend answered.
      const res = await fetchHotmailCode(line)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const lookup: HotmailLookupResponse = res.data
      const result = lookup.result
      if (lookup.kind === "graph") {
        const graph = result as GraphCodeResponse
        setGraphRes(graph)
        handleLookupResult(graph, isAutoRetry)
        return
      }
      if (lookup.kind === "outlook") {
        const outlook = result as OutlookCodeResponse
        setOutlookRes(outlook)
        handleLookupResult(outlook, isAutoRetry)
        return
      }
      const hotmail = result as HotmailCodeResponse
      setHotmailRes(hotmail)
      handleLookupResult(hotmail, isAutoRetry)
    } finally {
      setLoading(false)
    }
  }

  /** Shared success / waiting / retry handling for Graph + Hotmail + Outlook results. */
  function handleLookupResult(
    result: HotmailCodeResponse | OutlookCodeResponse | GraphCodeResponse,
    isAutoRetry: boolean,
  ) {
    if (result.successful && result.data?.code) {
      toast.success("Code retrieved.")
      return
    }
    const wait = retryAfterSeconds(result)
    if (wait !== null) {
      if (!isAutoRetry) toast.info("No code yet — auto-retrying. Trigger the code on the source site first.")
      scheduleRetry(wait)
    } else if (!isAutoRetry) {
      toast.info(result.msg || "No code yet.")
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Mail className="size-5 text-primary" />
        <h2 className="type-title text-xl text-foreground">Get Code</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-1">
        {(
          [
            { id: "gmail", label: "Gmail", icon: AtSign },
            { id: "hotmail-outlook", label: "Hotmail / Outlook", icon: Grid2x2 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setRetryIn(null)
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {tab === "gmail" && (
          <>
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <AtSign className="size-4 text-primary" /> Gmail Code
            </h3>
            <label htmlFor="gmail-email" className="mt-4 block text-sm font-medium text-foreground">
              email
            </label>
            <Input
              id="gmail-email"
              type="email"
              placeholder="example@gmail.com"
              value={gmailEmail}
              onChange={(e) => {
                setGmailEmail(e.target.value)
                setGmailRes(null)
              }}
              className="mt-1.5 h-11"
            />
          </>
        )}

        {tab === "hotmail-outlook" && (
          <>
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Grid2x2 className="size-4 text-primary" /> Hotmail / Outlook Code
            </h3>
            <label htmlFor="ho-line" className="mt-4 block text-sm font-medium text-foreground">
              Credentials line
            </label>
            <Input
              id="ho-line"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="email|password|refresh_token|client_id"
              value={hoLine}
              onChange={(e) => {
                setHoLine(e.target.value)
                clearHoResults()
              }}
              className="mt-1.5 h-11 font-mono text-xs"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Paste the credentials line from your order (email|password|refresh_token|client_id).
              A bare email also works when the order stores its refresh_token + client_id.
            </p>
          </>
        )}

        <Button
          className="mt-5 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => void onGetCode(false)}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Getting code…
            </>
          ) : retryIn !== null ? (
            <>Retry in {retryIn}s — or retry now</>
          ) : (
            <>Get Verification Code</>
          )}
        </Button>
        {retryIn !== null && (
          <Button
            variant="ghost"
            className="mt-2 h-9 w-full text-xs"
            onClick={() => {
              setRetryIn(null)
              void onGetCode(false)
            }}
          >
            Retry now
          </Button>
        )}
      </div>

      {tab === "gmail" && gmailRes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{gmailRes.msg}</p>
          {gmailRes.data?.code ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                  {gmailRes.data.code}
                </span>
                <button
                  type="button"
                  onClick={() => void copyCode(gmailRes.data?.code ?? "")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
              </div>
              {gmailRes.data.full_content && (
                <p className="mt-3 break-words rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  {gmailRes.data.full_content}
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              No code yet — request a new OTP on the source site, then retry.
            </p>
          )}
        </div>
      )}

      {tab === "hotmail-outlook" && graphRes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{graphRes.msg}</p>
          {graphRes.data?.code ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                {graphRes.data.code}
              </span>
              <button
                type="button"
                onClick={() => void copyCode(graphRes.data?.code ?? '')}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Copy className="size-3.5" /> Copy
              </button>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              No code yet — request a new OTP, then press Get Verification Code again.
            </p>
          )}
          {graphRes.data?.email && (
            <p className="mt-2 text-xs text-muted-foreground">Mailbox: {graphRes.data.email}</p>
          )}
          {graphRes.data?.latest && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-xs">
              <p className="font-medium text-foreground">
                {graphRes.data.latest.subject ?? 'Latest email'}
              </p>
              <p className="mt-1 text-muted-foreground">
                From:{' '}
                {graphRes.data.latest.from?.[0]?.name ??
                  graphRes.data.latest.from?.[0]?.address ??
                  'unknown'}
                {graphRes.data.latest.date ? ` • ${graphRes.data.latest.date}` : ''}
              </p>
            </div>
          )}
          {graphRes.data?.messages && graphRes.data.messages.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-xs">
              {graphRes.data.messages.slice(0, 5).map((m, i) => (
                <li
                  key={m.uid ?? i}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {m.subject ?? `Message ${m.uid ?? i + 1}`}
                  </span>
                  {m.code ? (
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{m.code}</span>
                      <button
                        type="button"
                        aria-label={`Copy code ${m.code}`}
                        onClick={() => void copyCode(m.code)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        <Copy className="size-3" /> Copy
                      </button>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">no code</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "hotmail-outlook" && hotmailRes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{hotmailRes.msg}</p>
          {hotmailRes.data?.code ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                {hotmailRes.data.code}
              </span>
              <button
                type="button"
                onClick={() => void copyCode(hotmailRes.data?.code ?? "")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Copy className="size-3.5" /> Copy
              </button>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              No code yet — request a new OTP, then press Get Verification Code again.
            </p>
          )}
          {hotmailRes.data?.email && (
            <p className="mt-2 text-xs text-muted-foreground">Mailbox: {hotmailRes.data.email}</p>
          )}
        </div>
      )}

      {tab === "hotmail-outlook" && !hotmailRes && outlookRes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{outlookRes.msg}</p>
          {outlookRes.data?.code ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                  {outlookRes.data.code}
                </span>
              <button
                type="button"
                onClick={() => void copyCode(outlookRes.data?.code ?? "")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
              </div>
              {outlookRes.data.reordered && (
                <p className="mt-2 text-xs text-primary">
                  Auto-renewed → {outlookRes.data.new_email ?? outlookRes.data.address} (charged).
                </p>
              )}
              {outlookRes.data.needs_topup && (
                <p className="mt-2 text-xs text-amber-500">Renewal skipped — supplier balance too low.</p>
              )}
              {outlookRes.data.expires_at && (
                <p className="mt-2 text-xs text-muted-foreground">Expires at: {outlookRes.data.expires_at}</p>
              )}
              {outlookRes.data.mail && (
                <div className="mt-3 rounded-lg bg-muted p-3 text-xs">
                  <p className="font-medium text-foreground">{outlookRes.data.mail.subject ?? "Latest email"}</p>
                  <p className="mt-1 text-muted-foreground">
                    From: {outlookRes.data.mail.sender_name ?? outlookRes.data.mail.sender_email ?? "unknown"}
                  </p>
                  {outlookRes.data.mail.body_text && (
                    <p className="mt-2 break-words text-muted-foreground">{outlookRes.data.mail.body_text}</p>
                  )}
                </div>
              )}
              {outlookRes.history && outlookRes.history.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 text-xs">
                  {outlookRes.history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                      <span className="font-mono font-semibold text-foreground">{h.code}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{h.created_at}</span>
                        <button
                          type="button"
                          aria-label={`Copy code ${h.code}`}
                          onClick={() => void copyCode(h.code)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          <Copy className="size-3" /> Copy
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : outlookRes.msg?.toLowerCase().includes("not purchased") ? (
            <div className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm">
              <p className="text-foreground">That address was not purchased from the Outlook code service.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste your full order credentials line above to retry via the GraphMail service.
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              {outlookRes.code === -3
                ? "Address expired — purchase a new one."
                : "Waiting for code — request a new OTP, then press Get Verification Code again."}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="size-4 text-primary" /> How it works
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs">
          <li>Enter your Gmail address to fetch its code.</li>
          <li>Paste your order credentials line (email|password|refresh_token|client_id) — codes are read via the GraphMail API. A bare email also works when your order already stores its refresh_token + client_id.</li>
          <li>Delivered lines only ever contain the parts your product provides — no empty separators.</li>
        </ul>
      </div>
    </div>
  )
}
