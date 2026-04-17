import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   * Returns the currently authenticated user's profile.
   * Protected: valid JWT required.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    // Passport already fetched the full user via JwtStrategy.validate()
    return user;
  }

  /**
   * GET /api/v1/users/:id
   * Admin-only — fetch any user by ID.
   * Protected: valid JWT + admin/manager role required.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.manager)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}

