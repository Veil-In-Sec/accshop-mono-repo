"use client"

import * as React from "react"
import { MotionConfig, useReducedMotion } from "motion/react"

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      {children}
    </MotionConfig>
  )
}
