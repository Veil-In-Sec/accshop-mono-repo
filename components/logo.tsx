import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconClassName?: string
  textClassName?: string
  showText?: boolean
  name?: string
}

export function Logo({
  className,
  iconClassName,
  textClassName,
  showText = true,
  name = "AccShop",
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/accshop-logo.svg"
        alt={`${name} logo`}
        width={28}
        height={28}
        className={cn("h-7 w-7 shrink-0", iconClassName)}
        priority
      />
      {showText && (
        <span className={cn("font-sans text-[17px] font-semibold tracking-[-0.02em] text-foreground", textClassName)}>
          {name}
        </span>
      )}
    </span>
  )
}
