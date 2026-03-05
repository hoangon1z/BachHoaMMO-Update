require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN,
    FB_COOKIE: process.env.FB_COOKIE || '',
    ADMIN_ID: process.env.ADMIN_ID,
    FREE_CHECK_INTERVAL: parseInt(process.env.FREE_CHECK_INTERVAL) || 600,
    VIP_CHECK_INTERVAL: parseInt(process.env.VIP_CHECK_INTERVAL) || 60,
    FREE_UID_LIMIT: 10,
    LIST_PAGE_SIZE: 10,
    BULK_LIMIT_FREE: 50,
    BULK_LIMIT_VIP: 500,
};
