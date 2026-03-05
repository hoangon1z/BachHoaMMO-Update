// ==================== HELPER UTILITIES ====================

/**
 * Parse duration string to milliseconds
 * Supports: 30p/30m (minutes), 7d (days), 2w (weeks), 1M (months)
 */
function parseDuration(str) {
    if (!str) return null;
    str = str.trim().toLowerCase();

    const match = str.match(/^(\d+)\s*(p|m|d|w|M|h)$/i);
    if (!match) return null;

    const num = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'p': case 'm': return num * 60 * 1000; // minutes
        case 'h': return num * 60 * 60 * 1000; // hours
        case 'd': return num * 24 * 60 * 60 * 1000; // days
        case 'w': return num * 7 * 24 * 60 * 60 * 1000; // weeks
        case 'M': return num * 30 * 24 * 60 * 60 * 1000; // months (approx)
        default: return null;
    }
}

/**
 * Parse duration string and return expiry date ISO string
 */
function parseExpiry(str) {
    const ms = parseDuration(str);
    if (!ms) return null;
    return new Date(Date.now() + ms).toISOString();
}

/**
 * Format duration remaining from ISO date
 */
function formatTimeRemaining(expiresAt) {
    if (!expiresAt) return 'Vĩnh viễn';
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Hết hạn';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/**
 * Format price number with commas
 */
function formatPrice(price) {
    if (!price || price === 0) return '0đ';
    return price.toLocaleString('vi-VN') + 'đ';
}

/**
 * Parse UID input - extract UID from various Facebook URL formats
 */
function parseFacebookInput(input) {
    input = input.trim();

    // Direct UID number
    if (/^\d+$/.test(input)) {
        return { uid: input, type: 'profile', link: null };
    }

    // Group link
    if (/\/groups\//i.test(input)) {
        const match = input.match(/\/groups\/([^/?&\s]+)/);
        return { uid: match ? match[1] : input, type: 'group', link: input };
    }

    // Post/Video links
    if (/\/(posts|videos|watch|reel|share\/p|pfbid|permalink|story_fbid)/i.test(input)) {
        return { uid: input, type: 'post', link: input };
    }

    // Profile link with ID
    if (/profile\.php\?id=(\d+)/i.test(input)) {
        const match = input.match(/profile\.php\?id=(\d+)/);
        return { uid: match[1], type: 'profile', link: input };
    }

    // Profile link with username
    if (/(?:facebook\.com|fb\.com)\/([^/?&\s]+)/i.test(input)) {
        const match = input.match(/(?:facebook\.com|fb\.com)\/([^/?&\s]+)/);
        const username = match[1];
        if (!['watch', 'groups', 'posts', 'reel', 'share', 'permalink.php'].includes(username)) {
            return { uid: username, type: 'profile', link: input };
        }
    }

    return { uid: input, type: 'profile', link: null };
}

/**
 * Parse TikTok input - extract username from various formats
 */
function parseTikTokInput(input) {
    input = input.trim();

    // Remove @ prefix
    if (input.startsWith('@')) return input.substring(1).toLowerCase();

    // TikTok link
    if (/tiktok\.com\/@?([^/?&\s]+)/i.test(input)) {
        const match = input.match(/tiktok\.com\/@?([^/?&\s]+)/);
        return match[1].replace(/^@/, '').toLowerCase();
    }

    // vm.tiktok.com short link - just return as-is
    if (/vm\.tiktok\.com/i.test(input)) {
        return input;
    }

    return input.toLowerCase();
}

/**
 * Parse command arguments separated by |
 * Returns: [value1, value2, value3, value4]
 */
function parseArgs(text, commandName) {
    // Remove the command itself
    let args = text;
    if (commandName) {
        args = text.replace(new RegExp(`^\\/${commandName}(?:@\\S+)?\\s*`, 'i'), '');
    }
    return args.split('|').map(s => s.trim());
}

/**
 * Status emoji helper
 */
function statusEmoji(status) {
    switch (status) {
        case 'live': return '✅ LIVE';
        case 'die': return '❌ DIE';
        default: return '⏳ Đang check...';
    }
}

/**
 * Type emoji helper
 */
function typeEmoji(type) {
    switch (type) {
        case 'profile': return '👤';
        case 'group': return '👥';
        case 'post': return '📝';
        default: return '📋';
    }
}

/**
 * Format duration in ms to readable string
 */
function formatDuration(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} ngày`;
    if (hours > 0) return `${hours} giờ`;
    return `${mins} phút`;
}

module.exports = {
    parseDuration,
    parseExpiry,
    formatTimeRemaining,
    formatPrice,
    parseFacebookInput,
    parseTikTokInput,
    parseArgs,
    statusEmoji,
    typeEmoji,
    formatDuration,
};
