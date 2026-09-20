import "reflect-metadata"

import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { json } from "express"
import cookieParser from "cookie-parser"
import { toNodeHandler } from "better-auth/node"

import { auth } from "./auth/better-auth"
import { AppModule } from "./app.module"
import { PrismaExceptionFilter } from "./common/prisma-exception.filter"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  })

  const webOrigins = (process.env.WEB_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  // Enable CORS BEFORE mounting Better Auth so that /api/auth/* responses
  // include the required CORS headers. Without this, the browser blocks the
  // cross-origin sign-up / login calls and the client hangs.
  // Note: wildcard "*" is not allowed with credentials:true — list explicit headers.
  app.enableCors({
    origin: webOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })

  app.use(cookieParser())

  // Mount Better Auth so it receives parsed cookies for session guards.
  app.use("/api/auth", toNodeHandler(auth))

  app.use(json({ limit: "1mb" }))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  )
  app.useGlobalFilters(new PrismaExceptionFilter())

  app.setGlobalPrefix("api")
  app.enableShutdownHooks()

  // Trust the first proxy (Next.js rewrites / nginx) so secure cookies
  // and client IPs behave correctly in production.
  try {
    app.getHttpAdapter().getInstance().set("trust proxy", 1)
  } catch {
    /* non-express adapter — ignore */
  }

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port)
  console.log(`[api] AccShop API listening on http://localhost:${port}`)
}

void bootstrap()
