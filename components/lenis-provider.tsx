"use client"

import * as React from "react"
import Lenis from "lenis"
import { useReducedMotion } from "motion/react"

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  const reduced = Boolean(shouldReduce)

  React.useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      gestureOrientation: "vertical",
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [reduced])

  return <>{children}</>
}
