import { Controller, Post, Body, UseGuards, Get, Request, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SkipWaf, Public } from '../security/decorators/security.decorators';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @SkipWaf()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @SkipWaf()
  async login(@Body() loginDto: LoginDto & { deviceId?: string }, @Req() req) {
    // Check if user has 2FA enabled
    const { twoFactorEnabled } = await this.authService.check2FA(loginDto.email);
    
    if (twoFactorEnabled) {
      // Validate credentials first
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        return { error: 'Invalid credentials' };
      }
      
      // Check if device is trusted (skip 2FA)
      if (loginDto.deviceId) {
        const isTrusted = await this.authService.isDeviceTrusted(user.id, loginDto.deviceId);
        if (isTrusted) {
          // Device is trusted, login directly
          return this.authService.login(loginDto);
        }
      }
      
      // Send 2FA code
      await this.authService.send2FACode(loginDto.email);
      return { 
        requires2FA: true, 
        message: 'Mã xác thực 2 bước đã được gửi đến email của bạn' 
      };
    }

    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  // ==================== FORGOT PASSWORD ====================

  @Post('forgot-password')
  @Public()
  @SkipWaf()
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-otp')
  @Public()
  @SkipWaf()
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  @Public()
  @SkipWaf()
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.otp, body.newPassword);
  }

  // ==================== 2FA ====================

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enable2FA(@Request() req) {
    return this.authService.enable2FA(req.user.id);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2FA(@Request() req, @Body('password') password: string) {
    return this.authService.disable2FA(req.user.id, password);
  }

  @Post('2fa/verify')
  @Public()
  @SkipWaf()
  async verify2FA(@Body() body: { email: string; code: string; deviceId?: string; trustDevice?: boolean }, @Req() req) {
    const deviceInfo = {
      deviceId: body.deviceId,
      trustDevice: body.trustDevice,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    return this.authService.verify2FAAndLogin(body.email, body.code, deviceInfo);
  }

  @Post('2fa/resend')
  @Public()
  @SkipWaf()
  async resend2FA(@Body('email') email: string) {
    return this.authService.send2FACode(email);
  }

  // ==================== CHANGE PASSWORD ====================

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  // ==================== DEVICE MANAGEMENT ====================

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async getDevices(@Request() req) {
    return this.authService.getUserDevices(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('devices/:deviceId/revoke')
  async revokeDevice(@Request() req, @Body() body: { deviceId: string }) {
    return this.authService.revokeDevice(req.user.id, body.deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('devices/revoke-all')
  async revokeAllDevices(@Request() req) {
    return this.authService.revokeAllDevices(req.user.id);
  }
}
