/**
 * Verification-codes ownership helpers — port of the email-ownership half of
 * apps/api/src/verification-codes/verification-codes.service.ts.
 * Only purchased (completed-order) emails may be queried — prevents balance
 * burn via auto-renewals and credential probing.
 */

import { db } from "./db"
import { badRequest } from "./upstream"

export interface OwnedEmail {
  email: string
  orderId: number
  productName: string
}

/** Distinct purchased emails for the user (for dropdowns / quick-pick). */
export async function listMyEmails(userId: string): Promise<OwnedEmail[]> {
  const orders = await db.order.findMany({
    where: { userId, status: "completed" },
    orderBy: { purchasedAt: "desc" },
    take: 200,
  })
  const seen = new Map<string, { email: string; orderId: number; productName: string }>()
  for (const o of orders) {
    const candidates: string[] = []
    if (o.deliveredEmail) candidates.push(o.deliveredEmail)
    if (o.deliveredCredentials) {
      try {
        const parsed = JSON.parse(o.deliveredCredentials) as Array<{
          email?: string
        }>
        if (Array.isArray(parsed)) {
          for (const acc of parsed) {
            if (acc?.email) candidates.push(acc.email)
          }
        }
      } catch {
        /* ignore malformed credentials JSON */
      }
    }
    for (const email of candidates) {
      const key = email.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.set(key, { email: email.trim(), orderId: o.id, productName: o.productName })
    }
  }
  return [...seen.values()]
}

/** Only purchased (completed-order) emails may be queried — prevents balance burn. */
export async function assertOwnsEmail(userId: string, email: string): Promise<void> {
  const owned = await listMyEmails(userId)
  const wanted = email.trim().toLowerCase()
  const ok = owned.some((e) => e.email.trim().toLowerCase() === wanted)
  if (!ok) {
    badRequest("This email is not in your purchased orders.")
  }
}

export interface OwnedAccount {
  email: string
  password?: string
  refresh_token: string
  client_id: string
}

/**
 * Resolve stored Graph credentials (refresh_token + client_id) for an owned
 * email so email-only lookups can use the GraphMail API, which requires both.
 * Searches the single-order columns first, then the deliveredCredentials JSON.
 */
export async function findOwnedAccount(
  userId: string,
  email: string,
): Promise<OwnedAccount | null> {
  const wanted = email.trim().toLowerCase()
  if (!wanted) return null
  const orders = await db.order.findMany({
    where: { userId, status: "completed" },
    orderBy: { purchasedAt: "desc" },
    take: 200,
  })
  for (const o of orders) {
    if ((o.deliveredEmail ?? "").trim().toLowerCase() === wanted) {
      const rt = (o.deliveredRefreshToken ?? "").trim()
      const cid = (o.deliveredClientId ?? "").trim()
      if (rt && cid) {
        return {
          email: o.deliveredEmail!.trim(),
          password: o.deliveredPassword ?? undefined,
          refresh_token: rt,
          client_id: cid,
        }
      }
    }
    if (o.deliveredCredentials) {
      try {
        const parsed = JSON.parse(o.deliveredCredentials) as Array<{
          email?: string
          password?: string
          refresh_token?: string
          refreshToken?: string
          client_id?: string
          clientId?: string
        }>
        if (Array.isArray(parsed)) {
          for (const acc of parsed) {
            if ((acc?.email ?? "").trim().toLowerCase() !== wanted) continue
            const rt = (acc?.refresh_token ?? acc?.refreshToken ?? "").trim()
            const cid = (acc?.client_id ?? acc?.clientId ?? "").trim()
            if (rt && cid) {
              return {
                email: acc.email!.trim(),
                password: acc.password,
                refresh_token: rt,
                client_id: cid,
              }
            }
          }
        }
      } catch {
        /* ignore malformed credentials JSON */
      }
    }
  }
  return null
}
