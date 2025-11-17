/**
 * Error Handler Service
 *
 * Provides comprehensive error handling for the Phase 8 pipeline.
 * Classifies errors, determines retry strategies, and logs failures.
 *
 * Error categories:
 * - API errors (rate limiting, auth, service outages)
 * - Content filter rejections
 * - Processing errors (ffmpeg, sox failures)
 * - S3 errors (upload/download failures)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Error handling strategies
 */
const ERROR_STRATEGIES = {
  RETRY: 'retry',       // Retry with exponential backoff
  SKIP: 'skip',         // Skip and continue with next sample
  FALLBACK: 'fallback', // Use alternative method
  ABORT: 'abort'        // Abort entire operation
};

/**
 * Error classification patterns
 */
const ERROR_PATTERNS = {
  // Transient network/API errors - retry
  'ECONNRESET': ERROR_STRATEGIES.RETRY,
  'ETIMEDOUT': ERROR_STRATEGIES.RETRY,
  'ENOTFOUND': ERROR_STRATEGIES.RETRY,
  'rate limit': ERROR_STRATEGIES.RETRY,
  'too many requests': ERROR_STRATEGIES.RETRY,
  '429': ERROR_STRATEGIES.RETRY,
  '503': ERROR_STRATEGIES.RETRY,
  '502': ERROR_STRATEGIES.RETRY,
  '504': ERROR_STRATEGIES.RETRY,
  'service unavailable': ERROR_STRATEGIES.RETRY,
  'connection timeout': ERROR_STRATEGIES.RETRY,

  // Content policy/filter issues - skip
  'content policy': ERROR_STRATEGIES.SKIP,
  'content filter': ERROR_STRATEGIES.SKIP,
  'inappropriate': ERROR_STRATEGIES.SKIP,
  'unsupported language': ERROR_STRATEGIES.SKIP,
  'unsupported character': ERROR_STRATEGIES.SKIP,
  'invalid text': ERROR_STRATEGIES.SKIP,

  // Authentication/authorization - abort
  '401': ERROR_STRATEGIES.ABORT,
  '403': ERROR_STRATEGIES.ABORT,
  'unauthorized': ERROR_STRATEGIES.ABORT,
  'forbidden': ERROR_STRATEGIES.ABORT,
  'invalid key': ERROR_STRATEGIES.ABORT,
  'invalid token': ERROR_STRATEGIES.ABORT,
  'authentication failed': ERROR_STRATEGIES.ABORT,

  // Processing errors - may have fallback options
  'ffmpeg': ERROR_STRATEGIES.FALLBACK,
  'sox': ERROR_STRATEGIES.FALLBACK,
  'audio processing failed': ERROR_STRATEGIES.FALLBACK
};

/**
 * Sleep utility for delays
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Classify error and determine handling strategy
 *
 * @param {Error} error - The error object
 * @param {Object} context - Additional context about the operation
 * @returns {Object} Classification with strategy and metadata
 */
function classifyError(error, context = {}) {
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || error.status || error.statusCode;

  // Check against known patterns
  for (const [pattern, strategy] of Object.entries(ERROR_PATTERNS)) {
    if (errorMessage.includes(pattern.toLowerCase()) ||
        errorCode?.toString() === pattern) {
      return {
        strategy,
        pattern,
        retryable: strategy === ERROR_STRATEGIES.RETRY,
        skippable: strategy === ERROR_STRATEGIES.SKIP,
        abortable: strategy === ERROR_STRATEGIES.ABORT,
        errorType: categorizeError(pattern)
      };
    }
  }

  // Unknown error - default to retry once
  return {
    strategy: ERROR_STRATEGIES.RETRY,
    pattern: 'unknown',
    retryable: true,
    skippable: false,
    abortable: false,
    errorType: 'unknown'
  };
}

/**
 * Categorize error by type
 *
 * @param {string} pattern - Error pattern matched
 * @returns {string} Error category
 */
function categorizeError(pattern) {
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '429', '503', '502', '504'].includes(pattern)) {
    return 'network';
  }
  if (['content policy', 'content filter', 'inappropriate'].includes(pattern)) {
    return 'content_filter';
  }
  if (['401', '403', 'unauthorized', 'forbidden', 'invalid key'].includes(pattern)) {
    return 'authentication';
  }
  if (['ffmpeg', 'sox', 'audio processing failed'].includes(pattern)) {
    return 'processing';
  }
  return 'unknown';
}

/**
 * Execute operation with comprehensive error handling
 *
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Error handling options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.backoffMs - Initial backoff in milliseconds (default: 1000)
 * @param {Object} options.context - Context for error logging
 * @param {Function} options.onError - Custom error handler callback
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise<any>} Result of operation or error handler
 */
