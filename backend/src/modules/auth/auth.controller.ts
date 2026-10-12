import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendSmsCodeDto } from './dto/owner-login.dto';
import { VerifySmsCodeDto } from './dto/verify-sms.dto';
import { AdminLoginDto, AdminVerify2faDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser, AuthenticatedUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('owner/send-code')
  @ApiOperation({ summary: 'Send SMS verification code to shop owner (O1)' })
  @ApiResponse({ status: 200, description: 'SMS code sent' })
  async sendSmsCode(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendSmsCode(dto.phone);
  }

  @Post('owner/verify-code')
  @ApiOperation({ summary: 'Verify SMS code and receive JWT session (O2)' })
  @ApiResponse({ status: 200, description: 'Verification successful, returns access token' })
  async verifySmsCode(@Body() dto: VerifySmsCodeDto) {
    return this.authService.verifySmsCode(dto.phone, dto.code);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Platform administrator email and password login' })
  @ApiResponse({ status: 200, description: 'Admin login success or 2FA required' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Post('admin/verify-2fa')
  @ApiOperation({ summary: 'Platform administrator verify secondary 2FA code' })
  @ApiResponse({ status: 200, description: 'Returns administrator access token' })
  async adminVerify2fa(@Body() dto: AdminVerify2faDto) {
    return this.authService.adminVerify2fa(dto.tempToken, dto.code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user and shop session' })
  async getMe(@GetUser() user: AuthenticatedUser) {
    return {
      user,
    };
  }
}
