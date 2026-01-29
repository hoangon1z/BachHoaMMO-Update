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

  async verify2FAAndLogin(email: string, code: string) {
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
}
