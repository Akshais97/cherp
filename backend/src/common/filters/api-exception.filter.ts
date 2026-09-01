import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Response } from 'express'

type ErrorPayload = {
  message: string | string[]
  error: string
  statusCode: number
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const payload = this.toPayload(exception)

    if (payload.statusCode >= 500) {
      console.error('[ApiExceptionFilter] Server Exception:', exception)
    }

    response.status(payload.statusCode).json(payload)
  }

  private toPayload(exception: unknown): ErrorPayload {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'object' && response !== null) {
        const data = response as Partial<ErrorPayload>
        return {
          message: data.message ?? exception.message,
          error: data.error ?? exception.name,
          statusCode,
        }
      }

      return {
        message: String(response),
        error: exception.name,
        statusCode,
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnownError(exception)
    }

    return {
      message: 'Unexpected server error.',
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    }
  }

  private fromPrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorPayload {
    console.error(`[ApiExceptionFilter] Prisma Known Error (${exception.code}):`, exception.message)

    if (exception.code === 'P2002') {
      return {
        message: 'A record with this value already exists.',
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      }
    }

    if (exception.code === 'P2025') {
      return {
        message: 'Record not found.',
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      }
    }

    if (exception.code === 'P2022') {
      return {
        message: 'Database schema is missing a required column. Run the latest Supabase SQL setup script.',
        error: 'Database Schema Mismatch',
        statusCode: HttpStatus.BAD_REQUEST,
      }
    }

    return {
      message: exception.message || 'Database operation failed.',
      error: 'Bad Request',
      statusCode: HttpStatus.BAD_REQUEST,
    }
  }
}
