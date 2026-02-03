import { Injectable, Logger } from '@nestjs/common';
import {
  SECURITY_CONSTANTS,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  RiskLevel,
} from '../constants/security.constants';

interface WafCheckResult {
  blocked: boolean;
  reason?: string;
  riskLevel: RiskLevel;
  threats: string[];
}

interface ThreatSignature {
  name: string;
  patterns: RegExp[];
  riskLevel: RiskLevel;
  block: boolean;
}

@Injectable()
export class WafService {
  private readonly logger = new Logger(WafService.name);

  private readonly threatSignatures: ThreatSignature[] = [
    {
      name: 'SQL_INJECTION',
      patterns: SQL_INJECTION_PATTERNS,
      riskLevel: RiskLevel.CRITICAL,
      block: true,
    },
    {
      name: 'XSS',
      patterns: XSS_PATTERNS,
      riskLevel: RiskLevel.HIGH,
      block: true,
    },
    {
      name: 'PATH_TRAVERSAL',
      patterns: PATH_TRAVERSAL_PATTERNS,
      riskLevel: RiskLevel.HIGH,
      block: true,
    },
    {
      name: 'COMMAND_INJECTION',
      patterns: COMMAND_INJECTION_PATTERNS,
      riskLevel: RiskLevel.CRITICAL,
      block: true,
    },
  ];

  /** Routes where body may contain command-like text (mô tả, code, tags) - skip COMMAND_INJECTION on body only */
  private readonly bodyCommandInjectionExemptPaths = [
    { method: 'POST', pathPrefix: '/seller/products' },
    { method: 'PUT', pathPrefix: '/seller/products/' },
  ];

