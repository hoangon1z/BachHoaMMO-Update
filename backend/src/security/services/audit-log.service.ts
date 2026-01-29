import { Injectable, Logger } from '@nestjs/common';
import { SecurityEventType, RiskLevel } from '../constants/security.constants';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType: SecurityEventType | string;
  userId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  riskLevel: RiskLevel;
  details: Record<string, any>;
  duration?: number;
  requestId: string;
}

export interface AuditQuery {
  userId?: string;
  eventType?: SecurityEventType | string;
  riskLevel?: RiskLevel;
  startDate?: Date;
  endDate?: Date;
  ip?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  
  // In-memory store (use database in production)
  private readonly auditLogs: AuditLogEntry[] = [];
  private readonly maxLogs = 100000; // Keep last 100k logs in memory

  /**
   * Log security event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.auditLogs.push(logEntry);

    // Trim if over limit
    if (this.auditLogs.length > this.maxLogs) {
      this.auditLogs.splice(0, this.auditLogs.length - this.maxLogs);
    }

    // Log to console for high risk events
    if (logEntry.riskLevel === RiskLevel.HIGH || logEntry.riskLevel === RiskLevel.CRITICAL) {
      this.logger.warn('High risk security event', {
        eventType: logEntry.eventType,
        userId: logEntry.userId,
        ip: logEntry.ip,
        details: logEntry.details,
      });
    }

    // In production, also write to database/SIEM
  }

  /**
   * Log authentication event
   */
  async logAuth(
    eventType: SecurityEventType,
    userId: string | undefined,
    ip: string,
    userAgent: string,
    success: boolean,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      ip,
      userAgent,
      endpoint: '/auth',
      method: 'POST',
      riskLevel: success ? RiskLevel.LOW : RiskLevel.MEDIUM,
      details: { success, ...details },
      requestId: this.generateId(),
    });
  }

  /**
   * Log API request
   */
  async logRequest(
    requestId: string,
    userId: string | undefined,
    ip: string,
    userAgent: string,
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    details?: Record<string, any>,
  ): Promise<void> {
    // Determine risk level based on status code and endpoint
    let riskLevel = RiskLevel.LOW;
    
    if (statusCode >= 400 && statusCode < 500) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (statusCode >= 500) {
      riskLevel = RiskLevel.HIGH;
    }
    
    // Sensitive endpoints get higher baseline risk
    if (endpoint.includes('/admin') || endpoint.includes('/wallet')) {
      riskLevel = this.increaseRiskLevel(riskLevel);
    }

    await this.log({
      eventType: 'API_REQUEST',
      userId,
      ip,
      userAgent,
      endpoint,
      method,
      statusCode,
      duration,
      riskLevel,
      details: details || {},
      requestId,
    });
  }

  /**
   * Log security incident
   */
  async logSecurityIncident(
    eventType: SecurityEventType,
    ip: string,
    userAgent: string,
    endpoint: string,
    riskLevel: RiskLevel,
    details: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      ip,
      userAgent,
      endpoint,
      method: 'N/A',
      riskLevel,
      details,
      requestId: this.generateId(),
    });

    // Alert on critical incidents
    if (riskLevel === RiskLevel.CRITICAL) {
      this.alertSecurityTeam(eventType, details);
    }
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let filtered = [...this.auditLogs];

    if (query.userId) {
      filtered = filtered.filter(log => log.userId === query.userId);
    }
    
    if (query.eventType) {
      filtered = filtered.filter(log => log.eventType === query.eventType);
    }
    
    if (query.riskLevel) {
      filtered = filtered.filter(log => log.riskLevel === query.riskLevel);
    }
    
    if (query.ip) {
      filtered = filtered.filter(log => log.ip === query.ip);
    }
    
    if (query.startDate) {
      filtered = filtered.filter(log => log.timestamp >= query.startDate!.getTime());
    }
    
    if (query.endDate) {
      filtered = filtered.filter(log => log.timestamp <= query.endDate!.getTime());
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const total = filtered.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    
    const logs = filtered.slice(offset, offset + limit);

    return { logs, total };
  }

  /**
   * Get security summary
   */
  async getSecuritySummary(hours: number = 24): Promise<{
    totalEvents: number;
    byRiskLevel: Record<RiskLevel, number>;
    byEventType: Record<string, number>;
    topIps: { ip: string; count: number }[];
    topUsers: { userId: string; count: number }[];
  }> {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    const recentLogs = this.auditLogs.filter(log => log.timestamp >= since);

    const byRiskLevel: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    const byEventType: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    for (const log of recentLogs) {
      // Count by risk level
      byRiskLevel[log.riskLevel]++;
      
      // Count by event type
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;
      
      // Count by IP
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
      
      // Count by user
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    }

    // Get top IPs
    const topIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Get top users
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    return {
      totalEvents: recentLogs.length,
      byRiskLevel,
      byEventType,
      topIps,
      topUsers,
    };
  }

  /**
   * Get failed login attempts for IP
   */
  async getFailedLoginAttempts(ip: string, hours: number = 1): Promise<number> {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    return this.auditLogs.filter(
      log =>
        log.ip === ip &&
        log.eventType === SecurityEventType.LOGIN_FAILURE &&
        log.timestamp >= since
    ).length;
  }

  /**
   * Check for suspicious patterns
   */
  async detectSuspiciousPatterns(ip: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const lastHour = Date.now() - (60 * 60 * 1000);
    
    const recentLogs = this.auditLogs.filter(
      log => log.ip === ip && log.timestamp >= lastHour
    );

    // Check for excessive failed logins
    const failedLogins = recentLogs.filter(
      log => log.eventType === SecurityEventType.LOGIN_FAILURE
    ).length;
    
    if (failedLogins >= 5) {
      reasons.push(`${failedLogins} failed login attempts in last hour`);
    }

    // Check for WAF blocks
    const wafBlocks = recentLogs.filter(
      log => log.eventType === SecurityEventType.WAF_BLOCKED
    ).length;
    
    if (wafBlocks >= 3) {
      reasons.push(`${wafBlocks} WAF blocks in last hour`);
    }

    // Check for rate limit hits
    const rateLimits = recentLogs.filter(
      log => log.eventType === SecurityEventType.RATE_LIMIT_EXCEEDED
    ).length;
    
    if (rateLimits >= 10) {
      reasons.push(`${rateLimits} rate limit hits in last hour`);
    }

    // Check for high risk events
    const highRiskEvents = recentLogs.filter(
      log => log.riskLevel === RiskLevel.HIGH || log.riskLevel === RiskLevel.CRITICAL
    ).length;
    
    if (highRiskEvents >= 3) {
      reasons.push(`${highRiskEvents} high risk events in last hour`);
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Export logs for compliance
   */
  async exportLogs(query: AuditQuery): Promise<string> {
    const { logs } = await this.query({ ...query, limit: 10000 });
    
    // Return as JSON (could also support CSV)
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Increase risk level by one step
   */
  private increaseRiskLevel(current: RiskLevel): RiskLevel {
    const levels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  /**
   * Alert security team (placeholder - implement actual alerting)
   */
  private alertSecurityTeam(eventType: SecurityEventType, details: Record<string, any>): void {
    this.logger.error('🚨 CRITICAL SECURITY ALERT', {
      eventType,
      details,
      timestamp: new Date().toISOString(),
    });
    
    // In production: Send to Slack, PagerDuty, email, etc.
  }

  /**
   * Get stats
   */
  getStats(): { totalLogs: number; oldestLog: number | null } {
    return {
      totalLogs: this.auditLogs.length,
      oldestLog: this.auditLogs.length > 0 ? this.auditLogs[0].timestamp : null,
    };
  }
}
