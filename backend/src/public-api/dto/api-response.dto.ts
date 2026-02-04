/**
 * Standard API Response DTOs
 * Consistent response format for all Public API endpoints
 */

export class ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper functions to create responses
export function createSuccessResponse<T>(data: T, meta?: ApiSuccessResponse['meta']): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

export function createErrorResponse(code: string, message: string, details?: any): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

// Common error codes
export const API_ERROR_CODES = {
  // Authentication
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  EXPIRED_TIMESTAMP: 'EXPIRED_TIMESTAMP',
  API_KEY_INACTIVE: 'API_KEY_INACTIVE',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
