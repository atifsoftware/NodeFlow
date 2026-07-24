const fs = require('fs');
const path = require('path');
const DB = require('../../config/db');

/**
 * Migrator Engine for NodeFlow
 * Manages database schema migrations, modeled after NovaFlow.
 */
class Migrator {
  constructor(directory = null) {
    this.table = 'migrations';
    this.directory = directory || path.join(process.cwd(), 'database', 'migrations');
  }

  /**
   * Ensure the migrations tracking table exists.
   */
  async ensureTableExists() {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`${this.table}\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`migration\` VARCHAR(255) NOT NULL,
        \`batch\` INT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await DB.query(sql);
  }

  /**
   * Run all pending migrations
   * @returns {Promise<string[]>} List of executed migration names
   */
  async run() {
    await this.ensureTableExists();

    const executed = await this.getExecutedMigrations();
    const files = this.getMigrationFiles();
    const batch = await this.getNextBatchNumber();
    const ran = [];

    for (const file of files) {
      const migrationName = path.basename(file, '.js');

      if (executed.includes(migrationName)) {
        continue;
      }

      console.log(`\x1b[36mMigrating:\x1b[0m ${migrationName}`);

      try {
        const migrationModule = require(file);
        
        let instance;
        if (typeof migrationModule === 'function') {
          // If exports a class
          instance = new migrationModule();
        } else {
          // If exports a plain object/module
          instance = migrationModule;
        }

        if (typeof instance.up !== 'function') {
          throw new Error(`Migration ${migrationName} does not define an up() method.`);
        }

        // Run the schema migration up
        await instance.up();

        // Record execution in migrations table
        await this.log(migrationName, batch);
        ran.push(migrationName);

        console.log(`\x1b[32mMigrated:\x1b[0m  ${migrationName}`);
      } catch (error) {
        console.error(`\x1b[31m✗ Error migrating ${migrationName}:\x1b[0m ${error.message}`);
        throw error;
      }
    }

    return ran;
  }

  /**
   * Fetch already executed migrations
   */
  async getExecutedMigrations() {
    const rows = await DB.query(`SELECT migration FROM \`${this.table}\``);
    return rows.map(r => r.migration);
  }

  /**
   * Get list of all migration files sorted chronologically
   */
  getMigrationFiles() {
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
      return [];
    }

    return fs.readdirSync(this.directory)
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(this.directory, file))
      .sort();
  }

  /**
   * Get next batch number
   */
  async getNextBatchNumber() {
    const rows = await DB.query(`SELECT MAX(batch) as max_batch FROM \`${this.table}\``);
    const max = rows[0].max_batch || 0;
    return max + 1;
  }

  /**
   * Log migration into database
   */
  async log(migration, batch) {
    await DB.table(this.table).insert({ migration, batch });
  }
}

module.exports = Migrator;
