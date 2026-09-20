"use client"

import * as React from "react"

export function AmbientElements() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div aria-hidden className="ambient">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="glow glow-c" />
      <div className="glow glow-d" />
      <div className="floating glass-chip" style={{ position: "absolute", top: "96px", left: "40px", width: "64px", height: "112px", opacity: 0.42 }} />
      <div className="floating b glass-chip" style={{ position: "absolute", top: "520px", right: "48px", width: "96px", height: "96px", opacity: 0.38 }} />
      <div className="floating c" style={{ position: "absolute", top: "672px", left: "24px", width: "32px", height: "32px", borderRadius: "999px", background: "linear-gradient(to top right, rgba(255,255,255,0.16), transparent)", border: "1px solid rgba(255,255,255,0.18)", opacity: 0.5 }} />
      <div className="floating glass-chip" style={{ position: "absolute", top: "832px", left: "32px", width: "56px", height: "80px", opacity: 0.28, transform: "rotate(45deg)" }} />
      <div className="floating b" style={{ position: "absolute", top: "800px", right: "64px", width: "40px", height: "40px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", opacity: 0.4 }} />
      <div className="floating" style={{ position: "absolute", bottom: "384px", right: "16px", width: "112px", height: "112px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.28 }} />
    </div>
  )
}