async function executeWithErrorHandling(operation, options = {}) {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    context = {},
    onError = null,
    onRetry = null
  } = options;

  let lastError;
  let lastClassification;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();

    } catch (error) {
      lastError = error;
      lastClassification = classifyError(error, context);

      console.warn(`\nAttempt ${attempt}/${maxRetries} failed:`);
      console.warn(`  Error: ${error.message}`);
      console.warn(`  Strategy: ${lastClassification.strategy}`);
      console.warn(`  Type: ${lastClassification.errorType}`);

      // Log error
      logError(error, {
        ...context,
        attempt,
        maxRetries,
        classification: lastClassification
      });

      // ABORT strategy - throw immediately
      if (lastClassification.strategy === ERROR_STRATEGIES.ABORT) {
        console.error(`\n❌ ABORTING: ${error.message}`);
        throw new Error(`Aborting operation: ${error.message}`);
      }

      // SKIP strategy - return skip result
      if (lastClassification.strategy === ERROR_STRATEGIES.SKIP) {
        console.warn(`\n⚠️  SKIPPING: ${error.message}`);
        return {
          success: false,
          skipped: true,
          reason: error.message,
          errorType: lastClassification.errorType
        };
      }

      // RETRY strategy - retry if attempts remaining
      if (attempt < maxRetries && lastClassification.retryable) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        console.log(`  Retrying in ${delay}ms...`);

        if (onRetry) {
          await onRetry(error, attempt, delay);
        }

        await sleep(delay);
        continue;
      }

      // FALLBACK strategy or exhausted retries
      if (lastClassification.strategy === ERROR_STRATEGIES.FALLBACK || attempt >= maxRetries) {
        console.warn(`\n⚠️  Fallback/max retries reached`);

        if (onError) {
          return await onError(error, context, lastClassification);
        }
      }

      // If we get here and no custom handler, throw
      throw error;
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Execute batch of operations with error handling
 *
 * @param {Array<Object>} items - Array of items to process
 * @param {Function} operation - Async operation function(item, index)
 * @param {Object} options - Error handling options (same as executeWithErrorHandling)
 * @returns {Promise<Array>} Array of results
 */
async function executeBatch(items, operation, options = {}) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const result = await executeWithErrorHandling(
      () => operation(item, i),
      {
        ...options,
        context: {
          ...options.context,
          itemIndex: i,
          totalItems: items.length,
          item
        }
      }
    );

    results.push(result);
  }

  return results;
}

/**
 * Log error to file for analysis
 *
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 */
function logError(error, context = {}) {
  const logDir = path.join(__dirname, '../logs');
  const logPath = path.join(logDir, 'phase8-errors.jsonl');

  // Ensure log directory exists
  fs.ensureDirSync(logDir);

  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      status: error.status || error.statusCode,
      stack: error.stack
    },
    context
  };

  // Append as JSON line
  fs.appendFileSync(logPath, JSON.stringify(errorLog) + '\n');
}

/**
 * Generate error summary report from logs
 *
 * @param {string} logPath - Path to error log file
 * @returns {Object} Error summary with statistics
 */
function generateErrorSummary(logPath) {
  if (!fs.existsSync(logPath)) {
    return {
      totalErrors: 0,
      byType: {},
      byStrategy: {},
      recentErrors: []
    };
  }

  const logContent = fs.readFileSync(logPath, 'utf-8');
  const lines = logContent.trim().split('\n').filter(l => l.length > 0);

  const errors = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(e => e !== null);

  const byType = {};
  const byStrategy = {};

  for (const errorLog of errors) {
    const type = errorLog.context?.classification?.errorType || 'unknown';
    const strategy = errorLog.context?.classification?.strategy || 'unknown';

    byType[type] = (byType[type] || 0) + 1;
    byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
  }

  return {
    totalErrors: errors.length,
    byType,
    byStrategy,
    recentErrors: errors.slice(-10) // Last 10 errors
  };
}

/**
 * Clear error logs (useful for fresh runs)
 *
 * @param {string} logPath - Path to error log file
 */
function clearErrorLogs(logPath) {
  if (fs.existsSync(logPath)) {
    fs.removeSync(logPath);
    console.log(`✓ Error logs cleared: ${logPath}`);
  }
}

/**
 * Format error for display
 *
 * @param {Error} error - The error object
 * @param {Object} context - Error context
 * @returns {string} Formatted error message
 */
function formatError(error, context = {}) {
  const classification = classifyError(error, context);

  const lines = [];
  lines.push('ERROR DETAILS:');
  lines.push(`  Message: ${error.message}`);
  lines.push(`  Type: ${classification.errorType}`);
  lines.push(`  Strategy: ${classification.strategy}`);

  if (context.sample) {
    lines.push(`  Sample: "${context.sample.text}"`);
    lines.push(`  Role: ${context.sample.role}`);
  }

  if (context.voice) {
    lines.push(`  Voice: ${context.voice}`);
  }

  return lines.join('\n');
}

module.exports = {
  ERROR_STRATEGIES,
  classifyError,
  executeWithErrorHandling,
  executeBatch,
  logError,
  generateErrorSummary,
  clearErrorLogs,
  formatError,
  sleep
};
