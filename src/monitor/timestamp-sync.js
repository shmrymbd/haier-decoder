/**
 * Timestamp Synchronization Utility
 * 
 * Synchronizes timestamps between two USB dongles to ensure accurate
 * timing correlation for packet pairing and flow analysis.
 */

class TimestampSync {
  constructor() {
    this.txBaseTime = null;
    this.rxBaseTime = null;
    this.offset = 0;
    this.isSynchronized = false;
    this.syncWindow = 1000; // 1 second window for initial sync
    this.maxOffset = 5000; // 5 second maximum offset
  }

  /**
   * Synchronize timestamps between TX and RX ports
   * @param {number} timestamp - Current timestamp
   * @param {string} direction - 'TX' or 'RX'
   * @returns {number} Synchronized timestamp
   */
  syncTimestamp(timestamp, direction) {
    // Record first packet from each port for synchronization
    if (!this.isSynchronized) {
      if (direction === 'TX' && this.txBaseTime === null) {
        this.txBaseTime = timestamp;
        console.log(`📡 TX base time: ${new Date(timestamp).toISOString()}`);
      } else if (direction === 'RX' && this.rxBaseTime === null) {
        this.rxBaseTime = timestamp;
        console.log(`📡 RX base time: ${new Date(timestamp).toISOString()}`);
      }
      
      // Calculate offset once we have both base times
      if (this.txBaseTime !== null && this.rxBaseTime !== null) {
        this.calculateOffset();
      }
    }
    
    // Apply offset correction
    return this.getNormalizedTime(timestamp, direction);
  }

  /**
   * Calculate offset between TX and RX timestamps
   */
  calculateOffset() {
    const timeDiff = Math.abs(this.txBaseTime - this.rxBaseTime);
    
    if (timeDiff > this.maxOffset) {
      console.warn(`⚠️ Large timestamp difference detected: ${timeDiff}ms`);
      console.warn('   This may indicate clock drift or system issues');
    }
    
    // Calculate offset (positive means RX is ahead of TX)
    this.offset = this.rxBaseTime - this.txBaseTime;
    
    console.log(`🔄 Timestamp offset calculated: ${this.offset}ms`);
    console.log(`   TX base: ${new Date(this.txBaseTime).toISOString()}`);
    console.log(`   RX base: ${new Date(this.rxBaseTime).toISOString()}`);
    
    this.isSynchronized = true;
  }

  /**
   * Get normalized timestamp with offset correction
   * @param {number} timestamp - Original timestamp
   * @param {string} direction - 'TX' or 'RX'
   * @returns {number} Normalized timestamp
   */
  getNormalizedTime(timestamp, direction) {
    if (!this.isSynchronized) {
      return timestamp;
    }
    
    // Apply offset correction
    if (direction === 'TX') {
      return timestamp + this.offset;
    } else {
      return timestamp;
    }
  }

  /**
   * Check if timestamps are synchronized
   * @returns {boolean} True if synchronized
   */
  isTimestampSynchronized() {
    return this.isSynchronized;
  }

  /**
   * Get synchronization statistics
   * @returns {object} Sync statistics
   */
  getSyncStats() {
    return {
      isSynchronized: this.isSynchronized,
      offset: this.offset,
      txBaseTime: this.txBaseTime,
      rxBaseTime: this.rxBaseTime,
      timeDifference: this.txBaseTime && this.rxBaseTime ? 
        Math.abs(this.txBaseTime - this.rxBaseTime) : null
    };
  }

  /**
   * Reset synchronization (for new sessions)
   */
  reset() {
    this.txBaseTime = null;
    this.rxBaseTime = null;
    this.offset = 0;
    this.isSynchronized = false;
  }

  /**
   * Validate timestamp synchronization quality
   * @returns {object} Validation results
   */
  validateSync() {
    if (!this.isSynchronized) {
      return {
        valid: false,
        reason: 'Not synchronized yet'
      };
    }

    const timeDiff = Math.abs(this.txBaseTime - this.rxBaseTime);
    
    return {
      valid: timeDiff <= this.maxOffset,
      timeDifference: timeDiff,
      offset: this.offset,
      quality: timeDiff <= 100 ? 'Excellent' : 
               timeDiff <= 500 ? 'Good' : 
               timeDiff <= 1000 ? 'Fair' : 'Poor',
      recommendation: timeDiff > 1000 ? 
        'Consider checking system clock synchronization' : 
        'Synchronization quality is acceptable'
    };
  }

  /**
   * Get recommended timeout for packet pairing
   * Based on observed timestamp accuracy
   * @returns {number} Recommended timeout in milliseconds
   */
  getRecommendedTimeout() {
    if (!this.isSynchronized) {
      return 5000; // Default timeout
    }

    const timeDiff = Math.abs(this.txBaseTime - this.rxBaseTime);
    
    // Base timeout of 2 seconds, plus buffer based on sync quality
    const baseTimeout = 2000;
    const buffer = Math.max(timeDiff * 2, 500);
    
    return Math.min(baseTimeout + buffer, 10000); // Cap at 10 seconds
  }

  /**
   * Detect potential clock drift
   * @param {number} currentTimestamp - Current timestamp
   * @param {string} direction - 'TX' or 'RX'
   * @returns {object} Drift detection results
   */
  detectDrift(currentTimestamp, direction) {
    if (!this.isSynchronized) {
      return { drift: 0, detected: false };
    }

    const baseTime = direction === 'TX' ? this.txBaseTime : this.rxBaseTime;
    const expectedTime = currentTimestamp - baseTime;
    const actualTime = Date.now() - baseTime;
    const drift = Math.abs(expectedTime - actualTime);
    
    return {
      drift: drift,
      detected: drift > 1000, // More than 1 second drift
      direction: direction,
      severity: drift > 5000 ? 'High' : drift > 1000 ? 'Medium' : 'Low'
    };
  }
}

module.exports = TimestampSync;
