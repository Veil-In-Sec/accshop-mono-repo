# VPS process manager (PM2). cPanel Node.js Selector users can ignore this
# and instead create one Node app with startup file server.js.
module.exports = {
  apps: [
    {
      name: "accshop-web",
      cwd: "./",
      script: "./server.js",
      env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "0.0.0.0" },
    },
  ],
}
