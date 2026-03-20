const { sql } = require("../config/database");

class DashboardService {
  async getStats() {
    const [
      productCount,
      orderCount,
      userCount,
      activeUserCount,
      categoryCount
    ] = await Promise.all([
      sql`SELECT COUNT(*) FROM public.products`,
      sql`SELECT COUNT(*) FROM public.orders`,
      sql`SELECT COUNT(*) FROM public.users`,
      sql`SELECT COUNT(*) FROM public.users WHERE is_active = true`,
      sql`SELECT COUNT(*) FROM public.categories`
    ]);

    return [
      {
        label: "Total Products",
        count: parseInt(productCount[0].count)
      },
      {
        label: "Total Orders",
        count: parseInt(orderCount[0].count)
      },
      {
        label: "Total Users",
        count: parseInt(userCount[0].count)
      },
      {
        label: "Active Users",
        count: parseInt(activeUserCount[0].count)
      },
      {
        label: "Total Categories",
        count: parseInt(categoryCount[0].count)
      }
    ];
  }
  
  async getOrderChartStats(filters = {}) {
    const { status, month, year } = filters;

    const stats = await sql`
      SELECT 
        ${month && year ? sql`DATE_TRUNC('day', created_at)` : sql`DATE_TRUNC('month', created_at)`} as period,
        SUM(total_price) as total_revenue,
        COUNT(*) as order_count
      FROM public.orders
      WHERE 
        (${status ? sql`status = ${status}` : sql`1=1`})${
          year ? sql` AND EXTRACT(YEAR FROM created_at) = ${year}` : sql``
        }${
          month ? sql` AND EXTRACT(MONTH FROM created_at) = ${month}` : sql``
        }
      GROUP BY period
      ORDER BY period ASC
    `;

    return stats.map((s) => ({
      period: s.period,
      totalRevenue: parseFloat(s.total_revenue) || 0,
      orderCount: parseInt(s.order_count) || 0,
    }));
  }
}

module.exports = new DashboardService();
