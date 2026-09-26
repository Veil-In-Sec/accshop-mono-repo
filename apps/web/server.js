// Production startup wrapper for cPanel Node.js Selector (Phusion Passenger)
// and plain VPS `node server.js`. Honors the PORT/HOST assigned by the host,
// unlike bare `next start` which defaults to port 3000 on localhost.
//
// cPanel setup: App Root = accshop-mono-repo/apps/web, Startup File = server.js
//
// Zero-config production defaults for accshop.online: every required env var
// falls back to a working value below, so the app boots with NO .env file
// and NO cPanel env-var setup. Explicit env vars (cPanel UI / .env) always
// win over these defaults.
process.env.DATABASE_URL ||= "postgresql://accshopo_shopuser:accshop_mamun@localhost:5432/accshopo_accshop"
process.env.SHADOW_DATABASE_URL ||= "postgresql://accshopo_shopuser:accshop_mamun@localhost:5432/accshopo_accshop"
process.env.BETTER_AUTH_URL ||= "https://accshop.online"
process.env.NEXT_PUBLIC_SITE_URL ||= "https://accshop.online"
process.env.WEB_ORIGINS ||= "https://accshop.online,https://www.accshop.online"
process.env.API_SERVER_URL ||= "http://127.0.0.1:3000"
process.env.BETTER_AUTH_SECRET ||= "CyfMPYh7xcZlozbDiMNBiVyGFA+QFcOuw1FnVKBVSYs="
process.env.ADMIN_PASSWORD ||= "AccMcpW6y3TwrfK#25"
process.env.TOTP_VAULT_KEY ||= "3Esrqvd0azqOvVdsFdbk3ISOnkOu8TbQ9p1rqx164+s="

const { createServer } = require("http")
const next = require("next")

const desiredPort = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOSTNAME ?? process.env.HOST ?? "0.0.0.0"
const dev = process.env.NODE_ENV !== "production"

const app = next({ dev, dir: __dirname, hostname, port: desiredPort })
const handle = app.getRequestHandler()

function listen(port) {
  const server = createServer((req, res) => handle(req, res))
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} in use, trying ${port + 1}...`)
      server.close()
      listen(port + 1)
    } else {
      throw err
    }
  })
  server.listen(port, hostname, () => {
    // Record the port THIS process actually bound (matters when the desired
    // port was taken and we auto-incremented, or when the host assigns ports
    // dynamically like cPanel Passenger). Server Actions use this for
    // server-to-self API fetches so they never hit a stale/wrong port.
    process.env.ACTUAL_PORT = String(port)
    console.log(`[web] AccShop web ready on http://${hostname}:${port}`)
  })
}

app.prepare().then(() => {
  listen(desiredPort)
})
