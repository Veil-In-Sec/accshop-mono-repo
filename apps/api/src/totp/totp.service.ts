import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"
import { TotpVaultService } from "./vault.service"
import { CreateTotpKeyDto, UpdateTotpKeyDto } from "./dto/totp.dto"
import {
  TOTP_ALGORITHMS,
  assertValidSecret,
  generateTotp,
  normalizeSecret,
  parseOtpauthUri,
  type TotpAlgorithm,
} from "./totp-crypto"

const MAX_KEYS_PER_USER = 50

function toMeta(row: {
  id: number
  label: string
  issuer: string
  algorithm: string
  digits: number
  period: number
  createdAt: Date
}) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    createdAt: row.createdAt.toISOString(),
  }
}

@Injectable()
export class TotpService {
  /** In-memory sliding-window counters (per single instance). */
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: TotpVaultService,
  ) {}

  private checkRate(scope: string, limit: number, windowMs: number) {
    const now = Date.now()
    const kept = (this.hits.get(scope) ?? []).filter((t) => now - t < windowMs)
    if (kept.length >= limit) {
      throw new HttpException("Too many requests — slow down and retry.", 429)
    }
    kept.push(now)
    this.hits.set(scope, kept)
    if (this.hits.size > 20000) {
      for (const [k, v] of this.hits) {
        if (v.length === 0 || now - v[v.length - 1] > windowMs) this.hits.delete(k)
        if (this.hits.size <= 10000) break
      }
    }
  }

  /** Saved keys (metadata only — secrets never leave the vault). */
  async listKeys(userId: string) {
    const rows = await this.prisma.totpKey.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
    return rows.map(toMeta)
  }

  async createKey(userId: string, dto: CreateTotpKeyDto) {
    this.checkRate(`totp:create:${userId}`, 30, 60 * 60 * 1000)

    const count = await this.prisma.totpKey.count({ where: { userId } })
    if (count >= MAX_KEYS_PER_USER) {
      throw new BadRequestException(
        `You can save up to ${MAX_KEYS_PER_USER} keys. Delete one to add another.`,
      )
    }

    let label = dto.label?.trim() ?? ""
    let issuer = dto.issuer?.trim() ?? ""
    let secret = dto.secret.trim()
    let algorithm: TotpAlgorithm = dto.algorithm ?? "SHA1"
    let digits = dto.digits ?? 6
    let period = dto.period ?? 30

    // Accept a full otpauth:// URI (from QR scans) as well as raw secrets.
    // Explicit fields always win over URI values.
    if (/^otpauth:\/\//i.test(secret)) {
      const parsed = parseOtpauthUri(secret)
      if (!label) label = parsed.label
      if (!issuer) issuer = parsed.issuer
      secret = parsed.secret
      if (!dto.algorithm) algorithm = parsed.algorithm
      if (dto.digits === undefined) digits = parsed.digits
      if (dto.period === undefined) period = parsed.period
    }
    if (!label) label = issuer || "Untitled key"

    secret = assertValidSecret(secret)
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(algorithm)) {
      throw new BadRequestException("Unsupported algorithm.")
    }

    const created = await this.prisma.totpKey.create({
      data: {
        userId,
        label: label.slice(0, 80),
        issuer: issuer.slice(0, 80),
        secretEncrypted: this.vault.encrypt(secret),
        algorithm,
        digits,
        period,
      },
    })

    // Immediate preview so the UI can confirm the key works.
    const preview = generateTotp(secret, { algorithm, digits, period })
    return { ...toMeta(created), preview }
  }

  async renameKey(userId: string, id: number, dto: UpdateTotpKeyDto) {
    const data: { label?: string; issuer?: string } = {}
    if (dto.label !== undefined) {
      const trimmed = dto.label.trim()
      if (!trimmed) throw new BadRequestException("Label cannot be empty.")
      data.label = trimmed
    }
    if (dto.issuer !== undefined) data.issuer = dto.issuer.trim()
    if (Object.keys(data).length === 0) {
      throw new BadRequestException("Nothing to update.")
    }

    // updateMany keeps the ownership check atomic (no TOCTOU, no enumeration).
    const res = await this.prisma.totpKey.updateMany({
      where: { id, userId },
      data,
    })
    if (res.count === 0) throw new NotFoundException("Key not found.")
    const row = await this.prisma.totpKey.findUniqueOrThrow({ where: { id } })
    return toMeta(row)
  }

  async deleteKey(userId: string, id: number) {
    const res = await this.prisma.totpKey.deleteMany({ where: { id, userId } })
    if (res.count === 0) throw new NotFoundException("Key not found.")
    return { success: true }
  }

  /** Current live code for every saved key — one request per refresh cycle. */
  async currentCodes(userId: string) {
    this.checkRate(`totp:codes:${userId}`, 120, 60 * 1000)

    const rows = await this.prisma.totpKey.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
    return rows.map((row) => {
      const secret = this.vault.decrypt(row.secretEncrypted)
      const algorithm = (TOTP_ALGORITHMS as readonly string[]).includes(row.algorithm)
        ? (row.algorithm as TotpAlgorithm)
        : "SHA1"
      const { code, secondsRemaining } = generateTotp(secret, {
        algorithm,
        digits: row.digits,
        period: row.period,
      })
      return {
        id: row.id,
        code,
        secondsRemaining,
        period: row.period,
        digits: row.digits,
      }
    })
  }
}
