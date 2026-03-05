const { userOps, fbOps, tkOps } = require('../database');
const kb = require('../utils/keyboards');
const { formatPrice, formatTimeRemaining } = require('../utils/helpers');
const { escMd } = require('./facebook');

function registerProfileHandlers(bot) {

    // ==================== /profile ====================
    bot.onText(/\/profile/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendProfile(bot, chatId, user);
    });

    // ==================== /nap - Payment info ====================
    bot.onText(/\/nap/, (msg) => {
        const chatId = msg.chat.id;

        bot.sendMessage(chatId, `💰 *Nâng cấp VIP*

*Bảng giá:*
📦 1 tháng: *50\\.000đ*
📦 3 tháng: *120\\.000đ* \\(tiết kiệm 20%\\)
📦 6 tháng: *200\\.000đ* \\(tiết kiệm 33%\\)
📦 12 tháng: *350\\.000đ* \\(tiết kiệm 42%\\)

*Thanh toán:*
🏦 Chuyển khoản ngân hàng
📱 Momo / ZaloPay

*Nội dung CK:* \`VIP [Telegram Username]\`

Sau khi thanh toán, gửi ảnh bill để admin xác nhận\\.
Liên hệ admin để được hỗ trợ\\!`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });

    // ==================== /setbot - Set sub bot ====================
    bot.onText(/\/setbot(?:@\S+)?\s+(.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);

        if (!isVip) {
            return bot.sendMessage(chatId,
                '🤖 *Bot con riêng* chỉ dành cho gói VIP\\!\n\nNâng cấp VIP để sử dụng\\.',
                { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
            );
        }

        const token = match[1].trim();
        if (!token.includes(':')) {
            return bot.sendMessage(chatId,
                '⚠️ Token không hợp lệ\\! Token có dạng: `123456789:ABCdefGHI\\.\\.\\.`',
                { parse_mode: 'MarkdownV2' }
            );
        }

        userOps.setSubBot(msg.from.id, token);
        bot.sendMessage(chatId, `✅ *Đã thiết lập bot con thành công\\!*

🤖 Token: \`${escMd(token.substring(0, 15))}\\.\\.\\.\`

Bot con của bạn đã được kết nối với hệ thống CheckUID\\.`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });

    // ==================== /mybot - View sub bot info ====================
    bot.onText(/\/mybot/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);

        if (!user.sub_bot_token) {
            return bot.sendMessage(chatId,
                '🤖 Bạn chưa thiết lập bot con\\.\n\nDùng `/setbot TOKEN` để thiết lập\\.',
                { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
            );
        }

        bot.sendMessage(chatId, `🤖 *Bot con của bạn*

🔑 Token: \`${escMd(user.sub_bot_token.substring(0, 15))}\\.\\.\\.\`
📊 Trạng thái: Đang hoạt động

Dùng /removebot để xóa bot con\\.`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });

    // ==================== /removebot ====================
    bot.onText(/\/removebot/, (msg) => {
        const chatId = msg.chat.id;
        userOps.setSubBot(msg.from.id, null);
        bot.sendMessage(chatId, '✅ Đã xóa bot con\\.', {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });
}

function sendProfile(bot, chatId, user, messageId) {
    const isVip = userOps.isVip(user.telegram_id);
    const fbCount = fbOps.countByUser(user.id);
    const tkCount = tkOps.countByUser(user.id);
    const fbStats = fbOps.stats(user.id);
    const tkStats = tkOps.stats(user.id);

    const text = `👤 *Thông tin tài khoản*

🆔 User ID: \`${user.telegram_id}\`
📛 Username: @${escMd(user.username || 'N/A')}
👋 Tên: ${escMd(user.first_name || 'N/A')}
⭐ Gói: *${isVip ? 'VIP ⭐' : 'Free'}*
${isVip && user.vip_expires_at ? `📅 Hết hạn VIP: ${escMd(user.vip_expires_at)}` : ''}

📊 *Thống kê:*
📘 Facebook UIDs: *${fbCount}*${!isVip ? `/${config.FREE_UID_LIMIT}` : ''}
  ✅ Live: ${fbStats.live || 0} \\| ❌ Die: ${fbStats.die || 0}
🎵 TikTok: *${tkCount}*${!isVip ? `/${config.FREE_UID_LIMIT}` : ''}
  ✅ Live: ${tkStats.live || 0} \\| ❌ Die: ${tkStats.die || 0}

💰 Tổng giá trị: *${escMd(formatPrice((fbStats.total_price || 0) + (tkStats.total_price || 0)))}*
🔄 Tần suất check: *${isVip ? '1 phút' : '10 phút'}*`;

    if (messageId) {
        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'MarkdownV2',
            reply_markup: kb.profileMenu(isVip),
        }).catch(() => {
            bot.sendMessage(chatId, text, {
                parse_mode: 'MarkdownV2',
                reply_markup: kb.profileMenu(isVip),
            });
        });
    } else {
        bot.sendMessage(chatId, text, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.profileMenu(isVip),
        });
    }
}

const config = require('../config');

module.exports = { registerProfileHandlers, sendProfile };
