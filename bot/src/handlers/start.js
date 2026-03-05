const { userOps } = require('../database');
const kb = require('../utils/keyboards');

const WELCOME_TEXT = `
🔍 *CheckUID\\.vn \\- Bot Theo dõi UID*

Chào mừng bạn đến với *CheckUID Bot*\\!
Bot giúp bạn theo dõi trạng thái *LIVE/DIE* của tài khoản Facebook tự động\\.

✨ *Tính năng chính:*
📘 Theo dõi Facebook Profile
🔔 Thông báo real\\-time khi UID đổi trạng thái
🔍 Tìm kiếm nhanh theo ID, UID hoặc ghi chú
📊 Thống kê chi tiết

👇 *Chọn chức năng từ menu bên dưới:*
`;

const HELP_TEXT = `
📖 *Hướng dẫn sử dụng CheckUID Bot*

*📘 Lệnh Facebook:*
/add \\- Thêm Facebook Profile
/adds \\- Upload hàng loạt
/list \\- Xem danh sách Facebook
/updatefb \\- Cập nhật thông tin
/tracking \\- Gia hạn thời gian
/delete \\- Xóa UID
/deleteall fb \\- Xóa tất cả FB

*🔍 Tìm kiếm:*
/search \\- Tìm kiếm nhanh
/searchai \\- Tìm kiếm AI \\(VIP\\)

*📊 Khác:*
/stats \\- Thống kê Facebook
/profile \\- Thông tin tài khoản

*📎 Cú pháp chung:*
\`/add UID | Ghi chú | Giá | Thời hạn\`

*⏱️ Định dạng thời hạn:*
30p/30m \\- 30 phút
7d \\- 7 ngày
2w \\- 2 tuần
1M \\- 1 tháng

💡 Bấm nút *Menu* bên dưới để bắt đầu\\!
`;

function registerStartHandlers(bot) {
    // /start command
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const user = userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);

        bot.sendMessage(chatId, WELCOME_TEXT, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.mainMenu(),
        });
    });

    // /help command
    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id, HELP_TEXT, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.backToMain(),
        });
    });

    // /menu command - show main menu
    bot.onText(/\/menu/, (msg) => {
        const chatId = msg.chat.id;
        userOps.findOrCreate(msg.from.id, msg.from.username, msg.from.first_name);

        bot.sendMessage(chatId, '🏠 *Menu chính*\n\nChọn chức năng:', {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.mainMenu(),
        });
    });
}

module.exports = { registerStartHandlers, WELCOME_TEXT, HELP_TEXT };
