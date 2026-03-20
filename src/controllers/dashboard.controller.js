const dashboardService = require("../services/dashboard.service");

class DashboardController {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats();
      
      res.status(200).json({
        success: true,
        message: "Dashboard statistics retrieved successfully",
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderChartStats(req, res, next) {
    try {
      const { status, month, year } = req.query;
      const stats = await dashboardService.getOrderChartStats({
        status,
        month: month ? parseInt(month) : null,
        year: year ? parseInt(year) : null,
      });

      res.status(200).json({
        success: true,
        message: "Order chart statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
