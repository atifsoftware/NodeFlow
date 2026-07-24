const fs = require('fs');
const path = require('path');
const requestContext = require('./RequestContext');

/**
 * Advanced Logging System for NodeFlow
 * Provides structured logging with levels and outputs, modeled after NovaFlow.
 */
class Logger {
  static EMERGENCY = 'emergency';
  static ALERT = 'alert';
  static CRITICAL = 'critical';
  static ERROR = 'error';
  static WARNING = 'warning';
  static NOTICE = 'notice';
  static INFO = 'info';
  static DEBUG = 'debug';

  static logFile = 'storage/logs/app.log';
  static errorLogFile = 'storage/logs/error.log';

  static levels = {
    [Logger.EMERGENCY]: 0,
    [Logger.ALERT]: 1,
    [Logger.CRITICAL]: 2,
    [Logger.ERROR]: 3,
    [Logger.WARNING]: 4,
    [Logger.NOTICE]: 5,
    [Logger.INFO]: 6,
    [Logger.DEBUG]: 7
  };

  /**
   * Initialize logging directories
   */
  static init() {
    const baseDir = path.dirname(path.resolve(this.logFile));
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }

  static emergency(message, context = {}) { this.log(this.EMERGENCY, message, context); }
  static alert(message, context = {}) { this.log(this.ALERT, message, context); }
  static critical(message, context = {}) { this.log(this.CRITICAL, message, context); }
  static error(message, context = {}) { this.log(this.ERROR, message, context); }
  static warning(message, context = {}) { this.log(this.WARNING, message, context); }
  static notice(message, context = {}) { this.log(this.NOTICE, message, context); }
  static info(message, context = {}) { this.log(this.INFO, message, context); }
  static debug(message, context = {}) { this.log(this.DEBUG, message, context); }

  /**
   * Core logging method
   */
  static log(level, message, context = {}) {
    this.init();

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Resolve info from AsyncLocalStorage context if available
    const store = requestContext.getStore();
    let ip = '127.0.0.1';
    let userId = 'guest';
    let requestPath = 'CLI';

    if (store && store.req) {
      const req = store.req;
      ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      userId = (req.session && req.session.user && req.session.user.id) ? req.session.user.id : 'guest';
      requestPath = req.originalUrl || req.url;
    }

    // Format context
    const cleanContext = { ...context };
    delete cleanContext.req; // Strip raw express req if passed
    const contextStr = Object.keys(cleanContext).length === 0 
      ? '' 
      : ' | Context: ' + JSON.stringify(cleanContext);

    // Create log entry
    const logEntry = `[${timestamp}] ${level.toUpperCase()} | IP: ${ip} | User: ${userId} | ${requestPath}: ${message}${contextStr}\n`;

    // Determine target log file
    const isErrorLog = [this.EMERGENCY, this.ALERT, this.CRITICAL, this.ERROR].includes(level);
    const targetFile = isErrorLog ? this.errorLogFile : this.logFile;

    try {
      fs.appendFileSync(targetFile, logEntry, 'utf8');
    } catch (err) {
      console.error('Failed to write log:', err);
    }

    // For critical alerts, also emit to standard system error
    if ([this.EMERGENCY, this.ALERT, this.CRITICAL].includes(level)) {
      this.sendAlert(level, message, cleanContext);
    }
  }

  /**
   * Emit system alert for critical issues
   */
  static sendAlert(level, message, context) {
    console.error(`CRITICAL NODEFLOW ALERT: ${level.toUpperCase()} - ${message}`, context);
  }

  /**
   * Log database query execution
   */
  static logQuery(query, bindings = [], executionTimeMs = null) {
    const context = { query, bindings, execution_time_ms: executionTimeMs };
    if (executionTimeMs !== null && executionTimeMs > 100) {
      this.warning('Slow query detected', context);
    } else {
      this.debug('Database query executed', context);
    }
  }

  /**
   * Log user activity
   */
  static logActivity(action, details = {}) {
    const store = requestContext.getStore();
    const context = {
      ...details,
      action,
      user_agent: (store && store.req) ? store.req.headers['user-agent'] : 'Unknown',
      referer: (store && store.req) ? store.req.headers['referer'] : 'Direct'
    };
    this.info(`User activity: ${action}`, context);
  }

  /**
   * Log security events
   */
  static logSecurity(event, details = {}) {
    const context = {
      ...details,
      event,
      severity: 'high'
    };
    this.warning(`Security event: ${event}`, context);
  }

  /**
   * Read recent logs
   */
  static getRecentLogs(lines = 50, file = null) {
    const filePath = file || this.logFile;
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const logsArray = content.split('\n').filter(l => l.trim().length > 0);
    return logsArray.reverse().slice(0, lines);
  }
}

module.exports = Logger;
