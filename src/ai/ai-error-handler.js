/**
 * AI Error Handler for Haier Protocol Decoder AI Agent
 * 
 * Provides centralized error handling and recovery strategies
 * for AI operations.
 */

class AIErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableFallback: options.enableFallback !== false,
      ...options
    };

    this.errorCounts = new Map();
    this.circuitBreaker = new Map();
  }

  /**
   * Handle AI operation errors with retry logic
   */
  async handleError(operation, error, context = {}) {
    const errorType = this.classifyError(error);
    const operationKey = `${operation}_${errorType}`;

    // Track error counts
    this.trackError(operationKey);

    // Check circuit breaker
    if (this.isCircuitOpen(operationKey)) {
      throw new Error(`Circuit breaker open for ${operation}: ${error.message}`);
    }

    // Determine if we should retry
    if (this.shouldRetry(errorType, operationKey)) {
      return this.retryOperation(operation, error, context);
    }

    // Handle non-retryable errors
    return this.handleNonRetryableError(operation, error, context);
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    if (error.code === 'insufficient_quota') {
      return 'QUOTA_EXCEEDED';
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return 'RATE_LIMIT';
    }
    
    if (error.code === 'invalid_api_key') {
      return 'AUTH_ERROR';
    }
    
    if (error.code === 'context_length_exceeded') {
      return 'CONTEXT_TOO_LONG';
    }
    
    if (error.code === 'network_error' || error.message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    
    if (error.code === 'timeout') {
      return 'TIMEOUT';
    }
    
    if (error.message.includes('sanitization')) {
      return 'SANITIZATION_ERROR';
    }
    
    if (error.message.includes('session')) {
      return 'SESSION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Track error occurrence
   */
  trackError(operationKey) {
    const count = this.errorCounts.get(operationKey) || 0;
    this.errorCounts.set(operationKey, count + 1);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(operationKey) {
    const errorCount = this.errorCounts.get(operationKey) || 0;
    const threshold = this.getCircuitBreakerThreshold(operationKey);
    
    if (errorCount >= threshold) {
      this.circuitBreaker.set(operationKey, Date.now());
      return true;
    }
    
    return false;
  }

  /**
   * Get circuit breaker threshold for operation
   */
  getCircuitBreakerThreshold(operationKey) {
    if (operationKey.includes('QUOTA_EXCEEDED')) {
      return 1; // No retries for quota exceeded
    }
    
    if (operationKey.includes('AUTH_ERROR')) {
      return 1; // No retries for auth errors
    }
    
    return 5; // Default threshold
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(errorType, operationKey) {
    const nonRetryableErrors = ['QUOTA_EXCEEDED', 'AUTH_ERROR', 'CONTEXT_TOO_LONG'];
    
    if (nonRetryableErrors.includes(errorType)) {
      return false;
    }
    
    const errorCount = this.errorCounts.get(operationKey) || 0;
    return errorCount < this.options.maxRetries;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(operation, error, context) {
    const retryCount = this.errorCounts.get(`${operation}_${this.classifyError(error)}`) || 0;
    const delay = this.options.retryDelay * Math.pow(2, retryCount - 1);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    throw new Error(`Retry ${retryCount}/${this.options.maxRetries} for ${operation}: ${error.message}`);
  }

  /**
   * Handle non-retryable errors
   */
  handleNonRetryableError(operation, error, context) {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'QUOTA_EXCEEDED':
        return this.createFallbackResponse('API quota exceeded. Please check your OpenAI billing.', 'error');
      
      case 'AUTH_ERROR':
        return this.createFallbackResponse('Authentication failed. Please check your API key.', 'error');
      
      case 'CONTEXT_TOO_LONG':
        return this.createFallbackResponse('Request too long. Please shorten your input.', 'error');
      
      case 'RATE_LIMIT':
        return this.createFallbackResponse('Rate limit exceeded. Please try again later.', 'error');
      
      case 'NETWORK_ERROR':
        return this.createFallbackResponse('Network error. Please check your connection.', 'error');
      
      case 'TIMEOUT':
        return this.createFallbackResponse('Request timed out. Please try again.', 'error');
      
      default:
        return this.createFallbackResponse('An unexpected error occurred. Please try again.', 'error');
    }
  }

  /**
   * Create fallback response
   */
  createFallbackResponse(message, type = 'error') {
    if (!this.options.enableFallback) {
      throw new Error('Fallback responses are disabled');
    }
    
    return {
      responseText: message,
      responseType: type,
      confidence: 0.1,
      isFallback: true,
      timestamp: new Date()
    };
  }

  /**
   * Reset error counts
   */
  resetErrorCounts() {
    this.errorCounts.clear();
    this.circuitBreaker.clear();
  }

  /**
   * Reset circuit breaker for operation
   */
  resetCircuitBreaker(operationKey) {
    this.circuitBreaker.delete(operationKey);
    this.errorCounts.delete(operationKey);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {};
    
    for (const [operationKey, count] of this.errorCounts) {
      const [operation, errorType] = operationKey.split('_');
      if (!stats[operation]) {
        stats[operation] = {};
      }
      stats[operation][errorType] = count;
    }
    
    return stats;
  }

  /**
   * Check if operation is healthy
   */
  isOperationHealthy(operation) {
    const errorCount = Array.from(this.errorCounts.entries())
      .filter(([key]) => key.startsWith(operation))
      .reduce((sum, [, count]) => sum + count, 0);
    
    return errorCount < 10; // Threshold for healthy operation
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    const status = {};
    
    for (const [operationKey, timestamp] of this.circuitBreaker) {
      const [operation, errorType] = operationKey.split('_');
      if (!status[operation]) {
        status[operation] = {};
      }
      status[operation][errorType] = {
        open: true,
        since: new Date(timestamp)
      };
    }
    
    return status;
  }
}

module.exports = AIErrorHandler;