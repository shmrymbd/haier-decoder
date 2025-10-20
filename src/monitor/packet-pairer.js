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
      0x09: { responseCommand: 0x4d, timeout: 2000, name: 'Control Signal' },
      
      // New commands from latest protocol analysis
      // Complex command (0xf7) → ACK (0x4d)
      0xf7: { responseCommand: 0x4d, timeout: 3000, name: 'Complex Command' },
      // Status query (0xf3) → Status response (0x6d)
      0xf3: { responseCommand: 0x6d, timeout: 3000, name: 'Status Query F3' },
      // Status query (0xf5) → Status response (0x6d)
      0xf5: { responseCommand: 0x6d, timeout: 3000, name: 'Status Query F5' },
      // Device info query (0xec) → Device info response (0xec)
      0xec: { responseCommand: 0xec, timeout: 2000, name: 'Device Info Query' },
      // Serial query (0xea) → Serial response (0xea)
      0xea: { responseCommand: 0xea, timeout: 2000, name: 'Serial Query' },
      // Firmware query (0x62) → Firmware response (0x62)
      0x62: { responseCommand: 0x62, timeout: 2000, name: 'Firmware Query' },
      // Session management commands
      // Session start (0x61) → Session ACK (0x70)
      0x61: { responseCommand: 0x70, timeout: 2000, name: 'Session Start' },
      // Controller ready (0x70) → Ready ACK (0x73)
      0x70: { responseCommand: 0x73, timeout: 2000, name: 'Controller Ready' },
      // Handshake init (0x4d 0x01) → Handshake ACK (0x73)
      0x4d: { responseCommand: 0x73, timeout: 2000, name: 'Handshake Init' }
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
    
    // Special handling for complex commands
    if (challenge.command === 0xf7 && response.command === 0x4d) {
      return this.validateComplexPair(challenge.packet, response);
    }
    
    // Special handling for device info queries
    if (challenge.command === 0xec && response.command === 0xec) {
      return this.validateDeviceInfoPair(challenge.packet, response);
    }
    
    // Special handling for session management
    if ([0x61, 0x70, 0x4d].includes(challenge.command) && [0x70, 0x73].includes(response.command)) {
      return this.validateSessionPair(challenge.packet, response);
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
    
    // Enhanced rolling code validation
    const challengeData = challenge.payload.slice(4, 12); // 8-byte challenge
    const responseData = response.payload.slice(4, 12);   // 8-byte response
    
    // Validate rolling code characteristics
    if (!this.validateRollingCode(challengeData, responseData)) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate rolling code characteristics
   * @param {Buffer} challenge - Challenge data
   * @param {Buffer} response - Response data
   * @returns {boolean} True if valid rolling code
   */
  validateRollingCode(challenge, response) {
    // Check for rolling code patterns
    // 1. Challenge should be unique (not all zeros or repeated bytes)
    if (this.isRepeatedBytes(challenge) || this.isAllZeros(challenge)) {
      return false;
    }
    
    // 2. Response should be different from challenge
    if (challenge.equals(response)) {
      return false;
    }
    
    // 3. Check for reasonable entropy (not too many repeated patterns)
    if (this.hasLowEntropy(challenge) || this.hasLowEntropy(response)) {
      return false;
    }
    
    // 4. Validate response length and structure
    if (response.length !== 8) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if buffer contains repeated bytes
   * @param {Buffer} buffer - Buffer to check
   * @returns {boolean} True if repeated bytes
   */
  isRepeatedBytes(buffer) {
    if (buffer.length === 0) return true;
    const firstByte = buffer[0];
    return buffer.every(byte => byte === firstByte);
  }

  /**
   * Check if buffer is all zeros
   * @param {Buffer} buffer - Buffer to check
   * @returns {boolean} True if all zeros
   */
  isAllZeros(buffer) {
    return buffer.every(byte => byte === 0);
  }

  /**
   * Check if buffer has low entropy (too many repeated patterns)
   * @param {Buffer} buffer - Buffer to check
   * @returns {boolean} True if low entropy
   */
  hasLowEntropy(buffer) {
    if (buffer.length < 4) return false;
    
    // Check for patterns like 0xAA, 0x55, 0xFF, 0x00
    const patterns = [0xAA, 0x55, 0xFF, 0x00];
    for (const pattern of patterns) {
      let count = 0;
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === pattern) count++;
      }
      if (count > buffer.length / 2) return true;
    }
    
    return false;
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
   * Validate complex command pair
   * @param {object} command - Complex command packet
   * @param {object} response - Response packet
   * @returns {boolean} True if valid pair
   */
  validateComplexPair(command, response) {
    // Check if command has complex structure (0xf7)
    if (command.command !== 0xf7) {
      return false;
    }
    
    // Check if response is ACK (0x4d)
    if (response.command !== 0x4d) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate device info query pair
   * @param {object} query - Query packet
   * @param {object} response - Response packet
   * @returns {boolean} True if valid pair
   */
  validateDeviceInfoPair(query, response) {
    // Check if both are device info commands
    if (query.command !== 0xec || response.command !== 0xec) {
      return false;
    }
    
    // Check if response has device info data
    if (!response.payload || response.payload.length < 10) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate session management pair
   * @param {object} command - Session command packet
   * @param {object} response - Response packet
   * @returns {boolean} True if valid pair
   */
  validateSessionPair(command, response) {
    // Check session start → controller ready
    if (command.command === 0x61 && response.command === 0x70) {
      return true;
    }
    
    // Check controller ready → handshake ACK
    if (command.command === 0x70 && response.command === 0x73) {
      return true;
    }
    
    // Check handshake init → handshake ACK
    if (command.command === 0x4d && response.command === 0x73) {
      return true;
    }
    
    return false;
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
   * Get rolling code analysis
   * @returns {object} Rolling code analysis
   */
  getRollingCodeAnalysis() {
    const authPairs = this.getAuthPairs();
    if (authPairs.length === 0) {
      return { valid: false, reason: 'No authentication pairs found' };
    }

    const challenges = authPairs.map(pair => pair.challenge.packet.payload.slice(4, 12));
    const responses = authPairs.map(pair => pair.response.packet.payload.slice(4, 12));
    
    // Analyze rolling code patterns
    const analysis = {
      totalPairs: authPairs.length,
      uniqueChallenges: new Set(challenges.map(c => c.toString('hex'))).size,
      uniqueResponses: new Set(responses.map(r => r.toString('hex'))).size,
      rollingCodeDetected: false,
      patterns: {
        challengeEntropy: [],
        responseEntropy: [],
        timeBetweenChallenges: []
      }
    };

    // Check if challenges are unique (rolling code characteristic)
    analysis.rollingCodeDetected = analysis.uniqueChallenges === authPairs.length;

    // Calculate entropy for each challenge/response
    for (let i = 0; i < challenges.length; i++) {
      analysis.patterns.challengeEntropy.push(this.calculateEntropy(challenges[i]));
      analysis.patterns.responseEntropy.push(this.calculateEntropy(responses[i]));
    }

    // Calculate time between challenges
    for (let i = 1; i < authPairs.length; i++) {
      const timeDiff = authPairs[i].challenge.timestamp - authPairs[i-1].challenge.timestamp;
      analysis.patterns.timeBetweenChallenges.push(timeDiff);
    }

    return analysis;
  }

  /**
   * Calculate entropy of a buffer
   * @param {Buffer} buffer - Buffer to analyze
   * @returns {number} Entropy value (0-8 for 8-byte buffer)
   */
  calculateEntropy(buffer) {
    if (buffer.length === 0) return 0;
    
    const byteCounts = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      byteCounts[buffer[i]]++;
    }
    
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (byteCounts[i] > 0) {
        const probability = byteCounts[i] / buffer.length;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
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
