const UserSeeder = require('./UserSeeder');

/**
 * Master Database Seeder
 * Orchestrates all individual seeders in order.
 */
class DatabaseSeeder {
  static async run() {
    const results = {};

    console.log('  → Running UserSeeder...');
    results.users = await UserSeeder.run();

    return results;
  }
}

module.exports = DatabaseSeeder;
