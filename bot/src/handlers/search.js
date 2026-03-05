const { userOps, fbOps } = require('../database');
const kb = require('../utils/keyboards');
const { parseArgs, formatPrice, statusEmoji, typeEmoji, formatTimeRemaining } = require('../utils/helpers');
const { escMd } = require('./facebook');

function registerSearchHandlers(bot) {

    // ==================== /search - Quick search ====================
    bot.onText(/\/search(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const keyword = match[1].trim();

        const fbResults = fbOps.search(user.id, keyword);

        if (fbResults.length === 0) {
            return bot.sendMessage(chatId,
                `🔍 Không tìm thấy kết quả cho "${escMd(keyword)}"`,
                { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
            );
        }

        let text = `🔍 *Kết quả tìm kiếm* "${escMd(keyword)}" \\(${fbResults.length} kết quả\\)\n\n`;

        if (fbResults.length > 0) {
            text += `*📘 Facebook:*\n`;
            fbResults.forEach(item => {
                text += `${typeEmoji(item.type)} \`${escMd(item.uid.substring(0, 25))}\`\n`;
                text += `  📝 ${escMd(item.note || 'N/A')} \\| 💰 ${escMd(formatPrice(item.price))} \\| ${escMd(statusEmoji(item.status))}\n`;
                text += `  🔎 /detail\\_${item.id}\n\n`;
            });
        }

        bot.sendMessage(chatId, text, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });

    // ==================== /searchai - AI Search (VIP) ====================
    bot.onText(/\/searchai(?:@\S+)?\s+(.+)/s, (msg, match) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);
        const isVip = userOps.isVip(msg.from.id);

        if (!isVip) {
            return bot.sendMessage(chatId,
                '🤖 *Tìm kiếm AI* chỉ dành cho gói VIP\\!\n\nNâng cấp VIP để sử dụng tính năng này\\.',
                { parse_mode: 'MarkdownV2', reply_markup: kb.backToMain() }
            );
        }

        // Simple AI-like search based on keywords
        const query = match[1].trim().toLowerCase();
        let fbResults = [];

        // Parse natural language queries
        if (query.includes('die') || query.includes('chết')) {
            fbResults = fbOps.listByUser(user.id, 'die', 1, 50).items;
        } else if (query.includes('live') || query.includes('sống')) {
            fbResults = fbOps.listByUser(user.id, 'live', 1, 50).items;
        } else if (query.includes('giá') || query.includes('value') || query.includes('kèo')) {
            fbResults = fbOps.listByUser(user.id, null, 1, 100).items
                .filter(i => i.price > 0)
                .sort((a, b) => b.price - a.price);
        } else if (query.includes('hết hạn') || query.includes('sắp hết')) {
            const now = new Date();
            const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            fbResults = fbOps.listByUser(user.id, null, 1, 100).items
                .filter(i => i.expires_at && new Date(i.expires_at) <= oneDayLater && new Date(i.expires_at) > now);
        } else {
            // Fallback to regular search
            fbResults = fbOps.search(user.id, query);
        }

        const totalResults = fbResults.length;
        const totalPrice = fbResults.reduce((sum, i) => sum + (i.price || 0), 0);

        let text = `🤖 *Kết quả tìm kiếm AI*\n\n`;
        text += `📝 Câu hỏi: "${escMd(match[1].trim())}"\n`;
        text += `📊 Tìm thấy: *${totalResults}* kết quả\n`;
        if (totalPrice > 0) text += `💰 Tổng giá trị: *${escMd(formatPrice(totalPrice))}*\n`;
        text += `\n`;

        fbResults.slice(0, 10).forEach((item, idx) => {
            text += `${idx + 1}\\. ${typeEmoji(item.type)} \`${escMd(item.uid.substring(0, 25))}\`\n`;
            text += `   📝 ${escMd(item.note || 'N/A')} \\| 💰 ${escMd(formatPrice(item.price))} \\| ${escMd(statusEmoji(item.status))}\n\n`;
        });

        if (totalResults > 10) {
            text += `\n_\\.\\.\\.và ${totalResults - 10} kết quả khác_`;
        }

        bot.sendMessage(chatId, text, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });
}

module.exports = { registerSearchHandlers };
