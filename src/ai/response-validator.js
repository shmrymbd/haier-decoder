const AILogger = require('./ai-logger');

/**
 * AI Response Validator
 * Validates AI responses for accuracy, safety, and compliance
 */
class ResponseValidator {
  constructor(options = {}) {
    this.options = {
      maxResponseLength: options.maxResponseLength || 2000,
      minConfidence: options.minConfidence || 0.3,
      enableContentFilter: options.enableContentFilter !== false,
      enableProtocolValidation: options.enableProtocolValidation !== false,
      ...options
    };
    
    this.logger = new AILogger();
    this.contentFilters = this.initializeContentFilters();
    this.protocolValidators = this.initializeProtocolValidators();
  }

  /**
   * Initialize content filters for safety
   */
  initializeContentFilters() {
    return {
      // Block potentially harmful content
      blockedPatterns: [
        /malicious/i,
        /exploit/i,
        /hack/i,
        /crack/i,
        /bypass.*security/i,
        /unauthorized.*access/i
      ],
      
      // Block sensitive data patterns
      sensitivePatterns: [
        /password\s*[:=]\s*\w+/i,
        /api[_-]?key\s*[:=]\s*\w+/i,
        /secret\s*[:=]\s*\w+/i,
        /token\s*[:=]\s*\w+/i,
        /\b\d{15,19}\b/, // Credit card numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email addresses
      ]
    };
  }

  /**
   * Initialize protocol-specific validators
   */
  initializeProtocolValidators() {
    return {
      // Validate hex command format
      hexCommand: (text) => {
        const hexPattern = /0x[0-9A-Fa-f]{2,8}/g;
        const matches = text.match(hexPattern);
        if (!matches) return { valid: true };
        
        return {
          valid: matches.every(hex => {
            const value = parseInt(hex, 16);
            return value >= 0 && value <= 0xFFFFFFFF;
          }),
          issues: matches.filter(hex => {
            const value = parseInt(hex, 16);
            return value < 0 || value > 0xFFFFFFFF;
          })
        };
      },
      
      // Validate CRC format
      crcFormat: (text) => {
        const crcPattern = /CRC[:\s]*([0-9A-Fa-f]{2,8})/gi;
        const matches = [...text.matchAll(crcPattern)];
        if (!matches.length) return { valid: true };
        
        return {
          valid: matches.every(match => {
            const crc = match[1];
            return /^[0-9A-Fa-f]{2,8}$/.test(crc);
          }),
          issues: matches.filter(match => {
            const crc = match[1];
            return !/^[0-9A-Fa-f]{2,8}$/.test(crc);
          })
        };
      }
    };
  }

  /**
   * Validate AI response
   * @param {Object} response - AI response object
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateResponse(response, context = {}) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: response.confidence || 0,
      sanitizedResponse: response.responseText || response.response || ''
    };

    try {
      // Basic validation
      await this.validateBasic(response, validationResult);
      
      // Content filtering
      await this.validateContent(response, validationResult);
      
      // Protocol-specific validation
      if (this.options.enableProtocolValidation) {
        await this.validateProtocol(response, validationResult, context);
      }
      
      // Confidence validation
      await this.validateConfidence(response, validationResult);
      
      // Length validation
      await this.validateLength(response, validationResult);
      
      // Final validation status
      validationResult.isValid = validationResult.errors.length === 0;
      
      this.logger.logValidation(validationResult, context);
      
      return validationResult;
      
    } catch (error) {
      this.logger.logError('Response validation failed', error, context);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        confidence: 0,
        sanitizedResponse: 'Validation error occurred'
      };
    }
  }

  /**
   * Validate basic response structure
   */
  async validateBasic(response, result) {
    if (!response) {
      result.errors.push('Response object is null or undefined');
      return;
    }

    if (!response.responseText && !response.response) {
      result.errors.push('Response text is missing');
    }

    if (typeof result.sanitizedResponse !== 'string') {
      result.errors.push('Response text must be a string');
    }
  }

