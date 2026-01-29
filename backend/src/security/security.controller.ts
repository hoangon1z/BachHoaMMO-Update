import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Public, Roles, AdminOnly } from './decorators/security.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityService } from './services/security.service';
import { RateLimitService } from './services/rate-limit.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { AuditLogService } from './services/audit-log.service';
import { DeviceFingerprintService } from './services/device-fingerprint.service';
import { TokenService } from './services/token.service';
import { WafService } from './services/waf.service';

@Controller('security')
export class SecurityController {
  constructor(
    private securityService: SecurityService,
    private rateLimitService: RateLimitService,
    private anomalyDetectionService: AnomalyDetectionService,
    private auditLogService: AuditLogService,
    private deviceFingerprintService: DeviceFingerprintService,
    private tokenService: TokenService,
    private wafService: WafService,
  ) {}

  /**
   * kiểm tra sức khỏe :V
   */
  @Public()
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        waf: 'active',
        rateLimit: 'active',
        anomalyDetection: 'active',
        auditLog: 'active',
      },
    };
  }

  /**
   * BẢO MẬT STATS HỆ THỐNG
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async getSecurityStats() {
    const [rateLimitStats, tokenStats, auditStats, wafStats] = await Promise.all([
      this.rateLimitService.getStats(),
      this.tokenService.getStats(),
      this.auditLogService.getStats(),
      this.wafService.getStats(),
    ]);

    return {
      rateLimit: rateLimitStats,
      tokens: tokenStats,
      audit: auditStats,
      waf: wafStats,
    };
  }

  /**
   * Get security summary (admin only)
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async getSecuritySummary(@Query('hours') hours?: string) {
    const hoursNum = parseInt(hours || '24') || 24;
    return this.auditLogService.getSecuritySummary(hoursNum);
  }

  /**
   * Get audit logs (admin only)
   */
  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogService.query({
      userId,
      eventType,
      riskLevel: riskLevel as any,
      limit: parseInt(limit || '50'),
      offset: parseInt(offset || '0'),
    });
  }

  /**
   * Get user's devices
   */
  @Get('devices')
  @UseGuards(JwtAuthGuard)
  async getMyDevices(@Request() req: any) {
    const devices = this.deviceFingerprintService.getUserDevices(req.user.sub);
    return {
      devices: devices.map(d => ({
        fingerprint: d.fingerprint.substring(0, 8) + '...',
        browser: d.browser,
        os: d.os,
        platform: d.platform,
        firstSeen: new Date(d.firstSeen).toISOString(),
        lastSeen: new Date(d.lastSeen).toISOString(),
        trustScore: d.trustScore,
        isCurrent: d.fingerprint === req.securityContext?.deviceFingerprint,
      })),
    };
  }

  /**
   * Revoke a device
   */
  @Delete('devices/:fingerprint')
  @UseGuards(JwtAuthGuard)
  async revokeDevice(@Request() req: any, @Param('fingerprint') fingerprint: string) {
    // Find device by partial fingerprint
    const devices = this.deviceFingerprintService.getUserDevices(req.user.sub);
    const device = devices.find(d => d.fingerprint.startsWith(fingerprint));
    
    if (device) {
      this.deviceFingerprintService.removeDevice(req.user.sub, device.fingerprint);
      return { success: true, message: 'Device revoked' };
    }
    
    return { success: false, message: 'Device not found' };
  }

  /**
   * Get user's active sessions
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getMySessions(@Request() req: any) {
    const sessions = this.tokenService.getUserSessions(req.user.sub);
    return {
      sessions: sessions.map(s => ({
        sessionId: s.substring(0, 12) + '...',
        isCurrent: s === req.user.sessionId,
      })),
      currentSession: req.user.sessionId?.substring(0, 12) + '...',
    };
  }

  /**
   * Revoke all sessions (logout everywhere)
   */
  @Post('sessions/revoke-all')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@Request() req: any) {
    this.tokenService.revokeAllUserSessions(req.user.sub);
    return { success: true, message: 'All sessions revoked' };
  }

  /**
   * Revoke specific session
   */
  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    // Find full session ID by partial match
    const sessions = this.tokenService.getUserSessions(req.user.sub);
    const fullSessionId = sessions.find(s => s.startsWith(sessionId));
    
    if (fullSessionId) {
      this.tokenService.revokeSession(req.user.sub, fullSessionId);
      return { success: true, message: 'Session revoked' };
    }
    
    return { success: false, message: 'Session not found' };
  }

  /**
   * Get user's risk profile
   */
  @Get('risk-profile')
  @UseGuards(JwtAuthGuard)
  async getMyRiskProfile(@Request() req: any) {
    const profile = this.anomalyDetectionService.getUserRiskProfile(req.user.sub);
    
    if (!profile) {
      return { message: 'No risk profile available' };
    }

    return {
      devicesCount: profile.devices.length,
      recentActionsCount: profile.actions.length,
      failedAttempts: profile.failedAttempts,
      lastActivity: new Date(profile.lastActivity).toISOString(),
    };
  }

  /**
   * Generate CSRF token
   */
  @Get('csrf-token')
  @UseGuards(JwtAuthGuard)
  async getCsrfToken(@Request() req: any) {
    const token = this.securityService.generateCsrfToken();
    // In production, store in session/redis associated with user
    return { csrfToken: token };
  }

  /**
   * Check IP reputation (admin only)
   */
  @Get('ip-check/:ip')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async checkIpReputation(@Param('ip') ip: string) {
    const isBlocked = this.rateLimitService.isIpBlocked(ip);
    const suspiciousPatterns = await this.auditLogService.detectSuspiciousPatterns(ip);
    
    return {
      ip,
      isBlocked,
      suspicious: suspiciousPatterns.suspicious,
      reasons: suspiciousPatterns.reasons,
    };
  }

  /**
   * Block IP (admin only)
   */
  @Post('block-ip/:ip')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async blockIp(
    @Param('ip') ip: string,
    @Query('duration') duration?: string,
  ) {
    const durationSeconds = parseInt(duration || '3600'); // Default 1 hour
    this.rateLimitService.blockIp(ip, durationSeconds, 'Admin manual block');
    return { success: true, message: `IP ${ip} blocked for ${durationSeconds} seconds` };
  }
}
