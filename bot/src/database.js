const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'checkuid.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== SCHEMA ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    is_vip INTEGER DEFAULT 0,
    vip_expires_at TEXT,
    sub_bot_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facebook_uids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    uid TEXT NOT NULL,
    type TEXT DEFAULT 'profile',
    link TEXT,
    note TEXT DEFAULT '',
    price INTEGER DEFAULT 0,
    status TEXT DEFAULT 'unknown',
    previous_status TEXT DEFAULT 'unknown',
    avatar_url TEXT,
    is_silhouette INTEGER DEFAULT 1,
    expires_at TEXT,
    last_checked_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tiktok_uids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    note TEXT DEFAULT '',
    price INTEGER DEFAULT 0,
    status TEXT DEFAULT 'unknown',
    previous_status TEXT DEFAULT 'unknown',
    expires_at TEXT,
    last_checked_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_fb_user ON facebook_uids(user_id);
  CREATE INDEX IF NOT EXISTS idx_fb_uid ON facebook_uids(uid);
  CREATE INDEX IF NOT EXISTS idx_fb_status ON facebook_uids(status);
  CREATE INDEX IF NOT EXISTS idx_tk_user ON tiktok_uids(user_id);
  CREATE INDEX IF NOT EXISTS idx_tk_username ON tiktok_uids(username);
  CREATE INDEX IF NOT EXISTS idx_tk_status ON tiktok_uids(status);
