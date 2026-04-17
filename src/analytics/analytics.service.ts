import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverallStats() {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);

    // Current 30 days
    const currentOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        orderStatus: { not: 'cancelled' },
      },
      select: { totalAmount: true },
    });

    // Previous 30 days
    const previousOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        orderStatus: { not: 'cancelled' },
      },
      select: { totalAmount: true },
    });

    const currentRevenue = currentOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const revenueGrowth = previousRevenue === 0 ? 100 : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    const [totalActiveProducts, totalCustomers, totalOrdersAllTime] = await Promise.all([
      this.prisma.product.count({ where: { status: 'published' } }),
      this.prisma.user.count({ where: { role: 'customer' } }),
      this.prisma.order.count(),
    ]);

    return {
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        growth: Math.round(revenueGrowth),
      },
      orders: {
        current: currentOrders.length,
        allTime: totalOrdersAllTime,
      },
      customers: {
        total: totalCustomers,
      },
      products: {
        active: totalActiveProducts,
      },
    };
  }

  async getSalesTrend(days = 30) {
    const startDate = subDays(startOfDay(new Date()), days);
    
    // Fetch all successful orders in the range
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        orderStatus: { not: 'cancelled' },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
        const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData[dateStr] = 0;
    }

    orders.forEach(order => {
      const dateStr = format(order.createdAt, 'yyyy-MM-dd');
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += Number(order.totalAmount);
      }
    });

    return Object.entries(dailyData)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopProducts(limit = 5) {
      const topItems = await this.prisma.orderItem.groupBy({
          by: ['productId'],
          _sum: {
              quantity: true,
              unitPrice: true, // This is price * qty in our schema? No, unitPrice is per item.
          },
          _count: {
              id: true,
          },
          orderBy: {
              _sum: {
                  quantity: 'desc'
              }
          },
          take: limit,
      });

      const productDetails = await this.prisma.product.findMany({
          where: { id: { in: topItems.map(i => i.productId) } },
          select: { id: true, name: true, slug: true }
      });

      return topItems.map(item => {
          const product = productDetails.find(p => p.id === item.productId);
          return {
              id: item.productId,
              name: product?.name || 'Unknown',
              quantitySold: item._sum.quantity,
              orderCount: item._count.id,
          };
      });
  }
}
