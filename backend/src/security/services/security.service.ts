import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    // Generate or get encryption key from env
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (key) {
      this.encryptionKey = Buffer.from(key, 'hex');
    } else {
      this.encryptionKey = crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH);
      this.logger.warn('Using random encryption key. Set ENCRYPTION_KEY in production!');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM as crypto.CipherGCMTypes,
      this.encryptionKey,
      iv,
    ) as crypto.CipherGCM;

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM as crypto.CipherGCMTypes,
      this.encryptionKey,
      iv,
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate CSRF token
   */
  generateCsrfToken(): string {
    return this.generateSecureToken(32);
  }

  /**
   * Verify CSRF token
   */
  verifyCsrfToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken),
    );
  }

  /**
   * Hash data with SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  generateHmac(data: string, secret?: string): string {
    const key = secret || this.encryptionKey.toString('hex');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmac(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/`/g, '&#x60;')
      .replace(/=/g, '&#x3D;');
  }

  /**
   * Deep sanitize object
   */
  sanitizeObject<T extends object>(obj: T): T {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value)
          ? value.map(v => typeof v === 'string' ? this.sanitizeInput(v) : v)
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { PASSWORD } = SECURITY_CONSTANTS;

    if (password.length < PASSWORD.MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters`);
    }
    if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    
    if (typeof data !== 'object' || data === null) return data;
    
    const masked: any = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  /**
   * Generate secure session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Calculate request signature for API integrity
   */
  calculateRequestSignature(
    method: string,
    path: string,
    timestamp: string,
    body?: string,
  ): string {
    const data = `${method.toUpperCase()}:${path}:${timestamp}:${body || ''}`;
    return this.generateHmac(data);
  }

  /**
   * Verify request signature
   */
  verifyRequestSignature(
    signature: string,
    method: string,
    path: string,
    timestamp: string,
    body?: string,
  ): boolean {
    // Check timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return false;
    }

    const expectedSignature = this.calculateRequestSignature(method, path, timestamp, body);
    return this.verifyHmac(
      `${method.toUpperCase()}:${path}:${timestamp}:${body || ''}`,
      signature,
    );
  }
}
