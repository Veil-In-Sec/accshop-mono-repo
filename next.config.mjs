/** @type {import('next').NextConfig} */
// All values hardcoded in lib/config.ts — no .env files are used.
// Server-Actions-only app: no app/api/* routes, all data via Server Actions.
const allowedDevOrigins = "localhost,127.0.0.1"
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig = {
  // SSR Next.js app (Server Actions + Prisma, no static export).
  // Requires a Node.js server (cPanel Node.js Selector / VPS + PM2).
  images: {
    unoptimized: true,
  },
  allowedDevOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: ["accshop.online", "www.accshop.online"],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
