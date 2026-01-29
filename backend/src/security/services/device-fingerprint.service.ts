import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  isMobile: boolean;
  isBot: boolean;
  language: string;
  timezone: string;
  screenResolution?: string;
  firstSeen: number;
  lastSeen: number;
  trustScore: number;
}

interface DeviceRegistry {
  userId: string;
  devices: Map<string, DeviceInfo>;
  trustedDevices: Set<string>;
}

@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);
  
  // Device registry per user (use Redis/DB in production)
  private readonly deviceRegistry = new Map<string, DeviceRegistry>();
  
  // Known bot user agents
  private readonly botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /headless/i, /phantom/i, /selenium/i,
  ];

  /**
   * Generate device fingerprint from request headers
   */
  generateFingerprint(headers: Record<string, string>): string {
    const components = [
      headers['user-agent'] || '',
      headers['accept-language'] || '',
      headers['accept-encoding'] || '',
      headers['accept'] || '',
      // These headers provide additional entropy
      headers['sec-ch-ua'] || '',
      headers['sec-ch-ua-platform'] || '',
      headers['sec-ch-ua-mobile'] || '',
    ];

    const fingerprintString = components.join('|');
    return crypto.createHash('sha256').update(fingerprintString).digest('hex').substring(0, 32);
  }

  /**
   * Parse device information from user agent
   */
  parseDeviceInfo(userAgent: string, headers: Record<string, string>): Partial<DeviceInfo> {
    const info: Partial<DeviceInfo> = {
      userAgent,
      isMobile: this.isMobileDevice(userAgent),
      isBot: this.isBot(userAgent),
      language: headers['accept-language']?.split(',')[0] || 'unknown',
      timezone: headers['x-timezone'] || 'unknown',
    };

    // Parse browser
    if (userAgent.includes('Chrome')) {
      info.browser = 'Chrome';
      info.browserVersion = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || 'unknown';
    } else if (userAgent.includes('Firefox')) {
      info.browser = 'Firefox';
      info.browserVersion = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      info.browser = 'Safari';
      info.browserVersion = userAgent.match(/Version\/([\d.]+)/)?.[1] || 'unknown';
    } else if (userAgent.includes('Edge')) {
      info.browser = 'Edge';
      info.browserVersion = userAgent.match(/Edge\/([\d.]+)/)?.[1] || 'unknown';
    } else {
      info.browser = 'Unknown';
      info.browserVersion = 'unknown';
    }

    // Parse OS
    if (userAgent.includes('Windows')) {
      info.os = 'Windows';
      info.osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || 'unknown';
      info.platform = 'desktop';
    } else if (userAgent.includes('Mac OS')) {
      info.os = 'macOS';
      info.osVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'unknown';
      info.platform = 'desktop';
    } else if (userAgent.includes('Linux')) {
      info.os = 'Linux';
      info.osVersion = 'unknown';
      info.platform = 'desktop';
    } else if (userAgent.includes('Android')) {
      info.os = 'Android';
      info.osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || 'unknown';
      info.platform = 'mobile';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      info.os = 'iOS';
      info.osVersion = userAgent.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'unknown';
      info.platform = userAgent.includes('iPad') ? 'tablet' : 'mobile';
    } else {
      info.os = 'Unknown';
      info.osVersion = 'unknown';
      info.platform = 'unknown';
    }

    return info;
  }

  /**
   * Register device for user
   */
  registerDevice(
    userId: string,
    fingerprint: string,
    deviceInfo: Partial<DeviceInfo>,
  ): DeviceInfo {
    let registry = this.deviceRegistry.get(userId);
    
    if (!registry) {
      registry = {
        userId,
        devices: new Map(),
        trustedDevices: new Set(),
      };
      this.deviceRegistry.set(userId, registry);
    }

    const existingDevice = registry.devices.get(fingerprint);
    const now = Date.now();

    if (existingDevice) {
      // Update existing device
      existingDevice.lastSeen = now;
      existingDevice.trustScore = Math.min(100, existingDevice.trustScore + 1);
      return existingDevice;
    }

    // Create new device entry
    const newDevice: DeviceInfo = {
      fingerprint,
      userAgent: deviceInfo.userAgent || '',
      platform: deviceInfo.platform || 'unknown',
      browser: deviceInfo.browser || 'unknown',
      browserVersion: deviceInfo.browserVersion || 'unknown',
      os: deviceInfo.os || 'unknown',
      osVersion: deviceInfo.osVersion || 'unknown',
      isMobile: deviceInfo.isMobile || false,
      isBot: deviceInfo.isBot || false,
      language: deviceInfo.language || 'unknown',
      timezone: deviceInfo.timezone || 'unknown',
      screenResolution: deviceInfo.screenResolution,
      firstSeen: now,
      lastSeen: now,
      trustScore: 10, // Start with low trust
    };

    registry.devices.set(fingerprint, newDevice);
    
    // Limit devices per user
    if (registry.devices.size > 20) {
      // Remove oldest device
      const oldest = [...registry.devices.entries()]
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
      registry.devices.delete(oldest[0]);
      registry.trustedDevices.delete(oldest[0]);
    }

    this.logger.log(`New device registered for user ${userId}: ${fingerprint.substring(0, 8)}...`);
    
    return newDevice;
  }

  /**
   * Check if device is known for user
   */
  isKnownDevice(userId: string, fingerprint: string): boolean {
    const registry = this.deviceRegistry.get(userId);
    return registry?.devices.has(fingerprint) || false;
  }

  /**
   * Check if device is trusted
   */
  isTrustedDevice(userId: string, fingerprint: string): boolean {
    const registry = this.deviceRegistry.get(userId);
    return registry?.trustedDevices.has(fingerprint) || false;
  }

  /**
   * Mark device as trusted
   */
  trustDevice(userId: string, fingerprint: string): void {
    const registry = this.deviceRegistry.get(userId);
    if (registry) {
      registry.trustedDevices.add(fingerprint);
      const device = registry.devices.get(fingerprint);
      if (device) {
        device.trustScore = 100;
      }
    }
  }

  /**
   * Revoke device trust
   */
  revokeDeviceTrust(userId: string, fingerprint: string): void {
    const registry = this.deviceRegistry.get(userId);
    if (registry) {
      registry.trustedDevices.delete(fingerprint);
      const device = registry.devices.get(fingerprint);
      if (device) {
        device.trustScore = 0;
      }
    }
  }

  /**
   * Get device trust score
   */
  getDeviceTrustScore(userId: string, fingerprint: string): number {
    const registry = this.deviceRegistry.get(userId);
    const device = registry?.devices.get(fingerprint);
    return device?.trustScore || 0;
  }

  /**
   * Get all devices for user
   */
  getUserDevices(userId: string): DeviceInfo[] {
    const registry = this.deviceRegistry.get(userId);
    return registry ? [...registry.devices.values()] : [];
  }

  /**
   * Remove device
   */
  removeDevice(userId: string, fingerprint: string): void {
    const registry = this.deviceRegistry.get(userId);
    if (registry) {
      registry.devices.delete(fingerprint);
      registry.trustedDevices.delete(fingerprint);
    }
  }

  /**
   * Check if user agent is mobile
   */
  private isMobileDevice(userAgent: string): boolean {
    return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  /**
   * Check if user agent is a bot
   */
  private isBot(userAgent: string): boolean {
    return this.botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Clear all devices for user (logout from all devices)
   */
  clearUserDevices(userId: string): void {
    this.deviceRegistry.delete(userId);
  }

  /**
   * Get device count for user
   */
  getDeviceCount(userId: string): number {
    const registry = this.deviceRegistry.get(userId);
    return registry?.devices.size || 0;
  }
}
