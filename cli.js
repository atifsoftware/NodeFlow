const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DB = require('./config/db');
const User = require('./app/models/User');
const Cache = require('./app/core/Cache');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  magenta: "\x1b[35m"
};

function printHeader() {
  console.clear();
  console.log(colors.cyan + "╔════════════════════════════════════════════╗" + colors.reset);
  console.log(colors.cyan + "║      " + colors.bold + "NODEFLOW CORE CLI TOOL" + colors.cyan + "        ║" + colors.reset);
  console.log(colors.cyan + "║       " + "Framework Development Kit" + colors.cyan + "      ║" + colors.reset);
  console.log(colors.cyan + "╚════════════════════════════════════════════╝" + colors.reset);
  console.log("");
}

function showMenu() {
  console.log(colors.bold + "\n=== MAIN MENU ===\n" + colors.reset);
  console.log("1. " + colors.green + "Database Setup (Initialize Schema & Admin User)" + colors.reset);
  console.log("2. " + colors.green + "Database Seed (Sample Users)" + colors.reset);
  console.log("3. " + colors.cyan + "View All Database Tables" + colors.reset);
  console.log("4. " + colors.blue + "Generate Model Scaffold" + colors.reset);
  console.log("5. " + colors.blue + "Generate Controller Scaffold" + colors.reset);
  console.log("6. " + colors.magenta + "Run All Seeders (db:seed)" + colors.reset);
  console.log("7. " + colors.magenta + "Generate Seeder Scaffold (make:seeder)" + colors.reset);
  console.log("8. " + colors.yellow + "Clear Application Cache (cache:clear)" + colors.reset);
  console.log("9. " + colors.cyan + "Framework Status Overview (app:status)" + colors.reset);
  console.log("10. " + colors.green + "Run Database Migrations (db:migrate)" + colors.reset);
  console.log("11. " + colors.blue + "Generate Migration Scaffold (make:migration)" + colors.reset);
  console.log("12. " + colors.yellow + "Launch Background Queue Worker (queue:work)" + colors.reset);
  console.log("13. " + colors.magenta + "Launch Interactive Tinker REPL (tinker)" + colors.reset);
  console.log("14. " + colors.cyan + "Run Automated Framework Tests (test)" + colors.reset);
  console.log("15. " + colors.green + "Generate Database Backup (db:backup)" + colors.reset);
  console.log("0. " + colors.red + "Exit" + colors.reset);
  console.log("");
  
  rl.question(colors.yellow + "Select option: " + colors.reset, (choice) => {
    handleChoice(choice.trim());
  });
}

async function handleChoice(choice) {
  switch (choice) {
    case '1':
      await dbSetup();
      break;
    case '2':
      await dbSeed();
      break;
    case '3':
      await viewTables();
      break;
    case '4':
      promptGenerateModel();
      return;
    case '5':
      promptGenerateController();
      return;
    case '6':
      await runAllSeeders();
      break;
    case '7':
      promptGenerateSeeder();
      return;
    case '8':
      cacheClear();
      break;
    case '9':
      await appStatus();
      break;
    case '10':
      await runMigrations();
      break;
    case '11':
      promptGenerateMigration();
      return;
    case '12':
      await launchQueueWorker();
      break;
    case '13':
      await launchTinker();
      return;
    case '14':
      await runAutomatedTests();
      break;
    case '15':
      await runDbBackup();
      break;
    case '0':
      console.log(colors.green + "\n✓ Goodbye From NodeFlow!\n" + colors.reset);
      rl.close();
      process.exit(0);
    default:
      console.log(colors.red + "✗ Invalid option!" + colors.reset);
      pause();
  }
}

function pause() {
  rl.question("\nPress Enter to continue...", () => {
    printHeader();
    showMenu();
  });
}

