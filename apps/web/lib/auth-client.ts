"use client"

import useSWR from "swr"

import { getSessionUser, signInAction, signUpAction, signOutAction } from "@/app/actions/auth"

/**
 * Same-origin auth client backed by Server Actions (no /api/* routes).
 * Mirrors the subset of the better-auth react client the app uses:
 * signIn.email / signUp.email / signOut / useSession.
 */

async function signInWithEmail(input: { email: string; password: string; rememberMe?: boolean }) {
  const res = await signInAction({ email: input.email, password: input.password })
  if (!res.ok) return { error: { message: res.message } as { message: string } }
  return { error: null }
}

async function signUpWithEmail(input: { email: string; password: string; name: string }) {
  const res = await signUpAction({ email: input.email, password: input.password, name: input.name })
  if (!res.ok) return { error: { message: res.message } as { message: string } }
  return { error: null }
}

async function signOutUser() {
  await signOutAction()
}

function useSessionHook() {
  const { data, isLoading, mutate } = useSWR("session-user", () => getSessionUser(), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  return {
    data: data ? { user: data } : null,
    isPending: isLoading as boolean,
    refetch: mutate,
  }
}

export const authClient = {
  signIn: { email: signInWithEmail },
  signUp: { email: signUpWithEmail },
  signOut: signOutUser,
  useSession: useSessionHook,
}

export const signIn = authClient.signIn
export const signUp = authClient.signUp
export const signOut = authClient.signOut
export const useSession = authClient.useSession
