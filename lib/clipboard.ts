"use client"

/**
 * Copy text to the clipboard, working in both secure (HTTPS/localhost) and
 * insecure (plain HTTP over IP) contexts.
 *
 * `navigator.clipboard.writeText` is only available in secure contexts, so on
 * plain-HTTP origins `navigator.clipboard` is `undefined` and the call must
 * fall back to the legacy `execCommand("copy")` path. Returns true on success.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  if (!value) return false
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(value)
      return true
    }
    throw new Error("Clipboard API unavailable")
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = value
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.top = "-9999px"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
