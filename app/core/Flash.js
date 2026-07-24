const requestContext = require('./RequestContext');

/**
 * Flash Message Handler for NodeFlow
 * Provides a clean interface for session-based messaging, modeled after NovaFlow.
 */
class Flash {
  /**
   * Helper to get current session from RequestContext
   */
  static getSession() {
    const store = requestContext.getStore();
    return (store && store.req) ? store.req.session : null;
  }

  /**
   * Set a success flash message
   */
  static success(message) {
    const session = this.getSession();
    if (session) {
      session.flash_success = message;
    }
  }

  /**
   * Set an error flash message
   */
  static error(message) {
    const session = this.getSession();
    if (session) {
      session.flash_error = message;
    }
  }

  /**
   * Set a warning flash message
   */
  static warning(message) {
    const session = this.getSession();
    if (session) {
      session.flash_warning = message;
    }
  }

  /**
   * Helper for generic flashes
   */
  static set(name, message, className = 'alert alert-info') {
    const session = this.getSession();
    if (session) {
      session[`flash_${name}`] = message;
      session[`flash_${name}_class`] = className;
    }
  }
}

module.exports = Flash;
