"use server"

import { actionErrorMessage, requireActionUser } from "@/lib/server/action-context"
import { getGraphCode, parseGraphLine } from "@/lib/server/graph-mail"
import { getGmailCode, getHotmailCode, getOutlookCode } from "@/lib/server/hotmail143"
import {
  assertOwnsEmail,
  findOwnedAccount,
  findOrderSupplier,
  listMyEmails,
} from "@/lib/server/verification-codes"

export async function listOwnedEmails() {
  try {
    const user = await requireActionUser()
    return await listMyEmails(user.id)
  } catch {
    return []
  }
}

export async function fetchGmailCode(email: string) {
  try {
    const user = await requireActionUser()
    if (typeof email !== "string" || email.length < 3 || email.length > 320) {
      throw new Error("Enter a valid email address.")
    }
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new Error("Enter a valid email address.")
    }
    await assertOwnsEmail(user.id, clean)
    const data = await getGmailCode(clean)
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch Gmail code.") }
  }
}

export async function fetchOutlookCode(email: string) {
  try {
    const user = await requireActionUser()
    if (typeof email !== "string" || email.length < 3 || email.length > 320) {
      throw new Error("Enter a valid Outlook/Hotmail address.")
    }
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new Error("Enter a valid Outlook/Hotmail address.")
    }
    await assertOwnsEmail(user.id, clean)
    const stored = await findOwnedAccount(user.id, clean)
    if (!stored) {
      throw new Error(
        "No saved refresh_token/client_id for this address — paste the full email|password|refresh_token|client_id line instead.",
      )
    }
    try {
      const data = await getGraphCode({ ...stored, type: "all" })
      return { ok: true as const, data }
    } catch (graphError) {
      if ((stored.supplier ?? "hotmail143") === "hotmail143") {
        try {
          const fallback = await getOutlookCode(clean)
          if (fallback.successful || fallback.code === -2) {
            return { ok: true as const, data: { kind: "outlook", result: fallback } as never }
          }
        } catch {
          /* transport-level fallback failure — fall through to Graph error */
        }
      }
      throw graphError
    }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch Outlook code.") }
  }
}

export async function fetchHotmailCode(pipeData: string) {
  try {
    const user = await requireActionUser()
    if (typeof pipeData !== "string" || pipeData.length < 5 || pipeData.length > 8000) {
      throw new Error("Enter a valid email address or credentials line.")
    }
    const clean = pipeData.trim()
    const parts = clean
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    const email = parts[0] ?? ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address or credentials line.")
    }
    await assertOwnsEmail(user.id, email)

    if (parts.length >= 3) {
      try {
        const input = parseGraphLine(clean)
        const data = { kind: "graph", result: await getGraphCode(input) } as const
        return { ok: true as const, data }
      } catch (graphError) {
        const supplier = await findOrderSupplier(user.id, email)
        if (supplier === "hotmail143") {
          try {
            const fallback = await getHotmailCode(clean)
            if (fallback.successful || fallback.code === -2) {
              return { ok: true as const, data: { kind: "hotmail", result: fallback } as const }
            }
          } catch {
            /* transport-level fallback failure — fall through to Graph error */
          }
        }
        throw graphError
      }
    }

    const stored = await findOwnedAccount(user.id, email)
    if (stored) {
      try {
        const data = {
          kind: "graph",
          result: await getGraphCode({ ...stored, type: "all" }),
        } as const
        return { ok: true as const, data }
      } catch (graphError) {
        if ((stored.supplier ?? "hotmail143") === "hotmail143") {
          try {
            const fallback = await getOutlookCode(email)
            if (fallback.successful || fallback.code === -2) {
              return { ok: true as const, data: { kind: "outlook", result: fallback } as const }
            }
          } catch {
            /* transport-level fallback failure — fall through to Graph error */
          }
        }
        throw graphError
      }
    }
    throw new Error(
      "This mailbox needs its credentials line (email|password|refresh_token|client_id). Paste the full line from your order.",
    )
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch Hotmail code.") }
  }
}
