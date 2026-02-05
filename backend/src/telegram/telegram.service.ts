import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Telegram Bot Tokens - Split into 2 bots for different purposes
// Bot 1: Order notifications (main bot)
const TELEGRAM_ORDER_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8531940203:AAHcPL43LGFS3ZlmMJSEXgeSxgPs6fzJG1w';
// Bot 2: Message notifications (chat bot)
const TELEGRAM_CHAT_BOT_TOKEN = process.env.TELEGRAM_CHAT_BOT_TOKEN || '8228936352:AAENIWyI0iWnr96Yc1CY-ZtciIEMjomrEm8';

const TELEGRAM_ORDER_API_URL = `https://api.telegram.org/bot${TELEGRAM_ORDER_BOT_TOKEN}`;
const TELEGRAM_CHAT_API_URL = `https://api.telegram.org/bot${TELEGRAM_CHAT_BOT_TOKEN}`;

// Legacy alias for backward compatibility
const TELEGRAM_API_URL = TELEGRAM_ORDER_API_URL;

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private orderBotPollingInterval: NodeJS.Timeout | null = null;
  private chatBotPollingInterval: NodeJS.Timeout | null = null;
  private orderBotLastUpdateId = 0;
  private chatBotLastUpdateId = 0;

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    // Start polling for both bots
    this.startOrderBotPolling();
    this.startChatBotPolling();
    this.logger.log('Telegram Order Bot started polling for updates');
    this.logger.log('Telegram Chat Bot started polling for updates');
  }

  /**
   * Start polling for Order Bot updates
   */
  private startOrderBotPolling() {
    this.orderBotPollingInterval = setInterval(async () => {
      try {
        await this.getOrderBotUpdates();
      } catch (error) {
        this.logger.error('Error polling Order Bot updates:', error.message);
      }
    }, 3000);
  }

  /**
   * Start polling for Chat Bot updates
   */
  private startChatBotPolling() {
    this.chatBotPollingInterval = setInterval(async () => {
      try {
        await this.getChatBotUpdates();
      } catch (error) {
        this.logger.error('Error polling Chat Bot updates:', error.message);
      }
    }, 3000);
  }

  /**
   * Get updates from Order Bot (long polling)
   */
  private async getOrderBotUpdates() {
    try {
      const response = await fetch(
        `${TELEGRAM_ORDER_API_URL}/getUpdates?offset=${this.orderBotLastUpdateId + 1}&timeout=1`,
      );
      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result as TelegramUpdate[]) {
          this.orderBotLastUpdateId = update.update_id;
          await this.handleUpdate(update, 'order');
        }
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }

  /**
   * Get updates from Chat Bot (long polling)
   */
  private async getChatBotUpdates() {
    try {
      const response = await fetch(
        `${TELEGRAM_CHAT_API_URL}/getUpdates?offset=${this.chatBotLastUpdateId + 1}&timeout=1`,
      );
      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result as TelegramUpdate[]) {
          this.chatBotLastUpdateId = update.update_id;
          await this.handleUpdate(update, 'chat');
        }
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }

  /**
   * Handle incoming Telegram update
   * @param botType - 'order' for order bot, 'chat' for chat bot
   */
  private async handleUpdate(update: TelegramUpdate, botType: 'order' | 'chat' = 'order') {
    if (!update.message?.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const username = update.message.from.username || update.message.from.first_name;
    const botName = botType === 'chat' ? 'Chat Bot' : 'Order Bot';

    this.logger.log(`[${botName}] Received message from ${username} (${chatId}): ${text}`);

    // Choose which send method to use based on bot type
    const sendFn = botType === 'chat'
      ? (msg: TelegramMessage) => this.sendChatBotMessage(msg)
      : (msg: TelegramMessage) => this.sendMessage(msg);

    // Handle /start command with linking code
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        // /start <linking_code>
        const linkingCode = parts[1];
        await this.handleLinkingCode(chatId.toString(), linkingCode, username, botType);
      } else {
        // Just /start without code
        const welcomeMsg = botType === 'chat'
          ? `🎉 Chào mừng ${username} đến với <b>BachHoaMMO Chat Bot</b>!\n\n💬 Bot này sẽ gửi thông báo khi bạn có <b>tin nhắn mới</b> từ khách hàng.\n\nĐể nhận thông báo, vui lòng truy cập trang Cài đặt Shop trên website và nhấn "Kết nối Telegram Chat".`
          : `🎉 Chào mừng ${username} đến với <b>BachHoaMMO Order Bot</b>!\n\n🛒 Bot này sẽ gửi thông báo khi bạn có:\n• Đơn hàng mới\n• Khiếu nại từ khách hàng\n• Thông báo từ Admin\n\nĐể nhận thông báo, vui lòng truy cập trang Cài đặt Shop trên website và nhấn "Kết nối Telegram".`;

        await sendFn({
          chat_id: chatId,
          text: welcomeMsg,
          parse_mode: 'HTML',
        });
      }
    } else if (text === '/help') {
      const helpMsg = botType === 'chat'
        ? `📚 <b>Hướng dẫn sử dụng BachHoaMMO Chat Bot</b>\n\n💬 Bot này chuyên gửi <b>thông báo tin nhắn mới</b>.\n\n🔗 <b>Kết nối tài khoản:</b>\n1. Truy cập website BachHoaMMO\n2. Vào Seller Dashboard > Cài đặt\n3. Nhấn "Kết nối Telegram Chat"\n\n❓ Có thắc mắc? Liên hệ Admin qua website.`
        : `📚 <b>Hướng dẫn sử dụng BachHoaMMO Order Bot</b>\n\n🔗 <b>Kết nối tài khoản:</b>\n1. Truy cập website BachHoaMMO\n2. Vào Seller Dashboard > Cài đặt\n3. Nhấn "Kết nối Telegram"\n4. Nhấn vào link được cung cấp\n\n📬 <b>Thông báo bạn sẽ nhận:</b>\n• Đơn hàng mới\n• Khiếu nại từ khách hàng\n• Thông báo từ Admin\n\n❓ Có thắc mắc? Liên hệ Admin qua website.`;

      await sendFn({
        chat_id: chatId,
        text: helpMsg,
        parse_mode: 'HTML',
      });
    } else if (text === '/status') {
      // Check if this chat is linked to any account
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId.toString() },
        include: { sellerProfile: true },
      });

      if (user) {
        await sendFn({
          chat_id: chatId,
          text: `✅ <b>Đã kết nối</b>\n\n👤 Tài khoản: ${user.email}\n🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}\n📅 Kết nối lúc: ${user.telegramLinkedAt?.toLocaleString('vi-VN') || 'N/A'}`,
          parse_mode: 'HTML',
        });
      } else {
        await sendFn({
          chat_id: chatId,
          text: `❌ <b>Chưa kết nối</b>\n\nTài khoản Telegram của bạn chưa được liên kết với BachHoaMMO.\n\nVui lòng truy cập website để kết nối.`,
          parse_mode: 'HTML',
        });
      }
    }
  }

  /**
   * Handle linking code from /start command
   * @param botType - 'order' for order bot, 'chat' for chat bot
   */
  private async handleLinkingCode(chatId: string, code: string, username: string, botType: 'order' | 'chat' = 'order') {
    // Choose which send method to use based on bot type
    const sendFn = botType === 'chat'
      ? (msg: TelegramMessage) => this.sendChatBotMessage(msg)
      : (msg: TelegramMessage) => this.sendMessage(msg);

    try {
      // Code format: link_<userId>_<timestamp>
      if (!code.startsWith('link_')) {
        await sendFn({
          chat_id: chatId,
          text: '❌ Mã liên kết không hợp lệ. Vui lòng lấy mã mới từ website.',
        });
        return;
      }

      const parts = code.split('_');
      if (parts.length < 3) {
        await sendFn({
          chat_id: chatId,
          text: '❌ Mã liên kết không hợp lệ.',
        });
        return;
      }

      const userId = parts[1];
      const timestamp = parseInt(parts[2]);

      // Check if code is expired (15 minutes)
      if (Date.now() - timestamp > 15 * 60 * 1000) {
        await sendFn({
          chat_id: chatId,
          text: '❌ Mã liên kết đã hết hạn. Vui lòng lấy mã mới từ website.',
        });
        return;
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { sellerProfile: true },
      });

      if (!user) {
        await sendFn({
          chat_id: chatId,
          text: '❌ Không tìm thấy tài khoản. Vui lòng thử lại.',
        });
        return;
      }

      // Check if this Telegram is already linked to another account for this specific bot
      const chatIdField = botType === 'chat' ? 'telegramChatBotChatId' : 'telegramChatId';
      const existingUser = await this.prisma.user.findFirst({
        where: { [chatIdField]: chatId, NOT: { id: userId } },
      });

      if (existingUser) {
        await sendFn({
          chat_id: chatId,
          text: `❌ Tài khoản Telegram này đã được liên kết với email ${existingUser.email}. Vui lòng hủy liên kết trước khi liên kết với tài khoản mới.`,
        });
        return;
      }

      // Link Telegram to user - save to the appropriate field based on bot type
      if (botType === 'chat') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            telegramChatBotChatId: chatId,
            telegramChatBotLinkedAt: new Date(),
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            telegramChatId: chatId,
            telegramLinkedAt: new Date(),
          },
        });
      }

      // Different success messages for each bot
      const successMsg = botType === 'chat'
        ? `✅ <b>Kết nối Chat Bot thành công!</b>\n\n👤 Email: ${user.email}\n🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}\n\n💬 Bạn sẽ nhận được thông báo khi:\n• Có tin nhắn mới từ khách hàng\n\nGõ /help để xem hướng dẫn.`
        : `✅ <b>Kết nối Order Bot thành công!</b>\n\n👤 Email: ${user.email}\n🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}\n\n🔔 Bạn sẽ nhận được thông báo khi:\n• Có đơn hàng mới\n• Có khiếu nại từ khách\n• Có thông báo từ Admin\n\nGõ /help để xem hướng dẫn.`;

      await sendFn({
        chat_id: chatId,
        text: successMsg,
        parse_mode: 'HTML',
      });

      this.logger.log(`Telegram ${botType} bot linked: User ${user.email} -> Chat ${chatId}`);
    } catch (error) {
      this.logger.error('Error handling linking code:', error);
      await sendFn({
        chat_id: chatId,
        text: '❌ Có lỗi xảy ra. Vui lòng thử lại sau.',
      });
    }
  }

  /**
   * Send a message to a Telegram chat via Order Bot (main bot)
   */
  async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_ORDER_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        this.logger.error(`Telegram Order Bot API error: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error sending Telegram message (Order Bot):', error.message);
      return false;
    }
  }

  /**
   * Send a message via Chat Bot (for message notifications)
   */
  async sendChatBotMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_CHAT_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        this.logger.error(`Telegram Chat Bot API error: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error sending Telegram message (Chat Bot):', error.message);
      return false;
    }
  }

  /**
   * Send notification to a user by their ID
   */
  async sendToUser(userId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });

      if (!user?.telegramChatId) {
        return false;
      }

      return this.sendMessage({
        chat_id: user.telegramChatId,
        text,
        parse_mode: parseMode,
      });
    } catch (error) {
      this.logger.error(`Error sending to user ${userId}:`, error.message);
      return false;
    }
  }

  // ==================== NOTIFICATION HELPERS ====================

  /**
   * Notify seller about new order
   */
  async notifyNewOrder(sellerId: string, order: {
    orderNumber: string;
    total: number;
    buyerName: string;
    items: { title: string; quantity: number }[];
  }) {
    const itemsList = order.items.map(i => `• ${i.title} x${i.quantity}`).join('\n');

    const message = `🛒 <b>ĐƠN HÀNG MỚI!</b>\n\n` +
      `📋 Mã đơn: <code>${order.orderNumber}</code>\n` +
      `👤 Khách hàng: ${order.buyerName}\n` +
      `💰 Tổng tiền: <b>${order.total.toLocaleString('vi-VN')}đ</b>\n\n` +
      `📦 Sản phẩm:\n${itemsList}\n\n` +
      `⏰ Vui lòng xử lý đơn hàng sớm nhất có thể!`;

    return this.sendToUser(sellerId, message);
  }

  /**
   * Notify seller about customer complaint
   */
  async notifyComplaint(sellerId: string, complaint: {
    orderNumber: string;
    buyerName: string;
    reason: string;
  }) {
    const message = `⚠️ <b>KHIẾU NẠI MỚI</b>\n\n` +
      `📋 Đơn hàng: <code>${complaint.orderNumber}</code>\n` +
      `👤 Khách hàng: ${complaint.buyerName}\n` +
      `📝 Lý do: ${complaint.reason}\n\n` +
      `⏰ Vui lòng phản hồi khách hàng trong vòng 24h.`;

    return this.sendToUser(sellerId, message);
  }

  /**
   * Notify seller about new message (via Chat Bot)
   */
  async notifyNewMessage(sellerId: string, message: {
    senderName: string;
    preview: string;
  }) {
    const text = `💬 <b>TIN NHẮN MỚI</b>\n\n` +
      `👤 Từ: ${message.senderName}\n` +
      `📝 Nội dung: ${message.preview.substring(0, 100)}${message.preview.length > 100 ? '...' : ''}\n\n` +
      `🔗 Truy cập website để xem và trả lời.`;

    // Use Chat Bot for message notifications
    return this.sendToUserViaChatBot(sellerId, text);
  }

  /**
   * Send notification to a user by their ID via Chat Bot
   */
  async sendToUserViaChatBot(userId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatBotChatId: true },
      });

      if (!user?.telegramChatBotChatId) {
        return false;
      }

      return this.sendChatBotMessage({
        chat_id: user.telegramChatBotChatId,
        text,
        parse_mode: parseMode,
      });
    } catch (error) {
      this.logger.error(`Error sending to user ${userId} via Chat Bot:`, error.message);
      return false;
    }
  }

  /**
   * Notify seller about withdrawal status
   */
  async notifyWithdrawalStatus(sellerId: string, withdrawal: {
    amount: number;
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
  }) {
    let message: string;

    if (withdrawal.status === 'APPROVED') {
      message = `✅ <b>RÚT TIỀN THÀNH CÔNG</b>\n\n` +
        `💰 Số tiền: <b>${withdrawal.amount.toLocaleString('vi-VN')}đ</b>\n` +
        `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
        `Tiền sẽ được chuyển vào tài khoản ngân hàng của bạn trong 1-3 ngày làm việc.`;
    } else {
      message = `❌ <b>RÚT TIỀN BỊ TỪ CHỐI</b>\n\n` +
        `💰 Số tiền: <b>${withdrawal.amount.toLocaleString('vi-VN')}đ</b>\n` +
        `📝 Lý do: ${withdrawal.reason || 'Không xác định'}\n\n` +
        `Số tiền đã được hoàn lại vào số dư tài khoản.`;
    }

    return this.sendToUser(sellerId, message);
  }

  /**
   * Notify user about system announcement
   */
  async notifyAnnouncement(userId: string, announcement: {
    title: string;
    content: string;
  }) {
    const message = `📢 <b>${announcement.title}</b>\n\n${announcement.content}`;
    return this.sendToUser(userId, message);
  }

  /**
   * Send notification to all connected sellers
   */
  async broadcastToSellers(text: string) {
    try {
      const sellers = await this.prisma.user.findMany({
        where: {
          isSeller: true,
          telegramChatId: { not: null },
        },
        select: { telegramChatId: true },
      });

      let successCount = 0;
      for (const seller of sellers) {
        if (seller.telegramChatId) {
          const sent = await this.sendMessage({
            chat_id: seller.telegramChatId,
            text,
            parse_mode: 'HTML',
          });
          if (sent) successCount++;
        }
      }

      this.logger.log(`Broadcast sent to ${successCount}/${sellers.length} sellers`);
      return successCount;
    } catch (error) {
      this.logger.error('Error broadcasting to sellers:', error);
      return 0;
    }
  }

  /**
   * Generate linking code for a user
   */
  generateLinkingCode(userId: string): string {
    const timestamp = Date.now();
    return `link_${userId}_${timestamp}`;
  }

  /**
   * Get bot link with linking code
   * @param botType - 'order' for order notifications bot, 'chat' for message notifications bot
   */
  getBotLinkWithCode(userId: string, botType: 'order' | 'chat' = 'order'): string {
    const code = this.generateLinkingCode(userId);
    // Order bot: bachhoammobot, Chat bot: bachhoammochat_bot
    const botUsername = botType === 'chat' ? 'bachhoammochat_bot' : 'bachhoammobot';
    return `https://t.me/${botUsername}?start=${code}`;
  }

  /**
   * Get both bot links for user
   */
  getBotLinks(userId: string): { orderBot: string; chatBot: string } {
    const code = this.generateLinkingCode(userId);
    return {
      orderBot: `https://t.me/bachhoammobot?start=${code}`,
      chatBot: `https://t.me/bachhoammochat_bot?start=${code}`,
    };
  }

  /**
   * Unlink Telegram from user
   * @param botType - 'order' to unlink order bot only, 'chat' to unlink chat bot only, undefined to unlink both
   */
  async unlinkTelegram(userId: string, botType?: 'order' | 'chat'): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, telegramChatBotChatId: true },
      });

      // Notify user before unlinking based on botType
      if (botType === 'order' || !botType) {
        if (user?.telegramChatId) {
          await this.sendMessage({
            chat_id: user.telegramChatId,
            text: '🔓 <b>Đã hủy liên kết Bot Đơn hàng</b>\n\nBạn sẽ không nhận được thông báo đơn hàng, khiếu nại nữa.',
            parse_mode: 'HTML',
          });
        }
      }

      if (botType === 'chat' || !botType) {
        if (user?.telegramChatBotChatId) {
          await this.sendChatBotMessage({
            chat_id: user.telegramChatBotChatId,
            text: '🔓 <b>Đã hủy liên kết Bot Tin nhắn</b>\n\nBạn sẽ không nhận được thông báo tin nhắn mới nữa.',
            parse_mode: 'HTML',
          });
        }
      }

      // Update database based on botType
      const updateData: any = {};
      if (botType === 'order') {
        updateData.telegramChatId = null;
        updateData.telegramLinkedAt = null;
      } else if (botType === 'chat') {
        updateData.telegramChatBotChatId = null;
        updateData.telegramChatBotLinkedAt = null;
      } else {
        // Unlink both
        updateData.telegramChatId = null;
        updateData.telegramLinkedAt = null;
        updateData.telegramChatBotChatId = null;
        updateData.telegramChatBotLinkedAt = null;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return true;
    } catch (error) {
      this.logger.error('Error unlinking Telegram:', error);
      return false;
    }
  }
}
