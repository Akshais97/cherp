import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateUserDto } from '../users/dto/create-user.dto'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Rate-limited password login wrapper delegating to Supabase Auth.' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1'
    return this.authService.login(dto, ipAddress)
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Creates a Supabase Auth user and ERP user record.' })
  register(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user)
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Delegates password reset email to Supabase Auth.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendPasswordReset(dto.email)
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Revokes current session and logs out user.' })
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user)
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Revokes all active sessions across all devices.' })
  logoutAll(@CurrentUser() user: RequestUser) {
    return this.authService.logoutAll(user)
  }
}
