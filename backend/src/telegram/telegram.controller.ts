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
  ) { }

  /**
   * Get Telegram connection status for both bots
   * GET /telegram/status
   */
  @Get('status')
  async getStatus(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        telegramChatId: true,
        telegramLinkedAt: true,
        telegramChatBotChatId: true,
        telegramChatBotLinkedAt: true,
      },
    });

    return {
      // Order Bot status
      orderBotConnected: !!user?.telegramChatId,
      orderBotLinkedAt: user?.telegramLinkedAt,
      // Chat Bot status
      chatBotConnected: !!user?.telegramChatBotChatId,
      chatBotLinkedAt: user?.telegramChatBotLinkedAt,
      // Legacy fields for backward compatibility
      connected: !!user?.telegramChatId,
      linkedAt: user?.telegramLinkedAt,
    };
  }

  /**
   * Get link to connect Telegram (legacy - order bot only)
   * GET /telegram/link
   */
  @Get('link')
  async getLink(@Request() req) {
    const botLink = this.telegramService.getBotLinkWithCode(req.user.id, 'order');

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
   * Get links for both Telegram bots
   * GET /telegram/links
   */
  @Get('links')
  async getLinks(@Request() req) {
    const botLinks = this.telegramService.getBotLinks(req.user.id);

    return {
      orderBot: botLinks.orderBot,
      chatBot: botLinks.chatBot,
      instructions: [
        '1. Kết nối cả 2 bot để nhận đầy đủ thông báo',
        '2. Nhấn "Start" trong mỗi bot',
        '3. Tài khoản của bạn sẽ được liên kết tự động',
      ],
      bots: [
        {
          name: 'Bot Đơn hàng',
          username: 'bachhoammobot',
          link: botLinks.orderBot,
          features: ['Đơn hàng mới', 'Khiếu nại', 'Rút tiền', 'Thông báo Admin'],
        },
        {
          name: 'Bot Tin nhắn',
          username: 'bachhoammochat_bot',
          link: botLinks.chatBot,
          features: ['Tin nhắn mới từ khách hàng'],
        },
      ],
    };
  }

  /**
   * Unlink Telegram - supports unlinking specific bot or all
   * DELETE /telegram/unlink?botType=order|chat
   */
  @Delete('unlink')
  async unlink(@Request() req) {
    // Get botType from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const botType = url.searchParams.get('botType') as 'order' | 'chat' | null;

    const success = await this.telegramService.unlinkTelegram(req.user.id, botType || undefined);

    const botName = botType === 'order' ? 'Bot Đơn hàng' : botType === 'chat' ? 'Bot Tin nhắn' : 'Telegram';
    return {
      success,
      message: success ? `Đã hủy liên kết ${botName}` : 'Có lỗi xảy ra',
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
