import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type EmailProvider = 'sendgrid' | 'resend' | 'brevo' | 'gmail' | 'mock';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: EmailProvider = 'mock';
  private sendgridApiKey: string | null = null;
  private resendApiKey: string | null = null;
  private brevoApiKey: string | null = null;
  private fromEmail: string = 'noreply@bachhoammo.store';
  private fromName: string = 'BachHoaMMO';

  constructor() {
    const emailProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    // SendGrid (HTTP API)
    if (emailProvider === 'sendgrid' && sendgridKey) {
      this.provider = 'sendgrid';
      this.sendgridApiKey = sendgridKey;
      this.fromEmail = process.env.SENDGRID_FROM_EMAIL || gmailUser || this.fromEmail;
      this.fromName = process.env.SENDGRID_FROM_NAME || this.fromName;
      console.log('[Email] SendGrid configured');
    }
    // Resend (HTTP API) - https://resend.com
    else if (emailProvider === 'resend' && resendKey) {
      this.provider = 'resend';
      this.resendApiKey = resendKey;
      this.fromEmail = process.env.RESEND_FROM_EMAIL || gmailUser || this.fromEmail;
      this.fromName = process.env.RESEND_FROM_NAME || this.fromName;
      console.log('[Email] Resend configured');
    }
    // Brevo / Sendinblue (HTTP API) - https://brevo.com
    else if ((emailProvider === 'brevo' || emailProvider === 'sendinblue') && brevoKey) {
      this.provider = 'brevo';
      this.brevoApiKey = brevoKey;
      this.fromEmail = process.env.BREVO_FROM_EMAIL || gmailUser || this.fromEmail;
      this.fromName = process.env.BREVO_FROM_NAME || this.fromName;
      console.log('[Email] Brevo configured');
    }
    // Gmail SMTP (cần mở port 465/587)
    else if (gmailUser && gmailPass) {
      this.provider = 'gmail';
      this.fromEmail = gmailUser;
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      console.log('[Email] Gmail SMTP configured');
    } else {
      this.provider = 'mock';
      console.warn('[Email] No provider. Set EMAIL_PROVIDER=sendgrid|resend|brevo + API key, or GMAIL_*');
    }
  }

  private get isConfigured(): boolean {
    return ['sendgrid', 'resend', 'brevo', 'gmail'].includes(this.provider);
  }

  private async sendViaSendGrid(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.sendgridApiKey) return false;
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.sendgridApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.fromEmail, name: this.fromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });
      if (!res.ok) {
        console.error('[Email] SendGrid:', res.status, await res.text());
        return false;
      }
      console.log(`[Email] Sent (SendGrid) to ${to}`);
      return true;
    } catch (e: any) {
      console.error('[Email] SendGrid:', e.message);
      return false;
    }
  }

  private async sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resendApiKey) return false;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        console.error('[Email] Resend:', res.status, await res.text());
        return false;
      }
      console.log(`[Email] Sent (Resend) to ${to}`);
      return true;
    } catch (e: any) {
      console.error('[Email] Resend:', e.message);
      return false;
    }
  }

  private async sendViaBrevo(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.brevoApiKey) return false;
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.brevoApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: this.fromName, email: this.fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        console.error('[Email] Brevo:', res.status, await res.text());
        return false;
      }
      console.log(`[Email] Sent (Brevo) to ${to}`);
      return true;
    } catch (e: any) {
      console.error('[Email] Brevo:', e.message);
      return false;
    }
  }

  private async sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (e: any) {
      console.error('[Email] Gmail:', e.message);
      return false;
    }
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[Email] MOCK: would send to ${to}: ${subject}`);
      return true;
    }
    if (this.provider === 'sendgrid') return this.sendViaSendGrid(to, subject, html);
    if (this.provider === 'resend') return this.sendViaResend(to, subject, html);
    if (this.provider === 'brevo') return this.sendViaBrevo(to, subject, html);
    if (this.provider === 'gmail') return this.sendViaGmail(to, subject, html);
    return true;
  }

  async sendOTP(email: string, otp: string, name: string = 'bạn'): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[Email] MOCK: OTP for ${email} is: ${otp}`);
      return true;
    }

    const subject = 'Mã OTP đặt lại mật khẩu - BachHoaMMO';
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">BachHoaMMO</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Chợ tài khoản số uy tín #1 Việt Nam</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Xin chào ${name},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP bên dưới:
              </p>
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #0369a1; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Mã OTP</p>
                <p style="color: #1e40af; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
              </div>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>⚠️</strong> Mã OTP có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 BachHoaMMO</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const ok = await this.send(email, subject, html);
    if (!ok && (this.provider === 'gmail')) {
      console.log(`[Email] FALLBACK - OTP for ${email}: ${otp}`);
      return true;
    }
    return ok;
  }

  async send2FACode(email: string, code: string, name: string = 'bạn'): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[Email] MOCK: 2FA code for ${email} is: ${code}`);
      return true;
    }
    const subject = 'Mã xác thực 2FA - BachHoaMMO';
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Xác thực 2FA</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0;">Xin chào ${name},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Mã xác thực 2FA:</p>
              <div style="background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #065f46; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">Mã có hiệu lực trong <strong>5 phút</strong>.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 24px; text-align: center;"><p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 BachHoaMMO</p></div>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.send(email, subject, html);
  }

  async sendWelcome(email: string, name: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`[Email] MOCK: Welcome email for ${email}`);
      return true;
    }
    const subject = 'Chào mừng bạn đến với BachHoaMMO! 🎉';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `
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
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Cảm ơn bạn đã đăng ký tại BachHoaMMO!</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${frontendUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">Bắt đầu mua sắm</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 24px; text-align: center;"><p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 BachHoaMMO</p></div>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.send(email, subject, html);
  }
}
