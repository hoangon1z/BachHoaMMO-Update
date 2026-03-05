const axios = require('axios');
const config = require('../config');
const { fbOps } = require('../database');

// ==================== FACEBOOK CHECKER ====================

/**
 * Check single Facebook UID status (LIVE/DIE)
 * Uses graph2.facebook.com without token for basic check
 */
async function checkFacebookUID(uid) {
    try {
        const checkUid = uid;

        const response = await axios.get(
            `https://graph2.facebook.com/v3.3/${encodeURIComponent(checkUid)}/picture`,
            {
                params: { redirect: false },
                timeout: 10000,
            }
        );

        const data = response.data?.data;
        if (!data) return { status: 'die', avatarUrl: null, isSilhouette: true };

        // LIVE: has height and width fields
        // DIE: no height/width, URL points to static placeholder
        const isLive = data.height !== undefined && data.width !== undefined;

        return {
            status: isLive ? 'live' : 'die',
            avatarUrl: data.url || null,
            isSilhouette: data.is_silhouette !== false,
        };
    } catch (error) {
        // Network error or API error - treat as unknown, don't change status
        console.error(`[FB Check Error] UID ${uid}:`, error.message);
        return { status: null, avatarUrl: null, isSilhouette: true };
    }
}

/**
 * Get real avatar for any Facebook user as a Buffer
 * Returns Buffer (image data) or null
 * Downloads the image ourselves because Telegram can't access Facebook scontent URLs
 */
async function getFacebookAvatar(uid) {
    // Method 1: Scrape touch.facebook.com + download image
    if (config.FB_COOKIE) {
        try {
            const avatarUrl = await scrapeTouchFacebook(uid);
            if (avatarUrl) {
                console.log(`[Avatar] Found URL for ${uid}, downloading...`);
                const buffer = await downloadImage(avatarUrl);
                if (buffer && buffer.length > 500) { // > 500B = real image (not empty)
                    console.log(`[Avatar] Downloaded ${buffer.length} bytes`);
                    return buffer;
                }
                console.log(`[Avatar] Image too small (${buffer?.length || 0} bytes), likely default`);
            }
        } catch (e) {
            console.log(`[Avatar] Method 1 error: ${e.message}`);
        }
    }

    // Method 2: Graph API with access token (works for token owner's avatar)
    if (config.FB_ACCESS_TOKEN) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${encodeURIComponent(uid)}/picture`,
                {
                    params: {
                        redirect: false,
                        width: 200,
                        height: 200,
                        access_token: config.FB_ACCESS_TOKEN,
                    },
                    timeout: 10000,
                }
            );

            const data = response.data?.data;
            if (data && !data.is_silhouette) {
                const buffer = await downloadImage(data.url);
                if (buffer && buffer.length > 500) return buffer;
            }
        } catch {
            // Failed
        }
    }

    return null;
}

/**
 * Download image from URL as Buffer
 */
function downloadImage(imageUrl) {
    const https = require('https');
    return new Promise((resolve) => {
        const parsedUrl = new URL(imageUrl);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                ...(config.FB_COOKIE ? { 'Cookie': config.FB_COOKIE } : {}),
            },
            timeout: 10000,
        };

        function doFetch(url, depth) {
            if (depth > 5) return resolve(null);
            const parsed = new URL(url);
            const opts = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                headers: options.headers,
                timeout: 10000,
            };
            const req = https.get(opts, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    return doFetch(res.headers.location, depth + 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return resolve(null);
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        }

        doFetch(imageUrl, 0);
    });
}

/**
 * Scrape touch.facebook.com to get profile avatar URL from React JSON hydration data
 * touch.facebook.com embeds profile_picture URIs in JSON within the HTML
 * Priority: profilePicLarge (480x480) > profilePicMedium (320x320) > profile_picture
 */
function scrapeTouchFacebook(uid) {
    const https = require('https');
    return new Promise((resolve) => {
        let redirectCount = 0;

        function fetchUrl(targetUrl) {
            if (redirectCount > 5) return resolve(null);
            const parsedUrl = new URL(targetUrl);
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Cookie': config.FB_COOKIE,
                    'Accept': 'text/html',
                },
                timeout: 15000,
            };

            const req = https.get(options, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let loc = res.headers.location;
                    if (!loc.startsWith('http')) loc = parsedUrl.protocol + '//' + parsedUrl.hostname + loc;
                    if (loc.startsWith('intent:')) { res.resume(); return resolve(null); }
                    res.resume();
                    redirectCount++;
                    return fetchUrl(loc);
                }
                let chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const html = Buffer.concat(chunks).toString();
                    let avatarUrl = null;

                    // Method 1: Find profilePicLarge in JSON data (480x480 - best quality)
                    const largePic = html.match(/"profilePicLarge":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                    if (largePic) {
                        avatarUrl = largePic[1].replace(/\\\//g, '/');
                        console.log('[Avatar] Found profilePicLarge');
                    }

                    // Method 2: profilePicMedium (320x320)
                    if (!avatarUrl) {
                        const medPic = html.match(/"profilePicMedium":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                        if (medPic) {
                            avatarUrl = medPic[1].replace(/\\\//g, '/');
                            console.log('[Avatar] Found profilePicMedium');
                        }
                    }

                    // Method 3: profile_picture from JSON (usually 80x80 but better than nothing)
                    if (!avatarUrl) {
                        const profPic = html.match(/"profile_picture":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                        if (profPic) {
                            avatarUrl = profPic[1].replace(/\\\//g, '/');
                            console.log('[Avatar] Found profile_picture');
                        }
                    }

                    // Method 4: Fallback to img tags with scontent
                    if (!avatarUrl) {
                        const imgMatches = html.match(/<img[^>]+src="([^"]*scontent[^"]*)"/gi) || [];
                        for (const m of imgMatches) {
                            const src = m.match(/src="([^"]+)"/i);
                            if (src) {
                                const url = src[1].replace(/&amp;/g, '&');
                                if (!url.includes('84628273_176159')) {
                                    avatarUrl = url;
                                    console.log('[Avatar] Fallback to img tag');
                                    break;
                                }
                            }
                        }
                    }

                    // Filter out default avatar
                    if (avatarUrl && avatarUrl.includes('84628273_176159')) {
                        avatarUrl = null;
                    }

                    resolve(avatarUrl);
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        }

        fetchUrl(`https://touch.facebook.com/${encodeURIComponent(uid)}`);
    });
}

