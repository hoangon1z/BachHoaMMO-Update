const { userOps, tkOps, fbOps } = require('../database');
const config = require('../config');
const kb = require('../utils/keyboards');
const {
    parseArgs, parseTikTokInput, parseExpiry, parseDuration,
    formatPrice, formatTimeRemaining, statusEmoji, formatDuration,
} = require('../utils/helpers');
const { escMd } = require('./facebook');
const { checkTikTokUsername } = require('../services/checker');

function registerTikTokHandlers(bot) {

    // ==================== /addtk - Add TikTok ====================
    bot.onText(/\/addtk(?:@\S+)?\s+(.+)/s, async (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);

        if (!isVip) {
            const fbCount = fbOps.countByUser(user.id);
            const tkCount = tkOps.countByUser(user.id);
            if (fbCount + tkCount >= config.FREE_UID_LIMIT) {
                return bot.sendMessage(chatId,
                    `⚠️ *Đã đạt giới hạn ${config.FREE_UID_LIMIT} UIDs*\n\nNâng cấp VIP để không giới hạn\\!`,
                    { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
                );
            }
        }

        const args = parseArgs(match[1]);
        const username = parseTikTokInput(args[0]);
        const note = args[1] || '';
        const price = args[2] ? parseInt(args[2].replace(/[^\d]/g, '')) : 0;
        const expiresAt = args[3] ? parseExpiry(args[3]) : null;

        const result = tkOps.add(user.id, username, note, price, expiresAt);
        if (result.error === 'duplicate') {
            return bot.sendMessage(chatId,
                `⚠️ Username này đã tồn tại\\!\n📋 ID: ${result.existing.id}`,
                { parse_mode: 'MarkdownV2' }
            );
        }

        // Initial check
        const checkResult = await checkTikTokUsername(username);
        if (checkResult.status) {
            tkOps.updateStatus(result.id, checkResult.status);
        }

        const item = tkOps.getById(result.id, user.id);
        bot.sendMessage(chatId, `✅ *Đã thêm TikTok thành công\\!*

📋 ID: \`${item.id}\`
🎵 Username: @${escMd(item.username)}
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(item.expires_at))}
📊 Trạng thái: ${escMd(statusEmoji(item.status))}`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.tkDetailActions(item.id),
        });
    });

    // ==================== /addtks - Bulk upload TikTok ====================
    bot.onText(/\/addtks(?:@\S+)?$/, (msg) => {
        const chatId = msg.chat.id;
        userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);
        const limit = isVip ? config.BULK_LIMIT_VIP : config.BULK_LIMIT_FREE;

        bot.sendMessage(chatId, `📤 *Upload hàng loạt TikTok*

Gửi danh sách usernames \\(mỗi dòng một username\\):

\`\`\`
username | Ghi chú | Giá | Thời hạn
\`\`\`

📎 Hoặc gửi file \\.txt

⚠️ Giới hạn: *${limit} mục* mỗi lần`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });

        bot._awaitingBulk = bot._awaitingBulk || {};
        bot._awaitingBulk[msg.from.id] = 'tk';
    });

    // ==================== /listtk - List TikTok ====================
    bot.onText(/\/listtk(?:@\S+)?$/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendTkList(bot, chatId, user.id, 'all', 1);
    });

    // ==================== /updatetk - Update TikTok ====================
    bot.onText(/\/updatetk(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const args = parseArgs(match[1]);

        const id = parseInt(args[0]);
        if (!id) return bot.sendMessage(chatId, '⚠️ Vui lòng nhập ID hợp lệ\\!', { parse_mode: 'MarkdownV2' });

        const note = args[1] || undefined;
        const price = args[2] ? parseInt(args[2].replace(/[^\d]/g, '')) : undefined;
        const expiresAt = args[3] ? parseExpiry(args[3]) : undefined;

        const updated = tkOps.update(id, user.id, note, price, expiresAt);
        if (!updated) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy TikTok với ID này\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `✅ *Đã cập nhật thành công\\!*

📋 ID: \`${updated.id}\`
🎵 Username: @${escMd(updated.username)}
📝 Ghi chú: ${escMd(updated.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(updated.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(updated.expires_at))}`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.tkDetailActions(updated.id),
        });
    });

    // ==================== /trackingtk - Extend tracking ====================
    bot.onText(/\/trackingtk(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const args = parseArgs(match[1]);

        const id = parseInt(args[0]);
        const durationStr = args[1];

        if (!id || !durationStr) {
            return bot.sendMessage(chatId,
                '⚠️ Cú pháp: `/trackingtk ID | Thời hạn`\nVD: `/trackingtk 45 | 7d`',
                { parse_mode: 'MarkdownV2' }
            );
        }

        const ms = parseDuration(durationStr);
        if (!ms) {
            return bot.sendMessage(chatId, '⚠️ Thời hạn không hợp lệ\\!', { parse_mode: 'MarkdownV2' });
        }

        const updated = tkOps.extendTracking(id, user.id, ms);
        if (!updated) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy TikTok với ID này\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `✅ *Đã gia hạn thành công\\!*

📋 ID: \`${updated.id}\`
🎵 Username: @${escMd(updated.username)}
⏱️ Thời hạn mới: ${escMd(formatTimeRemaining(updated.expires_at))} \\(\\+${escMd(formatDuration(ms))}\\)`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.tkDetailActions(updated.id),
        });
    });

    // ==================== /deletetk - Delete TikTok ====================
    bot.onText(/\/deletetk(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const keyword = match[1].trim();

        let item = null;
        const numId = parseInt(keyword);
        if (numId) item = tkOps.getById(numId, user.id);

        if (!item) {
            const results = tkOps.search(user.id, keyword);
            if (results.length === 1) item = results[0];
            else if (results.length > 1) {
                let text = `🔍 Tìm thấy ${results.length} kết quả\\. Chọn ID cụ thể:\n\n`;
                results.slice(0, 5).forEach(r => {
                    text += `📋 ID: \`${r.id}\` \\- 🎵 @${escMd(r.username)} \\- ${escMd(r.note || 'N/A')}\n`;
                });
                return bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
            }
        }

        if (!item) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy TikTok\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `⚠️ *Bạn có chắc muốn xóa?*

📋 ID: \`${item.id}\`
🎵 Username: @${escMd(item.username)}
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.deleteConfirm('tk', item.id),
        });
    });

    // ==================== /deletealltk ====================
    bot.onText(/\/deletealltk/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const count = tkOps.countByUser(user.id);

        bot.sendMessage(chatId, `⚠️ *XÓA TẤT CẢ TIKTOK?*

Bạn đang có *${count}* usernames\\. Hành động này *KHÔNG THỂ HOÀN TÁC*\\!`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.deleteAllConfirm('tk'),
        });
    });

    // ==================== /statstk ====================
    bot.onText(/\/statstk/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendTkStats(bot, chatId, user.id);
    });
}

// ==================== HELPER FUNCTIONS ====================

function sendOrEdit(bot, chatId, text, options, messageId) {
    if (messageId) {
        return bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            ...options,
        }).catch(async () => {
            try { await bot.deleteMessage(chatId, messageId); } catch (e) { /* ignore */ }
            return bot.sendMessage(chatId, text, options);
        });
    }
    return bot.sendMessage(chatId, text, options);
}

function sendTkList(bot, chatId, userId, filter, page, messageId) {
    const result = tkOps.listByUser(userId, filter === 'all' ? null : filter, page, config.LIST_PAGE_SIZE);

    if (result.total === 0) {
        return sendOrEdit(bot, chatId,
            '🎵 *Danh sách TikTok trống*\n\nChưa có username nào\\. Dùng /addtk để thêm\\!',
            { parse_mode: 'MarkdownV2', reply_markup: kb.tiktokMenu() },
            messageId
        );
    }

    let text = `🎵 *Danh sách TikTok* \\(Trang ${page}/${result.totalPages}\\)\n\n`;

    result.items.forEach((item, idx) => {
        const num = (page - 1) * config.LIST_PAGE_SIZE + idx + 1;
        text += `${num}\\. 🎵 @${escMd(item.username)}\n`;
        if (item.note) text += `   📝 ${escMd(item.note)}\n`;
        text += `   💰 ${escMd(formatPrice(item.price))} \\| ⏱️ ${escMd(formatTimeRemaining(item.expires_at))}\n`;
        text += `   📊 ${escMd(statusEmoji(item.status))} \\| 🔎 /detailtk\\_${item.id}\n\n`;
    });

    const keyboard = kb.tkListFilter(filter, page);
    if (result.totalPages > 1) {
        keyboard.inline_keyboard.splice(-1, 0, kb.tkListPagination(filter, page, result.totalPages));
    }

    return sendOrEdit(bot, chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
    }, messageId);
}

function sendTkStats(bot, chatId, userId, messageId) {
    const stats = tkOps.stats(userId);

    const text = `📊 *Thống kê TikTok*

🎵 Tổng: *${stats.total || 0}* usernames
✅ Live: *${stats.live || 0}*
❌ Die: *${stats.die || 0}*
⏳ Chưa check: *${stats.unknown || 0}*

💰 Tổng giá trị: *${escMd(formatPrice(stats.total_price || 0))}*`;

    return sendOrEdit(bot, chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: kb.backToMain(),
    }, messageId);
}

function sendTkDetail(bot, chatId, userId, itemId, messageId) {
    const item = tkOps.getById(itemId, userId);
    if (!item) {
        return sendOrEdit(bot, chatId, '❌ Không tìm thấy TikTok\\!', { parse_mode: 'MarkdownV2' }, messageId);
    }

    return sendOrEdit(bot, chatId, `📋 *Chi tiết TikTok \\#${item.id}*

🎵 Username: @${escMd(item.username)}
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(item.expires_at))}
📊 Trạng thái: ${escMd(statusEmoji(item.status))}
🕐 Check lần cuối: ${escMd(item.last_checked_at || 'Chưa check')}`, {
        parse_mode: 'MarkdownV2',
        reply_markup: kb.tkDetailActions(item.id),
    }, messageId);
}

module.exports = { registerTikTokHandlers, sendTkList, sendTkStats, sendTkDetail };

