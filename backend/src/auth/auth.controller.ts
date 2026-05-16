import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

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
  @ApiOkResponse({ description: 'Client should clear local session state.' })
  logout(@CurrentUser() user: RequestUser) {
    return {
      user_id: user.id,
      message: 'Session accepted for client-side invalidation.',
    }
  }
}
