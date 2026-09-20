"use client"

import { createAuthClient } from "better-auth/react"

// Same-origin: the browser talks to /api/* on the web origin and Next.js
// rewrites proxy to the API server-side. Never hardcode the API IP here —
// it breaks behind any domain and leaks infra details.
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  fetchOptions: {
    credentials: "include",
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
