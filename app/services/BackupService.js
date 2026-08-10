const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const DB = require('../../config/db');

class BackupService {
  /**
   * Target directory for storing database backups
   */
  static getBackupDir() {
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  /**
   * Format bytes into human readable string
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get database diagnostics and storage size
   */
  static async getDatabaseStats() {
    try {
      const dbName = process.env.DB_NAME || 'nodeflow_db';
      const tablesQuery = await DB.query("SHOW TABLES");
      const tablesCount = tablesQuery.length;

      // Query information_schema for approximate DB size & total rows
      const sizeQuery = await DB.query(`
        SELECT 
          SUM(data_length + index_length) AS total_size,
          SUM(table_rows) AS total_rows
        FROM information_schema.TABLES 
        WHERE table_schema = ?
      `, [dbName]);

      const totalSizeBytes = parseInt(sizeQuery[0]?.total_size || 0, 10);
      const totalRows = parseInt(sizeQuery[0]?.total_rows || 0, 10);

      return {
        dbName,
        tablesCount,
        totalRows,
        totalSizeBytes,
        formattedSize: BackupService.formatBytes(totalSizeBytes)
      };
    } catch (err) {
      console.error('Failed to get database stats:', err);
      return {
        dbName: process.env.DB_NAME || 'nodeflow_db',
        tablesCount: 0,
        totalRows: 0,
        totalSizeBytes: 0,
        formattedSize: '0 Bytes'
      };
    }
  }

  /**
   * List all available database backups in storage/backups
   */
  static listBackups() {
    const dir = BackupService.getBackupDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql') || f.endsWith('.gz') || f.endsWith('.zip'));

    const backups = files.map(filename => {
      const filePath = path.join(dir, filename);
      const stats = fs.statSync(filePath);
      const isCompressed = filename.endsWith('.gz') || filename.endsWith('.zip');
      return {
        filename,
        filePath,
        isCompressed,
        extension: isCompressed ? (filename.endsWith('.gz') ? '.sql.gz' : '.zip') : '.sql',
        sizeBytes: stats.size,
        formattedSize: BackupService.formatBytes(stats.size),
        createdAt: stats.mtime,
        createdAtFormatted: new Date(stats.mtime).toLocaleString('bn-BD', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      };
    });

    // Sort newest backups first
    return backups.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Escape MySQL string values for SQL dump safety
   */
  static escapeSqlValue(val) {
    if (val === null || val === undefined) {
      return 'NULL';
    }
    if (typeof val === 'boolean') {
      return val ? '1' : '0';
    }
    if (typeof val === 'number') {
      return val.toString();
    }
    if (val instanceof Date) {
      return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    if (Buffer.isBuffer(val)) {
      return `X'${val.toString('hex')}'`;
    }
    if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    
    // String escaping
    const str = val.toString()
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');

    return `'${str}'`;
  }

  /**
   * Generate full MySQL database dump file (Plain SQL or Gzip Compressed)
   * @param {Object} options - { compress: boolean }
   */
  static async createBackup(options = {}) {
    const compress = options.compress !== undefined ? Boolean(options.compress) : true;
    const dbName = process.env.DB_NAME || 'nodeflow_db';
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    
    const ext = compress ? 'sql.gz' : 'sql';
    const filename = `backup_${dbName}_${timestamp}.${ext}`;
    const filePath = path.join(BackupService.getBackupDir(), filename);

    const fileStream = fs.createWriteStream(filePath);
    let targetStream;
    let gzipStream = null;

    if (compress) {
      gzipStream = zlib.createGzip({ level: 9 });
      gzipStream.pipe(fileStream);
      targetStream = gzipStream;
    } else {
      targetStream = fileStream;
    }

    // Write Dump Header
    targetStream.write(`-- ========================================================\n`);
    targetStream.write(`-- NodeFlow Database Backup Engine\n`);
    targetStream.write(`-- Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}\n`);
    targetStream.write(`-- Database: \`${dbName}\`\n`);
    targetStream.write(`-- Compression: ${compress ? 'GZIP (Level 9)' : 'None (Plain SQL)'}\n`);
    targetStream.write(`-- Generation Date: ${now.toISOString()}\n`);
    targetStream.write(`-- Framework: NodeFlow MVC Engine (Node.js)\n`);
    targetStream.write(`-- ========================================================\n\n`);

    targetStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n`);
    targetStream.write(`SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`);
    targetStream.write(`SET NAMES utf8mb4;\n\n`);

    // Fetch all tables
    const tablesRows = await DB.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const dbKey = `Tables_in_${dbName}`;
    const tables = tablesRows.map(row => row[dbKey] || Object.values(row)[0]);

    let totalDumpedRows = 0;

    for (const table of tables) {
      targetStream.write(`-- --------------------------------------------------------\n`);
      targetStream.write(`-- Table structure for table \`${table}\`\n`);
      targetStream.write(`-- --------------------------------------------------------\n`);
      targetStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);

      // Get Create Table DDL
      const createResult = await DB.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createResult[0]?.['Create Table'] || createResult[0]?.[Object.keys(createResult[0])[1]];
      targetStream.write(`${createSql};\n\n`);

      // Dump Table Data in batches
      const countResult = await DB.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      const rowCount = countResult[0]?.cnt || 0;

      if (rowCount > 0) {
        targetStream.write(`-- Dumping data for table \`${table}\` (${rowCount} records)\n`);
        
        const batchSize = 200;
        let offset = 0;

        while (offset < rowCount) {
          const rows = await DB.query(`SELECT * FROM \`${table}\` LIMIT ${batchSize} OFFSET ${offset}`);
          if (rows.length === 0) break;

          const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
          targetStream.write(`INSERT INTO \`${table}\` (${columns}) VALUES\n`);

          const valueRows = rows.map(row => {
            const vals = Object.values(row).map(val => BackupService.escapeSqlValue(val)).join(', ');
            return `  (${vals})`;
          });

          targetStream.write(valueRows.join(',\n') + ';\n\n');
          totalDumpedRows += rows.length;
          offset += batchSize;
        }
      }
    }

    // Write Dump Footer
    targetStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
    targetStream.write(`-- ========================================================\n`);
    targetStream.write(`-- Backup Complete: Dumped ${tables.length} tables, ${totalDumpedRows} records.\n`);
    targetStream.write(`-- ========================================================\n`);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
      if (gzipStream) {
        gzipStream.end();
      } else {
        fileStream.end();
      }
    });

