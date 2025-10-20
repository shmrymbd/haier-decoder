/**
 * Packet Pairer for Dual-Dongle Monitoring
 * 
 * Automatically pairs challenge-response sequences using multiple strategies:
 * - Command-based matching (challenge → response)
 * - Sequence number correlation
 * - Timestamp-based windowing
 * - Payload analysis for complex pairs
 */

class PacketPairer {
  constructor() {
    this.pendingChallenges = new Map();
    this.pairedSequences = [];
    this.pairingRules = {
      // Authentication challenge (0x12) → Response (0x11)
      0x12: { responseCommand: 0x11, timeout: 5000, name: 'Authentication' },
      // Status query (0x01) → Status response (0x6d)
      0x01: { responseCommand: 0x6d, timeout: 3000, name: 'Status Query' },
      // Program start (0x60) → ACK (0x4d)
      0x60: { responseCommand: 0x4d, timeout: 2000, name: 'Program Start' },
      // Reset command (0x01 with 0x5d) → Reset confirm (0x0f)
      0x5d: { responseCommand: 0x0f, timeout: 3000, name: 'Reset' },
      // Control signal (0x09) → ACK (0x4d)
      0x09: { responseCommand: 0x4d, timeout: 2000, name: 'Control Signal' }
    };
    
    this.stats = {
      totalPairs: 0,
      successfulPairs: 0,
      failedPairs: 0,
      averageResponseTime: 0,
      responseTimeSum: 0
    };
  }

  /**
   * Add a packet and attempt to pair it
   * @param {object} packet - Parsed packet object
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Synchronized timestamp
   * @returns {object|null} Pair object if matched, null otherwise
   */
  addPacket(packet, direction, timestamp) {
    if (direction === 'TX') {
      return this.handleTxPacket(packet, timestamp);
    } else {
      return this.handleRxPacket(packet, timestamp);
    }
  }

  /**
   * Handle TX packet (challenge/request)
   * @param {object} packet - Parsed packet object
   * @param {number} timestamp - Timestamp
   * @returns {object|null} Pair if immediately matched
   */
  handleTxPacket(packet, timestamp) {
    const command = packet.command;
    const rule = this.pairingRules[command];
    
    if (!rule) {
      // No pairing rule for this command
      return null;
    }
    
    // Create pending challenge entry
    const challengeId = this.generateChallengeId(packet, timestamp);
    const pendingChallenge = {
      id: challengeId,
      command: command,
      packet: packet,
      timestamp: timestamp,
      rule: rule,
      timeout: timestamp + rule.timeout
    };
    
    this.pendingChallenges.set(challengeId, pendingChallenge);
    
    // Check if there's already a matching response
    const existingResponse = this.findMatchingResponse(packet, timestamp, rule);
    if (existingResponse) {
      return this.createPair(pendingChallenge, existingResponse);
    }
    
    return null;
  }

  /**
   * Handle RX packet (response)
   * @param {object} packet - Parsed packet object
   * @param {number} timestamp - Timestamp
   * @returns {object|null} Pair if matched with pending challenge
   */
  handleRxPacket(packet, timestamp) {
    const command = packet.command;
    
    // Find matching pending challenge
    for (const [challengeId, challenge] of this.pendingChallenges) {
      if (this.isMatchingResponse(challenge, packet, timestamp)) {
        // Remove from pending
        this.pendingChallenges.delete(challengeId);
        
        // Create pair
        return this.createPair(challenge, { packet, timestamp });
      }
    }
    
    return null;
  }

  /**
   * Check if response matches a pending challenge
   * @param {object} challenge - Pending challenge
   * @param {object} response - Response packet
   * @param {number} timestamp - Response timestamp
   * @returns {boolean} True if matches
   */
  isMatchingResponse(challenge, response, timestamp) {
    const rule = challenge.rule;
    
    // Check command match
    if (response.command !== rule.responseCommand) {
      return false;
    }
    
    // Check timeout
    if (timestamp > challenge.timeout) {
      return false;
    }
    
    // Check sequence number correlation if available
    if (challenge.packet.sequence !== undefined && response.sequence !== undefined) {
      if (challenge.packet.sequence !== response.sequence) {
        return false;
      }
    }
    
    // Special handling for authentication pairs
    if (challenge.command === 0x12 && response.command === 0x11) {
      return this.validateAuthPair(challenge.packet, response);
    }
    
    // Special handling for status queries
    if (challenge.command === 0x01 && response.command === 0x6d) {
      return this.validateStatusPair(challenge.packet, response);
    }
    
    return true;
  }

  /**
   * Validate authentication challenge-response pair
   * @param {object} challenge - Challenge packet
   * @param {object} response - Response packet
   * @returns {boolean} True if valid pair
   */
  validateAuthPair(challenge, response) {
    // Check if both have authentication payload structure
    if (!challenge.payload || !response.payload) {
      return false;
    }
    
    // Check authentication header (0x10 0x02 0x00 0x01)
    const challengeHeader = challenge.payload.slice(0, 4);
    const responseHeader = response.payload.slice(0, 4);
    
    if (!challengeHeader.equals(responseHeader)) {
      return false;
    }
    
    // Check if challenge has 8-byte challenge data
    if (challenge.payload.length < 12) { // 4 header + 8 challenge
      return false;
    }
    
    // Check if response has 8-byte response data
    if (response.payload.length < 12) { // 4 header + 8 response
      return false;
    }
    
    return true;
  }

  /**
   * Validate status query-response pair
   * @param {object} query - Query packet
   * @param {object} response - Response packet
   * @returns {boolean} True if valid pair
   */
  validateStatusPair(query, response) {
    // Check if query has status subcommand
    if (!query.payload || query.payload[0] !== 0x4d) {
      return false;
    }
    
    // Check if response has status data
    if (!response.payload || response.payload.length < 3) {
      return false;
    }
    
    return true;
  }

