"use server"

import { serverApi } from "@/lib/api/endpoints"
import type { TotpCreateInput } from "@/lib/api/endpoints"

export async function listTotpKeys() {
  try {
    return await serverApi.totp.keys()
  } catch {
    return []
  }
}

export async function fetchTotpCodes() {
  try {
    const data = await serverApi.totp.codes()
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not fetch 2FA codes." }
  }
}

export async function addTotpKey(input: TotpCreateInput) {
  try {
    const data = await serverApi.totp.create(input)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not save this key." }
  }
}

export async function renameTotpKey(id: number, input: { label?: string; issuer?: string }) {
  try {
    const data = await serverApi.totp.rename(id, input)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not rename this key." }
  }
}

export async function deleteTotpKey(id: number) {
  try {
    await serverApi.totp.remove(id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Could not delete this key." }
  }
}
