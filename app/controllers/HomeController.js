const os = require('os');
const DB = require('../../config/db');

class HomeController {
  /**
   * Render framework landing welcome page
   */
  static async index(req, res, next) {
    try {
      res.render('welcome', {
        title: 'NodeFlow — Modern Express MVC Framework for Node.js',
        user: req.session.user || null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Render interactive framework documentation page
   */
  static async docs(req, res, next) {
    try {
      res.render('docs', {
        title: 'Documentation — NodeFlow Framework',
        user: req.session.user || null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Render clean admin dashboard overview with system diagnostics and stats
   */
  static async adminDashboard(req, res, next) {
    try {
      // 1. Fetch framework stats
      const totalUsers = await DB.table('users').count();

      const totalLogsRes = await DB.query("SELECT COUNT(*) as count FROM activity_logs");
      const totalLogs = totalLogsRes[0]?.count || 0;

      const totalTokensRes = await DB.query("SELECT COUNT(*) as count FROM personal_access_tokens");
      const totalTokens = totalTokensRes[0]?.count || 0;

      // 2. Load system info
      const freeMemGb = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
      const totalMemGb = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
      const sysUptimeHr = (os.uptime() / 3600).toFixed(1);

      const systemStats = {
        usersCount: totalUsers,
        logsCount: totalLogs,
        tokensCount: totalTokens,
        osType: os.type(),
        osRelease: os.release(),
        cpuModel: os.cpus()[0]?.model || 'Generic CPU',
        cpuCores: os.cpus().length,
        memoryUsage: `${freeMemGb} GB Free / ${totalMemGb} GB Total`,
        uptime: `${sysUptimeHr} Hours`,
        nodeVersion: process.version
      };

      // 3. Fetch recent activity logs
      const recentLogs = await DB.table('activity_logs')
        .orderBy('id', 'DESC')
        .limit(5)
        .get();

      res.render('admin/dashboard', {
        title: 'ড্যাশবোর্ড ওভারভিউ — NodeFlow Admin',
        stats: systemStats,
        logs: recentLogs
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HomeController;