  /**
   * Main WAF check - analyzes request for threats
   */
  async analyzeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    ip?: string,
  ): Promise<WafCheckResult> {
    const threats: string[] = [];
    let riskLevel = RiskLevel.LOW;
    let blocked = false;
    let reason: string | undefined;

    // 1. Check URL length
    if (url.length > SECURITY_CONSTANTS.WAF.MAX_URL_LENGTH) {
      return {
        blocked: true,
        reason: 'URL too long',
        riskLevel: RiskLevel.MEDIUM,
        threats: ['OVERSIZED_URL'],
      };
    }

    // 2. Check blocked user agents
    const userAgent = headers['user-agent']?.toLowerCase() || '';
    for (const blockedAgent of SECURITY_CONSTANTS.WAF.BLOCKED_USER_AGENTS) {
      if (userAgent.includes(blockedAgent)) {
        return {
          blocked: true,
          reason: `Blocked user agent: ${blockedAgent}`,
          riskLevel: RiskLevel.HIGH,
          threats: ['BLOCKED_USER_AGENT'],
        };
      }
    }

    // 3. Check blocked file extensions in URL
    for (const ext of SECURITY_CONSTANTS.WAF.BLOCKED_EXTENSIONS) {
      if (url.toLowerCase().includes(ext)) {
        return {
          blocked: true,
          reason: `Blocked file extension: ${ext}`,
          riskLevel: RiskLevel.HIGH,
          threats: ['BLOCKED_EXTENSION'],
        };
      }
    }

    // 4. Scan URL for threats
    const urlThreats = this.scanForThreats(decodeURIComponent(url));
    threats.push(...urlThreats.threats);
    if (urlThreats.blocked) {
      blocked = true;
      reason = urlThreats.reason;
      riskLevel = this.getHigherRiskLevel(riskLevel, urlThreats.riskLevel);
    }

    // 5. Scan headers for threats (skip standard safe headers)
    const safeHeaders = [
      'accept', 'accept-language', 'accept-encoding', 'content-type',
      'content-length', 'host', 'origin', 'referer', 'user-agent',
      'authorization', 'cookie', 'connection', 'cache-control',
      'pragma', 'x-requested-with', 'x-forwarded-for', 'x-forwarded-proto',
      'x-real-ip', 'x-request-timestamp', 'x-api-version', 'sec-fetch-mode',
      'sec-fetch-site', 'sec-fetch-dest', 'sec-ch-ua', 'sec-ch-ua-mobile',
      'sec-ch-ua-platform', 'dnt', 'upgrade-insecure-requests',
    ];
    
    for (const [key, value] of Object.entries(headers)) {
      // Skip scanning safe/standard headers
      if (safeHeaders.includes(key.toLowerCase())) {
        continue;
      }
      
      if (typeof value === 'string') {
        const headerThreats = this.scanForThreats(value);
        threats.push(...headerThreats.threats.map(t => `HEADER_${key}_${t}`));
        if (headerThreats.blocked) {
          blocked = true;
          reason = `Malicious header: ${key}`;
          riskLevel = this.getHigherRiskLevel(riskLevel, headerThreats.riskLevel);
        }
      }
    }

    // 6. Scan body for threats
    const pathOnly = url.split('?')[0];
    const skipBodyCommandInjection = this.bodyCommandInjectionExemptPaths.some(
      (r) => r.method === method && pathOnly.startsWith(r.pathPrefix),
    );

    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      
      // Check body size
      if (bodyString.length > SECURITY_CONSTANTS.WAF.MAX_BODY_SIZE) {
        return {
          blocked: true,
          reason: 'Request body too large',
          riskLevel: RiskLevel.MEDIUM,
          threats: ['OVERSIZED_BODY'],
        };
      }

      const bodyExclude = skipBodyCommandInjection ? ['COMMAND_INJECTION'] : undefined;
      const bodyThreats = this.scanForThreats(bodyString, bodyExclude);
      threats.push(...bodyThreats.threats.map(t => `BODY_${t}`));
      if (bodyThreats.blocked) {
        blocked = true;
        reason = reason || 'Malicious request body';
        riskLevel = this.getHigherRiskLevel(riskLevel, bodyThreats.riskLevel);
      }

      // Deep scan object values
      if (typeof body === 'object') {
        const deepThreats = this.deepScanObject(body, 0, bodyExclude);
        threats.push(...deepThreats.threats);
        if (deepThreats.blocked) {
          blocked = true;
          reason = reason || 'Malicious content in request';
          riskLevel = this.getHigherRiskLevel(riskLevel, deepThreats.riskLevel);
        }
      }
    }

    // 7. Check for protocol attacks
    const protocolThreats = this.checkProtocolAttacks(headers, method);
    threats.push(...protocolThreats);
    if (protocolThreats.length > 0) {
      riskLevel = this.getHigherRiskLevel(riskLevel, RiskLevel.MEDIUM);
    }

    if (blocked) {
      this.logger.warn(`WAF blocked request: ${reason}`, {
        ip,
        method,
        url: url.substring(0, 100),
        threats,
      });
    }

    return { blocked, reason, riskLevel, threats };
  }

  /**
   * Scan string for threat patterns
   * @param excludeThreatNames skip these threat types (e.g. COMMAND_INJECTION for seller product body)
   */
  private scanForThreats(input: string, excludeThreatNames?: string[]): WafCheckResult {
    const threats: string[] = [];
    let riskLevel = RiskLevel.LOW;
    let blocked = false;
    let reason: string | undefined;
    const excludeSet = new Set(excludeThreatNames ?? []);

    for (const signature of this.threatSignatures) {
      if (excludeSet.has(signature.name)) continue;
      for (const pattern of signature.patterns) {
        if (pattern.test(input)) {
          threats.push(signature.name);
          riskLevel = this.getHigherRiskLevel(riskLevel, signature.riskLevel);
          
          if (signature.block) {
            blocked = true;
            reason = `Detected ${signature.name}`;
          }
          break; // One match per signature is enough
        }
      }
    }

    return { blocked, reason, riskLevel, threats };
  }

  /**
   * Deep scan object recursively
   * @param excludeThreatNames skip these threat types when scanning values (e.g. COMMAND_INJECTION)
   */
  private deepScanObject(obj: any, depth: number = 0, excludeThreatNames?: string[]): WafCheckResult {
    const threats: string[] = [];
    let riskLevel = RiskLevel.LOW;
    let blocked = false;
    let reason: string | undefined;

    // Prevent deep recursion attacks
    if (depth > 10) {
      return {
        blocked: true,
        reason: 'Object too deeply nested',
        riskLevel: RiskLevel.MEDIUM,
        threats: ['DEEP_NESTING'],
      };
    }

    if (typeof obj !== 'object' || obj === null) {
      return { blocked: false, riskLevel: RiskLevel.LOW, threats: [] };
    }

    for (const [key, value] of Object.entries(obj)) {
      // Check key for threats (no exemption for keys)
      const keyThreats = this.scanForThreats(key);
      threats.push(...keyThreats.threats.map(t => `KEY_${t}`));
      if (keyThreats.blocked) {
        blocked = true;
        reason = 'Malicious object key';
        riskLevel = this.getHigherRiskLevel(riskLevel, keyThreats.riskLevel);
      }

      // Check value
      if (typeof value === 'string') {
        const valueThreats = this.scanForThreats(value, excludeThreatNames);
        threats.push(...valueThreats.threats);
        if (valueThreats.blocked) {
          blocked = true;
          reason = reason || 'Malicious object value';
          riskLevel = this.getHigherRiskLevel(riskLevel, valueThreats.riskLevel);
        }
      } else if (typeof value === 'object' && value !== null) {
        const deepThreats = this.deepScanObject(value, depth + 1, excludeThreatNames);
        threats.push(...deepThreats.threats);
        if (deepThreats.blocked) {
          blocked = true;
          reason = reason || deepThreats.reason;
          riskLevel = this.getHigherRiskLevel(riskLevel, deepThreats.riskLevel);
        }
      }
    }

    return { blocked, reason, riskLevel, threats };
  }

  /**
   * Check for HTTP protocol attacks
   */
  private checkProtocolAttacks(
    headers: Record<string, string>,
    method: string,
  ): string[] {
    const threats: string[] = [];

    // Check for HTTP request smuggling indicators
    if (headers['transfer-encoding'] && headers['content-length']) {
      threats.push('REQUEST_SMUGGLING_ATTEMPT');
    }

    // Check for CRLF injection
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && (value.includes('\r') || value.includes('\n'))) {
        threats.push('CRLF_INJECTION');
        break;
      }
    }

    // Check for HTTP verb tampering
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(method.toUpperCase())) {
      threats.push('INVALID_HTTP_METHOD');
    }

    // Check for oversized headers
    const totalHeaderSize = Object.entries(headers)
      .reduce((sum, [k, v]) => sum + k.length + (typeof v === 'string' ? v.length : 0), 0);
    
    if (totalHeaderSize > SECURITY_CONSTANTS.WAF.MAX_HEADER_SIZE) {
      threats.push('OVERSIZED_HEADERS');
    }

    return threats;
  }

  /**
   * Get the higher of two risk levels
   */
  private getHigherRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
    const levels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    return levels.indexOf(a) > levels.indexOf(b) ? a : b;
  }

  /**
   * Sanitize string input
   */
  sanitize(input: string): string {
    if (typeof input !== 'string') return input;

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize unicode
      .normalize('NFC')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit consecutive spaces
      .replace(/\s{10,}/g, '          ')
      // Trim
      .trim();
  }

  /**
   * Get WAF stats
   */
  getStats(): { signaturesLoaded: number } {
    return {
      signaturesLoaded: this.threatSignatures.length,
    };
  }
}
