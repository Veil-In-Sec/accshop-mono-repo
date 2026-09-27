"use client"

import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { adminLogin } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

export function AdminLoginForm() {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const result = await adminLogin(password)
    setIsSubmitting(false)
    if (result.success) {
      router.push("/admin")
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <InputGroup className="border-white/10 bg-white/[0.04] focus-within:border-[#5362AD]/50">
        <InputGroupAddon className="text-zinc-500">
          <Lock className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="password"
          placeholder="Administrator password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="text-white placeholder:text-zinc-500"
        />
      </InputGroup>
      <Button type="submit" size="lg" disabled={isSubmitting} className="rounded-full bg-[#5362AD] font-semibold text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)] hover:bg-[#4351a0] border-0 h-11">
        {isSubmitting ? "Verifying..." : "Sign in"}
      </Button>
    </form>
  )
}