`);

// ==================== USER OPERATIONS ====================
const userOps = {
    findOrCreate(telegramId, username, firstName) {
        let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
        if (!user) {
            const stmt = db.prepare(
                'INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)'
            );
            stmt.run(String(telegramId), username || '', firstName || '');
            user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
        }
        return user;
    },

    getByTelegramId(telegramId) {
        return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
    },

    updateVip(telegramId, expiresAt) {
        db.prepare(
            'UPDATE users SET is_vip = 1, vip_expires_at = ?, updated_at = datetime("now") WHERE telegram_id = ?'
        ).run(expiresAt, String(telegramId));
    },

    setSubBot(telegramId, token) {
        db.prepare(
            'UPDATE users SET sub_bot_token = ?, updated_at = datetime("now") WHERE telegram_id = ?'
        ).run(token, String(telegramId));
    },

    isVip(telegramId) {
        const user = this.getByTelegramId(telegramId);
        if (!user || !user.is_vip) return false;
        if (user.vip_expires_at && new Date(user.vip_expires_at) < new Date()) {
            db.prepare(
                'UPDATE users SET is_vip = 0, updated_at = datetime("now") WHERE telegram_id = ?'
            ).run(String(telegramId));
            return false;
        }
        return true;
    },

    getAllVipUsers() {
        return db.prepare(
            'SELECT * FROM users WHERE is_vip = 1 AND (vip_expires_at IS NULL OR vip_expires_at > datetime("now"))'
        ).all();
    },

    getAllFreeUsers() {
        return db.prepare(
            'SELECT * FROM users WHERE is_vip = 0 OR (is_vip = 1 AND vip_expires_at <= datetime("now"))'
        ).all();
    },
};

// ==================== FACEBOOK OPERATIONS ====================
const fbOps = {
    add(userId, uid, type, link, note, price, expiresAt) {
        const existing = db.prepare(
            'SELECT * FROM facebook_uids WHERE user_id = ? AND uid = ? AND type = ?'
        ).get(userId, uid, type);
        if (existing) return { error: 'duplicate', existing };

        const stmt = db.prepare(
            `INSERT INTO facebook_uids (user_id, uid, type, link, note, price, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        const result = stmt.run(userId, uid, type, link || '', note || '', price || 0, expiresAt || null);
        return { id: result.lastInsertRowid };
    },

    getById(id, userId) {
        return db.prepare('SELECT * FROM facebook_uids WHERE id = ? AND user_id = ?').get(id, userId);
    },

    getByUid(uid, userId) {
        return db.prepare('SELECT * FROM facebook_uids WHERE uid = ? AND user_id = ?').get(uid, userId);
    },

    listByUser(userId, filter, page, pageSize) {
        let where = 'WHERE user_id = ?';
        const params = [userId];

        if (filter === 'live') { where += ' AND status = ?'; params.push('live'); }
        else if (filter === 'die') { where += ' AND status = ?'; params.push('die'); }
        else if (filter === 'profile') { where += ' AND type = ?'; params.push('profile'); }
        else if (filter === 'group') { where += ' AND type = ?'; params.push('group'); }
        else if (filter === 'post') { where += ' AND type = ?'; params.push('post'); }

        const total = db.prepare(`SELECT COUNT(*) as count FROM facebook_uids ${where}`).get(...params).count;
        const offset = (page - 1) * pageSize;
        const items = db.prepare(
            `SELECT * FROM facebook_uids ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
        ).all(...params, pageSize, offset);

        return { items, total, page, totalPages: Math.ceil(total / pageSize) };
    },

    update(id, userId, note, price, expiresAt) {
        const item = this.getById(id, userId);
        if (!item) return null;

        db.prepare(
            `UPDATE facebook_uids SET
        note = COALESCE(?, note),
        price = COALESCE(?, price),
        expires_at = COALESCE(?, expires_at),
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
        ).run(
            note !== undefined && note !== '' ? note : null,
            price !== undefined && price !== '' ? price : null,
            expiresAt !== undefined ? expiresAt : null,
            id, userId
        );
        return this.getById(id, userId);
    },

    extendTracking(id, userId, additionalMs) {
        const item = this.getById(id, userId);
        if (!item) return null;

        let baseDate = item.expires_at ? new Date(item.expires_at) : new Date();
        if (baseDate < new Date()) baseDate = new Date();
        const newExpiry = new Date(baseDate.getTime() + additionalMs);

        db.prepare(
            'UPDATE facebook_uids SET expires_at = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?'
        ).run(newExpiry.toISOString(), id, userId);
        return this.getById(id, userId);
    },

    delete(id, userId) {
        const item = this.getById(id, userId);
        if (!item) return null;
        db.prepare('DELETE FROM facebook_uids WHERE id = ? AND user_id = ?').run(id, userId);
        return item;
    },

    deleteAll(userId) {
        const count = db.prepare('SELECT COUNT(*) as count FROM facebook_uids WHERE user_id = ?').get(userId).count;
        db.prepare('DELETE FROM facebook_uids WHERE user_id = ?').run(userId);
        return count;
    },

    search(userId, keyword) {
        return db.prepare(
            `SELECT * FROM facebook_uids WHERE user_id = ? AND
       (CAST(id AS TEXT) = ? OR uid LIKE ? OR note LIKE ? OR link LIKE ?)
       ORDER BY id DESC LIMIT 20`
        ).all(userId, keyword, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    },

    countByUser(userId) {
        return db.prepare('SELECT COUNT(*) as count FROM facebook_uids WHERE user_id = ?').get(userId).count;
    },

    stats(userId) {
        return db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live,
        SUM(CASE WHEN status = 'die' THEN 1 ELSE 0 END) as die,
        SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown,
        SUM(price) as total_price,
        SUM(CASE WHEN type = 'profile' THEN 1 ELSE 0 END) as profiles,
        SUM(CASE WHEN type = 'group' THEN 1 ELSE 0 END) as groups,
        SUM(CASE WHEN type = 'post' THEN 1 ELSE 0 END) as posts
      FROM facebook_uids WHERE user_id = ?
    `).get(userId);
    },

    updateStatus(id, status, avatarUrl, isSilhouette) {
        const item = db.prepare('SELECT * FROM facebook_uids WHERE id = ?').get(id);
        if (!item) return null;

        db.prepare(
            `UPDATE facebook_uids SET
        previous_status = status,
        status = ?,
        avatar_url = COALESCE(?, avatar_url),
        is_silhouette = COALESCE(?, is_silhouette),
        last_checked_at = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`
        ).run(status, avatarUrl || null, isSilhouette !== undefined ? (isSilhouette ? 1 : 0) : null, id);

        return {
            item: db.prepare('SELECT * FROM facebook_uids WHERE id = ?').get(id),
            changed: item.status !== 'unknown' && item.status !== status,
            oldStatus: item.status,
        };
    },

    getAllForChecking() {
        return db.prepare(
            `SELECT f.*, u.telegram_id, u.is_vip
       FROM facebook_uids f
       JOIN users u ON f.user_id = u.id
       WHERE f.expires_at IS NULL OR f.expires_at > datetime('now')
       ORDER BY u.is_vip DESC, f.last_checked_at ASC`
        ).all();
    },

    cleanExpired() {
        const count = db.prepare(
            "SELECT COUNT(*) as count FROM facebook_uids WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')"
        ).get().count;
        db.prepare("DELETE FROM facebook_uids WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')").run();
        return count;
    },
};

// ==================== TIKTOK OPERATIONS ====================
const tkOps = {
    add(userId, username, note, price, expiresAt) {
        const cleanUsername = username.replace(/^@/, '').toLowerCase();
        const existing = db.prepare(
            'SELECT * FROM tiktok_uids WHERE user_id = ? AND username = ?'
        ).get(userId, cleanUsername);
        if (existing) return { error: 'duplicate', existing };

        const stmt = db.prepare(
            'INSERT INTO tiktok_uids (user_id, username, note, price, expires_at) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(userId, cleanUsername, note || '', price || 0, expiresAt || null);
        return { id: result.lastInsertRowid };
    },

    getById(id, userId) {
        return db.prepare('SELECT * FROM tiktok_uids WHERE id = ? AND user_id = ?').get(id, userId);
    },

    listByUser(userId, filter, page, pageSize) {
        let where = 'WHERE user_id = ?';
        const params = [userId];

        if (filter === 'live') { where += ' AND status = ?'; params.push('live'); }
        else if (filter === 'die') { where += ' AND status = ?'; params.push('die'); }

        const total = db.prepare(`SELECT COUNT(*) as count FROM tiktok_uids ${where}`).get(...params).count;
        const offset = (page - 1) * pageSize;
        const items = db.prepare(
            `SELECT * FROM tiktok_uids ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
        ).all(...params, pageSize, offset);

        return { items, total, page, totalPages: Math.ceil(total / pageSize) };
    },

    update(id, userId, note, price, expiresAt) {
        const item = this.getById(id, userId);
        if (!item) return null;

        db.prepare(
            `UPDATE tiktok_uids SET
        note = COALESCE(?, note),
        price = COALESCE(?, price),
        expires_at = COALESCE(?, expires_at),
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
        ).run(
            note !== undefined && note !== '' ? note : null,
            price !== undefined && price !== '' ? price : null,
            expiresAt !== undefined ? expiresAt : null,
            id, userId
        );
        return this.getById(id, userId);
    },

    extendTracking(id, userId, additionalMs) {
        const item = this.getById(id, userId);
        if (!item) return null;

        let baseDate = item.expires_at ? new Date(item.expires_at) : new Date();
        if (baseDate < new Date()) baseDate = new Date();
        const newExpiry = new Date(baseDate.getTime() + additionalMs);

        db.prepare(
            'UPDATE tiktok_uids SET expires_at = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?'
        ).run(newExpiry.toISOString(), id, userId);
        return this.getById(id, userId);
    },

    delete(id, userId) {
        const item = this.getById(id, userId);
        if (!item) return null;
        db.prepare('DELETE FROM tiktok_uids WHERE id = ? AND user_id = ?').run(id, userId);
        return item;
    },

    deleteAll(userId) {
        const count = db.prepare('SELECT COUNT(*) as count FROM tiktok_uids WHERE user_id = ?').get(userId).count;
        db.prepare('DELETE FROM tiktok_uids WHERE user_id = ?').run(userId);
        return count;
    },

    search(userId, keyword) {
        return db.prepare(
            `SELECT * FROM tiktok_uids WHERE user_id = ? AND
       (CAST(id AS TEXT) = ? OR username LIKE ? OR note LIKE ?)
       ORDER BY id DESC LIMIT 20`
        ).all(userId, keyword, `%${keyword}%`, `%${keyword}%`);
    },

    countByUser(userId) {
        return db.prepare('SELECT COUNT(*) as count FROM tiktok_uids WHERE user_id = ?').get(userId).count;
    },

    stats(userId) {
        return db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live,
        SUM(CASE WHEN status = 'die' THEN 1 ELSE 0 END) as die,
        SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown,
        SUM(price) as total_price
      FROM tiktok_uids WHERE user_id = ?
    `).get(userId);
    },

    updateStatus(id, status) {
        const item = db.prepare('SELECT * FROM tiktok_uids WHERE id = ?').get(id);
        if (!item) return null;

        db.prepare(
            `UPDATE tiktok_uids SET
        previous_status = status,
        status = ?,
        last_checked_at = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`
        ).run(status, id);

        return {
            item: db.prepare('SELECT * FROM tiktok_uids WHERE id = ?').get(id),
            changed: item.status !== 'unknown' && item.status !== status,
            oldStatus: item.status,
        };
    },

    getAllForChecking() {
        return db.prepare(
            `SELECT t.*, u.telegram_id, u.is_vip
       FROM tiktok_uids t
       JOIN users u ON t.user_id = u.id
       WHERE t.expires_at IS NULL OR t.expires_at > datetime('now')
       ORDER BY u.is_vip DESC, t.last_checked_at ASC`
        ).all();
    },

    cleanExpired() {
        const count = db.prepare(
            "SELECT COUNT(*) as count FROM tiktok_uids WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')"
        ).get().count;
        db.prepare("DELETE FROM tiktok_uids WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')").run();
        return count;
    },
};

module.exports = { db, userOps, fbOps, tkOps };