// ==================== BATCH CHECKER ====================

/**
 * Process all Facebook UIDs for checking (Profile only)
 * @param {Function} onStatusChange - callback(item, oldStatus, newStatus, avatarUrl)
 */
async function runFacebookChecks(onStatusChange) {
    const items = fbOps.getAllForChecking();
    console.log(`[Checker] Checking ${items.length} Facebook UIDs...`);

    for (const item of items) {
        try {
            const result = await checkFacebookUID(item.uid);

            if (result && result.status) {
                const updateResult = fbOps.updateStatus(
                    item.id,
                    result.status,
                    result.avatarUrl || null,
                    result.isSilhouette !== undefined ? result.isSilhouette : null
                );

                if (updateResult && updateResult.changed && onStatusChange) {
                    // Try to get real avatar if status changed
                    let avatarUrl = result.avatarUrl;
                    if (result.status === 'live') {
                        const realAvatar = await getFacebookAvatar(item.uid);
                        if (realAvatar) avatarUrl = realAvatar;
                    }

                    onStatusChange(
                        updateResult.item,
                        updateResult.oldStatus,
                        result.status,
                        avatarUrl
                    );
                }
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        } catch (error) {
            console.error(`[Checker Error] FB ID ${item.id}:`, error.message);
        }
    }
}

/**
 * Clean expired UIDs
 */
function cleanExpired() {
    const fbCount = fbOps.cleanExpired();
    if (fbCount > 0) {
        console.log(`[Cleanup] Removed ${fbCount} FB expired UIDs`);
    }
    return { fbCount };
}

module.exports = {
    checkFacebookUID,
    getFacebookAvatar,
    runFacebookChecks,
    cleanExpired,
};
