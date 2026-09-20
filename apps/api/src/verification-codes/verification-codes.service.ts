import { BadRequestException, Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"
import {
  Hotmail143Service,
  type HotmailCodeResult,
  type OutlookCodeResult,
} from "../hotmail143/hotmail143.service"

@Injectable()
export class VerificationCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotmail143: Hotmail143Service,
  ) {}

  /** Distinct purchased emails for the user (for dropdowns / quick-pick). */
  async listMyEmails(userId: string) {
    const orders = await this.prisma.order.findMany({
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

  async getGmailCode(userId: string, email: string) {
    const clean = email?.trim() ?? ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new BadRequestException("Enter a valid email address.")
    }
    await this.assertOwnsEmail(userId, clean)
    return this.hotmail143.getGmailCode(clean)
  }

  /** Only purchased (completed-order) emails may be queried — prevents balance burn. */
  private async assertOwnsEmail(userId: string, email: string): Promise<void> {
    const owned = await this.listMyEmails(userId)
    const wanted = email.trim().toLowerCase()
    const ok = owned.some((e) => e.email.trim().toLowerCase() === wanted)
    if (!ok) {
      throw new BadRequestException("This email is not in your purchased orders.")
    }
  }

  /**
   * Hotmail / Outlook code lookup from a delivered credentials line.
   *
   * Accepted shapes (all trimmed, empty segments ignored):
   * - `email|password|refresh_token|client_id` -> Hotmail143 `hotmail-code`
   *   (the only endpoint that accepts OAuth credentials, per its API doc).
   * - `email` or `email|password` (products without OAuth tokens) ->
   *   Hotmail143 `outlook-code` by email, the only code source that works
   *   with an email address alone.
   *
   * The email part must belong to one of the caller's completed orders,
   * matching the Gmail / Outlook endpoints (prevents balance burn via
   * auto-renewals and credential probing).
   *
   * Returns a discriminated envelope so callers never have to guess which
   * upstream shape they received.
   */
  async getHotmailCode(
    userId: string,
    pipeData: string,
  ): Promise<
    | { kind: "hotmail"; result: HotmailCodeResult }
    | { kind: "outlook"; result: OutlookCodeResult }
  > {
    const clean = pipeData?.trim() ?? ""
    const parts = clean
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    const email = parts[0] ?? ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Enter a valid email address or credentials line.")
    }
    await this.assertOwnsEmail(userId, email)

    if (parts.length >= 4) {
      const full = [parts[0], parts[1], parts[2], parts[3]].join("|")
      return { kind: "hotmail", result: await this.hotmail143.getHotmailCode(full) }
    }
    if (parts.length === 1 || parts.length === 2) {
      return { kind: "outlook", result: await this.hotmail143.getOutlookCode(email) }
    }
    throw new BadRequestException(
      "Use email, email|password, or the full email|password|refresh_token|client_id line.",
    )
  }

  async getOutlookCode(userId: string, email: string) {
    const clean = email?.trim() ?? ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new BadRequestException("Enter a valid Outlook/Hotmail address.")
    }
    await this.assertOwnsEmail(userId, clean)
    return this.hotmail143.getOutlookCode(clean)
  }
}
