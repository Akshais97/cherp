import assert from 'node:assert/strict'
import { UnauthorizedException } from '@nestjs/common'
import { getBearerTokenFromRequest } from '../src/common/auth/bearer-token'

type TestRequest = {
  get?: (name: string) => string | undefined
  headers?: { authorization?: string | string[] }
  rawHeaders?: string[]
}

function token(request: TestRequest) {
  return getBearerTokenFromRequest(request as never)
}

assert.equal(
  token({ headers: { authorization: 'Bearer abc.123' }, rawHeaders: [] }),
  'abc.123',
)

assert.equal(
  token({ get: () => 'Bearer from-get', headers: {}, rawHeaders: [] }),
  'from-get',
)

assert.equal(
  token({ headers: { authorization: ['Bearer first', 'Bearer second'] } }),
  'first',
)

assert.equal(
  token({ headers: {}, rawHeaders: ['authorization', 'Bearer raw-token'] }),
  'raw-token',
)

assert.throws(
  () => token({ headers: {}, rawHeaders: [] }),
  (error) =>
    error instanceof UnauthorizedException &&
    error.message === 'Authorization header was not received by the API.',
)

assert.throws(
  () => token({ headers: { authorization: 'Token bad' }, rawHeaders: [] }),
  (error) =>
    error instanceof UnauthorizedException &&
    error.message === 'Authorization header must use Bearer scheme.',
)

console.log('auth-header tests passed')
