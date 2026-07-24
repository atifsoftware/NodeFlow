const DB = require('../../config/db');

/**
 * Queue Manager for NodeFlow
 * Interfaces MySQL as a simple, robust background task broker.
 */
class Queue {
  static table = 'jobs';

  /**
   * Ensure jobs tracking table exists
   */
  static async ensureTableExists() {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`${this.table}\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`queue\` VARCHAR(255) NOT NULL DEFAULT 'default',
        \`payload\` LONGTEXT NOT NULL,
        \`attempts\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`reserved_at\` TIMESTAMP NULL DEFAULT NULL,
        \`available_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await DB.query(sql);
  }

  /**
   * Push a new job onto the queue
   */
  static async push(job, queue = 'default') {
    await this.ensureTableExists();

    const payload = {
      display_name: job.constructor.name,
      data: { ...job },
      tries: job.tries || 3,
      created_at: Date.now()
    };

    const delay = job.delay || 0;
    const availableAt = new Date(Date.now() + (delay * 1000));
    
    // Format timestamp for MySQL
    const formatTimestamp = (d) => d.toISOString().replace('T', ' ').substring(0, 19);

    return await DB.table(this.table).insert({
      queue,
      payload: JSON.stringify(payload),
      attempts: 0,
      available_at: formatTimestamp(availableAt),
      created_at: formatTimestamp(new Date())
    });
  }

  /**
   * Pop the next available job from the queue
   */
  static async pop(queue = 'default') {
    await this.ensureTableExists();

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Fetch the earliest job that is ready and not reserved
    const job = await DB.table(this.table)
      .where('queue', queue)
      .whereRaw('reserved_at IS NULL')
      .whereRaw('available_at <= ?', [now])
      .orderBy('id', 'ASC')
      .first();

    if (job) {
      // Reserve the job
      await DB.table(this.table)
        .where('id', job.id)
        .update({ reserved_at: now });
      
      return job;
    }

    return null;
  }

  /**
   * Delete a job after successful execution
   */
  static async delete(id) {
    return await DB.table(this.table).where('id', id).delete();
  }

  /**
   * Release a job back to the queue (on execution failure)
   */
  static async release(id, delay = 60) {
    const availableAt = new Date(Date.now() + (delay * 1000));
    const formatTimestamp = (d) => d.toISOString().replace('T', ' ').substring(0, 19);

    return await DB.query(
      `UPDATE \`${this.table}\` SET reserved_at = NULL, available_at = ?, attempts = attempts + 1 WHERE id = ?`,
      [formatTimestamp(availableAt), id]
    );
  }
}

module.exports = Queue;
