"use client"

import * as React from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

export function useReducedMotion(): boolean {
  const getInitial = React.useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  }, [])

  const [reduced, setReduced] = React.useState<boolean>(getInitial)

  React.useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return reduced
}
