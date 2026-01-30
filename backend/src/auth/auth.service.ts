import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password: _, ...result } = user;

    // Send welcome notification
    try {
      await this.notificationsService.sendWelcome(user.id, user.name || 'bạn');
    } catch (err) {
      // Don't fail registration if notification fails
      console.error('Failed to send welcome notification:', err);
    }

    // Generate token
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: result,
    };
  }

  // ==================== FORGOT PASSWORD ====================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'Nếu email tồn tại, bạn sẽ nhận được mã OTP' };
    }

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: otpExpires,
      },
    });

    // Send OTP via email
    const sent = await this.emailService.sendOTP(email, otp, user.name || 'bạn');
    if (!sent) {
      throw new BadRequestException('Không thể gửi email. Vui lòng thử lại sau.');
    }

    return { message: 'Mã OTP đã được gửi đến email của bạn' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      throw new BadRequestException('Không tìm thấy yêu cầu đặt lại mật khẩu');
    }

    if (new Date() > user.resetOtpExpires) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    if (user.resetOtp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    return { valid: true, message: 'Mã OTP hợp lệ' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    // Verify OTP first
    await this.verifyOtp(email, otp);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // ==================== 2FA ====================

  async enable2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: 'Đã bật xác thực 2 bước', enabled: true };
  }

  async disable2FA(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorCode: null,
        twoFactorExpires: null,
      },
    });

    return { message: 'Đã tắt xác thực 2 bước', enabled: false };
  }

  async send2FACode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('Không thể gửi mã 2FA');
    }

    // Generate 2FA code
    const code = this.generateOTP();
    const codeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorExpires: codeExpires,
      },
    });

    // Send via email
    await this.emailService.send2FACode(email, code, user.name || 'bạn');

    return { message: 'Mã xác thực đã được gửi đến email' };
  }

  async verify2FAAndLogin(
    email: string, 
    code: string,
    deviceInfo?: {
      deviceId?: string;
      trustDevice?: boolean;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestException('Email không hợp lệ');
    }
    
    const user = await this.prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    if (!user.twoFactorCode || !user.twoFactorExpires) {
      throw new BadRequestException('Không tìm thấy mã xác thực');
    }

    if (new Date() > user.twoFactorExpires) {
      throw new BadRequestException('Mã xác thực đã hết hạn');
    }

    if (user.twoFactorCode !== code) {
      throw new BadRequestException('Mã xác thực không chính xác');
    }

    // Clear 2FA code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpires: null,
      },
    });

    // Trust device for 24 hours if requested
    if (deviceInfo?.trustDevice && deviceInfo?.deviceId) {
      await this.trustDevice(user.id, deviceInfo.deviceId, deviceInfo.ipAddress, deviceInfo.userAgent);
    }

    // Generate token
    const { password: _, ...result } = user;
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: result,
    };
  }

  // Check if device is trusted (skip 2FA)
  async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.prisma.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device || !device.isTrusted || !device.trustExpires) {
      return false;
    }

    // Check if trust has expired
    if (new Date() > device.trustExpires) {
      // Trust expired, update device
      await this.prisma.userDevice.update({
        where: { id: device.id },
        data: { isTrusted: false, trustExpires: null },
      });
      return false;
    }

    return true;
  }

  // Trust a device for 24 hours
  async trustDevice(userId: string, deviceId: string, ipAddress?: string, userAgent?: string) {
    const trustExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Parse user agent for device info
    const deviceInfo = this.parseUserAgent(userAgent || '');

    await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: {
        isTrusted: true,
        trustExpires,
        lastActive: new Date(),
        ipAddress,
        ...deviceInfo,
      },
      create: {
        userId,
        deviceId,
        isTrusted: true,
        trustExpires,
        ipAddress,
        ...deviceInfo,
      },
    });
  }

  // Parse user agent string
  private parseUserAgent(userAgent: string): { deviceName?: string; deviceType?: string; browser?: string; os?: string } {
    const result: { deviceName?: string; deviceType?: string; browser?: string; os?: string } = {};

    // Simple parsing - can be improved with a library like ua-parser-js
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      result.deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      result.deviceType = 'tablet';
    } else {
      result.deviceType = 'desktop';
    }

    // Browser detection
    if (userAgent.includes('Chrome')) result.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) result.browser = 'Firefox';
    else if (userAgent.includes('Safari')) result.browser = 'Safari';
    else if (userAgent.includes('Edge')) result.browser = 'Edge';
    else result.browser = 'Unknown';

    // OS detection
    if (userAgent.includes('Windows')) result.os = 'Windows';
    else if (userAgent.includes('Mac')) result.os = 'macOS';
    else if (userAgent.includes('Linux')) result.os = 'Linux';
    else if (userAgent.includes('Android')) result.os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) result.os = 'iOS';
    else result.os = 'Unknown';

    result.deviceName = `${result.browser} on ${result.os}`;

    return result;
  }

  // Check if user has 2FA enabled
  async check2FA(email: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      select: { twoFactorEnabled: true }
    });
    return { twoFactorEnabled: user?.twoFactorEnabled || false };
  }

  // ==================== CHANGE PASSWORD ====================

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ==================== DEVICE MANAGEMENT ====================

  async getUserDevices(userId: string) {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActive: 'desc' },
    });

    return devices.map(device => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName || 'Unknown Device',
      deviceType: device.deviceType || 'unknown',
      browser: device.browser,
      os: device.os,
      ipAddress: device.ipAddress,
      location: device.location,
      lastActive: device.lastActive,
      createdAt: device.createdAt,
      isTrusted: device.isTrusted,
      trustExpires: device.trustExpires,
    }));
  }

  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.userDevice.update({
      where: { id: device.id },
      data: { 
        isActive: false,
        isTrusted: false,
        trustExpires: null,
      },
    });

    return { message: 'Device revoked successfully' };
  }

  async revokeAllDevices(userId: string) {
    await this.prisma.userDevice.updateMany({
      where: { userId },
      data: { 
        isActive: false,
        isTrusted: false,
        trustExpires: null,
      },
    });

    return { message: 'All devices revoked successfully' };
  }

  // Update device activity
  async updateDeviceActivity(userId: string, deviceId: string, ipAddress?: string, userAgent?: string) {
    const deviceInfo = this.parseUserAgent(userAgent || '');
    
    await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: {
        lastActive: new Date(),
        ipAddress,
        ...deviceInfo,
      },
      create: {
        userId,
        deviceId,
        ipAddress,
        isActive: true,
        ...deviceInfo,
      },
    });
  }
}
