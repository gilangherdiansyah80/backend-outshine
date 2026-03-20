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
}

module.exports = new DashboardService();
