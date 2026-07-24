/**
 * Base Abstract Job Class for NodeFlow
 * All queued jobs must extend this class, modeled after NovaFlow.
 */
class Job {
  constructor(data = {}) {
    // Populate job properties from constructor payload
    Object.assign(this, data);
    
    // Default retries/tries
    this.tries = this.tries || 3;
    
    // Default delay in seconds
    this.delay = this.delay || 0;
  }

  /**
   * Action handler - to be implemented by child classes
   */
  async handle() {
    throw new Error('Queue Job must implement handle() method.');
  }

  /**
   * Fail delegate callback - executed when max retries are exhausted
   */
  async failed(error) {
    // Optional custom hook for logging or notifications
  }
}

module.exports = Job;
