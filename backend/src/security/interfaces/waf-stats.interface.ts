import { RiskLevel } from '../constants/security.constants';

/**
 * WAF log entry for structured logging
 */
export interface WafLogEntry {
    timestamp: Date;
    ip: string;
    path: string;
    method: string;
    action: 'BLOCK' | 'WARN' | 'PASS';
    riskLevel: RiskLevel;
    threats: string[];
    reason?: string;
    requestSample?: string; // Truncated sample of suspicious content
    userAgent?: string;
}

/**
 * WAF statistics
 */
export interface WafStats {
    signaturesLoaded: number;
    totalScanned: number;
    totalBlocked: number;
    totalWarnings: number;
    recentLogs?: WafLogEntry[];
}
