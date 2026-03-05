// =====================================================
// ZERO-TRUST SECURITY CONSTANTS - 2025 Best Practices
// =====================================================

export const SECURITY_CONSTANTS = {
  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',      // Short-lived access tokens
    REFRESH_TOKEN_EXPIRY: '7d',       // Longer refresh tokens
    ALGORITHM: 'RS256' as const,      // Asymmetric for better security
    ISSUER: 'marketplace-api',
    AUDIENCE: 'marketplace-client',
  },

  // Rate Limiting (requests per window)
  RATE_LIMIT: {
    GLOBAL: { limit: 200, window: 60 },           // 200 req/min global
    AUTH: { limit: 10, window: 60 },              // 10 login attempts/min
    API: { limit: 120, window: 60 },              // 120 req/min for API
    SENSITIVE: { limit: 30, window: 60 },         // 30 req/min for sensitive ops
    UPLOAD: { limit: 20, window: 300 },           // 20 uploads/5min
    WALLET: { limit: 60, window: 60 },            // 60 req/min for wallet ops
  },

  // WAF Rules
  WAF: {
    MAX_BODY_SIZE: 10 * 1024 * 1024,              // 10MB max body
    MAX_URL_LENGTH: 2048,
    MAX_HEADER_SIZE: 8192,
    BLOCKED_USER_AGENTS: [
      'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab',
      'gobuster', 'dirbuster', 'wfuzz', 'hydra'
    ],
    BLOCKED_EXTENSIONS: [
      '.php', '.asp', '.aspx', '.jsp', '.cgi', '.exe', '.bat', '.sh'
    ],
  },

  // Session Configuration
  SESSION: {
    MAX_CONCURRENT_SESSIONS: 5,
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,           // 30 minutes
    ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000,        // 24 hours
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    MAX_AGE_DAYS: 90,
    HISTORY_COUNT: 5,                              // Can't reuse last 5 passwords
  },

  // Anomaly Detection Thresholds
  ANOMALY: {
    LOGIN_VELOCITY_THRESHOLD: 5,                  // Max logins per hour
    GEO_VELOCITY_KM_PER_HOUR: 1000,              // Impossible travel detection
    UNUSUAL_TIME_HOURS: [0, 1, 2, 3, 4, 5],      // Unusual activity hours
    RISK_SCORE_THRESHOLD: 70,                     // Block if risk > 70
  },

  // Security Headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000,                       // 1 year
    CSP_DIRECTIVES: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
  },

  // Encryption
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    AUTH_TAG_LENGTH: 16,
    SALT_ROUNDS: 12,
  },
};

// SQL Injection Patterns - More targeted to reduce false positives
export const SQL_INJECTION_PATTERNS = [
  // Only match SQL keywords when combined with suspicious patterns (not standalone)
  /(\bUNION\b\s+\bSELECT\b)/gi,
  /(\bSELECT\b\s+.+\s+\bFROM\b)/gi,
  /(\bINSERT\b\s+\bINTO\b)/gi,
  /(\bDELETE\b\s+\bFROM\b)/gi,
  /(\bDROP\b\s+(TABLE|DATABASE)\b)/gi,
  /(\bUPDATE\b\s+\w+\s+\bSET\b)/gi,
  // SQL comment injection - only match at end of potential SQL or with space before
  /('\s*--)/g,
  /(\/\*[\s\S]*?\*\/)/g,
  // Classic SQL injection patterns
  /('\s*(OR|AND)\s+'?\d+'\s*=\s*'?\d+)/gi,
  /('\s*(OR|AND)\s+'\w+'\s*=\s*'\w+')/gi,
  /(OR|AND)\s+\d+\s*=\s*\d+/gi,
  /('\s*;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/gi,
  // Time-based injection
  /SLEEP\s*\(/gi,
  /BENCHMARK\s*\(/gi,
  /WAITFOR\s+DELAY/gi,
  // File operations
  /LOAD_FILE\s*\(/gi,
  /INTO\s+(OUTFILE|DUMPFILE)/gi,
];

// XSS Patterns
export const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object\b[^>]*>[\s\S]*?<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*data:/gi,
];

// Path Traversal Patterns
export const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.%2e\//gi,
  /%2e\.\//gi,
  /\.\.%2f/gi,
  /%252e%252e%252f/gi,
];

// Command Injection Patterns - More targeted to reduce false positives
// IMPORTANT: Backticks (`code`) are commonly used in markdown for code blocks
// We don't block them to avoid false positives with user-generated content
export const COMMAND_INJECTION_PATTERNS = [
  // Shell command substitution with actual commands inside
  /\$\(\s*(cat|ls|rm|wget|curl|bash|sh|nc|netcat|chmod|chown|kill|pkill)\b/gi,
  // Pipe/redirect with dangerous commands
  /\|\s*(cat|ls|rm|wget|curl|bash|sh|nc|netcat)(\s|$)/gi,
  /;\s*(cat|ls|rm|wget|curl|bash|sh|nc|netcat|id|whoami|uname)(\s|$)/gi,
  // Redirect to sensitive locations
  />\s*\/etc\//gi,
  />\s*\/dev\/null/gi,
  // Dangerous functions in code contexts (eval, exec, system with parentheses)
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bsystem\s*\(/gi,
];

// Decorator keys for metadata
export const SECURITY_METADATA = {
  IS_PUBLIC: 'isPublic',
  RATE_LIMIT: 'rateLimit',
  REQUIRE_MFA: 'requireMfa',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  SKIP_WAF: 'skipWaf',
  SKIP_AUDIT: 'skipAudit',
};

// Risk levels
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  WAF_BLOCKED = 'WAF_BLOCKED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
}
