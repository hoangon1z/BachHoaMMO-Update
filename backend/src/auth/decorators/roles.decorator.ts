import { SetMetadata } from '@nestjs/common';

/**
 * Roles decorator
 * Usage: @Roles('ADMIN', 'SELLER')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
