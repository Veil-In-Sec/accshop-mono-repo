// ---------------------------------------------------------------------------
// AccShop hardcoded configuration — single source of truth.
// NO .env files are used anywhere. Edit the values below to change the app.
//
// PRODUCTION (cPanel shared hosting, https://accshop.online):
// database accshopo_accshop, app runs behind Apache/Passenger on port 80.
// Just upload the repo, npm install, build, start — no env setup needed.
// ---------------------------------------------------------------------------

export const CONFIG = {
  // PostgreSQL on the cPanel host (same machine → localhost).
  DATABASE_URL: "postgresql://accshopo_shopuser:accshop_mamun@localhost:5432/accshopo_accshop",
  SHADOW_DATABASE_URL: "postgresql://accshopo_shopuser:accshop_mamun@localhost:5432/accshopo_accshop",

  // Better Auth — canonical public origin of the app (auth cookies same-origin).
  BETTER_AUTH_URL: "https://accshop.online",
  BETTER_AUTH_SECRET: "8f4c1d9e7a2b5c6e3f0a8d4b9c1e7f2a6d3b8c5e0f9a4d7b2c6e1f3a5d8b0c9e",

  // Admin panel password (admin_session HMAC, proxy.ts + lib/server/admin.ts).
  ADMIN_PASSWORD: "accshop_mamun_vis_890",

  // TOTP vault key (AES-256, encrypts customer 2FA secrets). 64 hex chars.
  // NEVER change this on a live database — stored 2FA secrets can't be decrypted otherwise.
  TOTP_VAULT_KEY: "bf2b0be2d91dfe12f8e7453a3f4a71c52813405887538dd28f5b0ad2163e6041",

  // Allowed browser origins (better-auth trustedOrigins).
  WEB_ORIGINS: "https://accshop.online,https://www.accshop.online",

  // Canonical public origin of the web app (SEO, sitemap, metadata).
  NEXT_PUBLIC_SITE_URL: "https://accshop.online",

  // Dev origins for `next dev` cross-origin warnings (dev only, ignored in prod).
  ALLOWED_DEV_ORIGINS: "localhost,127.0.0.1",

  // GraphMail supplier endpoint (verification-code lookups).
  GRAPH_MAIL_API_URL: "https://tools.dongvanfb.net/api/graph_code",

  // Server Action allowed origins (reverse-proxy deployments).
  SERVER_ACTIONS_ALLOWED_ORIGINS: ["accshop.online", "www.accshop.online"],
} as const

// NOTE: nothing in the app reads process.env for configuration anymore —
// the Prisma datasource URL is a literal in prisma/schema.prisma and the
// better-auth secret is passed explicitly in lib/server/auth.ts. The only
// remaining process.env reads are host-provided runtime values (PORT,
// HOSTNAME, NODE_ENV), never secrets or .env files.
