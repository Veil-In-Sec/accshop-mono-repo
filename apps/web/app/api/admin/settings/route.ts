import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { prismaError, readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function optStr(v: unknown, max: number): string | undefined | null {
  // Returns undefined when absent, null when invalid, otherwise the string.
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || v.length > max) return null;
  return v;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function isValidUrl(v: string): boolean {
  try {
    new URL(v);
    return true;
  } catch {
    try {
      const u = new URL(`http://${v}`);
      return u.hostname.includes(".") || u.hostname === "localhost";
    } catch {
      return false;
    }
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const row = await db.siteSetting.findUnique({ where: { id: 1 } });
  return Response.json(
    row
      ? {
          currencySymbol: row.currencySymbol,
          usdToLocalRate: Number(row.usdToLocalRate),
          minDepositUsd: Number(row.minDepositUsd),
          minTransferAmount: Number(row.minTransferAmount),
          initialBalance: Number(row.initialBalance),
          siteName: row.siteName,
          supportUrl: row.supportUrl ?? "",
          heroTitle: row.heroTitle ?? "",
          heroSubtitle: row.heroSubtitle ?? "",
          footerText: row.footerText ?? "",
          hotmailApiKey: row.hotmailApiKey ?? "",
          hotmailApiBaseUrl: row.hotmailApiBaseUrl ?? "",
          bulkmailApiKey: row.bulkmailApiKey ?? "",
          bulkmailApiBaseUrl: row.bulkmailApiBaseUrl ?? "",
          fxLiveEnabled: row.fxLiveEnabled ?? true,
          heroBadge: row.heroBadge ?? "",
          aboutTitle: row.aboutTitle ?? "",
          aboutSubtitle: row.aboutSubtitle ?? "",
          aboutHeading: row.aboutHeading ?? "",
          aboutPara1: row.aboutPara1 ?? "",
          aboutPara2: row.aboutPara2 ?? "",
          stat1Value: row.stat1Value ?? "",
          stat1Label: row.stat1Label ?? "",
          stat2Value: row.stat2Value ?? "",
          stat2Label: row.stat2Label ?? "",
          stat3Value: row.stat3Value ?? "",
          stat3Label: row.stat3Label ?? "",
          stat4Value: row.stat4Value ?? "",
          stat4Label: row.stat4Label ?? "",
          trustTitle: row.trustTitle ?? "",
          trustDesc: row.trustDesc ?? "",
          trustBullets: row.trustBullets ?? "",
          valuesTitle: row.valuesTitle ?? "",
          valuesSubtitle: row.valuesSubtitle ?? "",
          featuresTitle: row.featuresTitle ?? "",
          featuresSubtitle: row.featuresSubtitle ?? "",
          teamTitle: row.teamTitle ?? "",
          teamDescription: row.teamDescription ?? "",
          teamStat1Value: row.teamStat1Value ?? "",
          teamStat1Label: row.teamStat1Label ?? "",
          teamStat2Value: row.teamStat2Value ?? "",
          teamStat2Label: row.teamStat2Label ?? "",
          teamImageUrl: row.teamImageUrl ?? "",
          testimonialsTitle: row.testimonialsTitle ?? "",
          testimonialsSubtitle: row.testimonialsSubtitle ?? "",
          faqTitle: row.faqTitle ?? "",
          ctaBadge: row.ctaBadge ?? "",
          ctaTitle: row.ctaTitle ?? "",
          ctaSubtitle: row.ctaSubtitle ?? "",
          contactPhone: row.contactPhone ?? "",
          contactSupportEmail: row.contactSupportEmail ?? "",
          contactSalesEmail: row.contactSalesEmail ?? "",
        }
      : null,
    );
  } catch (e) {
    return routeError(e);
  }
}

// Max lengths mirror UpdateSettingsDto's @MaxLength constraints.
const OPTIONAL_LIMITS: Record<string, number> = {
  heroTitle: 2000,
  heroSubtitle: 2000,
  footerText: 2000,
  heroBadge: 120,
  aboutTitle: 200,
  aboutSubtitle: 500,
  aboutHeading: 200,
  aboutPara1: 2000,
  aboutPara2: 2000,
  stat1Value: 40,
  stat1Label: 80,
  stat2Value: 40,
  stat2Label: 80,
  stat3Value: 40,
  stat3Label: 80,
  stat4Value: 40,
  stat4Label: 80,
  trustTitle: 200,
  trustDesc: 500,
  trustBullets: 2000,
  valuesTitle: 200,
  valuesSubtitle: 500,
  featuresTitle: 200,
  featuresSubtitle: 500,
  teamTitle: 200,
  teamDescription: 1000,
  teamStat1Value: 80,
  teamStat1Label: 120,
  teamStat2Value: 80,
  teamStat2Label: 120,
  teamImageUrl: 500,
  testimonialsTitle: 200,
  testimonialsSubtitle: 500,
  faqTitle: 120,
  ctaBadge: 200,
  ctaTitle: 200,
  ctaSubtitle: 500,
  contactPhone: 80,
  contactSupportEmail: 120,
  contactSalesEmail: 120,
};

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const body = await readJson(req);
    if (!isRecord(body)) throw jsonError(400, "Invalid request body.");

    // Required fields (mirror UpdateSettingsDto).
    const currencySymbol = body.currencySymbol;
    if (typeof currencySymbol !== "string" || currencySymbol.length < 1 || currencySymbol.length > 8) {
      throw jsonError(400, "currencySymbol must be a string of 1-8 characters.");
    }
    const siteName = body.siteName;
    if (typeof siteName !== "string" || siteName.length < 1 || siteName.length > 80) {
      throw jsonError(400, "siteName must be a string of 1-80 characters.");
    }
    const numbers: Record<string, number> = {};
    for (const key of ["usdToLocalRate", "minDepositUsd", "minTransferAmount", "initialBalance"]) {
      const n = coerceNumber(body[key]);
      if (n === null || n < 0 || n > 1_000_000) throw jsonError(400, `${key} must be a number between 0 and 1000000.`);
      numbers[key] = n;
    }

    // Optional URL field — empty string clears it (frontend sends "" for empty inputs).
    let supportUrl: string | undefined;
    if (typeof body.supportUrl === "string" && body.supportUrl.trim() === "") {
      supportUrl = "";
    } else if (body.supportUrl !== undefined && body.supportUrl !== null) {
      if (typeof body.supportUrl !== "string" || body.supportUrl.length > 500 || !isValidUrl(body.supportUrl)) {
        throw jsonError(400, "supportUrl must be a valid URL of max 500 characters.");
      }
      supportUrl = body.supportUrl;
    }

  // Optional string fields.
  const optionals: Record<string, string | undefined> = {};
  for (const [key, max] of Object.entries(OPTIONAL_LIMITS)) {
    const v = optStr(body[key], max);
    if (v === null) throw jsonError(400, `${key} must be a string of max ${max} characters.`);
    if (v !== undefined) optionals[key] = v;
  }

  const input = {
    currencySymbol,
    usdToLocalRate: numbers.usdToLocalRate,
    minDepositUsd: numbers.minDepositUsd,
    minTransferAmount: numbers.minTransferAmount,
    initialBalance: numbers.initialBalance,
    siteName,
    supportUrl,
    ...optionals,
  } as {
    currencySymbol: string;
    usdToLocalRate: number;
    minDepositUsd: number;
    minTransferAmount: number;
    initialBalance: number;
    siteName: string;
    supportUrl?: string;
    [k: string]: string | number | undefined;
  };

  const orNull = (v?: string) => v?.trim() || null;
  const settingsData = {
    currencySymbol: input.currencySymbol,
    usdToLocalRate: input.usdToLocalRate.toFixed(12),
    minDepositUsd: input.minDepositUsd.toFixed(2),
    minTransferAmount: input.minTransferAmount.toFixed(2),
    initialBalance: input.initialBalance.toFixed(2),
    siteName: input.siteName,
    supportUrl: input.supportUrl || null,
    heroTitle: (input.heroTitle as string | undefined) || null,
    heroSubtitle: (input.heroSubtitle as string | undefined) || null,
    footerText: (input.footerText as string | undefined) || null,
    heroBadge: orNull(input.heroBadge as string | undefined),
    aboutTitle: orNull(input.aboutTitle as string | undefined),
    aboutSubtitle: orNull(input.aboutSubtitle as string | undefined),
    aboutHeading: orNull(input.aboutHeading as string | undefined),
    aboutPara1: orNull(input.aboutPara1 as string | undefined),
    aboutPara2: orNull(input.aboutPara2 as string | undefined),
    stat1Value: orNull(input.stat1Value as string | undefined),
    stat1Label: orNull(input.stat1Label as string | undefined),
    stat2Value: orNull(input.stat2Value as string | undefined),
    stat2Label: orNull(input.stat2Label as string | undefined),
    stat3Value: orNull(input.stat3Value as string | undefined),
    stat3Label: orNull(input.stat3Label as string | undefined),
    stat4Value: orNull(input.stat4Value as string | undefined),
    stat4Label: orNull(input.stat4Label as string | undefined),
    trustTitle: orNull(input.trustTitle as string | undefined),
    trustDesc: orNull(input.trustDesc as string | undefined),
    trustBullets: orNull(input.trustBullets as string | undefined),
    valuesTitle: orNull(input.valuesTitle as string | undefined),
    valuesSubtitle: orNull(input.valuesSubtitle as string | undefined),
    featuresTitle: orNull(input.featuresTitle as string | undefined),
    featuresSubtitle: orNull(input.featuresSubtitle as string | undefined),
    teamTitle: orNull(input.teamTitle as string | undefined),
    teamDescription: orNull(input.teamDescription as string | undefined),
    teamStat1Value: orNull(input.teamStat1Value as string | undefined),
    teamStat1Label: orNull(input.teamStat1Label as string | undefined),
    teamStat2Value: orNull(input.teamStat2Value as string | undefined),
    teamStat2Label: orNull(input.teamStat2Label as string | undefined),
    teamImageUrl: orNull(input.teamImageUrl as string | undefined),
    testimonialsTitle: orNull(input.testimonialsTitle as string | undefined),
    testimonialsSubtitle: orNull(input.testimonialsSubtitle as string | undefined),
    faqTitle: orNull(input.faqTitle as string | undefined),
    ctaBadge: orNull(input.ctaBadge as string | undefined),
    ctaTitle: orNull(input.ctaTitle as string | undefined),
    ctaSubtitle: orNull(input.ctaSubtitle as string | undefined),
    contactPhone: orNull(input.contactPhone as string | undefined),
    contactSupportEmail: orNull(input.contactSupportEmail as string | undefined),
    contactSalesEmail: orNull(input.contactSalesEmail as string | undefined),
    updatedAt: new Date(),
  };

  try {
    await db.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...settingsData },
      update: settingsData,
    });
  } catch (error) {
    const mapped = prismaError(error);
    if (mapped) return mapped;
    throw error;
  }

    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}
