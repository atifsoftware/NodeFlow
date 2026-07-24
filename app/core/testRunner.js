const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DB = require('../../config/db');

/**
 * NodeFlow Micro Test Runner
 * A lightweight, zero-dependency assert testing framework that executes
 * all test assertions inside a database transaction, rolling back automatically.
 */
class TestRunner {
  static tests = [];

  static register(testName, callback) {
    this.tests.push({ name: testName, run: callback });
  }

  static async runAll() {
    console.log('\n\x1b[36m╔════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║          NODEFLOW AUTOMATED TESTS          ║\x1b[0m');
    console.log('\x1b[36m╚════════════════════════════════════════════╝\x1b[0m\n');

    let passed = 0;
    let failed = 0;

    // Scan tests directory and load them
    const testsDir = path.join(process.cwd(), 'tests');
    if (fs.existsSync(testsDir)) {
      const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
      files.forEach(f => require(path.join(testsDir, f)));
    }

    if (this.tests.length === 0) {
      console.log('\x1b[33m⚠ No test cases registered in /tests directory.\x1b[0m\n');
      return;
    }

    for (const test of this.tests) {
      process.stdout.write(`⏳ Running: ${test.name} ... `);

      const originalTable = DB.table;
      const originalQuery = DB.query;
      try {
        // Execute inside database transaction sandbox to keep database pristine!
        await DB.transaction(async (trx) => {
          // Temporarily swap DB connection for ORM query executor to match transaction connection
          DB.table = (name) => originalTable(name, trx.pool || trx); // Proxy
          DB.query = async (sql, params = []) => {
            const res = await trx.query(sql, params);
            return Array.isArray(res) ? res[0] : res;
          };

          try {
            await trx.query('SET FOREIGN_KEY_CHECKS = 0');
            await test.run(assert);
          } finally {
            await trx.query('SET FOREIGN_KEY_CHECKS = 1');
            // Restore normal DB table and query executors
            DB.table = originalTable;
            DB.query = originalQuery;
          }

          // Force rollback exception to abort transaction write
          throw new Error('__SANDBOX_ROLLBACK__');
        });
      } catch (err) {
        if (err.message === '__SANDBOX_ROLLBACK__') {
          // Success! Test completed successfully and transaction was aborted/rolled back cleanly!
          passed++;
          console.log('\x1b[32m✓ PASSED\x1b[0m');
        } else {
          failed++;
          console.log('\x1b[31m✗ FAILED\x1b[0m');
          console.error(`\x1b[31m  Assertion Error: ${err.message}\x1b[0m`);
          if (err.stack) {
            console.error(err.stack.split('\n').slice(0, 3).join('\n'));
          }
        }
      }
    }

    console.log('\n\x1b[36m─────────────────────────────────────────────\x1b[0m');
    console.log(`📊 Test Results: \x1b[32m${passed} Passed\x1b[0m | \x1b[31m${failed} Failed\x1b[0m`);
    console.log('\x1b[36m─────────────────────────────────────────────\x1b[0m\n');

    return { passed, failed };
  }
}

module.exports = TestRunner;
