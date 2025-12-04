/**
 * Simple Logging Utility
 *
 * Provides consistent logging format across all services.
 * Format: [ServiceName] message
 *
 * Usage:
 *   const createLogger = require('./services/shared/logger.cjs')
 *   const logger = createLogger('MyService')
 *   logger.log('Server started')
 *   logger.warn('Something looks wrong')
 *   logger.error('Failed to connect')
 *
 * Options:
 *   const logger = createLogger('MyService', { timestamp: true })
 *
 * @version 1.0.0
 */

/**
 * Create a logger instance for a service
 *
 * @param {string} serviceName - Name of the service (e.g., 'Supabase', 'Phase 8', 'Production API')
 * @param {Object} options - Optional configuration
 * @param {boolean} options.timestamp - Include ISO timestamp in logs (default: false)
 * @returns {Object} Logger instance with log(), warn(), error() methods
 */
function createLogger(serviceName, options = {}) {
  const { timestamp = false } = options

  /**
   * Format a log message with prefix and optional timestamp
   *
   * @param {string} message - The message to log
   * @returns {string} Formatted message
   */
  function formatMessage(message) {
    const prefix = `[${serviceName}]`
    if (timestamp) {
      const ts = new Date().toISOString()
      return `${prefix} [${ts}] ${message}`
    }
    return `${prefix} ${message}`
  }

  /**
   * Format multiple arguments (handles objects, errors, etc.)
   *
   * @param {Array} args - Arguments to format
   * @returns {Array} Formatted arguments for console methods
   */
  function formatArgs(args) {
    if (args.length === 0) return [formatMessage('')]

    // First arg is the message string
    const [message, ...rest] = args
    return [formatMessage(message), ...rest]
  }

  return {
    /**
     * Log an informational message
     *
     * @param {...*} args - Message and optional additional data
     */
    log(...args) {
      console.log(...formatArgs(args))
    },

    /**
     * Log a warning message
     *
     * @param {...*} args - Message and optional additional data
     */
    warn(...args) {
      console.warn(...formatArgs(args))
    },

    /**
     * Log an error message
     *
     * @param {...*} args - Message and optional additional data
     */
    error(...args) {
      console.error(...formatArgs(args))
    }
  }
}

module.exports = createLogger
