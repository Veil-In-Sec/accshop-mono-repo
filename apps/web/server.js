// Production startup wrapper for cPanel Node.js Selector (Phusion Passenger)
// and plain VPS `node server.js`. Honors the PORT/HOST assigned by the host,
// unlike bare `next start` which defaults to port 3000 on localhost.
//
// cPanel setup: App Root = accshop-mono-repo/apps/web, Startup File = server.js
const { createServer } = require("http")
const next = require("next")

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOSTNAME ?? process.env.HOST ?? "0.0.0.0"
const dev = process.env.NODE_ENV !== "production"

const app = next({ dev, dir: __dirname, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`[web] AccShop web ready on http://${hostname}:${port}`)
  })
})
