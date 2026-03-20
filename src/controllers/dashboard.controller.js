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
}

module.exports = new DashboardController();
