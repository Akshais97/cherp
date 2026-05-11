import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { RequestUser } from '../types/request-user.type'

type RequestWithUser = Request & {
  user?: RequestUser
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    return request.user
  },
)
