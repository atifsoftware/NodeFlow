const path = require('path');
const fs = require('fs');
const Queue = require('./Queue');
const Job = require('./Job');

/**
 * QueueWorker for NodeFlow
 * Asynchronously processes queued tasks from the database broker, modeled after NovaFlow.
 */
class QueueWorker {
  constructor() {
    this.shouldKeepWorking = true;
    this.sleepTime = 3; // Seconds to sleep when queue is empty
  }

  /**
   * Launch continuous polling work loop
   */
  async work(queue = 'default') {
    console.log(this.color(`\n🚀 NodeFlow Queue Worker started. Watching queue: [${queue}]`, 'cyan'));
    console.log(this.color(`⌨️  Press Ctrl+C to stop.\n`, 'yellow'));

    while (this.shouldKeepWorking) {
      try {
        const jobRecord = await Queue.pop(queue);

        if (jobRecord) {
          await this.process(jobRecord);
        } else {
          // Sleep for a bit
          await new Promise(resolve => setTimeout(resolve, this.sleepTime * 1000));
        }
      } catch (err) {
        console.error(this.color(`[ERROR] Worker Exception: ${err.message}`, 'red'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single popped job
   */
  async process(jobRecord) {
    const payload = JSON.parse(jobRecord.payload);
    const displayName = payload.display_name;
    const attempts = jobRecord.attempts;

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`${this.color(`[ ${timestamp} ]`, 'white')} Processing: ${this.color(displayName, 'cyan')}`);

    let JobClass;
    let jobInstance;

    try {
      // Resolve job definition from app/jobs/ directory
      const jobsDir = path.join(process.cwd(), 'app', 'jobs');
      const jobFilePath = path.join(jobsDir, `${displayName}.js`);

      if (!fs.existsSync(jobFilePath)) {
        throw new Error(`Job file '${displayName}.js' not found in ${jobsDir}`);
      }

      JobClass = require(jobFilePath);
      jobInstance = new JobClass(payload.data);

      if (!(jobInstance instanceof Job)) {
        throw new Error(`Job class must extend NodeFlow's base Job core class.`);
      }

      // Execute job handler
      await jobInstance.handle();

      // Delete completed job
      await Queue.delete(jobRecord.id);

      const successTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      console.log(`${this.color(`[ ${successTimestamp} ]`, 'white')} ${this.color(`✓ Success:`, 'green')} ${displayName}`);

    } catch (error) {
      const errorTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      console.log(`${this.color(`[ ${errorTimestamp} ]`, 'white')} ${this.color(`✗ Failed:`, 'red')} ${displayName}`);
      console.log(this.color(`  Error: ${error.message}`, 'red'));

      const maxTries = payload.tries || 3;

      if (attempts < maxTries) {
        const delay = 60 * (attempts + 1); // Exponential backoff wait
        await Queue.release(jobRecord.id, delay);
        console.log(this.color(`  Released back to queue with ${delay}s delay.`, 'yellow'));
      } else {
        // Run optional custom fail handler
        if (jobInstance && typeof jobInstance.failed === 'function') {
          try {
            await jobInstance.failed(error);
          } catch (failErr) {
            console.error('Job fail handler errored:', failErr.message);
          }
        }
        
        // Delete job as max attempts exceeded
        await Queue.delete(jobRecord.id);
        console.log(this.color(`  Max attempts (${maxTries}) reached. Job deleted.`, 'red'));
      }
    }
  }

  color(text, color) {
    const termColors = {
      cyan: "\x1b[36m",
      yellow: "\x1b[33m",
      green: "\x1b[32m",
      red: "\x1b[31m",
      white: "\x1b[37m",
      reset: "\x1b[0m"
    };
    return (termColors[color] || '') + text + termColors.reset;
  }
}

module.exports = QueueWorker;
