const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const config = require('./config');

// Validate config
if (!config.BOT_TOKEN || config.BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.error('❌ BOT_TOKEN chưa được cấu hình! Vui lòng cập nhật file .env');
    process.exit(1);
}

// Create bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Handle polling errors gracefully
bot.on('polling_error', (err) => {
    if (err.code === 'ETELEGRAM' && err.message.includes('409')) {
        console.log('[Polling] Another bot instance detected, retrying...');
    } else {
        console.log('[Polling Error]', err.message);
    }
});

// Global unhandled rejection handler (prevents crash from editMessageText on photo messages)
process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    if (msg.includes('no text in the message to edit') || msg.includes('message is not modified')) {
        // Expected when trying to edit a photo message - silently ignore
        return;
    }
    console.error('[Unhandled Rejection]', msg);
});

console.log('🤖 CheckUID Bot đang khởi động...');

// Initialize state objects
bot._awaitingInput = {};
bot._awaitingBulk = {};

// ==================== REGISTER HANDLERS ====================
const { registerStartHandlers } = require('./handlers/start');
const { registerFacebookHandlers } = require('./handlers/facebook');
const { registerSearchHandlers } = require('./handlers/search');
const { registerProfileHandlers } = require('./handlers/profile');
const { registerCallbackHandlers } = require('./handlers/callbacks');

registerStartHandlers(bot);
registerFacebookHandlers(bot);
registerSearchHandlers(bot);
registerProfileHandlers(bot);
registerCallbackHandlers(bot);

// ==================== SET BOT COMMANDS ====================
bot.setMyCommands([
    { command: 'start', description: '🚀 Khởi động bot' },
    { command: 'menu', description: '🏠 Menu chính' },
    { command: 'help', description: '❓ Hướng dẫn sử dụng' },
    { command: 'add', description: '➕ Thêm Facebook Profile' },
    { command: 'adds', description: '📤 Upload Facebook hàng loạt' },
    { command: 'list', description: '📋 Xem danh sách Facebook' },
    { command: 'search', description: '🔍 Tìm kiếm' },
    { command: 'stats', description: '📊 Thống kê Facebook' },
    { command: 'profile', description: '👤 Thông tin tài khoản' },
    { command: 'nap', description: '💰 Nâng cấp VIP' },
]);

// ==================== STATUS CHECK SCHEDULER ====================
const { runFacebookChecks, cleanExpired } = require('./services/checker');
const { escMd } = require('./handlers/facebook');
const { statusEmoji, typeEmoji, formatPrice } = require('./utils/helpers');

/**
 * Send notification when UID status changes - with avatar if available
 */
function onFbStatusChange(item, oldStatus, newStatus, avatarUrl) {
    const emoji = newStatus === 'die' ? '🔴' : '🟢';
    const text = `${emoji} *THAY ĐỔI TRẠNG THÁI*

${typeEmoji(item.type)} UID: \`${escMd(item.uid)}\`
📝 Ghi chú: ${escMd(item.note || 'N/A')}
💰 Giá: ${escMd(formatPrice(item.price))}

📊 ${escMd(statusEmoji(oldStatus))} ➜ ${escMd(statusEmoji(newStatus))}`;

    // Send with avatar photo if available (for profiles)
    if (avatarUrl && item.type === 'profile') {
        bot.sendPhoto(item.telegram_id, avatarUrl, {
            caption: text,
            parse_mode: 'MarkdownV2',
        }).catch(() => {
            // Fallback to text
            bot.sendMessage(item.telegram_id, text, { parse_mode: 'MarkdownV2' }).catch(err => {
                console.error(`[Notify Error] User ${item.telegram_id}:`, err.message);
            });
        });
    } else {
        bot.sendMessage(item.telegram_id, text, { parse_mode: 'MarkdownV2' }).catch(err => {
            console.error(`[Notify Error] User ${item.telegram_id}:`, err.message);
        });
    }
}

// Run checks every minute (VIP gets priority in the checker service)
let isChecking = false;

cron.schedule('* * * * *', async () => {
    if (isChecking) return;
    isChecking = true;

    try {
        await runFacebookChecks(onFbStatusChange);
    } catch (error) {
        console.error('[Scheduler Error]', error.message);
    } finally {
        isChecking = false;
    }
});

// Clean expired UIDs every hour
cron.schedule('0 * * * *', () => {
    try {
        cleanExpired();
    } catch (error) {
        console.error('[Cleanup Error]', error.message);
    }
});

// ==================== ERROR HANDLING ====================
bot.on('polling_error', (error) => {
    console.error('[Polling Error]', error.message);
});

process.on('uncaughtException', (error) => {
    console.error('[Uncaught Exception]', error);
});

process.on('unhandledRejection', (error) => {
    console.error('[Unhandled Rejection]', error);
});

console.log('✅ CheckUID Bot đã sẵn sàng!');
console.log(`📊 Check interval: VIP=${config.VIP_CHECK_INTERVAL}s, Free=${config.FREE_CHECK_INTERVAL}s`);
console.log(`🔑 FB Token: ${config.FB_ACCESS_TOKEN ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
console.log(`🍪 FB Cookie: ${config.FB_COOKIE ? '✅ Đã cấu hình' : '⚠️ Chưa cấu hình (avatar sẽ là mặc định)'}`);
