"use client"

import * as React from "react"
import { MotionConfig } from "motion/react"
import { useReducedMotion } from "@/lib/useReducedMotion"

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      {children}
    </MotionConfig>
  )
}
