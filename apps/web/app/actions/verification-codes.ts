"use server"

import { serverApi } from "@/lib/api/endpoints"

export async function listOwnedEmails() {
  try {
    return await serverApi.verificationCodes.emails()
  } catch {
    return []
  }
}

export async function fetchGmailCode(email: string) {
  try {
    const data = await serverApi.verificationCodes.gmail(email)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not fetch Gmail code." }
  }
}

export async function fetchOutlookCode(email: string) {
  try {
    const data = await serverApi.verificationCodes.outlook(email)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not fetch Outlook code." }
  }
}

export async function fetchHotmailCode(pipeData: string) {
  try {
    const data = await serverApi.verificationCodes.hotmail(pipeData)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not fetch Hotmail code." }
  }
}
