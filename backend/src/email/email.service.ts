import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  async sendOTP(email: string, otp: string, name: string = 'bạn'): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"BachHoaMMO" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Mã OTP đặt lại mật khẩu - BachHoaMMO',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">BachHoaMMO</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Chợ tài khoản số uy tín #1 Việt Nam</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px;">
                  <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Xin chào ${name},</h2>
                  
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản BachHoaMMO. Vui lòng sử dụng mã OTP bên dưới để xác nhận:
                  </p>
                  
                  <!-- OTP Box -->
                  <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #0369a1; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Mã OTP của bạn</p>
                    <p style="color: #1e40af; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                  </div>
                  
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      <strong>⚠️ Lưu ý:</strong> Mã OTP có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
                    </p>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi nếu bạn lo ngại về bảo mật tài khoản.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                    Email này được gửi tự động từ BachHoaMMO
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2026 BachHoaMMO. Tất cả quyền được bảo lưu.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`[Email] OTP sent to ${email}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send OTP:', error);
      return false;
    }
  }

  async send2FACode(email: string, code: string, name: string = 'bạn'): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"BachHoaMMO" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Mã xác thực 2FA - BachHoaMMO',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Xác thực 2FA</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #1f2937; margin: 0 0 16px 0;">Xin chào ${name},</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Mã xác thực 2FA cho đăng nhập tài khoản của bạn:
                  </p>
                  <div style="background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #065f46; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Mã có hiệu lực trong <strong>5 phút</strong>.
                  </p>
                </div>
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 BachHoaMMO</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send 2FA code:', error);
      return false;
    }
  }

  async sendWelcome(email: string, name: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"BachHoaMMO" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Chào mừng bạn đến với BachHoaMMO! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Chào mừng!</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #1f2937; margin: 0 0 16px 0;">Xin chào ${name},</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Cảm ơn bạn đã đăng ký tài khoản tại BachHoaMMO - Chợ tài khoản số uy tín #1 Việt Nam!
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Bắt đầu khám phá hàng ngàn sản phẩm chất lượng với giá tốt nhất.
                  </p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                      Bắt đầu mua sắm
                    </a>
                  </div>
                </div>
                <div style="background-color: #f9fafb; padding: 24px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 BachHoaMMO</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return false;
    }
  }
}
