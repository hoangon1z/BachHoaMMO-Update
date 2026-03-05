const { userOps, fbOps } = require('../database');
const config = require('../config');
const kb = require('../utils/keyboards');
const {
    parseArgs, parseFacebookInput, parseExpiry, parseDuration,
    formatPrice, formatTimeRemaining, statusEmoji, typeEmoji, formatDuration,
} = require('../utils/helpers');
const { checkFacebookUID, getFacebookAvatar } = require('../services/checker');

function registerFacebookHandlers(bot) {

    // ==================== /add - Add Facebook Profile ====================
    bot.onText(/\/add(?:@\S+)?\s+(.+)/s, async (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);

        // Check limit
        if (!isVip) {
            const fbCount = fbOps.countByUser(user.id);
            const { tkOps } = require('../database');
            const tkCount = tkOps.countByUser(user.id);
            if (fbCount + tkCount >= config.FREE_UID_LIMIT) {
                return bot.sendMessage(chatId,
                    `⚠️ *Đã đạt giới hạn ${config.FREE_UID_LIMIT} UIDs*\n\nNâng cấp VIP để theo dõi không giới hạn\\!`,
                    { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
                );
            }
        }

        const args = parseArgs(match[1]);
        const parsed = parseFacebookInput(args[0]);
        const note = args[1] || '';
        const price = args[2] ? parseInt(args[2].replace(/[^\d]/g, '')) : 0;
        const expiresAt = args[3] ? parseExpiry(args[3]) : null;

        const result = fbOps.add(user.id, parsed.uid, 'profile', parsed.link, note, price, expiresAt);

        if (result.error === 'duplicate') {
            return bot.sendMessage(chatId,
                `⚠️ UID này đã tồn tại trong danh sách\\!\n📋 ID: ${result.existing.id}`,
                { parse_mode: 'MarkdownV2' }
            );
        }

        // Send loading message immediately for instant feedback
        const loadingMsg = await bot.sendMessage(chatId, '⏳ Đang kiểm tra UID...', { parse_mode: 'MarkdownV2' });

        // Run check and avatar fetch IN PARALLEL (saves ~3-5 seconds)
        const [checkResult, avatarBuffer] = await Promise.all([
            checkFacebookUID(parsed.uid),
            parsed.type === 'profile' ? getFacebookAvatar(parsed.uid) : Promise.resolve(null),
        ]);

        if (checkResult.status) {
            fbOps.updateStatus(result.id, checkResult.status, checkResult.avatarUrl, checkResult.isSilhouette);
        }

        const item = fbOps.getById(result.id, user.id);
        const caption = `✅ *Đã thêm UID thành công\\!*

📋 ID: \`${item.id}\`
👤 UID: \`${escMd(item.uid)}\`
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(item.expires_at))}
📊 Trạng thái: ${escMd(statusEmoji(item.status))}`;

        // Delete loading message
        try { await bot.deleteMessage(chatId, loadingMsg.message_id); } catch (e) { /* ignore */ }

        // Send with avatar photo for live profiles
        if (avatarBuffer && checkResult.status === 'live') {
            bot.sendPhoto(chatId, avatarBuffer, {
                caption: caption,
                parse_mode: 'MarkdownV2',
                reply_markup: kb.fbDetailActions(item.id),
            }, { filename: 'avatar.jpg', contentType: 'image/jpeg' }).catch((err) => {
                console.log('[Avatar] sendPhoto failed:', err.message);
                bot.sendMessage(chatId, caption, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.fbDetailActions(item.id),
                });
            });
        } else {
            bot.sendMessage(chatId, caption, {
                parse_mode: 'MarkdownV2',
                reply_markup: kb.fbDetailActions(item.id),
            });
        }
    });



    // ==================== /adds - Bulk upload (start) ====================
    bot.onText(/\/adds(?:@\S+)?$/, (msg) => {
        const chatId = msg.chat.id;
        userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);
        const limit = isVip ? config.BULK_LIMIT_VIP : config.BULK_LIMIT_FREE;

        bot.sendMessage(chatId, `📤 *Upload hàng loạt Facebook UIDs*

Gửi danh sách UIDs \\(mỗi dòng một UID\\):

\`\`\`
UID | Ghi chú | Giá | Thời hạn
\`\`\`

📎 Hoặc gửi file \\.txt

⚠️ Giới hạn: *${limit} mục* mỗi lần`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });

        // Set user state to await bulk input
        bot._awaitingBulk = bot._awaitingBulk || {};
        bot._awaitingBulk[msg.from.id] = 'fb';
    });

    // ==================== /list - List Facebook UIDs ====================
    bot.onText(/\/list(?:@\S+)?$/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendFbList(bot, chatId, user.id, 'all', 1);
    });

    // ==================== /updatefb - Update Facebook UID ====================
    bot.onText(/\/updatefb(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const args = parseArgs(match[1]);

        const id = parseInt(args[0]);
        if (!id) return bot.sendMessage(chatId, '⚠️ Vui lòng nhập ID hợp lệ\\!', { parse_mode: 'MarkdownV2' });

        const note = args[1] || undefined;
        const price = args[2] ? parseInt(args[2].replace(/[^\d]/g, '')) : undefined;
        const expiresAt = args[3] ? parseExpiry(args[3]) : undefined;

        const updated = fbOps.update(id, user.id, note, price, expiresAt);
        if (!updated) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy UID với ID này\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `✅ *Đã cập nhật thành công\\!*

📋 ID: \`${updated.id}\`
${typeEmoji(updated.type)} UID: \`${escMd(updated.uid)}\`
📝 Ghi chú: ${escMd(updated.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(updated.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(updated.expires_at))}`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.fbDetailActions(updated.id),
        });
    });

    // ==================== /tracking - Extend tracking ====================
    bot.onText(/\/tracking(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const args = parseArgs(match[1]);

        const id = parseInt(args[0]);
        const durationStr = args[1];

        if (!id || !durationStr) {
            return bot.sendMessage(chatId,
                '⚠️ Cú pháp: `/tracking ID | Thời hạn`\nVD: `/tracking 123 | 7d`',
                { parse_mode: 'MarkdownV2' }
            );
        }

        const ms = parseDuration(durationStr);
        if (!ms) {
            return bot.sendMessage(chatId, '⚠️ Thời hạn không hợp lệ\\! VD: 30p, 7d, 2w, 1M', { parse_mode: 'MarkdownV2' });
        }

        const updated = fbOps.extendTracking(id, user.id, ms);
        if (!updated) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy UID với ID này\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `✅ *Đã gia hạn thành công\\!*

📋 ID: \`${updated.id}\`
${typeEmoji(updated.type)} UID: \`${escMd(updated.uid)}\`
⏱️ Thời hạn mới: ${escMd(formatTimeRemaining(updated.expires_at))} \\(\\+${escMd(formatDuration(ms))}\\)`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.fbDetailActions(updated.id),
        });
    });

    // ==================== /delete - Delete UID ====================
    bot.onText(/\/delete(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const keyword = match[1].trim();

        // Try to find by ID first
        let item = null;
        const numId = parseInt(keyword);
        if (numId) {
            item = fbOps.getById(numId, user.id);
        }

        // Try by UID
        if (!item) {
            item = fbOps.getByUid(keyword, user.id);
        }

        // Try by search
        if (!item) {
            const results = fbOps.search(user.id, keyword);
            if (results.length === 1) item = results[0];
            else if (results.length > 1) {
                let text = `🔍 Tìm thấy ${results.length} kết quả\\. Vui lòng chọn ID cụ thể:\n\n`;
                results.slice(0, 5).forEach(r => {
                    text += `📋 ID: \`${r.id}\` \\- ${typeEmoji(r.type)} \`${escMd(r.uid)}\` \\- ${escMd(r.note || 'N/A')}\n`;
                });
                return bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
            }
        }

        if (!item) {
            return bot.sendMessage(chatId, '❌ Không tìm thấy UID\\!', { parse_mode: 'MarkdownV2' });
        }

        bot.sendMessage(chatId, `⚠️ *Bạn có chắc muốn xóa UID này?*

📋 ID: \`${item.id}\`
${typeEmoji(item.type)} UID: \`${escMd(item.uid)}\`
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.deleteConfirm('fb', item.id),
        });
    });

    // ==================== /deleteall fb ====================
    bot.onText(/\/deleteall(?:@\S+)?\s+fb/i, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const count = fbOps.countByUser(user.id);

        bot.sendMessage(chatId, `⚠️ *XÓA TẤT CẢ FACEBOOK UIDs?*

Bạn đang có *${count}* UIDs\\. Hành động này *KHÔNG THỂ HOÀN TÁC*\\!`, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.deleteAllConfirm('fb'),
        });
    });

    // ==================== /stats - Facebook stats ====================
    bot.onText(/\/stats(?:@\S+)?$/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendFbStats(bot, chatId, user.id);
    });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Send or edit a message. If messageId is provided, edits existing message.
 */
function sendOrEdit(bot, chatId, text, options, messageId) {
    if (messageId) {
        return bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            ...options,
        }).catch(async () => {
            // Edit failed (e.g. photo message has no text to edit) - delete old and send new
            try { await bot.deleteMessage(chatId, messageId); } catch (e) { /* ignore */ }
            return bot.sendMessage(chatId, text, options);
        });
    }
    return bot.sendMessage(chatId, text, options);
}

function sendFbList(bot, chatId, userId, filter, page, messageId) {
    const result = fbOps.listByUser(userId, filter === 'all' ? null : filter, page, config.LIST_PAGE_SIZE);

    if (result.total === 0) {
        return sendOrEdit(bot, chatId,
            '📋 *Danh sách trống*\n\nChưa có Facebook UID nào\\. Dùng /add để thêm\\!',
            { parse_mode: 'MarkdownV2', reply_markup: kb.facebookMenu() },
            messageId
        );
    }

    let text = `📋 *Danh sách Facebook UIDs* \\(Trang ${page}/${result.totalPages}\\)\n\n`;

    result.items.forEach((item, idx) => {
        const num = (page - 1) * config.LIST_PAGE_SIZE + idx + 1;
        text += `${num}\\. ${typeEmoji(item.type)} \`${escMd(item.uid.substring(0, 25))}\`\n`;
        if (item.note) text += `   📝 ${escMd(item.note)}\n`;
        text += `   💰 ${escMd(formatPrice(item.price))} \\| ⏱️ ${escMd(formatTimeRemaining(item.expires_at))}\n`;
        text += `   📊 ${escMd(statusEmoji(item.status))} \\| 🔎 /detail\\_${item.id}\n\n`;
    });

    const keyboard = kb.fbListFilter(filter, page);
    if (result.totalPages > 1) {
        keyboard.inline_keyboard.splice(-1, 0, kb.fbListPagination(filter, page, result.totalPages));
    }

    return sendOrEdit(bot, chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
    }, messageId);
}