  /**
   * Validate content for safety and compliance
   */
  async validateContent(response, result) {
    if (!this.options.enableContentFilter) return;

    const text = result.sanitizedResponse.toLowerCase();
    
    // Check for blocked patterns
    for (const pattern of this.contentFilters.blockedPatterns) {
      if (pattern.test(text)) {
        result.errors.push(`Content contains blocked pattern: ${pattern.source}`);
        result.sanitizedResponse = this.sanitizeContent(result.sanitizedResponse, pattern);
      }
    }
    
    // Check for sensitive data
    for (const pattern of this.contentFilters.sensitivePatterns) {
      if (pattern.test(text)) {
        result.warnings.push(`Content may contain sensitive data: ${pattern.source}`);
        result.sanitizedResponse = this.sanitizeSensitiveData(result.sanitizedResponse, pattern);
      }
    }
  }

  /**
   * Validate protocol-specific content
   */
  async validateProtocol(response, result, context) {
    const text = result.sanitizedResponse;
    
    // Validate hex commands
    const hexValidation = this.protocolValidators.hexCommand(text);
    if (!hexValidation.valid) {
      result.warnings.push(`Invalid hex commands found: ${hexValidation.issues.join(', ')}`);
    }
    
    // Validate CRC format
    const crcValidation = this.protocolValidators.crcFormat(text);
    if (!crcValidation.valid) {
      result.warnings.push(`Invalid CRC format found: ${crcValidation.issues.join(', ')}`);
    }
    
    // Validate against protocol knowledge if available
    if (context.protocolKnowledge) {
      await this.validateAgainstProtocolKnowledge(text, result, context.protocolKnowledge);
    }
  }

  /**
   * Validate against protocol knowledge base
   */
  async validateAgainstProtocolKnowledge(text, result, protocolKnowledge) {
    const hexCommands = text.match(/0x[0-9A-Fa-f]{2,8}/g) || [];
    
    // Handle both direct commands array and nested knowledge structure
    const commands = protocolKnowledge.commands || 
                    (protocolKnowledge.knowledge && protocolKnowledge.knowledge.commands) || 
                    [];
    
    for (const hexCommand of hexCommands) {
      const command = commands.find(cmd => 
        cmd.commandHex.toLowerCase() === hexCommand.toLowerCase()
      );
      
      if (!command) {
        result.warnings.push(`Unknown command referenced: ${hexCommand}`);
      }
    }
  }

  /**
   * Validate confidence level
   */
  async validateConfidence(response, result) {
    const confidence = response.confidence || 0;
    
    if (confidence < this.options.minConfidence) {
      result.warnings.push(`Low confidence response: ${confidence} (minimum: ${this.options.minConfidence})`);
    }
    
    if (confidence > 1) {
      result.errors.push(`Invalid confidence value: ${confidence} (must be 0-1)`);
    }
  }

  /**
   * Validate response length
   */
  async validateLength(response, result) {
    const length = result.sanitizedResponse.length;
    
    if (length > this.options.maxResponseLength) {
      result.warnings.push(`Response too long: ${length} characters (maximum: ${this.options.maxResponseLength})`);
      result.sanitizedResponse = result.sanitizedResponse.substring(0, this.options.maxResponseLength) + '...';
    }
    
    if (length === 0) {
      result.errors.push('Response is empty');
    }
  }

  /**
   * Sanitize content by removing blocked patterns
   */
  sanitizeContent(text, pattern) {
    return text.replace(pattern, '[CONTENT FILTERED]');
  }

  /**
   * Sanitize sensitive data
   */
  sanitizeSensitiveData(text, pattern) {
    return text.replace(pattern, '[SENSITIVE DATA REMOVED]');
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      contentFilters: this.contentFilters.blockedPatterns.length + this.contentFilters.sensitivePatterns.length,
      protocolValidators: Object.keys(this.protocolValidators).length,
      maxResponseLength: this.options.maxResponseLength,
      minConfidence: this.options.minConfidence
    };
  }
}

module.exports = ResponseValidator;