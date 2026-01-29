import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
  deviceFingerprint?: string;
  iat?: number;
  exp?: number;
}

interface RefreshTokenData {
  userId: string;
  sessionId: string;
  deviceFingerprint: string;
  createdAt: number;
  expiresAt: number;
  rotationCount: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  
  // Refresh token store (use Redis in production)
  private readonly refreshTokens = new Map<string, RefreshTokenData>();
  
  // Blacklisted tokens (revoked)
  private readonly blacklistedTokens = new Set<string>();
  
  // Active sessions per user
  private readonly userSessions = new Map<string, Set<string>>();

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    // Cleanup expired tokens every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      expiresIn: SECURITY_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token (long-lived, opaque)
   */
  generateRefreshToken(
    userId: string,
    sessionId: string,
    deviceFingerprint: string,
  ): string {
    const token = crypto.randomBytes(64).toString('hex');
    const now = Date.now();
    
    // Parse expiry duration
    const expiryMs = this.parseExpiry(SECURITY_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY);
    
    this.refreshTokens.set(token, {
      userId,
      sessionId,
      deviceFingerprint,
      createdAt: now,
      expiresAt: now + expiryMs,
      rotationCount: 0,
    });

    // Track session
    this.addUserSession(userId, sessionId);

    return token;
  }

  /**
   * Validate refresh token and rotate
   */
  async rotateRefreshToken(
    oldToken: string,
    deviceFingerprint: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokenData = this.refreshTokens.get(oldToken);
    
    if (!tokenData) {
      this.logger.warn('Refresh token not found - possible reuse attack');
      return null;
    }

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      this.refreshTokens.delete(oldToken);
      return null;
    }

    // Check device fingerprint
    if (tokenData.deviceFingerprint !== deviceFingerprint) {
      this.logger.warn('Device fingerprint mismatch during token refresh');
      // Revoke all tokens for this session (possible theft)
      this.revokeSession(tokenData.userId, tokenData.sessionId);
      return null;
    }

    // Check rotation count (prevent infinite refresh)
    if (tokenData.rotationCount > 100) {
      this.logger.warn('Excessive token rotation detected');
      this.revokeSession(tokenData.userId, tokenData.sessionId);
      return null;
    }

    // Invalidate old token
    this.refreshTokens.delete(oldToken);

    // Generate new tokens
    const newRefreshToken = this.generateRefreshToken(
      tokenData.userId,
      tokenData.sessionId,
      deviceFingerprint,
    );

    // Update rotation count
    const newTokenData = this.refreshTokens.get(newRefreshToken);
    if (newTokenData) {
      newTokenData.rotationCount = tokenData.rotationCount + 1;
    }

    // Generate new access token (you'd need user data here)
    const accessToken = this.generateAccessToken({
      sub: tokenData.userId,
      email: '', // Would need to fetch from DB
      role: '', // Would need to fetch from DB
      sessionId: tokenData.sessionId,
      deviceFingerprint,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      // Check if blacklisted
      const tokenHash = this.hashToken(token);
      if (this.blacklistedTokens.has(tokenHash)) {
        return null;
      }

      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke access token
   */
  revokeAccessToken(token: string): void {
    const tokenHash = this.hashToken(token);
    this.blacklistedTokens.add(tokenHash);
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(token: string): void {
    this.refreshTokens.delete(token);
  }

  /**
   * Revoke all tokens for a session
   */
  revokeSession(userId: string, sessionId: string): void {
    // Remove from user sessions
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      sessions.delete(sessionId);
    }

    // Remove all refresh tokens for this session
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId && data.sessionId === sessionId) {
        this.refreshTokens.delete(token);
      }
    }

    this.logger.log(`Session revoked: ${sessionId} for user ${userId}`);
  }

  /**
   * Revoke all sessions for user (logout everywhere)
   */
  revokeAllUserSessions(userId: string): void {
    // Get all sessions
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      for (const sessionId of sessions) {
        this.revokeSession(userId, sessionId);
      }
    }
    this.userSessions.delete(userId);
    
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  /**
   * Get active sessions for user
   */
  getUserSessions(userId: string): string[] {
    const sessions = this.userSessions.get(userId);
    return sessions ? [...sessions] : [];
  }

  /**
   * Check if session is valid
   */
  isSessionValid(userId: string, sessionId: string): boolean {
    const sessions = this.userSessions.get(userId);
    return sessions?.has(sessionId) || false;
  }

  /**
   * Generate session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Add user session
   */
  private addUserSession(userId: string, sessionId: string): void {
    let sessions = this.userSessions.get(userId);
    if (!sessions) {
      sessions = new Set();
      this.userSessions.set(userId, sessions);
    }

    // Enforce max concurrent sessions
    if (sessions.size >= SECURITY_CONSTANTS.SESSION.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      const oldestSession = sessions.values().next().value;
      this.revokeSession(userId, oldestSession);
    }

    sessions.add(sessionId);
  }

  /**
   * Hash token for blacklist storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Cleanup expired tokens
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
        cleaned++;
      }
    }

    // Cleanup old blacklisted tokens (keep for 24 hours max)
    // In production, you'd track creation time
    if (this.blacklistedTokens.size > 10000) {
      this.blacklistedTokens.clear();
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired refresh tokens`);
    }
  }

  /**
   * Get token stats
   */
  getStats(): {
    activeRefreshTokens: number;
    blacklistedTokens: number;
    activeSessions: number;
  } {
    let activeSessions = 0;
    for (const sessions of this.userSessions.values()) {
      activeSessions += sessions.size;
    }

    return {
      activeRefreshTokens: this.refreshTokens.size,
      blacklistedTokens: this.blacklistedTokens.size,
      activeSessions,
    };
  }
}
