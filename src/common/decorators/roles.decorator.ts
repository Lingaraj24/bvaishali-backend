import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * @Roles decorator
 * Attach allowed roles to a route handler. Must be paired with RolesGuard.
 *
 * Usage: @Roles(UserRole.admin)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
