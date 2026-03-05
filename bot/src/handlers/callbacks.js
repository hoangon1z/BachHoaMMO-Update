const { userOps, fbOps } = require('../database');
const config = require('../config');
const kb = require('../utils/keyboards');
const { formatPrice, formatTimeRemaining, statusEmoji, typeEmoji, parseDuration, parseExpiry } = require('../utils/helpers');
const { sendFbList, sendFbStats, sendFbDetail, escMd } = require('./facebook');
const { sendProfile } = require('./profile');

function registerCallbackHandlers(bot) {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;
        const user = userOps.findOrCreate(query.from.id, query.from.username, query.from.first_name);
        const isVip = userOps.isVip(query.from.id);

        // Acknowledge callback
        bot.answerCallbackQuery(query.id);

        try {
            // ==================== MAIN MENU ====================
            if (data === 'menu_main') {
                return bot.editMessageText('🏠 *Menu chính*\n\nChọn chức năng:', {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.mainMenu(),
                });
            }

            // ==================== FACEBOOK MENU ====================
            if (data === 'menu_fb') {
                return bot.editMessageText('📘 *Facebook* \\- Chọn thao tác:', {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.facebookMenu(),
                });
            }

            // ==================== SEARCH MENU ====================
            if (data === 'menu_search') {
                return bot.editMessageText('🔍 *Tìm kiếm* \\- Chọn loại:', {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.searchMenu(),
                });
            }

            // ==================== STATS MENU ====================
            if (data === 'menu_stats') {
                return sendFbStats(bot, chatId, user.id, messageId);
            }

            // ==================== PROFILE MENU ====================
            if (data === 'menu_profile') {
                return sendProfile(bot, chatId, user, messageId);
            }

            // ==================== HELP MENU ====================
            if (data === 'menu_help') {
                const { HELP_TEXT } = require('./start');
                return bot.editMessageText(HELP_TEXT, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.backToMain(),
                });
            }

            // ==================== FB GUIDES ====================
            if (data === 'fb_add_guide') {
                return bot.editMessageText(`➕ *Thêm Facebook Profile*

*Cú pháp:*
\`/add UID | Ghi chú | Giá | Thời hạn\`

*Ví dụ:*
\`/add 100012345678\`
\`/add 100012345678 | Khánh RIP | 500000 | 7d\`
\`/add https://facebook\\.com/username | Ghi chú\`

*Định dạng UID:*
• UID số: \`100012345678\`
• Link: \`https://facebook\\.com/username\`
• Link ID: \`https://facebook\\.com/profile\\.php?id\\=xxx\`

*Thời hạn:* 30p, 7d, 2w, 1M`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Quay lại', callback_data: 'menu_fb' }]] },
                });
            }

            if (data === 'fb_adds_guide') {
                return bot.editMessageText(`📤 *Upload hàng loạt Facebook*

Gõ /adds rồi gửi danh sách hoặc file \\.txt

*Format mỗi dòng:*
\`UID | Ghi chú | Giá | Thời hạn\`

*Giới hạn:* ${isVip ? '500' : '50'} mục/lần`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Quay lại', callback_data: 'menu_fb' }]] },
                });
            }

            // ==================== SEARCH GUIDES ====================
            if (data === 'search_guide') {
                return bot.editMessageText(`🔍 *Tìm kiếm nhanh*

*Cú pháp:*
\`/search Từ khóa\`

*Tìm theo:*
• ID hệ thống: \`/search 123\`
• UID Facebook: \`/search 100012345678\`
• Ghi chú: \`/search Khánh\``, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Quay lại', callback_data: 'menu_search' }]] },
                });
            }

            if (data === 'searchai_guide') {
                const vipNote = isVip ? '' : '\n\n⚠️ _Tính năng này yêu cầu gói VIP_';
                return bot.editMessageText(`🤖 *Tìm kiếm AI* \\(VIP\\)

*Cú pháp:*
\`/searchai Câu hỏi\`

*Ví dụ:*
\`/searchai tìm các UID die có giá trị trên 500k\`
\`/searchai UID nào sắp hết hạn\`
\`/searchai thống kê tổng giá trị kèo die\`${vipNote}`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Quay lại', callback_data: 'menu_search' }]] },
                });
            }

            // ==================== FB LIST ====================
            const fbListMatch = data.match(/^fb_list_(\w+)_(\d+)$/);
            if (fbListMatch) {
                const filter = fbListMatch[1];
                const page = parseInt(fbListMatch[2]);
                return sendFbList(bot, chatId, user.id, filter, page, messageId);
            }

            // ==================== FB STATS ====================
            if (data === 'fb_stats') {
                return sendFbStats(bot, chatId, user.id, messageId);
            }

            // ==================== PROFILE VIEW ====================
            if (data === 'profile_view') {
                return sendProfile(bot, chatId, user, messageId);
            }

            if (data === 'profile_upgrade') {
                return bot.editMessageText(`⭐ *Nâng cấp VIP*

*Lợi ích VIP:*
• UID không giới hạn
• Check nhanh 1 phút/lần
• Tìm kiếm AI
• Bot con riêng
• Hỗ trợ ưu tiên

Gõ /nap để xem hướng dẫn thanh toán\\.`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.backToMain(),
                });
            }

            if (data === 'profile_subbot') {
                return bot.editMessageText(`🤖 *Bot con riêng*

*Cách tạo:*
1\\. Chat với @BotFather
2\\. Gõ /newbot
3\\. Copy Bot Token
4\\. Gõ \`/setbot TOKEN\` ở đây

*Quản lý:*
/mybot \\- Xem thông tin bot con
/removebot \\- Xóa bot con`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.backToMain(),
                });
            }

            // ==================== FB DELETE CONFIRM ====================
            const fbDeleteConfirm = data.match(/^fb_delete_confirm_(\d+)$/);
            if (fbDeleteConfirm) {
                const id = parseInt(fbDeleteConfirm[1]);
                const item = fbOps.getById(id, user.id);
                if (!item) return;

                return bot.editMessageText(`⚠️ *Xác nhận xóa?*

📋 ID: \`${item.id}\`
${typeEmoji(item.type)} UID: \`${escMd(item.uid)}\`
📝 ${escMd(item.note || 'Không có')}
💰 ${escMd(formatPrice(item.price))}`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.deleteConfirm('fb', id),
                });
            }

            // FB DELETE YES
            const fbDeleteYes = data.match(/^fb_delete_yes_(\d+)$/);
            if (fbDeleteYes) {
                const id = parseInt(fbDeleteYes[1]);
                const deleted = fbOps.delete(id, user.id);
                if (deleted) {
                    return bot.editMessageText(`✅ *Đã xóa thành công\\!*\n\n${typeEmoji(deleted.type)} \`${escMd(deleted.uid)}\` \\- ${escMd(deleted.note || 'N/A')}`, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'MarkdownV2',
                        reply_markup: kb.backToMain(),
                    });
                }
            }

            // FB DELETE ALL YES
            if (data === 'fb_deleteall_yes') {
                const count = fbOps.deleteAll(user.id);
                return bot.editMessageText(`✅ *Đã xóa tất cả ${count} Facebook UIDs\\!*`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'MarkdownV2',
                    reply_markup: kb.backToMain(),
                });
            }

            // ==================== FB EDIT NOTE/PRICE (interactive) ====================
            const fbEditNote = data.match(/^fb_edit_note_(\d+)$/);
            if (fbEditNote) {
                const id = parseInt(fbEditNote[1]);
                bot._awaitingInput = bot._awaitingInput || {};
                bot._awaitingInput[query.from.id] = { type: 'fb_note', id };

                return bot.sendMessage(chatId, `📝 Nhập ghi chú mới cho UID #${id}:`, {
                    reply_markup: { force_reply: true },
                });
            }

            const fbEditPrice = data.match(/^fb_edit_price_(\d+)$/);
            if (fbEditPrice) {
                const id = parseInt(fbEditPrice[1]);
                bot._awaitingInput = bot._awaitingInput || {};
                bot._awaitingInput[query.from.id] = { type: 'fb_price', id };

                return bot.sendMessage(chatId, `💰 Nhập giá mới cho UID #${id}:`, {
                    reply_markup: { force_reply: true },
                });
            }

            const fbExtend = data.match(/^fb_extend_(\d+)$/);
            if (fbExtend) {
                const id = parseInt(fbExtend[1]);
                bot._awaitingInput = bot._awaitingInput || {};
                bot._awaitingInput[query.from.id] = { type: 'fb_extend', id };

                return bot.sendMessage(chatId, `⏱️ Nhập thời hạn gia hạn cho UID \\#${id}:\n\\(VD: 30p, 7d, 2w, 1M\\)`, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: { force_reply: true },
                });
            }

            // NOOP
            if (data === 'noop') return;

        } catch (error) {
            console.error('[Callback Error]', error.message);
        }
    });

    // ==================== HANDLE AWAITING INPUTS ====================
    bot.on('message', (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        if (!bot._awaitingInput || !bot._awaitingInput[msg.from.id]) return;

        const chatId = msg.chat.id;
        const awaiting = bot._awaitingInput[msg.from.id];
        delete bot._awaitingInput[msg.from.id];
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);

        try {
            if (awaiting.type === 'fb_note') {
                const updated = fbOps.update(awaiting.id, user.id, msg.text, undefined, undefined);
                if (updated) {
                    bot.sendMessage(chatId, `✅ Đã cập nhật ghi chú: "${escMd(msg.text)}"`, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: kb.fbDetailActions(awaiting.id),
                    });
                }
            } else if (awaiting.type === 'fb_price') {
                const price = parseInt(msg.text.replace(/[^\d]/g, ''));
                const updated = fbOps.update(awaiting.id, user.id, undefined, price, undefined);
                if (updated) {
                    bot.sendMessage(chatId, `✅ Đã cập nhật giá: ${escMd(formatPrice(price))}`, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: kb.fbDetailActions(awaiting.id),
                    });
                }
            } else if (awaiting.type === 'fb_extend') {
                const ms = parseDuration(msg.text.trim());
                if (!ms) return bot.sendMessage(chatId, '⚠️ Thời hạn không hợp lệ\\!', { parse_mode: 'MarkdownV2' });
                const updated = fbOps.extendTracking(awaiting.id, user.id, ms);
                if (updated) {
                    bot.sendMessage(chatId, `✅ Đã gia hạn: ${escMd(formatTimeRemaining(updated.expires_at))}`, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: kb.fbDetailActions(awaiting.id),
                    });
                }
            }
        } catch (error) {
            console.error('[Input Handler Error]', error.message);
            bot.sendMessage(chatId, '❌ Có lỗi xảy ra\\!', { parse_mode: 'MarkdownV2' });
        }
    });

    // ==================== HANDLE BULK UPLOAD TEXT ====================
    bot.on('message', (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        if (!bot._awaitingBulk || !bot._awaitingBulk[msg.from.id]) return;
        // Don't consume if awaiting other input
        if (bot._awaitingInput && bot._awaitingInput[msg.from.id]) return;

        const chatId = msg.chat.id;
        const bulkType = bot._awaitingBulk[msg.from.id];
        delete bot._awaitingBulk[msg.from.id];

        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const lines = msg.text.split('\n').filter(l => l.trim());

        processBulkUpload(bot, chatId, user, bulkType, lines);
    });

    // ==================== HANDLE DETAIL COMMANDS ====================
    bot.onText(/\/detail_(\d+)/, (msg, match) => {
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        sendFbDetail(bot, msg.chat.id, user.id, parseInt(match[1]));
    });
}