async function dbSetup() {
  console.log(colors.yellow + "\nInitializing database schema setup..." + colors.reset);
  try {
    const mysql = require('mysql2/promise');
    
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || ''
    });
    
    const dbName = process.env.DB_NAME || 'nodeflow_db';
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();
    console.log(colors.green + `✓ Database '${dbName}' created or verified successfully.` + colors.reset);

    const sqlPath = path.join(__dirname, 'database.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error("database.sql file not found in project root.");
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    let cleanedSql = sqlContent.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanedSql = cleanedSql.replace(/(--|#)[^\n]*\n/g, '\n');
    
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await DB.query(statement);
    }
    
    console.log(colors.green + "✓ Tables initialized successfully." + colors.reset);

    const adminEmail = 'admin@nodeflow.com';
    const existing = await User.findByEmail(adminEmail);
    
    if (!existing) {
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
        status: 1
      });
      console.log(colors.green + `✓ Default Admin user seeded:` + colors.reset);
      console.log(colors.white + `  Email:    admin@nodeflow.com` + colors.reset);
      console.log(colors.white + `  Password: admin123` + colors.reset);
    } else {
      await User.query().where('email', adminEmail).update({ status: 1 });
      console.log(colors.yellow + "✓ Admin user already exists. Forced status to active." + colors.reset);
    }

    console.log(colors.green + "\n✓ Database Setup complete!" + colors.reset);

  } catch (error) {
    console.log(colors.red + "✗ Error during DB Setup: " + error.message + colors.reset);
  }
  pause();
}

async function dbSeed() {
  console.log(colors.yellow + "\nSeeding database with sample users..." + colors.reset);
  try {
    const users = [
      { name: 'System Administrator', email: 'admin@nodeflow.com', password: 'admin123', role: 'admin', status: 1 },
      { name: 'Developer User', email: 'developer@nodeflow.com', password: 'developer123', role: 'staff', status: 1 },
      { name: 'Guest User', email: 'guest@nodeflow.com', password: 'guest123', role: 'staff', status: 1 }
    ];

    let inserted = 0;
    for (const user of users) {
      const existing = await User.findByEmail(user.email);
      if (!existing) {
        await User.create(user);
        inserted++;
      }
    }

    console.log(colors.green + `✓ Seeded ${inserted} new users into system successfully.` + colors.reset);

  } catch (error) {
    console.log(colors.red + "✗ Seed failure: " + error.message + colors.reset);
  }
  pause();
}

async function viewTables() {
  console.log(colors.yellow + "\nDatabase Tables:" + colors.reset);
  try {
    const rows = await DB.query("SHOW TABLES");
    const dbNameKey = `Tables_in_${process.env.DB_NAME || 'nodeflow_db'}`;
    
    if (rows.length === 0) {
      console.log("No tables found inside database.");
    } else {
      rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row[dbNameKey]}`);
      });
    }
  } catch (error) {
    console.log(colors.red + "✗ Error: " + error.message + colors.reset);
  }
  pause();
}

function promptGenerateModel() {
  rl.question(colors.yellow + "\nEnter Model Name (e.g. Customer): " + colors.reset, (name) => {
    const modelName = name.trim();
    if (!modelName) {
      console.log(colors.red + "✗ Model name cannot be empty." + colors.reset);
      pause();
      return;
    }

    try {
      const targetDir = path.join(__dirname, 'app', 'models');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${modelName}.js`);
      if (fs.existsSync(filePath)) {
        throw new Error(`Model ${modelName}.js already exists!`);
      }

      // Generate table name from model name
      const tableName = modelName.replace(/([A-Z])/g, (match, p1, offset) => {
        return offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase();
      }) + 's';

      const template = `const Model = require('../core/Model');

class ${modelName} extends Model {
  /**
   * Database table name
   */
  static table = '${tableName}';

  /**
   * Fields hidden from JSON output
   */
  static hidden = [];
}

module.exports = ${modelName};
`;

      fs.writeFileSync(filePath, template, 'utf8');
      console.log(colors.green + `✓ Model scaffold created at: app/models/${modelName}.js` + colors.reset);
      console.log(colors.cyan + `  Table: ${tableName}` + colors.reset);
      console.log(colors.cyan + `  Extends: Model (ORM Base Class)` + colors.reset);

    } catch (error) {
      console.log(colors.red + "✗ Scaffold failed: " + error.message + colors.reset);
    }
    pause();
  });
}

