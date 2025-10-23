/**
 * AI Logger for Haier Protocol Decoder AI Agent
 * 
 * Provides structured logging for AI operations with different log levels
 * and sensitive data filtering.
 */

const winston = require('winston');
const path = require('path');

class AILogger {
  constructor(options = {}) {
    this.options = {
      level: options.level || 'info',
      logDir: options.logDir || path.join(process.cwd(), 'logs'),
      maxFiles: options.maxFiles || 5,
      maxSize: options.maxSize || '10m',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      sanitizeData: options.sanitizeData !== false,
      ...options
    };

    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   */
  createLogger() {
    const transports = [];

    // Console transport
    if (this.options.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.options.level,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}] ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // File transport
    if (this.options.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: path.join(this.options.logDir, 'ai-agent.log'),
          level: this.options.level,
          maxFiles: this.options.maxFiles,
          maxsize: this.options.maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Error file transport
      transports.push(
        new winston.transports.File({
          filename: path.join(this.options.logDir, 'ai-agent-error.log'),
          level: 'error',
          maxFiles: this.options.maxFiles,
          maxsize: this.options.maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.options.level,
      transports,
      exitOnError: false
    });
  }

  /**
   * Sanitize sensitive data from log messages
   */
  sanitizeData(data) {
    if (!this.options.sanitizeData || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['apiKey', 'token', 'password', 'secret', 'imei', 'serial'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log AI agent initialization
   */
  logInitialization(config) {
    this.logger.info('AI Agent initialized', {
      event: 'initialization',
      config: this.sanitizeData(config)
    });
  }

  /**
   * Log query processing
   */
  logQuery(sessionId, query, metadata = {}) {
    this.logger.info('AI query received', {
      event: 'query',
      sessionId,
      query: query.substring(0, 100), // Truncate long queries
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log AI response
   */
  logResponse(sessionId, response, metadata = {}) {
    this.logger.info('AI response generated', {
      event: 'response',
      sessionId,
      responseType: response.responseType,
      confidence: response.confidence,
      responseLength: response.responseText?.length || 0,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log AI error
   */
  logError(sessionId, error, context = {}) {
    this.logger.error('AI operation failed', {
      event: 'error',
      sessionId,
      error: error.message,
      stack: error.stack,
      context: this.sanitizeData(context)
    });
  }

  /**
   * Log session events
   */
  logSession(event, sessionId, metadata = {}) {
    this.logger.info(`Session ${event}`, {
      event: `session_${event}`,
      sessionId,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log protocol analysis
   */
  logAnalysis(sessionId, analysisType, data, metadata = {}) {
    this.logger.info('Protocol analysis performed', {
      event: 'analysis',
      sessionId,
      analysisType,
      dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log command suggestions
   */
  logSuggestions(sessionId, suggestions, context = {}) {
    this.logger.info('Command suggestions generated', {
      event: 'suggestions',
      sessionId,
      suggestionCount: suggestions.length,
      context: this.sanitizeData(context)
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, metadata = {}) {
    this.logger.info('Performance metric', {
      event: 'performance',
      operation,
      duration,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log API usage
   */
  logAPIUsage(apiCall, tokens, cost, metadata = {}) {
    this.logger.info('API usage', {
      event: 'api_usage',
      apiCall,
      tokens,
      cost,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log data sanitization
   */
  logSanitization(originalSize, sanitizedSize, patternsFound = []) {
    this.logger.info('Data sanitized', {
      event: 'sanitization',
      originalSize,
      sanitizedSize,
      patternsFound: patternsFound.length,
      reductionPercent: ((originalSize - sanitizedSize) / originalSize * 100).toFixed(2)
    });
  }

  /**
   * Log configuration changes
   */
  logConfigChange(configKey, oldValue, newValue) {
    this.logger.info('Configuration changed', {
      event: 'config_change',
      configKey,
      oldValue: this.sanitizeData(oldValue),
      newValue: this.sanitizeData(newValue)
    });
  }

  /**
   * Log cleanup operations
   */
  logCleanup(operation, itemsProcessed, metadata = {}) {
    this.logger.info('Cleanup operation', {
      event: 'cleanup',
      operation,
      itemsProcessed,
      metadata: this.sanitizeData(metadata)
    });
  }

  /**
   * Log validation result
   */
  logValidation(validationResult, context = {}) {
    const level = validationResult.isValid ? 'info' : 'warn';
    this.logger[level]('AI response validation', {
      event: 'validation',
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      confidence: validationResult.confidence,
      context: this.sanitizeData(context)
    });
  }

  /**
   * Log AI agent operation
   */
  logOperation(operation, details, context = {}) {
    this.logger.info(`AI Agent ${operation}`, {
      event: 'operation',
      operation,
      details,
      context: this.sanitizeData(context)
    });
  }

  /**
   * Get logger instance for direct use
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.logger.level = level;
  }

  /**
   * Create child logger with additional context
   */
  child(defaultMeta) {
    return this.logger.child(defaultMeta);
  }
}

module.exports = AILogger;