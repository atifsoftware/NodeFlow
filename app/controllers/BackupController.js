const BackupService = require('../services/BackupService');
const Gate = require('../core/Gate');
const Flash = require('../core/Flash');
const DB = require('../../config/db');

class BackupController {
  /**
   * Log administrative activity if activity_logs table exists
   */
  static async _logActivity(userId, userName, action, description, req) {
    try {
      await DB.table('activity_logs').insert({
        user_id: userId || null,
        user_name: userName || 'Admin',
        action: action,
        description: description,
        ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || '',
        created_at: new Date()
      });
    } catch (err) {
      // Activity logging shouldn't crash the operation
      console.warn('Activity log write skipped:', err.message);
    }
  }

  /**
   * Display backup manager page with list of all backups & database statistics
   */
  static async index(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার ডাটাবেস ব্যাকআপ অ্যাক্সেস করার অনুমতি নেই।');
        return res.redirect('/admin/dashboard');
      }

      const [dbStats, backups] = await Promise.all([
        BackupService.getDatabaseStats(),
        Promise.resolve(BackupService.listBackups())
      ]);

      const totalBackupBytes = backups.reduce((acc, b) => acc + b.sizeBytes, 0);
      const formattedTotalBackupSize = BackupService.formatBytes(totalBackupBytes);

      res.render('admin/backups/index', {
        title: 'ডাটাবেস ব্যাকআপ ম্যানেজার — NodeFlow Admin',
        dbStats,
        backups,
        totalBackupBytes,
        formattedTotalBackupSize,
        user: req.session.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger immediate database backup generation
   */
  static async create(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার এই কাজটি করার অনুমতি নেই।');
        return res.redirect('/admin/backups');
      }

      const format = req.body.format || 'gzip';
      const compress = format === 'gzip';

      const result = await BackupService.createBackup({ compress });

      await BackupController._logActivity(
        req.session?.user?.id,
        req.session?.user?.name,
        'DATABASE_BACKUP_CREATED',
        `নতুন ডাটাবেস ব্যাকআপ তৈরি করা হয়েছে: ${result.filename} (${result.formattedSize})`,
        req
      );

      const typeLabel = compress ? 'GZIP জিপ সংকুচিত (.sql.gz)' : 'প্লেন এসকিউএল (.sql)';
      Flash.success(`ডাটাবেস ব্যাকআপ [${typeLabel}] সফলভাবে তৈরি করা হয়েছে! ফাইল: ${result.filename} (${result.formattedSize})`);
      res.redirect('/admin/backups');
    } catch (error) {
      console.error('Backup creation error:', error);
      Flash.error(`ব্যাকআপ তৈরি করার সময় ত্রুটি ঘটেছে: ${error.message}`);
      res.redirect('/admin/backups');
    }
  }

  /**
   * Download a backup .sql file
   */
  static async download(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার ব্যাকআপ ডাউনলোড করার অনুমতি নেই।');
        return res.redirect('/admin/backups');
      }

      const { filename } = req.params;
      const filePath = BackupService.getBackupFilePath(filename);

      if (!filePath) {
        Flash.error('অনুরোধকৃত ব্যাকআপ ফাইলটি খুঁজে পাওয়া যায়নি।');
        return res.redirect('/admin/backups');
      }

      await BackupController._logActivity(
        req.session?.user?.id,
        req.session?.user?.name,
        'DATABASE_BACKUP_DOWNLOADED',
        `ডাটাবেস ব্যাকআপ ফাইল ডাউনলোড করা হয়েছে: ${filename}`,
        req
      );

      res.download(filePath, filename, (err) => {
        if (err && !res.headersSent) {
          Flash.error(`ফাইল ডাউনলোড ব্যর্থ হয়েছে: ${err.message}`);
          res.redirect('/admin/backups');
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore database from selected backup file
   */
  static async restore(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার ডাটাবেস রিস্টোর করার অনুমতি নেই।');
        return res.redirect('/admin/backups');
      }

      const { filename } = req.params;
      const result = await BackupService.restoreBackup(filename);

      await BackupController._logActivity(
        req.session?.user?.id,
        req.session?.user?.name,
        'DATABASE_RESTORED',
        `ডাটাবেস সফলভাবে রিস্টোর করা হয়েছে ফাইল থেকে: ${filename}`,
        req
      );

      // Flush settings cache if present
      if (global.flushSettingsCache) {
        await global.flushSettingsCache();
      }

      Flash.success(`ডাটাবেস সফলভাবে রিস্টোর করা হয়েছে (${result.statementsExecuted} টি স্টেটমেন্ট কার্যকর হয়েছে)।`);
      res.redirect('/admin/backups');
    } catch (error) {
      console.error('Database restore error:', error);
      Flash.error(`ডাটাবেস রিস্টোর করার সময় সমস্যা হয়েছে: ${error.message}`);
      res.redirect('/admin/backups');
    }
  }

  /**
   * Delete a backup file
   */
  static async destroy(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার ব্যাকআপ ডিলিট করার অনুমতি নেই।');
        return res.redirect('/admin/backups');
      }

      const { filename } = req.params;
      BackupService.deleteBackup(filename);

      await BackupController._logActivity(
        req.session?.user?.id,
        req.session?.user?.name,
        'DATABASE_BACKUP_DELETED',
        `ডাটাবেস ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: ${filename}`,
        req
      );

      Flash.success(`ব্যাকআপ ফাইল '${filename}' সফলভাবে মুছে ফেলা হয়েছে।`);
      res.redirect('/admin/backups');
    } catch (error) {
      console.error('Backup delete error:', error);
      Flash.error(`ব্যাকআপ মুছতে ত্রুটি: ${error.message}`);
      res.redirect('/admin/backups');
    }
  }
}

module.exports = BackupController;
