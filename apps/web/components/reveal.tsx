"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

/**
 * House springs — Apple discipline, structural restraint.
 * Critically damped (bounce 0) by default: graceful, non-distracting.
 * Bounce ONLY for momentum-driven interactions (flicks, drag releases).
 */
export const springDefault = { type: "spring", bounce: 0, duration: 0.45 } as const
export const springSnappy = { type: "spring", bounce: 0, duration: 0.4 } as const
export const springMomentum = { type: "spring", bounce: 0.2, duration: 0.45 } as const

type Props = {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

export function Reveal({ children, delay = 0, y = 16, className, as = "div" }: Props) {
  const shouldReduce = useReducedMotion()
  const MotionTag = motion[as as keyof typeof motion] as any

  if (shouldReduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...springDefault, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

export function Stagger({ children, stagger = 0.06, className }: { children: React.ReactNode; stagger?: number; className?: string }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, y = 16 }: { children: React.ReactNode; className?: string; y?: number }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: springDefault },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Mount entrance — springs in on first paint (hero, dialogs, sheets).
 * Starts from live values; interruptible by design.
 */
export function Mount({
  children,
  className,
  y = 20,
  scale = 1,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  y?: number
  scale?: number
  delay?: number
}) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y, scale: scale === 1 ? 1 : 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springDefault, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Pressable — instant pointer-down feedback (scale 0.97, 100ms).
 * For elements that can't use the CSS :active path.
 */
export function Pressable({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
