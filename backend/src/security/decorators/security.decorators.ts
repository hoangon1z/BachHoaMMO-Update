import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { SECURITY_METADATA } from '../constants/security.constants';

/**
 * Mark endpoint as public (skip authentication)
 */
export const Public = () => SetMetadata(SECURITY_METADATA.IS_PUBLIC, true);

/**
 * Custom rate limit for specific endpoint
 * @param limit - Max requests
 * @param window - Time window in seconds
 */
export const RateLimit = (limit: number, window: number) =>
  SetMetadata(SECURITY_METADATA.RATE_LIMIT, { limit, window });

/**
 * Require MFA for sensitive operations
 */
export const RequireMfa = () => SetMetadata(SECURITY_METADATA.REQUIRE_MFA, true);

/**
 * Role-based access control
 * @param roles - Required roles
 */
export const Roles = (...roles: string[]) =>
  SetMetadata(SECURITY_METADATA.ROLES, roles);

/**
 * Permission-based access control
 * @param permissions - Required permissions
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(SECURITY_METADATA.PERMISSIONS, permissions);

/**
 * Skip WAF checks for specific endpoint (use carefully!)
 */
export const SkipWaf = () => SetMetadata(SECURITY_METADATA.SKIP_WAF, true);

/**
 * Skip audit logging for specific endpoint
 */
export const SkipAudit = () => SetMetadata(SECURITY_METADATA.SKIP_AUDIT, true);

/**
 * Sensitive endpoint - applies strict rate limiting and audit logging
 */
export const SensitiveEndpoint = () =>
  applyDecorators(
    RateLimit(10, 60),
    SetMetadata('isSensitive', true),
  );

/**
 * Admin only endpoint
 */
export const AdminOnly = () =>
  applyDecorators(
    Roles('ADMIN'),
    SensitiveEndpoint(),
  );

/**
 * Require fresh authentication (re-login within last 5 minutes)
 */
export const RequireFreshAuth = () =>
  SetMetadata('requireFreshAuth', true);
