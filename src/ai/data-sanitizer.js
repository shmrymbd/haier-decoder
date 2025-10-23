/**
 * Data Sanitization Framework for Protocol Data
 * 
 * Handles sanitization of sensitive protocol data before sending to AI services,
 * ensuring no sensitive information (IMEI, serial numbers, etc.) is exposed.
 */

class DataSanitizer {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      replaceWith: options.replaceWith || '[REDACTED]',
      preserveStructure: options.preserveStructure !== false,
      ...options
    };

    // Patterns for sensitive data detection
    this.sensitivePatterns = [
      // IMEI patterns (15 digits)
      { pattern: /\b\d{15}\b/g, type: 'IMEI' },
      // Serial number patterns (various formats)
      { pattern: /\b[A-Z0-9]{8,20}\b/g, type: 'SERIAL' },
      // MAC address patterns
      { pattern: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g, type: 'MAC' },
      // IP address patterns
      { pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, type: 'IP' },
      // Device ID patterns
      { pattern: /\bDEVICE[_-]?ID[:\s]*([A-Z0-9]+)/gi, type: 'DEVICE_ID' },
      // Authentication tokens
      { pattern: /\bAUTH[_-]?TOKEN[:\s]*([A-Za-z0-9+/=]+)/gi, type: 'AUTH_TOKEN' }
    ];

    // Protocol-specific sensitive fields
    this.protocolSensitiveFields = [
      'imei',
      'serial',
      'deviceId',
      'macAddress',
      'ipAddress',
      'authToken',
      'sessionId',
      'userId'
    ];
  }

  /**
   * Sanitize protocol data for AI processing
   */
  sanitize(data, context = {}) {
    if (!this.options.enabled) {
      return data;
    }

    try {
      if (typeof data === 'string') {
        return this.sanitizeString(data, context);
      } else if (Array.isArray(data)) {
        return this.sanitizeArray(data, context);
      } else if (typeof data === 'object' && data !== null) {
        return this.sanitizeObject(data, context);
      }
      
      return data;
    } catch (error) {
      console.warn(`Data sanitization failed: ${error.message}`);
      return this.options.preserveStructure ? '[SANITIZATION_ERROR]' : data;
    }
  }

  /**
   * Sanitize string data
   */
  sanitizeString(str, context = {}) {
    let sanitized = str;

    // Apply pattern-based sanitization
    for (const { pattern, type } of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        return this.createReplacement(match, type, context);
      });
    }

    return sanitized;
  }

  /**
   * Sanitize array data
   */
  sanitizeArray(arr, context = {}) {
    return arr.map((item, index) => {
      const itemContext = { ...context, arrayIndex: index };
      return this.sanitize(item, itemContext);
    });
  }

  /**
   * Sanitize object data
   */
  sanitizeObject(obj, context = {}) {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldContext = { ...context, fieldName: key };
      
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.createReplacement(value, 'FIELD', fieldContext);
      } else {
        sanitized[key] = this.sanitize(value, fieldContext);
      }
    }

    return sanitized;
  }

  /**
   * Check if a field name indicates sensitive data
   */
  isSensitiveField(fieldName) {
    const lowerField = fieldName.toLowerCase();
    return this.protocolSensitiveFields.some(sensitiveField => 
      lowerField.includes(sensitiveField) || sensitiveField.includes(lowerField)
    );
  }

  /**
   * Create replacement for sensitive data
   */
  createReplacement(original, type, context = {}) {
    if (this.options.preserveStructure) {
      // Preserve the structure but replace content
      if (typeof original === 'string') {
        return original.replace(/[A-Za-z0-9]/g, 'X');
      } else if (typeof original === 'number') {
        return 0;
      } else {
        return this.options.replaceWith;
      }
    } else {
      return this.options.replaceWith;
    }
  }

  /**
   * Sanitize protocol packet for AI analysis
   */
  sanitizePacket(packet, options = {}) {
    const sanitizeOptions = {
      preserveHexStructure: options.preserveHexStructure !== false,
      preservePacketLength: options.preservePacketLength !== false,
      ...options
    };

    if (typeof packet === 'string') {
      return this.sanitizeHexPacket(packet, sanitizeOptions);
    } else if (Array.isArray(packet)) {
      return packet.map(byte => this.sanitizeHexByte(byte, sanitizeOptions));
    }

    return packet;
  }

  /**
   * Sanitize hex packet string
   */
  sanitizeHexPacket(hexString, options = {}) {
    // Split into bytes
    const bytes = hexString.split(/\s+/);
    const sanitizedBytes = bytes.map(byte => this.sanitizeHexByte(byte, options));
    
    return sanitizedBytes.join(' ');
  }

  /**
   * Sanitize individual hex byte
   */
  sanitizeHexByte(byte, options = {}) {
    // Check if this byte might contain sensitive data
    if (this.isPotentiallySensitive(byte)) {
      return options.preserveHexStructure ? 'XX' : this.options.replaceWith;
    }
    
    return byte;
  }

  /**
   * Check if a hex byte might contain sensitive data
   */
  isPotentiallySensitive(byte) {
    // Simple heuristic: check for patterns that might indicate sensitive data
    const hexValue = parseInt(byte, 16);
    
    // Check for ASCII printable characters that might be text
    if (hexValue >= 32 && hexValue <= 126) {
      const char = String.fromCharCode(hexValue);
      return /[A-Za-z0-9@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(char);
    }
    
    return false;
  }

  /**
   * Create sanitization report
   */
  createSanitizationReport(originalData, sanitizedData) {
    const report = {
      originalSize: this.getDataSize(originalData),
      sanitizedSize: this.getDataSize(sanitizedData),
      sanitizationApplied: originalData !== sanitizedData,
      timestamp: new Date().toISOString()
    };

    return report;
  }

  /**
   * Get approximate data size
   */
  getDataSize(data) {
    if (typeof data === 'string') {
      return data.length;
    } else if (Array.isArray(data)) {
      return data.length;
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    
    return 1;
  }

  /**
   * Validate sanitized data
   */
  validateSanitizedData(data) {
    const issues = [];

    // Check for remaining sensitive patterns
    const dataString = JSON.stringify(data);
    for (const { pattern, type } of this.sensitivePatterns) {
      const matches = dataString.match(pattern);
      if (matches) {
        issues.push({
          type: 'SENSITIVE_DATA_DETECTED',
          pattern: type,
          matches: matches.length
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = DataSanitizer;