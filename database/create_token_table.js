const DB = require('../config/db');

async function run() {
  try {
    console.log("Creating required system tables in database...");

    // Create personal_access_tokens table
    await DB.query(`
      CREATE TABLE IF NOT EXISTS \`personal_access_tokens\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`tokenable_type\` VARCHAR(255) NOT NULL,
        \`tokenable_id\` INT NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`token\` VARCHAR(64) NOT NULL UNIQUE,
        \`abilities\` TEXT,
        \`last_used_at\` TIMESTAMP NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ table 'personal_access_tokens' created successfully.");

    // Create activity_logs table
    await DB.query(`
      CREATE TABLE IF NOT EXISTS \`activity_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT NULL,
        \`user_name\` VARCHAR(255) DEFAULT 'Guest',
        \`action\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`ip_address\` VARCHAR(45) NOT NULL,
        \`user_agent\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ table 'activity_logs' created successfully.");

    console.log("Database migration finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
