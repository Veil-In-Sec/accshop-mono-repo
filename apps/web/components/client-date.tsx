"use client"

import * as React from "react"

/**
 * Renders a date without hydration mismatches.
 * Server (and first client render) output the raw ISO string; once mounted,
 * it swaps to the viewer's locale format. The server timezone is UTC while
 * browsers are usually local time, so formatting during SSR always mismatches.
 */
export function ClientDate({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = React.useState(iso)

  React.useEffect(() => {
    setText(new Date(iso).toLocaleString())
  }, [iso])

  return (
    <span suppressHydrationWarning className={className}>
      {text}
    </span>
  )
}

/** Current time, rendered only after mount (no SSR mismatch). Updates once. */
export function ClientTimeNow({ className }: { className?: string }) {
  const [text, setText] = React.useState("…")

  React.useEffect(() => {
    setText(new Date().toLocaleTimeString())
  }, [])

  return (
    <span suppressHydrationWarning className={className}>
      {text}
    </span>
  )
}
