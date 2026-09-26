/** @type {import('next').NextConfig} */
// Dev origins are env-driven so prod IPs/domains don't leak into the repo.
// Example: ALLOWED_DEV_ORIGINS="localhost,127.0.0.1,accshop.online"
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "localhost,127.0.0.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig = {
  // HostSeba Node.js app path (SSR + API routes + Server Actions).
  // Must stay SSR: NO `output: 'export'`. Static export + FTP out/ -> public_html
  // would delete app/api/* (78 routes), proxy.ts middleware, and Prisma access.
  // Requires a Node.js server (cPanel Node.js Selector / VPS + PM2).
  // Single-app merge: API lives in app/api/* locally, no rewrites needed.
  images: {
    // cPanel shared hosting has no Image Optimization server — keep
    // unoptimized. On a VPS with `next start` you may set false + remotePatterns.
    unoptimized: true,
  },
  allowedDevOrigins,
  experimental: {
    // Server Actions originate from the browser origin. Behind a reverse
    // proxy (cPanel Apache/Passenger) the Host seen by Node can differ, so
    // allowlist the public origins explicitly instead of relying on Host.
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
