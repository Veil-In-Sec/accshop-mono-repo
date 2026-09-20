"use client"

import useSWR from "swr"

import { authClient } from "@/lib/auth-client"
import { getWalletData } from "@/app/actions/wallet"

export interface Order {
  id: string
  productName: string
  tag?: string
  price: number
  quantity: number
  deliveredEmail: string
  deliveredPassword: string
  deliveredRefreshToken: string
  deliveredClientId: string
  deliveredCredentials: string
  status?: "pending" | "processing" | "completed" | "failed"
  purchasedAt: string
}

export interface Transaction {
  id: string
  type: "deposit" | "purchase" | "refund" | "referral" | "transfer"
  description: string
  amount: number
  balanceAfter: number
  status: "completed" | "pending"
  createdAt: string
}

/**
 * Compatibility hook that mirrors the previous localStorage-based `useAuth()`
 * API, but is backed by a real Better Auth session + Neon-backed wallet data.
 */
export function useAuth() {
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const userId = session?.user?.id

  const {
    data,
    error: walletError,
    isLoading: dataLoading,
    mutate,
  } = useSWR(userId ? ["wallet-data", userId] : null, () => getWalletData(), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
  })

  const user = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null

  async function logout() {
    await authClient.signOut()
    await mutate(undefined, { revalidate: false })
  }

  return {
    user,
    balance: data?.balance ?? 0,
    orders: data?.orders ?? [],
    transactions: data?.transactions ?? [],
    error: walletError ?? null,
    isLoading: sessionLoading || (!!userId && dataLoading),
    logout,
    refresh: () => mutate(),
  }
}
