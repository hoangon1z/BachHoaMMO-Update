import { Controller, Get, Post, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get Telegram connection status
   * GET /telegram/status
   */
  @Get('status')
  async getStatus(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        telegramChatId: true,
        telegramLinkedAt: true,
      },
    });

    return {
      connected: !!user?.telegramChatId,
      linkedAt: user?.telegramLinkedAt,
    };
  }

  /**
   * Get link to connect Telegram
   * GET /telegram/link
   */
  @Get('link')
  async getLink(@Request() req) {
    const botLink = this.telegramService.getBotLinkWithCode(req.user.id);
    
    return {
      link: botLink,
      botUsername: 'bachhoammobot',
      instructions: [
        '1. Nhấn vào link bên dưới để mở Telegram',
        '2. Nhấn nút "Start" hoặc gửi tin nhắn đầu tiên',
        '3. Tài khoản của bạn sẽ được liên kết tự động',
      ],
    };
  }

  /**
   * Unlink Telegram
   * DELETE /telegram/unlink
   */
  @Delete('unlink')
  async unlink(@Request() req) {
    const success = await this.telegramService.unlinkTelegram(req.user.id);
    
    return {
      success,
      message: success ? 'Đã hủy liên kết Telegram' : 'Có lỗi xảy ra',
    };
  }

  /**
   * Test notification (for testing purposes)
   * POST /telegram/test
   */
  @Post('test')
  async testNotification(@Request() req) {
    const sent = await this.telegramService.sendToUser(
      req.user.id,
      '🔔 <b>Test thông báo</b>\n\nĐây là tin nhắn test từ BachHoaMMO. Nếu bạn nhận được tin nhắn này, Telegram đã được kết nối thành công!',
    );

    return {
      success: sent,
      message: sent ? 'Đã gửi thông báo test' : 'Không thể gửi (chưa kết nối Telegram)',
    };
  }
}
