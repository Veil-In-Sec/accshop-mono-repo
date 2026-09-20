import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException, BadRequestException } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import type { Response } from "express"

/** Maps common Prisma errors to 400/404 instead of leaking 500s. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    if (exception.code === "P2025") {
      const err = new NotFoundException("Record not found.")
      return res.status(err.getStatus()).json(err.getResponse())
    }
    if (exception.code === "P2002") {
      const target = (exception.meta?.target as string[] | undefined)?.join(", ") ?? "field"
      const err = new BadRequestException(`Duplicate value for ${target}.`)
      return res.status(err.getStatus()).json(err.getResponse())
    }
    const err = new BadRequestException("Database request failed.")
    return res.status(err.getStatus()).json(err.getResponse())
  }
}
