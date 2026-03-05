import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Telegram Bot Tokens - Split into 3 bots for different purposes
// Bot 1: Order notifications (main bot - @bachhoammobot)
const TELEGRAM_ORDER_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// Bot 2: Message notifications (chat bot - @bachhoammochat_bot)
const TELEGRAM_CHAT_BOT_TOKEN = process.env.TELEGRAM_CHAT_BOT_TOKEN || '';
// Bot 3: Deposit notifications (deposit bot - @TBNTBHMMO_BOT)
const TELEGRAM_DEPOSIT_BOT_TOKEN = process.env.TELEGRAM_DEPOSIT_BOT_TOKEN || '';

const TELEGRAM_ORDER_API_URL = `https://api.telegram.org/bot${TELEGRAM_ORDER_BOT_TOKEN}`;
const TELEGRAM_CHAT_API_URL = `https://api.telegram.org/bot${TELEGRAM_CHAT_BOT_TOKEN}`;
const TELEGRAM_DEPOSIT_API_URL = `https://api.telegram.org/bot${TELEGRAM_DEPOSIT_BOT_TOKEN}`;

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

  /**
   * Escape HTML special characters for Telegram HTML parse mode
   * This prevents Telegram API from rejecting messages when user-generated
   * content contains <, >, & characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

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
          ? `🎉 Chào mừng ${username} đến với <b>BachHoaMMO Chat Bot</b>!

💬 Bot này sẽ gửi thông báo khi bạn có <b>tin nhắn mới</b> từ khách hàng.

Để nhận thông báo, vui lòng truy cập trang Cài đặt Shop trên website và nhấn "Kết nối Telegram Chat".`
          : `🎉 Chào mừng ${username} đến với <b>BachHoaMMO Order Bot</b>!

🛒 Bot này sẽ gửi thông báo khi bạn có:
• Đơn hàng mới
• Khiếu nại từ khách hàng
• Thông báo từ Admin

Để nhận thông báo, vui lòng truy cập trang Cài đặt Shop trên website và nhấn "Kết nối Telegram".`;

        await sendFn({
          chat_id: chatId,
          text: welcomeMsg,
          parse_mode: 'HTML',
        });
      }
    } else if (text === '/help') {
      const helpMsg = botType === 'chat'
        ? `📚 <b>Hướng dẫn sử dụng BachHoaMMO Chat Bot</b>

💬 Bot này chuyên gửi <b>thông báo tin nhắn mới</b>.

🔗 <b>Kết nối tài khoản:</b>
1. Truy cập website BachHoaMMO
2. Vào Seller Dashboard > Cài đặt
3. Nhấn "Kết nối Telegram Chat"

❓ Có thắc mắc? Liên hệ Admin qua website.`
        : `📚 <b>Hướng dẫn sử dụng BachHoaMMO Order Bot</b>

🔗 <b>Kết nối tài khoản:</b>
1. Truy cập website BachHoaMMO
2. Vào Seller Dashboard > Cài đặt
3. Nhấn "Kết nối Telegram"
4. Nhấn vào link được cung cấp

📬 <b>Thông báo bạn sẽ nhận:</b>
• Đơn hàng mới
• Khiếu nại từ khách hàng
• Thông báo từ Admin

❓ Có thắc mắc? Liên hệ Admin qua website.`;

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
          text: `✅ <b>Đã kết nối</b>

👤 Tài khoản: ${user.email}
🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}
📅 Kết nối lúc: ${user.telegramLinkedAt?.toLocaleString('vi-VN') || 'N/A'}`,
          parse_mode: 'HTML',
        });
      } else {
        await sendFn({
          chat_id: chatId,
          text: `❌ <b>Chưa kết nối</b>

Tài khoản Telegram của bạn chưa được liên kết với BachHoaMMO.

Vui lòng truy cập website để kết nối.`,
          parse_mode: 'HTML',
        });
      }
    } else if (text.startsWith('/checkthongtin')) {
      // ADMIN ONLY command - check user info from chat logs
      const ADMIN_CHAT_ID = '8372784038';
      if (chatId.toString() !== ADMIN_CHAT_ID) {
        await sendFn({ chat_id: chatId, text: '❌ Bạn không có quyền sử dụng lệnh này.', parse_mode: 'HTML' });
        return;
      }

      const parts = text.split(' ');
      if (parts.length < 2) {
        await sendFn({
          chat_id: chatId,
          text: `📋 <b>Hướng dẫn sử dụng:</b>\n\n/checkthongtin [tên hoặc email]\n\nVí dụ:\n/checkthongtin Tuấn Anh\n/checkthongtin thinhdade@gmail.com`,
          parse_mode: 'HTML',
        });
        return;
      }

      const searchTerm = parts.slice(1).join(' ').trim();
      await sendFn({ chat_id: chatId, text: `🔍 Đang tìm kiếm: <b>${searchTerm}</b>...`, parse_mode: 'HTML' });

      try {
        // 1. Search in DB
        const dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: searchTerm } },
              { name: { contains: searchTerm } },
            ],
          },
          include: { sellerProfile: true },
        });

        // 2. Search orders from MongoDB chat messages
        const { MongoClient } = require('mongodb');
        const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/mmomarket');
        await mongoClient.connect();
        const db = mongoClient.db('mmomarket');

        // Find conversations matching the name
        const convos = await db.collection('conversations').find({
          subject: { $regex: searchTerm, $options: 'i' },
        }).toArray();

        // Extract all order IDs from messages in those conversations
        const orderSet = new Set<string>();
        const orderDetails: Array<{ orderId: string; product: string; price: string; date: string }> = [];

        for (const conv of convos) {
          const msgs = await db.collection('messages').find({
            conversationId: conv._id,
            content: { $regex: 'ORD-' },
          }).sort({ createdAt: 1 }).toArray();

          for (const m of msgs) {
            const matches = m.content.match(/ORD-[\w-]+/g);
            if (matches) {
              for (const ordId of matches) {
                if (!orderSet.has(ordId)) {
                  orderSet.add(ordId);
                  const priceMatch = m.content.match(/Giá trị.*?([\d.,]+)đ/);
                  const productMatch = m.content.match(/Sản phẩm.*?\*\*(.*?)\*\*/);
                  const date = new Date(m.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                  orderDetails.push({
                    orderId: ordId,
                    product: productMatch ? productMatch[1].substring(0, 40) : 'N/A',
                    price: priceMatch ? priceMatch[1] + 'đ' : 'N/A',
                    date,
                  });
                }
              }
            }
          }
        }

        await mongoClient.close();

        // Build response
        let response = `🔎 <b>Kết quả tìm kiếm: ${this.escapeHtml(searchTerm)}</b>\n\n`;

        if (dbUser) {
          response += `👤 <b>Thông tin tài khoản (DB):</b>\n`;
          response += `📧 Email: <code>${dbUser.email}</code>\n`;
          response += `👤 Tên: ${this.escapeHtml(dbUser.name || '')}\n`;
          response += `💰 Số dư ví: <b>${(dbUser.balance || 0).toLocaleString('vi-VN')}đ</b>\n`;
          response += `🏪 Shop: ${dbUser.sellerProfile?.shopName ? this.escapeHtml(dbUser.sellerProfile.shopName) : 'Không có'}\n`;
          response += `📱 Telegram: ${dbUser.telegramChatId || 'Chưa liên kết'}\n\n`;
        } else {
          response += `⚠️ <b>Không tìm thấy trong DB</b> (tài khoản tạo sau 21/02)\n\n`;
        }

        response += `📦 <b>Đơn hàng từ chat (${orderDetails.length} đơn):</b>\n`;
        if (orderDetails.length === 0) {
          response += `• Không tìm thấy đơn hàng nào trong chat\n`;
        } else {
          for (const o of orderDetails.slice(0, 15)) {
            response += `\n• <code>${o.orderId}</code>\n`;
            response += `  💰 ${o.price} | 📅 ${o.date}\n`;
          }
          if (orderDetails.length > 15) {
            response += `\n... và ${orderDetails.length - 15} đơn khác\n`;
          }
        }

        if (convos.length > 0) {
          response += `\n💬 <b>${convos.length} cuộc hội thoại:</b>\n`;
          for (const c of convos.slice(0, 5)) {
            response += `• ${this.escapeHtml(c.subject || '')} (${new Date(c.createdAt).toLocaleDateString('vi-VN')})\n`;
          }
        }

        response += `\n⚠️ <i>Lưu ý: Đây chỉ là đơn có nhắn tin trong chat. Cần đối chiếu thêm với PayOS và Telegram bot history.</i>`;

        await sendFn({ chat_id: chatId, text: response, parse_mode: 'HTML', disable_web_page_preview: true });
      } catch (err) {
        this.logger.error('Error in /checkthongtin:', err);
        await sendFn({ chat_id: chatId, text: `❌ Lỗi khi tìm kiếm: ${err.message}`, parse_mode: 'HTML' });
      }
    } else if (text.startsWith('/checkid')) {
      // ADMIN ONLY - lookup by Telegram chat ID
      const ADMIN_CHAT_ID = '8372784038';
      if (chatId.toString() !== ADMIN_CHAT_ID) {
        await sendFn({ chat_id: chatId, text: '❌ Không có quyền.', parse_mode: 'HTML' });
        return;
      }
      const parts = text.trim().split(' ');
      if (parts.length < 2) {
        await sendFn({
          chat_id: chatId,
          text: `📋 <b>Cách dùng:</b>\n/checkid [telegram_chat_id]\n\nVí dụ: /checkid 123456789\n\n<i>Lấy chat ID: seller gõ /myid trong bot, hoặc dùng @userinfobot</i>`,
          parse_mode: 'HTML',
        });
        return;
      }
      const targetChatId = parts[1].trim();
      await sendFn({ chat_id: chatId, text: `🔍 Đang tìm Telegram ID: <code>${targetChatId}</code>...`, parse_mode: 'HTML' });

      try {
        // Find user by telegramChatId in DB
        const dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { telegramChatId: targetChatId },
              { telegramChatBotChatId: targetChatId },
            ],
          },
          include: { sellerProfile: true },
        });

        let response = `🔎 <b>Kết quả cho Telegram ID: <code>${targetChatId}</code></b>\n\n`;

        if (dbUser) {
          response += `✅ <b>Tìm thấy trong DB:</b>\n`;
          response += `📧 Email: <code>${dbUser.email}</code>\n`;
          response += `👤 Tên: ${this.escapeHtml(dbUser.name || '')}\n`;
          response += `💰 Số dư ví: <b>${(dbUser.balance || 0).toLocaleString('vi-VN')}đ</b>\n`;
          response += `🎭 Role: ${dbUser.isSeller ? 'SELLER' : 'BUYER'}\n`;
          if (dbUser.sellerProfile) {
            response += `🏪 Shop: ${this.escapeHtml(dbUser.sellerProfile.shopName)}\n`;
            response += `📦 Đã bán: ${dbUser.sellerProfile.totalSales} đơn\n`;
          }
          response += `\n`;

          // Query MongoDB for their conversations and orders
          const { MongoClient } = require('mongodb');
          const mc = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/mmomarket');
          await mc.connect();
          const mdb = mc.db('mmomarket');

          const userId = dbUser.id;
          const convos = await mdb.collection('conversations').find({
            $or: [{ buyerId: userId }, { sellerId: userId }],
          }).sort({ createdAt: -1 }).toArray();

          response += `💬 <b>${convos.length} cuộc hội thoại:</b>\n`;
          const orderSet = new Set<string>();

          for (const c of convos) {
            response += `• ${this.escapeHtml(c.subject || 'N/A')} (${new Date(c.createdAt).toLocaleDateString('vi-VN')})\n`;
            // Get orders from messages
            const orderMsgs = await mdb.collection('messages').find({
              conversationId: c._id,
              content: { $regex: 'ORD-' },
            }).toArray();
            for (const m of orderMsgs) {
              const matches = m.content.match(/ORD-[\w-]+/g);
              if (matches) matches.forEach((o: string) => orderSet.add(o));
            }
          }

          await mc.close();

          if (orderSet.size > 0) {
            response += `\n📦 <b>${orderSet.size} đơn hàng từ chat:</b>\n`;
            Array.from(orderSet).slice(0, 15).forEach(o => {
              response += `• <code>${o}</code>\n`;
            });
            if (orderSet.size > 15) response += `... và ${orderSet.size - 15} đơn khác\n`;
          } else {
            response += `\n📦 Không tìm thấy đơn hàng trong chat\n`;
          }
        } else {
          response += `❌ <b>Không tìm thấy trong DB</b>\n`;
          response += `Telegram ID này chưa kết nối với tài khoản BachHoaMMO\n`;
          response += `hoặc tài khoản được tạo sau 21/02 (đã mất)\n`;
        }

        response += `\n⚠️ <i>Để tra đầy đủ, kết hợp với PayOS dashboard và Telegram bot history.</i>`;
        await sendFn({ chat_id: chatId, text: response, parse_mode: 'HTML', disable_web_page_preview: true });
      } catch (err) {
        this.logger.error('Error in /checkid:', err);
        await sendFn({ chat_id: chatId, text: `❌ Lỗi: ${err.message}`, parse_mode: 'HTML' });
      }
    } else if (text === '/myid') {
      // Anyone can use this to get their own chat ID
      await sendFn({
        chat_id: chatId,
        text: `🆔 <b>Telegram Chat ID của bạn:</b>\n<code>${chatId}</code>\n\nGửi ID này cho Admin để tra cứu thông tin.`,
        parse_mode: 'HTML',
      });
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
        ? `✅ <b>Kết nối Chat Bot thành công!</b>

👤 Email: ${user.email}
🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}

💬 Bạn sẽ nhận được thông báo khi:
• Có tin nhắn mới từ khách hàng

Gõ /help để xem hướng dẫn.`
        : `✅ <b>Kết nối Order Bot thành công!</b>

👤 Email: ${user.email}
🏪 Shop: ${user.sellerProfile?.shopName || 'Chưa có shop'}

🔔 Bạn sẽ nhận được thông báo khi:
• Có đơn hàng mới
• Có khiếu nại từ khách
• Có thông báo từ Admin

Gõ /help để xem hướng dẫn.`;

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
   * Returns 'chat_not_found' if the chat ID is invalid, false for other errors, true on success
   */
  async sendMessage(message: TelegramMessage): Promise<boolean | 'chat_not_found'> {
    try {
      const response = await fetch(`${TELEGRAM_ORDER_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        // Check for "chat not found" or "bot was blocked" errors
        const desc = (data.description || '').toLowerCase();
        if (desc.includes('chat not found') || desc.includes('bot was blocked') || desc.includes('user is deactivated') || desc.includes('chat_id is empty')) {
          this.logger.warn(`Telegram Order Bot: chat ${message.chat_id} not reachable (${data.description}) - will auto-unlink`);
          return 'chat_not_found';
        }
        this.logger.error(`Telegram Order Bot API error for chat ${message.chat_id}: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error sending Telegram message (Order Bot) to chat ${message.chat_id}:`, error.message);
      return false;
    }
  }

  /**
   * Send a message via Chat Bot (for message notifications)
   * Returns 'chat_not_found' if the chat ID is invalid, false for other errors, true on success
   */
  async sendChatBotMessage(message: TelegramMessage): Promise<boolean | 'chat_not_found'> {
    try {
      const response = await fetch(`${TELEGRAM_CHAT_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        // Check for "chat not found" or "bot was blocked" errors
        const desc = (data.description || '').toLowerCase();
        if (desc.includes('chat not found') || desc.includes('bot was blocked') || desc.includes('user is deactivated') || desc.includes('chat_id is empty')) {
          this.logger.warn(`Telegram Chat Bot: chat ${message.chat_id} not reachable (${data.description}) - will auto-unlink`);
          return 'chat_not_found';
        }
        this.logger.error(`Telegram Chat Bot API error for chat ${message.chat_id}: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error sending Telegram message (Chat Bot) to chat ${message.chat_id}:`, error.message);
      return false;
    }
  }

  /**
   * Send notification to a user by their ID
   * Automatically unlinks invalid Telegram chat IDs
   */
  async sendToUser(userId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, email: true },
      });

      if (!user?.telegramChatId) {
        this.logger.warn(`User ${userId} (${user?.email || 'unknown'}) has no telegramChatId linked - skipping Order Bot notification`);
        return false;
      }

      this.logger.log(`Sending Order Bot notification to user ${userId} (chat: ${user.telegramChatId})`);
      const result = await this.sendMessage({
        chat_id: user.telegramChatId,
        text,
        parse_mode: parseMode,
      });

      // Auto-unlink if chat is not reachable
      if (result === 'chat_not_found') {
        this.logger.warn(`Auto-unlinking Order Bot for user ${userId} (${user.email}) - chat ${user.telegramChatId} not reachable`);
        await this.prisma.user.update({
          where: { id: userId },
          data: { telegramChatId: null, telegramLinkedAt: null },
        });
        return false;
      }

      return result === true;
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
    const itemsList = order.items.map(i => `• ${this.escapeHtml(i.title)} x${i.quantity}`).join('\n');

    const message = `🛒 <b>ĐƠN HÀNG MỚI!</b>

` +
      `📋 Mã đơn: <code>${order.orderNumber}</code>
` +
      `👤 Khách hàng: ${this.escapeHtml(order.buyerName)}
` +
      `💰 Tổng tiền: <b>${order.total.toLocaleString('vi-VN')}đ</b>

` +
      `📦 Sản phẩm:
${itemsList}

` +
      `⏰ Vui lòng xử lý đơn hàng sớm nhất có thể!`;

    this.logger.log(`Sending new order notification to seller ${sellerId} for order ${order.orderNumber}`);
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
    const message = `⚠️ <b>KHIẾU NẠI MỚI</b>

` +
      `📋 Đơn hàng: <code>${complaint.orderNumber}</code>
` +
      `👤 Khách hàng: ${this.escapeHtml(complaint.buyerName)}
` +
      `📝 Lý do: ${this.escapeHtml(complaint.reason)}

` +
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
    const previewText = this.escapeHtml(message.preview.substring(0, 100)) + (message.preview.length > 100 ? '...' : '');
    const text = `💬 <b>TIN NHẮN MỚI</b>

` +
      `👤 Từ: ${this.escapeHtml(message.senderName)}
` +
      `📝 Nội dung: ${previewText}

` +
      `🔗 Truy cập website để xem và trả lời.`;

    // Use Chat Bot for message notifications
    return this.sendToUserViaChatBot(sellerId, text);
  }

  /**
   * Send notification to a user by their ID via Chat Bot
   * Automatically unlinks invalid Telegram chat IDs
   */
  async sendToUserViaChatBot(userId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatBotChatId: true, email: true },
      });

      if (!user?.telegramChatBotChatId) {
        this.logger.warn(`User ${userId} (${user?.email || 'unknown'}) has no telegramChatBotChatId linked - skipping Chat Bot notification`);
        return false;
      }

      this.logger.log(`Sending Chat Bot notification to user ${userId} (chat: ${user.telegramChatBotChatId})`);
      const result = await this.sendChatBotMessage({
        chat_id: user.telegramChatBotChatId,
        text,
        parse_mode: parseMode,
      });

      // Auto-unlink if chat is not reachable
      if (result === 'chat_not_found') {
        this.logger.warn(`Auto-unlinking Chat Bot for user ${userId} (${user.email}) - chat ${user.telegramChatBotChatId} not reachable`);
        await this.prisma.user.update({
          where: { id: userId },
          data: { telegramChatBotChatId: null, telegramChatBotLinkedAt: null },
        });
        return false;
      }

      return result === true;
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
      message = `✅ <b>RÚT TIỀN THÀNH CÔNG</b>

` +
        `💰 Số tiền: <b>${withdrawal.amount.toLocaleString('vi-VN')}đ</b>
` +
        `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}

` +
        `Tiền sẽ được chuyển vào tài khoản ngân hàng của bạn trong 1-3 ngày làm việc.`;
    } else {
      message = `❌ <b>RÚT TIỀN BỊ TỪ CHỐI</b>

` +
        `💰 Số tiền: <b>${withdrawal.amount.toLocaleString('vi-VN')}đ</b>
` +
        `📝 Lý do: ${this.escapeHtml(withdrawal.reason || 'Không xác định')}

` +
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
    const message = `📢 <b>${this.escapeHtml(announcement.title)}</b>

${this.escapeHtml(announcement.content)}`;
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

  // ==================== DEPOSIT NOTIFICATION MANAGEMENT ====================

  /**
   * Get all deposit notification recipients
   */
  async getDepositRecipients() {
    try {
      return await this.prisma.telegramDepositNotification.findMany({
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error getting deposit recipients:', error.message);
      return [];
    }
  }

  /**
   * Add a new deposit notification recipient
   */
  async addDepositRecipient(telegramId: string, name?: string) {
    try {
      // Check max 5 recipients
      const count = await this.prisma.telegramDepositNotification.count();
      if (count >= 5) {
        return { success: false, message: 'Đã đạt tối đa 5 người nhận thông báo' };
      }

      // Check duplicate
      const existing = await this.prisma.telegramDepositNotification.findUnique({
        where: { telegramId },
      });
      if (existing) {
        return { success: false, message: 'Telegram ID này đã được thêm' };
      }

      const recipient = await this.prisma.telegramDepositNotification.create({
        data: {
          telegramId,
          name: name || undefined,
        },
      });

      return { success: true, recipient };
    } catch (error) {
      this.logger.error('Error adding deposit recipient:', error.message);
      return { success: false, message: 'Lỗi khi thêm người nhận' };
    }
  }

  /**
   * Update a deposit notification recipient
   */
  async updateDepositRecipient(id: string, data: { name?: string; isActive?: boolean }) {
    try {
      const recipient = await this.prisma.telegramDepositNotification.update({
        where: { id },
        data,
      });
      return { success: true, recipient };
    } catch (error) {
      this.logger.error('Error updating deposit recipient:', error.message);
      return { success: false, message: 'Không tìm thấy người nhận' };
    }
  }

  /**
   * Remove a deposit notification recipient
   */
  async removeDepositRecipient(id: string) {
    try {
      await this.prisma.telegramDepositNotification.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error('Error removing deposit recipient:', error.message);
      return { success: false, message: 'Không tìm thấy người nhận' };
    }
  }

  /**
   * Send a message via Deposit Bot (for deposit notifications to admin channel)
   */
  async sendDepositBotMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_DEPOSIT_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        this.logger.error(`Telegram Deposit Bot API error for chat ${message.chat_id}: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error sending Telegram message (Deposit Bot) to chat ${message.chat_id}:`, error.message);
      return false;
    }
  }

  /**
   * Test deposit notification - sends test message to all active recipients
   */
  async testDepositNotification() {
    try {
      const recipients = await this.prisma.telegramDepositNotification.findMany({
        where: { isActive: true },
      });

      if (recipients.length === 0) {
        return { success: false, message: 'Chưa có người nhận nào được cấu hình' };
      }

      const testMessage = `🧪 <b>TEST THÔNG BÁO NẠP TIỀN</b>\n\n` +
        `👤 Tài khoản: test@example.com\n` +
        `💰 Số tiền: <b>100,000đ</b>\n` +
        `📋 Mã GD: TEST-${Date.now()}\n\n` +
        `⏰ ${new Date().toLocaleString('vi-VN')}\n` +
        `✅ Đây là tin nhắn test!`;

      let successCount = 0;
      for (const recipient of recipients) {
        const sent = await this.sendDepositBotMessage({
          chat_id: recipient.telegramId,
          text: testMessage,
          parse_mode: 'HTML',
        });
        if (sent) successCount++;
      }

      return {
        success: true,
        message: `Đã gửi test đến ${successCount}/${recipients.length} người nhận`,
        sent: successCount,
        total: recipients.length,
      };
    } catch (error) {
      this.logger.error('Error testing deposit notification:', error.message);
      return { success: false, message: 'Lỗi khi gửi test' };
    }
  }

  /**
   * Send deposit notification to all active recipients
   */
  async notifyDeposit(deposit: {
    userEmail: string;
    userName?: string;
    amount: number;
    orderCode: number;
    transactionId: string;
    bank?: string;
  }) {
    try {
      const recipients = await this.prisma.telegramDepositNotification.findMany({
        where: { isActive: true },
      });

      if (recipients.length === 0) {
        this.logger.warn('No active deposit notification recipients configured');
        return;
      }

      const displayName = deposit.userName
        ? `${this.escapeHtml(deposit.userName)} (${this.escapeHtml(deposit.userEmail)})`
        : this.escapeHtml(deposit.userEmail);

      const bankNames: Record<string, string> = {
        bidv: '🏦 BIDV',
        mbbank: '🏦 MB Bank',
      };
      const bankLabel = deposit.bank ? (bankNames[deposit.bank] || deposit.bank.toUpperCase()) : 'BIDV';

      const message = `💰 <b>NẠP TIỀN THÀNH CÔNG</b>\n\n` +
        `👤 Tài khoản: ${displayName}\n` +
        `💵 Số tiền: <b>${deposit.amount.toLocaleString('vi-VN')}đ</b>\n` +
        `🏦 Ngân hàng: <b>${bankLabel}</b>\n` +
        `📋 Mã GD: <code>${deposit.orderCode}</code>\n` +
        `🔗 ID: <code>${deposit.transactionId}</code>\n\n` +
        `⏰ ${new Date().toLocaleString('vi-VN')}`;

      let successCount = 0;
      for (const recipient of recipients) {
        const sent = await this.sendDepositBotMessage({
          chat_id: recipient.telegramId,
          text: message,
          parse_mode: 'HTML',
        });
        if (sent) successCount++;
      }

      this.logger.log(`Deposit notification sent to ${successCount}/${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Error sending deposit notification:', error.message);
    }
  }

  /**
   * Send USDT deposit request notification to all active recipients
   */
  async notifyUsdtDeposit(deposit: {
    userEmail: string;
    userName?: string;
    usdtAmount: number;
    vndAmount: number;
    network: string;
    txHash: string;
    walletAddress: string;
    transactionId: string;
  }) {
    try {
      const recipients = await this.prisma.telegramDepositNotification.findMany({
        where: { isActive: true },
      });

      if (recipients.length === 0) {
        this.logger.warn('No active deposit notification recipients configured');
        return;
      }

      const displayName = deposit.userName
        ? `${this.escapeHtml(deposit.userName)} (${this.escapeHtml(deposit.userEmail)})`
        : this.escapeHtml(deposit.userEmail);

      // Blockchain explorer links
      const explorerLinks: Record<string, string> = {
        TRC20: `https://tronscan.org/#/transaction/${deposit.txHash}`,
        ERC20: `https://etherscan.io/tx/${deposit.txHash}`,
        BEP20: `https://bscscan.com/tx/${deposit.txHash}`,
      };
      const explorerUrl = explorerLinks[deposit.network] || '';
      const explorerLine = explorerUrl
        ? `🔍 <a href="${explorerUrl}">Xem trên blockchain</a>\n`
        : '';

      const message = `💵 <b>YÊU CẦU NẠP USDT</b> ⏳\n\n` +
        `👤 Tài khoản: ${displayName}\n` +
        `💰 Số USDT: <b>${deposit.usdtAmount} USDT</b>\n` +
        `💵 Quy đổi: <b>${deposit.vndAmount.toLocaleString('vi-VN')}đ</b>\n` +
        `🌐 Mạng: <b>${deposit.network}</b>\n` +
        `📋 TxHash: <code>${this.escapeHtml(deposit.txHash)}</code>\n` +
        explorerLine +
        `🔗 ID: <code>${deposit.transactionId}</code>\n\n` +
        `⚠️ <b>Cần admin duyệt thủ công!</b>\n` +
        `⏰ ${new Date().toLocaleString('vi-VN')}`;

      let successCount = 0;
      for (const recipient of recipients) {
        const sent = await this.sendDepositBotMessage({
          chat_id: recipient.telegramId,
          text: message,
          parse_mode: 'HTML',
        });
        if (sent) successCount++;
      }

      this.logger.log(`USDT deposit notification sent to ${successCount}/${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Error sending USDT deposit notification:', error.message);
    }
  }
}