function sendFbStats(bot, chatId, userId, messageId) {
    const stats = fbOps.stats(userId);

    const text = `📊 *Thống kê Facebook*

📋 Tổng: *${stats.total || 0}* UIDs
✅ Live: *${stats.live || 0}*
❌ Die: *${stats.die || 0}*
⏳ Chưa check: *${stats.unknown || 0}*

💰 Tổng giá trị: *${escMd(formatPrice(stats.total_price || 0))}*`;

    return sendOrEdit(bot, chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: kb.backToMain(),
    }, messageId);
}

/**
 * Send FB item detail - with avatar
 * Uses graph.facebook.com direct URL for avatar (works for any public profile)
 */
async function sendFbDetail(bot, chatId, userId, itemId, messageId) {
    const item = fbOps.getById(itemId, userId);
    if (!item) {
        return sendOrEdit(bot, chatId, '❌ Không tìm thấy UID\\!', { parse_mode: 'MarkdownV2' }, messageId);
    }

    let text = `📋 *Chi tiết UID \\#${item.id}*

${typeEmoji(item.type)} Loại: ${escMd(item.type.toUpperCase())}
🆔 UID: \`${escMd(item.uid)}\``;

    if (item.link) text += `\n🔗 Link: ${escMd(item.link.substring(0, 50))}`;
    text += `
📝 Ghi chú: ${escMd(item.note || 'Không có')}
💰 Giá: ${escMd(formatPrice(item.price))}
⏱️ Thời hạn: ${escMd(formatTimeRemaining(item.expires_at))}
📊 Trạng thái: ${escMd(statusEmoji(item.status))}
🕐 Check lần cuối: ${escMd(item.last_checked_at || 'Chưa check')}`;

    // For profiles, try to send with avatar photo
    if (item.type === 'profile' && item.status === 'live') {
        const avatarBuffer = await getFacebookAvatar(item.uid);

        if (avatarBuffer) {
            // If editing a message, we can't change to photo, so delete old and send new photo
            if (messageId) {
                try {
                    await bot.deleteMessage(chatId, messageId);
                } catch (e) { /* ignore */ }
            }

            return bot.sendPhoto(chatId, avatarBuffer, {
                caption: text,
                parse_mode: 'MarkdownV2',
                reply_markup: kb.fbDetailActions(item.id),
            }, { filename: 'avatar.jpg', contentType: 'image/jpeg' }).catch(() => {
                return bot.sendMessage(chatId, text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.fbDetailActions(item.id),
                });
            });
        }
    }

    // Non-profile or DIE: just text
    return sendOrEdit(bot, chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: kb.fbDetailActions(item.id),
    }, messageId);
}

/**
 * Escape MarkdownV2 special characters
 */
function escMd(text) {
    if (!text) return '';
    return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

module.exports = { registerFacebookHandlers, sendFbList, sendFbStats, sendFbDetail, escMd };