    const fileStat = fs.statSync(filePath);

    return {
      filename,
      filePath,
      isCompressed: compress,
      tablesCount: tables.length,
      totalRows: totalDumpedRows,
      sizeBytes: fileStat.size,
      formattedSize: BackupService.formatBytes(fileStat.size),
      createdAt: now
    };
  }

  /**
   * Delete a backup file safely
   */
  static deleteBackup(filename) {
    const cleanFilename = path.basename(filename);
    const filePath = path.join(BackupService.getBackupDir(), cleanFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`ব্যাকআপ ফাইল '${cleanFilename}' খুঁজে পাওয়া যায়নি।`);
    }

    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * Get safe absolute path of a backup file
   */
  static getBackupFilePath(filename) {
    const cleanFilename = path.basename(filename);
    const filePath = path.join(BackupService.getBackupDir(), cleanFilename);

    if (!fs.existsSync(filePath)) {
      return null;
    }
    return filePath;
  }

  /**
   * Restore database from backup SQL or Gzip file
   */
  static async restoreBackup(filename) {
    const cleanFilename = path.basename(filename);
    const filePath = path.join(BackupService.getBackupDir(), cleanFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`ব্যাকআপ ফাইল '${cleanFilename}' পাওয়া যায়নি।`);
    }

    let sqlContent;
    if (cleanFilename.endsWith('.gz')) {
      const buffer = fs.readFileSync(filePath);
      sqlContent = zlib.gunzipSync(buffer).toString('utf8');
    } else {
      sqlContent = fs.readFileSync(filePath, 'utf8');
    }

    // Remove comments
    let cleanSql = sqlContent.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanSql = cleanSql.replace(/^--.*$/gm, '');

    // Split SQL by semicolon ensuring delimiter integrity
    const statements = cleanSql
      .split(/;\s*[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const connection = await DB.getConnection();
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      return { success: true, statementsExecuted: statements.length };
    } catch (err) {
      console.error('Database restore error:', err);
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = BackupService;
