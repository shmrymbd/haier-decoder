/**
 * CRC calculation and validation for Haier protocol packets
 */

const config = require('../config');

class CRC {
  constructor() {
    this.algorithms = config.crcAlgorithms;
    this.knownPackets = config.knownPackets;
    this.validatedAlgorithm = null;
    this.lookupTable = new Map();
  }

  /**
   * Calculate CRC-16 using specified algorithm
   * @param {Buffer} data - Data to calculate CRC for
   * @param {Object} algorithm - Algorithm configuration
   * @returns {number} CRC value
   */
  calculateCRC16(data, algorithm) {
    let crc = algorithm.init;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 8;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ algorithm.poly;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return (crc ^ algorithm.xorOut) & 0xFFFF;
  }

  /**
   * Calculate CRC-16/ARC (CRC-16-ANSI) - the algorithm used by Haier protocol
   * Based on HaierProtocol library findings
   * @param {Buffer} data - Data to calculate CRC for
   * @returns {number} CRC value
   */
  calculateCRC16ARC(data) {
    let crc = 0x0000; // Initial value
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001; // Polynomial 0x8005 reversed
        } else {
          crc = crc >> 1;
        }
      }
    }
    
    return crc;
  }

  /**
   * Extract frame data for CRC calculation according to Haier protocol
   * Frame structure: [separator][length][flags][reserved][type][data][checksum][crc]
   * CRC is calculated on: [length][flags][reserved][type][data] (excluding separator, checksum and CRC)
   * @param {Buffer} packet - Complete packet
   * @returns {Buffer} Frame data for CRC calculation
   */
  extractFrameDataForCRC(packet) {
    if (packet.length < 8) {
      return Buffer.alloc(0);
    }
    
    // Check if this is a single-byte CRC packet (no CRC bytes at the end)
    const frameLength = packet[2];
    const expectedPacketLength = frameLength + 3; // +3 for separator
    
    if (packet.length === expectedPacketLength) {
      // Single-byte CRC packet - CRC is calculated on frame data excluding checksum
      return packet.slice(2, -1); // Skip separator, exclude checksum
    } else {
      // Multi-byte CRC packet - CRC is calculated on frame data excluding checksum and CRC
      return packet.slice(2, -3); // Skip separator and CRC, exclude checksum
    }
  }

  /**
   * Test all CRC algorithms against known packets
   * @returns {Object|null} Best matching algorithm or null
   */
  reverseEngineerCRC() {
    console.log('🔍 Reverse engineering CRC algorithm...');
    
    // First, test CRC-16/ARC algorithm (based on HaierProtocol library findings)
    console.log('\n📊 Testing CRC-16/ARC (Haier Protocol Standard):');
    let arcMatches = 0;
    const arcResults = [];
    
    for (const packet of this.knownPackets) {
      const data = this.hexToBuffer(packet.data);
      const frameData = this.extractFrameDataForCRC(data);
      const calculatedCRC = this.calculateCRC16ARC(frameData);
      const expectedCRC = this.parseCRC(packet.crc);
      
      const match = calculatedCRC === expectedCRC;
      if (match) arcMatches++;
      
      arcResults.push({
        name: packet.name,
        calculated: calculatedCRC.toString(16).padStart(4, '0'),
        expected: expectedCRC.toString(16).padStart(4, '0'),
        match
      });
    }
    
    console.log(`   Matches: ${arcMatches}/${this.knownPackets.length}`);
    
    arcResults.forEach(result => {
      const status = result.match ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.calculated} vs ${result.expected}`);
    });
    
    if (arcMatches === this.knownPackets.length) {
      console.log('\n🎯 Perfect match: CRC-16/ARC algorithm (Haier Protocol Standard)');
      this.validatedAlgorithm = { name: 'CRC-16/ARC', type: 'arc' };
      this.buildLookupTable();
      return this.validatedAlgorithm;
    }
    
    // If CRC-16/ARC doesn't match all, test other algorithms
    let bestMatch = null;
    let maxMatches = arcMatches;
    
    for (const algorithm of this.algorithms) {
      let matches = 0;
      const results = [];
      
      for (const packet of this.knownPackets) {
        const data = this.hexToBuffer(packet.data);
        const calculatedCRC = this.calculateCRC16(data, algorithm);
        const expectedCRC = this.parseCRC(packet.crc);
        
        const match = calculatedCRC === expectedCRC;
        if (match) matches++;
        
        results.push({
          name: packet.name,
          calculated: calculatedCRC.toString(16).padStart(4, '0'),
          expected: expectedCRC.toString(16).padStart(4, '0'),
          match
        });
      }
      
      console.log(`\n📊 Testing ${algorithm.name}:`);
      console.log(`   Matches: ${matches}/${this.knownPackets.length}`);
      
      results.forEach(result => {
        const status = result.match ? '✅' : '❌';
        console.log(`   ${status} ${result.name}: ${result.calculated} vs ${result.expected}`);
      });
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = algorithm;
      }
    }
    
    if (bestMatch) {
      console.log(`\n🎯 Best match: ${bestMatch.name} (${maxMatches}/${this.knownPackets.length} packets)`);
      this.validatedAlgorithm = bestMatch;
      
      // Build lookup table for known packets
      this.buildLookupTable();
    } else {
      console.log('\n⚠️  No algorithm matched all packets. Using lookup table approach.');
      this.buildLookupTable();
    }
    
    return bestMatch;
  }

  /**
   * Build lookup table for known packet CRCs
   */
  buildLookupTable() {
    console.log('📚 Building CRC lookup table...');
    
    for (const packet of this.knownPackets) {
      const data = this.hexToBuffer(packet.data);
      const expectedCRC = this.parseCRC(packet.crc);
      this.lookupTable.set(data.toString('hex'), expectedCRC);
    }
    
    console.log(`✅ Lookup table built with ${this.lookupTable.size} entries`);
  }

  /**
   * Validate packet CRC
   * @param {Buffer} packet - Complete packet
   * @returns {Object} Validation result
   */
  validatePacket(packet) {
    if (packet.length < 3) {
      return { valid: false, reason: 'Packet too short' };
    }
    
    // For CRC-16/ARC, calculate on frame data according to Haier protocol
    const frameData = this.extractFrameDataForCRC(packet);
    const receivedCRC = this.parseCRCFromPacket(packet);
    
    // Try CRC-16/ARC first (based on HaierProtocol library findings)
    const arcCRC = this.calculateCRC16ARC(frameData);
    if (arcCRC === receivedCRC) {
      return { 
        valid: true, 
        algorithm: 'CRC-16/ARC',
        crc: arcCRC 
      };
    }
    
    // Try validated algorithm (if not CRC-16/ARC)
    if (this.validatedAlgorithm && this.validatedAlgorithm.type !== 'arc') {
      const calculatedCRC = this.calculateCRC16(frameData, this.validatedAlgorithm);
      if (calculatedCRC === receivedCRC) {
        return { 
          valid: true, 
          algorithm: this.validatedAlgorithm.name,
          crc: calculatedCRC 
        };
      }
    }
    
    // Try lookup table
    const dataHex = frameData.toString('hex');
    if (this.lookupTable.has(dataHex)) {
      const expectedCRC = this.lookupTable.get(dataHex);
      if (expectedCRC === receivedCRC) {
        return { 
          valid: true, 
          algorithm: 'lookup',
          crc: receivedCRC 
        };
      }
    }
    
    // Try all algorithms as fallback
    for (const algorithm of this.algorithms) {
      const calculatedCRC = this.calculateCRC16(frameData, algorithm);
      if (calculatedCRC === receivedCRC) {
        return { 
          valid: true, 
          algorithm: algorithm.name,
          crc: calculatedCRC 
        };
      }
    }
    
    return { 
      valid: false, 
      reason: 'CRC mismatch',
      received: receivedCRC,
      calculated: arcCRC
    };
  }

  /**
   * Calculate CRC for outgoing packet
   * @param {Buffer} frameData - Frame data excluding separator, CRC, and checksum
   * @returns {number} CRC value
   */
  calculatePacketCRC(frameData) {
    // Use CRC-16/ARC as primary algorithm (based on HaierProtocol library)
    return this.calculateCRC16ARC(frameData);
  }

  /**
   * Parse CRC from hex string
   * @param {string} crcHex - CRC hex string (e.g., "80" or "b0 34 ad")
   * @returns {number} CRC value
   */
  parseCRC(crcHex) {
    const cleanHex = crcHex.replace(/\s+/g, '');
    
    if (cleanHex.length === 2) {
      return parseInt(cleanHex, 16);
    } else if (cleanHex.length === 4) {
      return parseInt(cleanHex, 16);
    } else if (cleanHex.length === 6) {
      // 3-byte CRC, take last 2 bytes
      return parseInt(cleanHex.slice(2), 16);
    }
    
    throw new Error(`Invalid CRC format: ${crcHex}`);
  }

  /**
   * Extract CRC from packet (last 2 bytes)
   * @param {Buffer} packet - Complete packet
   * @returns {number} CRC value
   */
  parseCRCFromPacket(packet) {
    const crcBytes = packet.slice(-2);
    return (crcBytes[0] << 8) | crcBytes[1];
  }

  /**
   * Convert hex string to Buffer
   * @param {string} hexString - Space-separated hex string
   * @returns {Buffer} Buffer object
   */
  hexToBuffer(hexString) {
    const cleanHex = hexString.replace(/\s+/g, '');
    return Buffer.from(cleanHex, 'hex');
  }

  /**
   * Get CRC statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      validatedAlgorithm: this.validatedAlgorithm?.name || 'none',
      lookupTableSize: this.lookupTable.size,
      algorithms: this.algorithms.length
    };
  }
}

module.exports = CRC;
