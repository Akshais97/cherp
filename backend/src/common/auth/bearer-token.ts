import { UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

export function getBearerTokenFromRequest(request: Request): string {
  const authorization = getAuthorizationHeader(request)

  if (!authorization) {
    throw new UnauthorizedException(
      'Authorization header was not received by the API.',
    )
  }

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    throw new UnauthorizedException('Authorization header must use Bearer scheme.')
  }

  const token = authorization.slice('Bearer '.length).trim()

  if (!token) {
    throw new UnauthorizedException('Bearer token is empty.')
  }

  return token
}

function getAuthorizationHeader(request: Request): string | undefined {
  const fromGet = request.get?.('authorization')

  if (fromGet) {
    return fromGet
  }

  const header = request.headers?.authorization

  if (Array.isArray(header)) {
    return header[0]
  }

  if (header) {
    return header
  }

  const rawHeaders = request.rawHeaders ?? []
  const rawIndex = rawHeaders.findIndex(
    (name) => name.toLowerCase() === 'authorization',
  )

  return rawIndex >= 0 ? rawHeaders[rawIndex + 1] : undefined
}
