import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UserRole } from '../enums/user-role.enum'
import { RequestUser } from '../types/request-user.type'

type RequestWithUser = Request & {
  user?: RequestUser
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []

    if (requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const user = request.user

    if (user && requiredRoles.includes(user.role)) {
      return true
    }

    throw new ForbiddenException('User role is not allowed for this route.')
  }
}