function promptGenerateController() {
  rl.question(colors.yellow + "\nEnter Controller Name (e.g. CustomerController): " + colors.reset, (name) => {
    const controllerName = name.trim();
    if (!controllerName) {
      console.log(colors.red + "✗ Controller name cannot be empty." + colors.reset);
      pause();
      return;
    }

    try {
      const targetDir = path.join(__dirname, 'app', 'controllers');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${controllerName}.js`);
      if (fs.existsSync(filePath)) {
        throw new Error(`Controller ${controllerName}.js already exists!`);
      }

      const template = `class ${controllerName} {
  /**
   * Display listing of index
   */
  static async index(req, res, next) {
    try {
      res.render('${controllerName.toLowerCase().replace('controller', '')}/index', {
        title: '${controllerName}'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create action
   */
  static async store(req, res) {
    try {
      // Logic for adding entries
      res.status(201).json({ status: 'success', message: 'Record created successfully.' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = ${controllerName};
`;

      fs.writeFileSync(filePath, template, 'utf8');
      console.log(colors.green + `✓ Controller scaffold created at: app/controllers/${controllerName}.js` + colors.reset);

    } catch (error) {
      console.log(colors.red + "✗ Scaffold failed: " + error.message + colors.reset);
    }
    pause();
  });
}

async function runAllSeeders() {
  console.log(colors.yellow + "\nRunning all database seeders..." + colors.reset);
  try {
    const DatabaseSeeder = require('./database/seeders/DatabaseSeeder');
    const results = await DatabaseSeeder.run();

    console.log(colors.green + "\n✓ Seeding complete." + colors.reset);
  } catch (error) {
    console.log(colors.red + "✗ Seeder error: " + error.message + colors.reset);
  }
  pause();
}

function promptGenerateSeeder() {
  rl.question(colors.yellow + "\nEnter Seeder Name (e.g. CategorySeeder): " + colors.reset, (name) => {
    const seederName = name.trim();
    if (!seederName) {
      console.log(colors.red + "✗ Seeder name cannot be empty." + colors.reset);
      pause();
      return;
    }

    try {
      const targetDir = path.join(__dirname, 'database', 'seeders');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${seederName}.js`);
      if (fs.existsSync(filePath)) {
        throw new Error(`Seeder ${seederName}.js already exists!`);
      }

      const template = `const DB = require('../../config/db');

/**
 * ${seederName}
 * Database seeder for populating sample data.
 */
class ${seederName} {
  static async run() {
    const records = [
      // Add your seed data here
      // { column1: 'value1', column2: 'value2' }
    ];

    let inserted = 0;
    for (const record of records) {
      // await DB.table('your_table').insert(record);
      inserted++;
    }

    return inserted;
  }
}

module.exports = ${seederName};
`;

      fs.writeFileSync(filePath, template, 'utf8');
      console.log(colors.green + `✓ Seeder scaffold created at: database/seeders/${seederName}.js` + colors.reset);
      console.log(colors.cyan + `  Remember to register it in DatabaseSeeder.js` + colors.reset);

    } catch (error) {
      console.log(colors.red + "✗ Scaffold failed: " + error.message + colors.reset);
    }
    pause();
  });
}

function cacheClear() {
  console.log(colors.yellow + "\nClearing application cache..." + colors.reset);
  try {
    const cleaned = Cache.clear();
    console.log(colors.green + `✓ Application cache cleared. ${cleaned} cache file(s) removed.` + colors.reset);
  } catch (error) {
    console.log(colors.red + "✗ Cache clear error: " + error.message + colors.reset);
  }
  pause();
}

async function appStatus() {
  console.log(colors.yellow + "\nNodeFlow Framework Status Overview" + colors.reset);
  console.log(colors.cyan + "─────────────────────────────────────" + colors.reset);

  try {
    // Database Status
    const tables = await DB.query("SHOW TABLES");
    const dbName = process.env.DB_NAME || 'nodeflow_db';
    console.log(colors.bold + "\n📦 Database:" + colors.reset);
    console.log(`   Name:   ${dbName}`);
    console.log(`   Tables: ${tables.length}`);

    // Models Count
    const modelsDir = path.join(__dirname, 'app', 'models');
    const modelFiles = fs.existsSync(modelsDir)
      ? fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'))
      : [];
    console.log(colors.bold + "\n📄 Models:" + colors.reset);
    console.log(`   Count: ${modelFiles.length}`);
    modelFiles.forEach(f => console.log(`   → ${f}`));

    // Controllers Count
    const controllersDir = path.join(__dirname, 'app', 'controllers');
    const controllerFiles = fs.existsSync(controllersDir)
      ? fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'))
      : [];
    console.log(colors.bold + "\n🎮 Controllers:" + colors.reset);
    console.log(`   Count: ${controllerFiles.length}`);
    controllerFiles.forEach(f => console.log(`   → ${f}`));

    // Seeders Count
    const seedersDir = path.join(__dirname, 'database', 'seeders');
    const seederFiles = fs.existsSync(seedersDir)
      ? fs.readdirSync(seedersDir).filter(f => f.endsWith('.js'))
      : [];
    console.log(colors.bold + "\n🌱 Seeders:" + colors.reset);
    console.log(`   Count: ${seederFiles.length}`);
    seederFiles.forEach(f => console.log(`   → ${f}`));

    // Middlewares Count
    const middlewaresDir = path.join(__dirname, 'app', 'middlewares');
    const middlewareFiles = fs.existsSync(middlewaresDir)
      ? fs.readdirSync(middlewaresDir).filter(f => f.endsWith('.js'))
      : [];
    console.log(colors.bold + "\n🛡️  Middlewares:" + colors.reset);
    console.log(`   Count: ${middlewareFiles.length}`);
    middlewareFiles.forEach(f => console.log(`   → ${f}`));

    // Core Libraries
    const coreDir = path.join(__dirname, 'app', 'core');
    const coreFiles = fs.existsSync(coreDir)
      ? fs.readdirSync(coreDir).filter(f => f.endsWith('.js'))
      : [];
    console.log(colors.bold + "\n⚙️  Core Libraries:" + colors.reset);
    console.log(`   Count: ${coreFiles.length}`);
    coreFiles.forEach(f => console.log(`   → ${f}`));

    // Cache Stats
    const cacheStats = Cache.stats();
    console.log(colors.bold + "\n💾 Cache:" + colors.reset);
    console.log(`   Files:   ${cacheStats.totalFiles}`);
    console.log(`   Size:    ${(cacheStats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Valid:   ${cacheStats.validCount}`);
    console.log(`   Expired: ${cacheStats.expiredCount}`);

    console.log(colors.cyan + "\n─────────────────────────────────────" + colors.reset);
    console.log(colors.green + "✓ Framework status check complete." + colors.reset);

  } catch (error) {
    console.log(colors.red + "✗ Status check error: " + error.message + colors.reset);
  }
  pause();
}

async function runMigrations() {
  console.log(colors.yellow + "\nRunning database migrations..." + colors.reset);
  try {
    const Migrator = require('./app/core/Migrator');
    const migrator = new Migrator();
    const ran = await migrator.run();
    if (ran.length === 0) {
      console.log(colors.green + "✓ No pending migrations." + colors.reset);
    } else {
      console.log(colors.green + `\n✓ Successfully executed ${ran.length} migration(s).` + colors.reset);
    }
  } catch (error) {
    console.log(colors.red + "✗ Migration failed: " + error.message + colors.reset);
  }
  pause();
}

function promptGenerateMigration() {
  rl.question(colors.yellow + "\nEnter Migration Name (e.g. create_orders_table): " + colors.reset, (name) => {
    const migrationName = name.trim().toLowerCase();
    if (!migrationName) {
      console.log(colors.red + "✗ Migration name cannot be empty." + colors.reset);
      pause();
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
      const fileName = `${timestamp}_${migrationName}.js`;
      const targetDir = path.join(__dirname, 'database', 'migrations');
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, fileName);
      
      let tableName = 'table_name';
      if (migrationName.startsWith('create_') && migrationName.endsWith('_table')) {
        tableName = migrationName.replace('create_', '').replace('_table', '');
      }

      const template = `const DB = require('../../config/db');

class ${resolveClassName(migrationName)} {
  /**
   * Run the migrations.
   */
  async up() {
    await DB.query(\`
      CREATE TABLE IF NOT EXISTS \\\`${tableName}\\\` (
        \\\`id\\\` INT AUTO_INCREMENT PRIMARY KEY,
        \\\`created_at\\\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \\\`updated_at\\\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);
  }

  /**
   * Reverse the migrations.
   */
  async down() {
    await DB.query(\`DROP TABLE IF EXISTS \\\`${tableName}\\\`\`);
  }
}

module.exports = ${resolveClassName(migrationName)};
`;

      fs.writeFileSync(filePath, template, 'utf8');
      console.log(colors.green + `✓ Migration scaffold created at: database/migrations/${fileName}` + colors.reset);
    } catch (error) {
      console.log(colors.red + "✗ Scaffold failed: " + error.message + colors.reset);
    }
    pause();
  });
}

function resolveClassName(migrationName) {
  const parts = migrationName.split('_');
  let className = '';
  parts.forEach(p => {
    if (p) className += p.charAt(0).toUpperCase() + p.slice(1);
  });
  return className;
}

async function launchQueueWorker() {
  console.log(colors.yellow + "\nLaunching Background Queue Worker..." + colors.reset);
  try {
    const QueueWorker = require('./app/core/QueueWorker');
    const worker = new QueueWorker();
    await worker.work();
  } catch (error) {
    console.log(colors.red + "✗ Worker failed: " + error.message + colors.reset);
    pause();
  }
}

async function launchTinker() {
  console.log(colors.magenta + "\nBooting NodeFlow Interactive Tinker REPL..." + colors.reset);
  console.log(colors.white + "Pre-loaded Core Services: DB, Cache, Logger, Flash, ApiResource, Queue, HasApiTokens" + colors.reset);
  
  const modelsDir = path.join(__dirname, 'app', 'models');
  let loadedModelsCount = 0;
  
  rl.close();
  
  const r = require('repl').start({
    prompt: colors.bold + colors.magenta + 'nodeflow > ' + colors.reset,
    useGlobal: true
  });

  // Pre-load core services
  r.context.DB = require('./config/db');
  r.context.Cache = require('./app/core/Cache');
  r.context.Logger = require('./app/core/Logger');
  r.context.Flash = require('./app/core/Flash');
  r.context.ApiResource = require('./app/core/ApiResource');
  r.context.Queue = require('./app/core/Queue');
  r.context.HasApiTokens = require('./app/core/HasApiTokens');

  // Pre-load models
  if (fs.existsSync(modelsDir)) {
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
    files.forEach(file => {
      const modelName = path.basename(file, '.js');
      try {
        r.context[modelName] = require(path.join(modelsDir, file));
        loadedModelsCount++;
      } catch (err) {
        // Ignore
      }
    });
  }

  console.log(colors.white + `Pre-loaded ${loadedModelsCount} Model(s) into context.\n` + colors.reset);
  console.log("Type any JavaScript/Database command. Type '.exit' or Ctrl+D to quit.\n");

  r.on('exit', () => {
    console.log(colors.green + "\n✓ Goodbye From Tinker!\n" + colors.reset);
    process.exit(0);
  });
}

async function runAutomatedTests() {
  try {
    const TestRunner = require('./app/core/testRunner');
    await TestRunner.runAll();
  } catch (error) {
    console.log(colors.red + "✗ Testing failed: " + error.message + colors.reset);
  }
  pause();
}

async function runDbBackup() {
  console.log(colors.yellow + "\nGenerating complete database backup dump..." + colors.reset);
  try {
    const BackupService = require('./app/services/BackupService');
    const result = await BackupService.createBackup();
    console.log(colors.green + `✓ Backup generated successfully!` + colors.reset);
    console.log(colors.cyan + `  File:     storage/backups/${result.filename}` + colors.reset);
    console.log(colors.cyan + `  Size:     ${result.formattedSize}` + colors.reset);
    console.log(colors.cyan + `  Tables:   ${result.tablesCount}` + colors.reset);
    console.log(colors.cyan + `  Records:  ${result.totalRows}` + colors.reset);
  } catch (error) {
    console.log(colors.red + "✗ Backup failure: " + error.message + colors.reset);
  }
  pause();
}

// Kickstart CLI on execute
if (require.main === module) {
  const directArg = process.argv[2];
  if (directArg) {
    rl.close();
    (async () => {
      if (directArg === 'db:backup' || directArg === 'backup') {
        const BackupService = require('./app/services/BackupService');
        try {
          const result = await BackupService.createBackup();
          console.log(`✓ Backup created: storage/backups/${result.filename} (${result.formattedSize})`);
          process.exit(0);
        } catch (err) {
          console.error(`✗ Backup failed:`, err.message);
          process.exit(1);
        }
      } else if (directArg === 'db:seed') {
        await runAllSeeders();
        process.exit(0);
      } else if (directArg === 'cache:clear') {
        Cache.clear();
        console.log('✓ Cache cleared.');
        process.exit(0);
      } else if (directArg === 'migrate' || directArg === 'db:migrate') {
        const Migrator = require('./app/core/Migrator');
        const migrator = new Migrator();
        await migrator.run();
        process.exit(0);
      } else if (directArg === 'test') {
        const TestRunner = require('./app/core/testRunner');
        await TestRunner.runAll();
        process.exit(0);
      } else {
        printHeader();
        showMenu();
      }
    })();
  } else {
    printHeader();
    showMenu();
  }
}