  /**
   * Create a paired sequence object
   * @param {object} challenge - Challenge/challenge object
   * @param {object} response - Response object
   * @returns {object} Pair object
   */
  createPair(challenge, response) {
    const responseTime = response.timestamp - challenge.timestamp;
    
    const pair = {
      id: this.generatePairId(),
      challenge: {
        packet: challenge.packet,
        timestamp: challenge.timestamp,
        command: challenge.command,
        direction: 'TX'
      },
      response: {
        packet: response.packet,
        timestamp: response.timestamp,
        command: response.command,
        direction: 'RX'
      },
      responseTime: responseTime,
      rule: challenge.rule,
      pairType: challenge.rule.name,
      createdAt: Date.now()
    };
    
    // Add to paired sequences
    this.pairedSequences.push(pair);
    
    // Update statistics
    this.updateStats(responseTime);
    
    return pair;
  }

  /**
   * Update pairing statistics
   * @param {number} responseTime - Response time in milliseconds
   */
  updateStats(responseTime) {
    this.stats.totalPairs++;
    this.stats.successfulPairs++;
    this.stats.responseTimeSum += responseTime;
    this.stats.averageResponseTime = this.stats.responseTimeSum / this.stats.successfulPairs;
  }

  /**
   * Generate unique challenge ID
   * @param {object} packet - Packet object
   * @param {number} timestamp - Timestamp
   * @returns {string} Challenge ID
   */
  generateChallengeId(packet, timestamp) {
    const sequence = packet.sequence || 0;
    return `${packet.command}_${sequence}_${timestamp}`;
  }

  /**
   * Generate unique pair ID
   * @returns {string} Pair ID
   */
  generatePairId() {
    return `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Find matching response for a challenge
   * @param {object} packet - Challenge packet
   * @param {number} timestamp - Timestamp
   * @param {object} rule - Pairing rule
   * @returns {object|null} Matching response
   */
  findMatchingResponse(packet, timestamp, rule) {
    // This would be used for immediate pairing if response already exists
    // For now, return null as we handle this in handleRxPacket
    return null;
  }

  /**
   * Get all paired sequences
   * @returns {array} Array of paired sequences
   */
  getPairedSequences() {
    return this.pairedSequences;
  }

  /**
   * Get pairing statistics
   * @returns {object} Statistics object
   */
  getStats() {
    const pendingCount = this.pendingChallenges.size;
    const successRate = this.stats.totalPairs > 0 ? 
      (this.stats.successfulPairs / this.stats.totalPairs * 100).toFixed(1) : 0;
    
    return {
      ...this.stats,
      pendingChallenges: pendingCount,
      successRate: parseFloat(successRate),
      pairedSequences: this.pairedSequences.length
    };
  }

  /**
   * Get pairs by type
   * @param {string} pairType - Type of pair to filter
   * @returns {array} Filtered pairs
   */
  getPairsByType(pairType) {
    return this.pairedSequences.filter(pair => pair.pairType === pairType);
  }

  /**
   * Get authentication pairs
   * @returns {array} Authentication pairs
   */
  getAuthPairs() {
    return this.getPairsByType('Authentication');
  }

  /**
   * Get status query pairs
   * @returns {array} Status query pairs
   */
  getStatusPairs() {
    return this.getPairsByType('Status Query');
  }

  /**
   * Get program start pairs
   * @returns {array} Program start pairs
   */
  getProgramPairs() {
    return this.getPairsByType('Program Start');
  }

  /**
   * Clean up expired pending challenges
   * @param {number} currentTime - Current timestamp
   */
  cleanupExpiredChallenges(currentTime = Date.now()) {
    const expired = [];
    
    for (const [challengeId, challenge] of this.pendingChallenges) {
      if (currentTime > challenge.timeout) {
        expired.push(challengeId);
        this.stats.failedPairs++;
      }
    }
    
    expired.forEach(id => this.pendingChallenges.delete(id));
    
    return expired.length;
  }

  /**
   * Get response time analysis
   * @returns {object} Response time analysis
   */
  getResponseTimeAnalysis() {
    if (this.pairedSequences.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0 };
    }
    
    const responseTimes = this.pairedSequences.map(pair => pair.responseTime).sort((a, b) => a - b);
    const min = responseTimes[0];
    const max = responseTimes[responseTimes.length - 1];
    const avg = this.stats.averageResponseTime;
    const median = responseTimes[Math.floor(responseTimes.length / 2)];
    
    return { min, max, avg, median, count: responseTimes.length };
  }

  /**
   * Export paired sequences to JSON
   * @param {string} filename - Output filename
   * @returns {string} Export file path
   */
  exportPairs(filename = null) {
    if (!filename) {
      const timestamp = Date.now();
      filename = `logs/paired-sequences-${timestamp}.json`;
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      statistics: this.getStats(),
      responseTimeAnalysis: this.getResponseTimeAnalysis(),
      pairedSequences: this.pairedSequences.map(pair => ({
        id: pair.id,
        pairType: pair.pairType,
        responseTime: pair.responseTime,
        challenge: {
          command: pair.challenge.command,
          timestamp: pair.challenge.timestamp,
          hex: pair.challenge.packet.raw ? require('../utils/hex-utils').bufferToHex(pair.challenge.packet.raw) : null
        },
        response: {
          command: pair.response.command,
          timestamp: pair.response.timestamp,
          hex: pair.response.packet.raw ? require('../utils/hex-utils').bufferToHex(pair.response.packet.raw) : null
        }
      }))
    };
    
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    return filename;
  }
}

module.exports = PacketPairer;