// ==================== BULK UPLOAD PROCESSOR ====================
async function processBulkUpload(bot, chatId, user, type, lines) {
    const isVip = userOps.isVip(user.telegram_id);
    const limit = isVip ? config.BULK_LIMIT_VIP : config.BULK_LIMIT_FREE;

    if (lines.length > limit) {
        return bot.sendMessage(chatId,
            `⚠️ Vượt quá giới hạn\\! Tối đa ${limit} mục/lần\\.`,
            { parse_mode: 'MarkdownV2' }
        );
    }

    let success = 0, failed = 0, skipped = 0;
    const errors = [];

    const statusMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý ${lines.length} mục\\.\\.\\.`, { parse_mode: 'MarkdownV2' });

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
            const args = line.split('|').map(s => s.trim());
            const { parseFacebookInput } = require('../utils/helpers');
            const parsed = parseFacebookInput(args[0]);
            const note = args[1] || '';
            const price = args[2] ? parseInt(args[2].replace(/[^\d]/g, '')) : 0;
            const expiresAt = args[3] ? parseExpiry(args[3]) : null;

            const result = fbOps.add(user.id, parsed.uid, 'profile', parsed.link, note, price, expiresAt);
            if (result.error === 'duplicate') { skipped++; }
            else { success++; }
        } catch (err) {
            failed++;
            errors.push(`Dòng ${i + 1}: ${err.message}`);
        }
    }

    let resultText = `📤 *Kết quả upload hàng loạt*

✅ Thành công: *${success}*
❌ Thất bại: *${failed}*
⏭️ Bỏ qua \\(trùng\\): *${skipped}*`;

    if (errors.length > 0) {
        resultText += `\n\n*Chi tiết lỗi:*\n`;
        errors.slice(0, 5).forEach(e => { resultText += `• ${escMd(e)}\n`; });
    }

    bot.editMessageText(resultText, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'MarkdownV2',
        reply_markup: kb.backToMain(),
    });
}

module.exports = { registerCallbackHandlers };
