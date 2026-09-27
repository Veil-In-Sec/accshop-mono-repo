import {
  Award,
  Clock,
  Globe,
  Headset,
  Heart,
  Lock,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Zap,
  Headset,
  Sparkles,
  Star,
  Heart,
  Rocket,
  Globe,
  Lock,
  Clock,
  Award,
  ThumbsUp,
  Users,
  MessageCircle,
}

export function getLucideIcon(name: string): LucideIcon {
  return iconMap[name] ?? Sparkles
}
