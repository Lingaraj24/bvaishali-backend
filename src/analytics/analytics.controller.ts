import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  getStats() {
    return this.analyticsService.getOverallStats();
  }

  @Get('sales-trend')
  getSalesTrend(@Query('days') days?: number) {
    return this.analyticsService.getSalesTrend(days ? Number(days) : 30);
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit?: number) {
    return this.analyticsService.getTopProducts(limit ? Number(limit) : 5);
  }
}
