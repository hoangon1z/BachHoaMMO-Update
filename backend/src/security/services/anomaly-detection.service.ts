import { Injectable, Logger } from '@nestjs/common';
import { SECURITY_CONSTANTS, RiskLevel, SecurityEventType } from '../constants/security.constants';

interface UserBehavior {
  userId: string;
  loginTimes: number[];
  loginLocations: { ip: string; country?: string; city?: string; lat?: number; lon?: number }[];
  devices: string[];
  actions: { type: string; timestamp: number; endpoint: string }[];
  failedAttempts: number;
  lastActivity: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  recommendations: string[];
}

interface GeoLocation {
  ip: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timestamp?: number;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  
  // In-memory behavior store (use Redis/DB in production)
  private readonly userBehaviors = new Map<string, UserBehavior>();
  private readonly ipReputationCache = new Map<string, { score: number; lastCheck: number }>();
  
  // Simple ML model weights (in production, use TensorFlow.js or external ML service)
  private readonly weights = {
    unusualTime: 15,
    newDevice: 20,
    impossibleTravel: 40,
    highFailedAttempts: 25,
    rapidActions: 20,
    unusualEndpoint: 10,
    suspiciousIp: 30,
  };

  /**
   * Analyze user behavior for anomalies
   */
  async analyzeUserBehavior(
    userId: string,
    currentAction: {
      type: string;
      ip: string;
      userAgent: string;
      endpoint: string;
      timestamp?: number;
    },
  ): Promise<AnomalyResult> {
    const timestamp = currentAction.timestamp || Date.now();
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Get or create user behavior profile
    let behavior = this.userBehaviors.get(userId);
    if (!behavior) {
      behavior = this.createNewBehavior(userId);
      this.userBehaviors.set(userId, behavior);
    }

    // 1. Check login time anomaly
    const timeScore = this.checkUnusualTime(timestamp);
    if (timeScore > 0) {
      riskScore += timeScore;
      reasons.push('Login at unusual time');
    }

    // 2. Check device fingerprint
    const deviceFingerprint = this.generateSimpleFingerprint(currentAction.userAgent);
    if (!behavior.devices.includes(deviceFingerprint)) {
      riskScore += this.weights.newDevice;
      reasons.push('New device detected');
      recommendations.push('Verify device via email/MFA');
      
      // Add new device (max 10 devices)
      if (behavior.devices.length >= 10) behavior.devices.shift();
      behavior.devices.push(deviceFingerprint);
    }

    // 3. Check impossible travel
    const lastLocation = behavior.loginLocations[behavior.loginLocations.length - 1];
    if (lastLocation) {
      const travelScore = await this.checkImpossibleTravel(lastLocation, {
        ip: currentAction.ip,
        timestamp,
      });
      if (travelScore > 0) {
        riskScore += travelScore;
        reasons.push('Impossible travel detected');
        recommendations.push('Force re-authentication');
      }
    }

    // 4. Check failed attempts
    if (behavior.failedAttempts >= 3) {
      riskScore += this.weights.highFailedAttempts;
      reasons.push(`High failed login attempts: ${behavior.failedAttempts}`);
      recommendations.push('Enable account lockout');
    }

    // 5. Check rapid actions (possible automation)
    const recentActions = behavior.actions.filter(
      a => timestamp - a.timestamp < 60000 // Last minute
    );
    if (recentActions.length > 30) {
      riskScore += this.weights.rapidActions;
      reasons.push('Rapid action pattern detected');
      recommendations.push('Add CAPTCHA verification');
    }

    // 6. Check IP reputation
    const ipScore = await this.checkIpReputation(currentAction.ip);
    if (ipScore > 0) {
      riskScore += ipScore;
      reasons.push('Suspicious IP address');
    }

    // 7. Check unusual endpoint access pattern
    const endpointScore = this.checkUnusualEndpoint(behavior, currentAction.endpoint);
    if (endpointScore > 0) {
      riskScore += endpointScore;
      reasons.push('Unusual access pattern');
    }

    // Update behavior profile
    behavior.actions.push({
      type: currentAction.type,
      timestamp,
      endpoint: currentAction.endpoint,
    });
    
    // Keep only last 100 actions
    if (behavior.actions.length > 100) {
      behavior.actions = behavior.actions.slice(-100);
    }
    
    behavior.lastActivity = timestamp;
    behavior.loginLocations.push({ ip: currentAction.ip });
    if (behavior.loginLocations.length > 10) {
      behavior.loginLocations.shift();
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(riskScore);
    const isAnomaly = riskScore >= SECURITY_CONSTANTS.ANOMALY.RISK_SCORE_THRESHOLD;

    if (isAnomaly) {
      this.logger.warn(`Anomaly detected for user ${userId}`, {
        riskScore,
        riskLevel,
        reasons,
      });
    }

    return {
      isAnomaly,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      reasons,
      recommendations,
    };
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(userId: string): void {
    let behavior = this.userBehaviors.get(userId);
    if (!behavior) {
      behavior = this.createNewBehavior(userId);
      this.userBehaviors.set(userId, behavior);
    }
    behavior.failedAttempts++;
  }

  /**
   * Reset failed attempts on successful login
   */
  resetFailedAttempts(userId: string): void {
    const behavior = this.userBehaviors.get(userId);
    if (behavior) {
      behavior.failedAttempts = 0;
    }
  }

  /**
   * Check for login at unusual time
   */
  private checkUnusualTime(timestamp: number): number {
    const hour = new Date(timestamp).getHours();
    if (SECURITY_CONSTANTS.ANOMALY.UNUSUAL_TIME_HOURS.includes(hour)) {
      return this.weights.unusualTime;
    }
    return 0;
  }

  /**
   * Check for impossible travel (simplified without external geo API)
   */
  private async checkImpossibleTravel(
    lastLocation: GeoLocation,
    currentLocation: { ip: string; timestamp: number },
  ): Promise<number> {
    // If same IP, no travel
    if (lastLocation.ip === currentLocation.ip) return 0;

    // Simple heuristic: if different IP within 1 hour, flag it
    const lastTimestamp = lastLocation.timestamp || Date.now();
    const timeDiff = (currentLocation.timestamp - lastTimestamp) / (1000 * 60 * 60); // hours
    
    if (timeDiff < 1) {
      // Different IP in less than 1 hour - could be VPN or impossible travel
      return this.weights.impossibleTravel / 2; // Partial score
    }

    return 0;
  }

  /**
   * Check IP reputation (simplified - in production use external API)
   */
  private async checkIpReputation(ip: string): Promise<number> {
    // Check cache
    const cached = this.ipReputationCache.get(ip);
    if (cached && Date.now() - cached.lastCheck < 3600000) { // 1 hour cache
      return cached.score;
    }

    let score = 0;

    // Simple heuristics
    // Check for known bad IP patterns
    if (this.isPrivateIp(ip)) {
      score = 0; // Private IPs are OK
    } else if (this.isTorExitNode(ip)) {
      score = this.weights.suspiciousIp;
    } else if (this.isDatacenterIp(ip)) {
      score = this.weights.suspiciousIp / 2; // Datacenter IPs are suspicious but not blocked
    }

    // Cache result
    this.ipReputationCache.set(ip, { score, lastCheck: Date.now() });

    return score;
  }

  /**
   * Check for unusual endpoint access
   */
  private checkUnusualEndpoint(behavior: UserBehavior, endpoint: string): number {
    // Check if user has accessed this type of endpoint before
    const endpointBase = endpoint.split('/').slice(0, 3).join('/');
    const previousEndpoints = new Set(
      behavior.actions.map(a => a.endpoint.split('/').slice(0, 3).join('/'))
    );

    // If this is a sensitive endpoint they've never accessed
    const sensitivePatterns = ['/admin', '/wallet/withdraw', '/settings/security'];
    const isSensitive = sensitivePatterns.some(p => endpoint.includes(p));
    const isNew = !previousEndpoints.has(endpointBase);

    if (isSensitive && isNew && behavior.actions.length > 10) {
      return this.weights.unusualEndpoint;
    }

    return 0;
  }

  /**
   * Generate simple device fingerprint from user agent
   */
  private generateSimpleFingerprint(userAgent: string): string {
    // Extract browser and OS info
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || 'Unknown';
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[0] || 'Unknown';
    return `${browser}|${os}`;
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Create new behavior profile
   */
  private createNewBehavior(userId: string): UserBehavior {
    return {
      userId,
      loginTimes: [],
      loginLocations: [],
      devices: [],
      actions: [],
      failedAttempts: 0,
      lastActivity: Date.now(),
    };
  }

  /**
   * Simple check if IP is private
   */
  private isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      ip === '127.0.0.1' ||
      ip === '::1'
    );
  }

  /**
   * Simplified Tor exit node check (in production, use Tor exit list)
   */
  private isTorExitNode(ip: string): boolean {
    // This would check against a Tor exit node list
    return false;
  }

  /**
   * Simplified datacenter IP check
   */
  private isDatacenterIp(ip: string): boolean {
    // Known datacenter IP ranges (simplified)
    const datacenterPrefixes = [
      '34.', '35.', // Google Cloud
      '52.', '54.', // AWS
      '104.', // Cloudflare
      '157.', // Microsoft Azure
    ];
    return datacenterPrefixes.some(prefix => ip.startsWith(prefix));
  }

  /**
   * Get user risk profile
   */
  getUserRiskProfile(userId: string): UserBehavior | null {
    return this.userBehaviors.get(userId) || null;
  }

  /**
   * Clear user behavior data (for GDPR compliance)
   */
  clearUserData(userId: string): void {
    this.userBehaviors.delete(userId);
  }
}
