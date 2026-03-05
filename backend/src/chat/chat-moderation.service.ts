import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ============================================
// VIOLATION DETECTION PATTERNS
// ============================================

// Banned keywords - contact info that indicates off-platform transactions
const BANNED_KEYWORDS = [
    // Social media / messaging apps
    'zalo', 'zalô', 'za lo', 'z.a.l.o', 'z a l o',
    'telegram', 'tele', 'telê', 't.e.l.e',
    'facebook', 'fb', 'face', 'messenger', 'mess',
    'viber', 'whatsapp', 'wechat', 'line',
    'skype', 'discord', 'instagram', 'insta',

    // Off-platform transaction keywords
    'giao dịch ngoài', 'giao dich ngoai',
    'mua ngoài', 'mua ngoai',
    'bán ngoài', 'ban ngoai',
    'chuyển khoản trực tiếp', 'chuyen khoan truc tiep',
    'thanh toán ngoài', 'thanh toan ngoai',
    'liên hệ ngoài', 'lien he ngoai',
    'qua chỗ khác', 'qua cho khac',
    'ra ngoài', 'ra ngoai',
    'không qua sàn', 'khong qua san',

    // Payment methods that bypass platform
    'momo', 'mo mo', 'zalopay', 'vnpay trực tiếp',
    'chuyển mbank', 'chuyen mbank',
    'stk', 's.t.k', 'số tài khoản', 'so tai khoan',
    'bank', 'ngân hàng', 'ngan hang',
];

