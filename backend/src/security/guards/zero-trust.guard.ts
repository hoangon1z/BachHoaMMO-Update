import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SECURITY_METADATA, SecurityEventType, RiskLevel } from '../constants/security.constants';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';
import { TokenService } from '../services/token.service';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  private readonly logger = new Logger(ZeroTrustGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    private deviceFingerprintService: DeviceFingerprintService,
    private anomalyDetectionService: AnomalyDetectionService,
    private tokenService: TokenService,
    private auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      SECURITY_METADATA.IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Skip for Public Seller API routes (they have their own API Key authentication)
    const path = request.path || request.url?.split('?')[0] || '';
    if (path.startsWith('/api/v1/')) {
      return true;
    }
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';

    // 1. Extract and verify token
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip,
        userAgent,
        request.path,
        RiskLevel.MEDIUM,
        { reason: 'Invalid token', error: error.message },
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 2. Verify session is still valid
    if (payload.sessionId && !this.tokenService.isSessionValid(payload.sub, payload.sessionId)) {
      throw new UnauthorizedException('Session has been terminated');
    }

    // 3. Device fingerprint verification
    const currentFingerprint = this.deviceFingerprintService.generateFingerprint(request.headers);
    
    if (payload.deviceFingerprint && payload.deviceFingerprint !== currentFingerprint) {
      // Device mismatch - possible token theft
      this.logger.warn(`Device fingerprint mismatch for user ${payload.sub}`);
      
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip,
        userAgent,
        request.path,
        RiskLevel.HIGH,
        {
          reason: 'Device fingerprint mismatch',
          userId: payload.sub,
          expectedFingerprint: payload.deviceFingerprint?.substring(0, 8),
          actualFingerprint: currentFingerprint.substring(0, 8),
        },
      );

      // In strict mode, reject the request
      const strictMode = this.configService.get<boolean>('SECURITY_STRICT_MODE', false);
      if (strictMode) {
        throw new ForbiddenException('Device verification failed');
      }
    }

    // 4. Anomaly detection
    const anomalyResult = await this.anomalyDetectionService.analyzeUserBehavior(
      payload.sub,
      {
        type: 'API_REQUEST',
        ip,
        userAgent,
        endpoint: request.path,
      },
    );

    if (anomalyResult.isAnomaly) {
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.ANOMALY_DETECTED,
        ip,
        userAgent,
        request.path,
        anomalyResult.riskLevel,
        {
          userId: payload.sub,
          riskScore: anomalyResult.riskScore,
          reasons: anomalyResult.reasons,
        },
      );

      // Block if risk is critical
      if (anomalyResult.riskLevel === RiskLevel.CRITICAL) {
        throw new ForbiddenException('Access blocked due to suspicious activity');
      }
    }

    // 5. Check required roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      SECURITY_METADATA.ROLES,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.role)) {
        await this.auditLogService.logSecurityIncident(
          SecurityEventType.PRIVILEGE_ESCALATION,
          ip,
          userAgent,
          request.path,
          RiskLevel.HIGH,
          {
            userId: payload.sub,
            userRole: payload.role,
            requiredRoles,
          },
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // 6. Check MFA requirement
    const requireMfa = this.reflector.getAllAndOverride<boolean>(
      SECURITY_METADATA.REQUIRE_MFA,
      [context.getHandler(), context.getClass()],
    );

    if (requireMfa && !payload.mfaVerified) {
      throw new ForbiddenException('MFA verification required');
    }

    // 7. Check fresh auth requirement
    const requireFreshAuth = this.reflector.getAllAndOverride<boolean>(
      'requireFreshAuth',
      [context.getHandler(), context.getClass()],
    );

    if (requireFreshAuth) {
      const tokenAge = Date.now() - (payload.iat * 1000);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (tokenAge > fiveMinutes) {
        throw new ForbiddenException('Fresh authentication required for this action');
      }
    }

    // Attach user and security context to request
    request.user = payload;
    request.securityContext = {
      ip,
      userAgent,
      deviceFingerprint: currentFingerprint,
      anomalyRisk: anomalyResult.riskScore,
      sessionId: payload.sessionId,
    };

    return true;
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
