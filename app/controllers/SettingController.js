const path = require('path');
const fs = require('fs');
const DB = require('../../config/db');
const Gate = require('../core/Gate');
const Flash = require('../core/Flash');

class SettingController {
  /**
   * Render settings page
   */
  static async index(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার এই পেজটি অ্যাক্সেস করার অনুমতি নেই।');
        return res.redirect('/admin/dashboard');
      }

      // Fetch all settings from database to ensure fresh values
      const rows = await DB.table('settings').get();
      const settings = {};
      rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });

      res.render('admin/settings', {
        title: 'সাইট সেটিংস — NodeFlow Admin',
        settings,
        user: req.session.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update setting values
   */
  static async update(req, res, next) {
    try {
      console.log('--- Settings update request received ---');
      console.log('req.body:', req.body);
      console.log('req.files:', req.files);

      if (!Gate.allows('admin-only')) {
        Flash.error('আপনার এই কাজটি করার অনুমতি নেই।');
        return res.redirect('/admin/dashboard');
      }

      const { name, short_name, email, mobile, address } = req.body;

      // Basic updates
      const fields = { name, short_name, email, mobile, address };

      // Helper function to update setting in database
      const updateSetting = async (key, value) => {
        const existing = await DB.table('settings').where('setting_key', key).first();
        if (existing) {
          await DB.table('settings').where('setting_key', key).update({ setting_value: value || '' });
        } else {
          await DB.table('settings').insert({ setting_key: key, setting_value: value || '' });
        }
      };

      // Loop and save text settings
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          await updateSetting(key, val);
        }
      }

      // Handle file uploads (logo & favicon)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Fetch current settings for file replacement cleanup
      const currentRows = await DB.table('settings').get();
      const currentSettings = {};
      currentRows.forEach(row => {
        currentSettings[row.setting_key] = row.setting_value;
      });

      // 1. Process Logo
      if (req.files && req.files.logo && req.files.logo.name && req.files.logo.size > 0) {
        const logoFile = req.files.logo;
        const ext = path.extname(logoFile.name);
        const logoName = `logo_${Date.now()}${ext}`;
        const uploadPath = path.join(uploadDir, logoName);

        // Delete old logo file if it exists and is not empty
        if (currentSettings.logo) {
          const oldLogoPath = path.join(process.cwd(), 'public', currentSettings.logo);
          if (fs.existsSync(oldLogoPath) && fs.lstatSync(oldLogoPath).isFile()) {
            try {
              fs.unlinkSync(oldLogoPath);
            } catch (err) {
              console.error('Failed to delete old logo file:', err);
            }
          }
        }

        await logoFile.mv(uploadPath);
        await updateSetting('logo', 'uploads/' + logoName);
      }

      // 2. Process Favicon / Icon
      if (req.files && req.files.favicon && req.files.favicon.name && req.files.favicon.size > 0) {
        const faviconFile = req.files.favicon;
        const ext = path.extname(faviconFile.name);
        const faviconName = `favicon_${Date.now()}${ext}`;
        const uploadPath = path.join(uploadDir, faviconName);

        // Delete old favicon file if it exists and is not empty
        if (currentSettings.favicon) {
          const oldFaviconPath = path.join(process.cwd(), 'public', currentSettings.favicon);
          if (fs.existsSync(oldFaviconPath) && fs.lstatSync(oldFaviconPath).isFile()) {
            try {
              fs.unlinkSync(oldFaviconPath);
            } catch (err) {
              console.error('Failed to delete old favicon file:', err);
            }
          }
        }

        await faviconFile.mv(uploadPath);
        await updateSetting('favicon', 'uploads/' + faviconName);
      }

      // Flush settings cache so modifications reflect instantly globally
      if (global.flushSettingsCache) {
        await global.flushSettingsCache();
      }

      Flash.success('সেটিংস সফলভাবে আপডেট করা হয়েছে।');
      res.redirect('/admin/settings');
    } catch (error) {
      console.error('Settings update error:', error);
      Flash.error('সেটিংস আপডেট করার সময় একটি ত্রুটি ঘটেছে: ' + error.message);
      res.redirect('/admin/settings');
    }
  }
}

module.exports = SettingController;
