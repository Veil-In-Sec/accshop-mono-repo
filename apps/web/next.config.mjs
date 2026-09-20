/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_SERVER_URL ?? process.env.API_URL ?? "http://127.0.0.1:4000"

const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["107.172.127.198", "localhost"],
  async rewrites() {
    // Proxy the API through the web origin so the browser only ever talks to
    // port 3000 (no need to expose 4000 or deal with CORS). Requests to
    // /api/* are forwarded server-side to the NestJS API.
    // Destination is env-driven so Docker/prod API hosts keep working.
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ]
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