// Phone number patterns
const PHONE_PATTERNS = [
    /0\d{9,10}/g,                    // 0912345678, 01234567890
    /\+84\d{9,10}/g,                 // +84912345678
    /0\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, // 091-234-5678, 091.234.5678
    /\(?0\d{2,3}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, // (091) 234-5678
    /zero\s*\d/gi,                   // zero 9 1 2...
    /không\s*\d/gi,                  // không 9 1 2...
];

// Email patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Link patterns (excluding platform links)
const LINK_PATTERNS = [
    /https?:\/\/(?!bachhoammo\.store)[^\s]+/gi,
    /www\.(?!bachhoammo\.store)[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|net|org|vn|io|xyz|site|online|shop|store)(?!\/api)/gi,
];

// Severity levels
export enum ViolationSeverity {
    LOW = 'LOW',       // Warning only
    MEDIUM = 'MEDIUM', // Block message + warning
    HIGH = 'HIGH',     // Block message + restrict account
    CRITICAL = 'CRITICAL', // Block message + lock account
}

export enum ViolationType {
    PHONE_NUMBER = 'PHONE_NUMBER',
    EMAIL = 'EMAIL',
    SOCIAL_MEDIA = 'SOCIAL_MEDIA',
    EXTERNAL_LINK = 'EXTERNAL_LINK',
    OFF_PLATFORM_TRANSACTION = 'OFF_PLATFORM_TRANSACTION',
    BANK_INFO = 'BANK_INFO',
}

export interface ViolationResult {
    isViolation: boolean;
    violations: {
        type: ViolationType;
        severity: ViolationSeverity;
        matched: string;
        keyword?: string;
    }[];
    totalScore: number;
    action: 'ALLOW' | 'WARN' | 'BLOCK' | 'BLOCK_AND_WARN' | 'BLOCK_AND_RESTRICT' | 'BLOCK_AND_LOCK';
    warningMessage?: string;
}

export interface UserViolationStats {
    totalViolations: number;
    last24h: number;
    last7d: number;
    isRestricted: boolean;
    isLocked: boolean;
}

@Injectable()
export class ChatModerationService {
    constructor(
        private prisma: PrismaService,
    ) { }

    // ============================================
    // MAIN DETECTION METHOD
    // ============================================

    /**
     * Analyze message content for violations
     */
    analyzeMessage(content: string): ViolationResult {
        const violations: ViolationResult['violations'] = [];
        let totalScore = 0;

        // Normalize content for detection (lowercase, remove special chars)
        const normalizedContent = this.normalizeText(content);
        const originalContent = content.toLowerCase();

        // 1. Check for phone numbers
        for (const pattern of PHONE_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    violations.push({
                        type: ViolationType.PHONE_NUMBER,
                        severity: ViolationSeverity.HIGH,
                        matched: match,
                    });
                    totalScore += 30;
                }
            }
        }

        // 2. Check for emails
        const emailMatches = content.match(EMAIL_PATTERN);
        if (emailMatches) {
            for (const match of emailMatches) {
                violations.push({
                    type: ViolationType.EMAIL,
                    severity: ViolationSeverity.MEDIUM,
                    matched: match,
                });
                totalScore += 20;
            }
        }

        // 3. Check for banned keywords
        for (const keyword of BANNED_KEYWORDS) {
            if (normalizedContent.includes(keyword) || originalContent.includes(keyword)) {
                const severity = this.getKeywordSeverity(keyword);
                violations.push({
                    type: this.getKeywordViolationType(keyword),
                    severity,
                    matched: keyword,
                    keyword,
                });
                totalScore += this.getSeverityScore(severity);
            }
        }

        // 4. Check for external links
        for (const pattern of LINK_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    // Skip platform links
                    if (match.includes('bachhoammo.store')) continue;

                    violations.push({
                        type: ViolationType.EXTERNAL_LINK,
                        severity: ViolationSeverity.MEDIUM,
                        matched: match,
                    });
                    totalScore += 20;
                }
            }
        }

        // Determine action based on score
        const action = this.determineAction(totalScore, violations);
        const warningMessage = this.getWarningMessage(action, violations);

        return {
            isViolation: violations.length > 0,
            violations,
            totalScore,
            action,
            warningMessage,
        };
    }

    /**
     * Check message and record violation if any
     */
    async checkAndRecordViolation(
        userId: string,
        conversationId: string,
        content: string,
        messageId?: string,
    ): Promise<ViolationResult> {
        const result = this.analyzeMessage(content);

        if (result.isViolation) {
            // Record violation to database
            await this.recordViolation(userId, conversationId, result, content, messageId);

            // Check if user should be restricted/locked
            await this.checkAndApplyPenalty(userId);
        }

        return result;
    }

    // ============================================
    // DATABASE OPERATIONS
    // ============================================

    /**
     * Record violation to database
     */
    private async recordViolation(
        userId: string,
        conversationId: string,
        result: ViolationResult,
        content: string,
        messageId?: string,
    ): Promise<void> {
        try {
            // Create chat violation record using Prisma
            await this.prisma.chatViolation.create({
                data: {
                    userId,
                    conversationId,
                    messageId: messageId || null,
                    content: content.substring(0, 500),
                    violationType: result.violations.map(v => v.type).join(','),
                    severity: result.violations[0]?.severity || 'LOW',
                    score: result.totalScore,
                    matchedPatterns: JSON.stringify(result.violations.map(v => v.matched)),
                    action: result.action,
                },
            });
            console.log(`[ChatModeration] Recorded violation for user ${userId}: ${result.action}`);
        } catch (error) {
            // Table might not exist yet, log and continue
            console.error('[ChatModeration] Error recording violation:', error.message);
        }
    }

    /**
     * Get user's violation statistics
     */
    async getUserViolationStats(userId: string): Promise<UserViolationStats> {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Get counts using Prisma
            const [total, countLast24h, countLast7d] = await Promise.all([
                this.prisma.chatViolation.count({
                    where: { userId },
                }),
                this.prisma.chatViolation.count({
                    where: { userId, createdAt: { gte: last24h } },
                }),
                this.prisma.chatViolation.count({
                    where: { userId, createdAt: { gte: last7d } },
                }),
            ]);

            // Get user restriction status
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { isChatRestricted: true, isChatLocked: true },
            });

            return {
                totalViolations: total,
                last24h: countLast24h,
                last7d: countLast7d,
                isRestricted: user?.isChatRestricted || false,
                isLocked: user?.isChatLocked || false,
            };
        } catch (error) {
            // Tables might not exist yet
            console.error('[ChatModeration] Error getting stats:', error.message);
            return {
                totalViolations: 0,
                last24h: 0,
                last7d: 0,
                isRestricted: false,
                isLocked: false,
            };
        }
    }

    /**
     * Check and apply penalty based on violation history
     */
    private async checkAndApplyPenalty(userId: string): Promise<void> {
        const stats = await this.getUserViolationStats(userId);

        try {
            // Lock account if 5+ violations in 24h or 10+ in 7 days
            if (stats.last24h >= 5 || stats.last7d >= 10) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        isChatLocked: true,
                        chatLockedAt: new Date(),
                        chatLockReason: `Tự động khóa do vi phạm nhiều lần: ${stats.last24h} lần/24h, ${stats.last7d} lần/7 ngày`,
                    },
                });
                console.log(`[ChatModeration] User ${userId} LOCKED due to excessive violations`);
            }
            // Restrict if 3+ violations in 24h or 5+ in 7 days
            else if (stats.last24h >= 3 || stats.last7d >= 5) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        isChatRestricted: true,
                        chatRestrictedAt: new Date(),
                    },
                });
                console.log(`[ChatModeration] User ${userId} RESTRICTED due to violations`);
            }
        } catch (error) {
            // Fields might not exist yet in schema
            console.error('[ChatModeration] Error applying penalty:', error.message);
        }
    }

    /**
     * Check if user can send messages
     */
    async canUserSendMessage(userId: string): Promise<{ allowed: boolean; reason?: string }> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { isChatLocked: true, isChatRestricted: true, chatLockReason: true },
            });

            if (user?.isChatLocked) {
                return {
                    allowed: false,
                    reason: user.chatLockReason || 'Tài khoản đã bị khóa chức năng nhắn tin do vi phạm quy định.',
                };
            }

            if (user?.isChatRestricted) {
                return {
                    allowed: true, // Still allowed but with restrictions
                    reason: 'Tài khoản đang bị hạn chế. Tin nhắn sẽ được kiểm duyệt chặt chẽ hơn.',
                };
            }

            return { allowed: true };
        } catch (error) {
            // Fields might not exist, allow by default
            return { allowed: true };
        }
    }

    // ============================================
    // ADMIN METHODS
    // ============================================

    /**
     * Get all violations (admin)
     */
    async getViolations(options: {
        userId?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ violations: any[]; total: number }> {
        const { userId, page = 1, limit = 20 } = options;

        try {
            const where = userId ? { userId } : {};
            const skip = (page - 1) * limit;

            const [violations, total] = await Promise.all([
                this.prisma.chatViolation.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                this.prisma.chatViolation.count({ where }),
            ]);

            // Enrich with user info
            const enrichedViolations = await Promise.all(
                violations.map(async (v) => {
                    const user = await this.prisma.user.findUnique({
                        where: { id: v.userId },
                        select: { name: true, email: true },
                    });
                    return {
                        ...v,
                        userName: user?.name || 'Unknown',
                        userEmail: user?.email || '',
                    };
                })
            );

            return {
                violations: enrichedViolations,
                total,
            };
        } catch (error) {
            console.error('[ChatModeration] Error getting violations:', error.message);
            return { violations: [], total: 0 };
        }
    }

    /**
     * Unlock user chat (admin)
     */
    async unlockUserChat(userId: string, adminId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isChatLocked: false,
                isChatRestricted: false,
                chatLockedAt: null,
                chatRestrictedAt: null,
                chatLockReason: null,
            },
        });
        console.log(`[ChatModeration] Admin ${adminId} unlocked user ${userId}`);
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private getKeywordSeverity(keyword: string): ViolationSeverity {
        // High severity for direct contact methods
        if (['zalo', 'telegram', 'facebook', 'messenger', 'viber', 'whatsapp'].some(k => keyword.includes(k))) {
            return ViolationSeverity.HIGH;
        }
        // Critical for explicit off-platform transaction intent
        if (['giao dịch ngoài', 'thanh toán ngoài', 'không qua sàn', 'stk', 'số tài khoản'].some(k => keyword.includes(k))) {
            return ViolationSeverity.CRITICAL;
        }
        // Medium for payment apps
        if (['momo', 'zalopay', 'bank', 'ngân hàng'].some(k => keyword.includes(k))) {
            return ViolationSeverity.MEDIUM;
        }
        return ViolationSeverity.LOW;
    }

    private getKeywordViolationType(keyword: string): ViolationType {
        if (['zalo', 'telegram', 'facebook', 'messenger', 'viber', 'whatsapp', 'fb', 'tele', 'skype', 'discord', 'instagram'].some(k => keyword.includes(k))) {
            return ViolationType.SOCIAL_MEDIA;
        }
        if (['momo', 'zalopay', 'vnpay', 'stk', 'số tài khoản', 'bank', 'ngân hàng', 'chuyển khoản'].some(k => keyword.includes(k))) {
            return ViolationType.BANK_INFO;
        }
        return ViolationType.OFF_PLATFORM_TRANSACTION;
    }

    private getSeverityScore(severity: ViolationSeverity): number {
        switch (severity) {
            case ViolationSeverity.LOW: return 10;
            case ViolationSeverity.MEDIUM: return 20;
            case ViolationSeverity.HIGH: return 30;
            case ViolationSeverity.CRITICAL: return 50;
        }
    }

    private determineAction(score: number, violations: ViolationResult['violations']): ViolationResult['action'] {
        // Check for critical violations first
        if (violations.some(v => v.severity === ViolationSeverity.CRITICAL)) {
            return 'BLOCK_AND_RESTRICT';
        }

        if (score >= 50) return 'BLOCK_AND_RESTRICT';
        if (score >= 30) return 'BLOCK_AND_WARN';
        if (score >= 20) return 'BLOCK';
        if (score >= 10) return 'WARN';
        return 'ALLOW';
    }

    private getWarningMessage(action: ViolationResult['action'], violations: ViolationResult['violations']): string {
        const violationTypes = [...new Set(violations.map(v => {
            switch (v.type) {
                case ViolationType.PHONE_NUMBER: return 'số điện thoại';
                case ViolationType.EMAIL: return 'email';
                case ViolationType.SOCIAL_MEDIA: return 'ứng dụng nhắn tin bên ngoài';
                case ViolationType.EXTERNAL_LINK: return 'đường link ngoài';
                case ViolationType.BANK_INFO: return 'thông tin ngân hàng';
                case ViolationType.OFF_PLATFORM_TRANSACTION: return 'giao dịch ngoài sàn';
            }
        }))].join(', ');

        switch (action) {
            case 'WARN':
                return `⚠️ Cảnh báo: Tin nhắn của bạn có chứa ${violationTypes}. Vui lòng không chia sẻ thông tin liên lạc hoặc mời gọi giao dịch ngoài sàn.`;
            case 'BLOCK':
                return `🚫 Tin nhắn bị chặn: Phát hiện ${violationTypes}. Để bảo vệ quyền lợi của bạn, vui lòng thực hiện giao dịch qua BachHoaMMO.`;
            case 'BLOCK_AND_WARN':
                return `🚫 Tin nhắn bị chặn: Phát hiện ${violationTypes}. Đây là cảnh báo! Tiếp tục vi phạm sẽ dẫn đến hạn chế tài khoản.`;
            case 'BLOCK_AND_RESTRICT':
                return `⛔ Tin nhắn bị chặn và tài khoản bị hạn chế: Vi phạm nghiêm trọng - ${violationTypes}. Liên hệ admin để được hỗ trợ.`;
            case 'BLOCK_AND_LOCK':
                return `⛔ Tài khoản đã bị khóa chức năng nhắn tin do vi phạm nghiêm trọng quy định giao dịch. Liên hệ admin để khiếu nại.`;
            default:
                return '';
        }
    }
}
