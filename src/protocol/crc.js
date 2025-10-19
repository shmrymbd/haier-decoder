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
   * Test all CRC algorithms against known packets
   * @returns {Object|null} Best matching algorithm or null
   */
  reverseEngineerCRC() {
    console.log('🔍 Reverse engineering CRC algorithm...');
    
    let bestMatch = null;
    let maxMatches = 0;
    
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
    
    const data = packet.slice(0, -3);
    const receivedCRC = this.parseCRCFromPacket(packet);
    
    // Try validated algorithm first
    if (this.validatedAlgorithm) {
      const calculatedCRC = this.calculateCRC16(data, this.validatedAlgorithm);
      if (calculatedCRC === receivedCRC) {
        return { 
          valid: true, 
          algorithm: this.validatedAlgorithm.name,
          crc: calculatedCRC 
        };
      }
    }
    
    // Try lookup table
    const dataHex = data.toString('hex');
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
      const calculatedCRC = this.calculateCRC16(data, algorithm);
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
      calculated: this.calculateCRC16(data, this.algorithms[0])
    };
  }

  /**
   * Calculate CRC for outgoing packet
   * @param {Buffer} data - Packet data without CRC
   * @returns {number} CRC value
   */
  calculatePacketCRC(data) {
    if (this.validatedAlgorithm) {
      return this.calculateCRC16(data, this.validatedAlgorithm);
    }
    
    // Try lookup table first
    const dataHex = data.toString('hex');
    if (this.lookupTable.has(dataHex)) {
      return this.lookupTable.get(dataHex);
    }
    
    // Fallback to first algorithm
    return this.calculateCRC16(data, this.algorithms[0]);
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
   * Extract CRC from packet (last 3 bytes)
   * @param {Buffer} packet - Complete packet
   * @returns {number} CRC value
   */
  parseCRCFromPacket(packet) {
    const crcBytes = packet.slice(-3);
    return this.parseCRC(crcBytes.toString('hex'));
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
