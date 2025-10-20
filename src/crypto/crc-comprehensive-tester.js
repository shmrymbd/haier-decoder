/**
 * Haier Protocol CRC Comprehensive Tester
 * 
 * This module tests CRC algorithms on 100+ packets from all captures
 * to identify the correct CRC calculation method.
 */

const HexUtils = require('../utils/hex-utils');
const fs = require('fs');

class CRCComprehensiveTester {
  constructor() {
    this.crcAlgorithms = {
      'CRC-16-CCITT': this.crc16ccitt,
      'CRC-16-Modbus': this.crc16modbus,
      'CRC-16-IBM': this.crc16ibm,
      'CRC-16-ANSI': this.crc16ansi,
      'CRC-16-USB': this.crc16usb,
      'CRC-24': this.crc24,
      'CRC-32': this.crc32,
      'Sum-8': this.sum8,
      'Sum-16': this.sum16,
      'XOR-8': this.xor8,
      'XOR-16': this.xor16
    };
    
    this.testResults = [];
    this.packets = [];
  }

  /**
   * Run comprehensive CRC analysis
   */
  async runAnalysis() {
    console.log('🔍 Starting Comprehensive CRC Analysis...');
    
    // Load all captured packets
    await this.loadAllPackets();
    console.log(`📊 Loaded ${this.packets.length} packets for analysis`);
    
    // Test each CRC algorithm
    for (const [name, algorithm] of Object.entries(this.crcAlgorithms)) {
      console.log(`\n🧪 Testing ${name}...`);
      const result = await this.testAlgorithm(name, algorithm);
      this.testResults.push(result);
      
      if (result.successRate > 0.8) {
        console.log(`✅ ${name}: ${result.successRate.toFixed(2)}% success rate`);
      } else {
        console.log(`❌ ${name}: ${result.successRate.toFixed(2)}% success rate`);
      }
    }
    
    // Save results
    this.saveResults();
    this.printSummary();
  }

  /**
   * Load all captured packets
   */
  async loadAllPackets() {
    const sources = [
      'startupMachine.txt',
      'startupModem.txt',
      'binding.txt',
      'logs/haier-protocol.log'
    ];
    
    for (const source of sources) {
      try {
        const data = fs.readFileSync(source, 'utf8');
        const packets = this.extractPackets(data);
        this.packets.push(...packets);
        console.log(`📁 Loaded ${packets.length} packets from ${source}`);
      } catch (error) {
        console.log(`⚠️  Could not load ${source}: ${error.message}`);
      }
    }
  }

  /**
   * Extract packets from text data
   */
  extractPackets(data) {
    const packets = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.trim() && this.isHexPacket(line)) {
        const packet = this.parsePacket(line);
        if (packet && packet.crc) {
          packets.push(packet);
        }
      }
    }
    
    return packets;
  }

  /**
   * Check if line contains hex packet
   */
  isHexPacket(line) {
    const hexPattern = /^[0-9a-fA-F\s]+$/;
    return hexPattern.test(line.trim()) && line.trim().length > 20;
  }

  /**
   * Parse packet and extract components
   */
  parsePacket(line) {
    try {
      const hexString = line.replace(/\s+/g, '');
      const bytes = HexUtils.hexToBuffer(hexString);
      
      if (bytes.length < 6) return null;
      
      // Extract header (FF FF)
      if (bytes[0] !== 0xFF || bytes[1] !== 0xFF) return null;
      
      // Extract length
      const length = bytes[2];
      
      // Extract frame type
      const frameType = bytes[3];
      
      // Extract sequence (4 bytes)
      const sequence = bytes.slice(4, 8);
      
      // Extract command
      const command = bytes[8];
      
      // Extract payload (length - 8 bytes for header, length, frame, sequence, command, crc)
      const payloadLength = length - 8;
      const payload = bytes.slice(9, 9 + payloadLength);
      
      // Extract CRC (last 3 bytes typically)
      const crc = bytes.slice(-3);
      
      return {
        hex: hexString,
        bytes: bytes,
        length: length,
        frameType: frameType,
        sequence: sequence,
        command: command,
        payload: payload,
        crc: crc,
        dataForCrc: bytes.slice(0, -3) // All bytes except CRC
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Test a specific CRC algorithm
   */
  async testAlgorithm(name, algorithm) {
    let correct = 0;
    let total = 0;
    const details = [];
    
    for (const packet of this.packets) {
      try {
        const calculatedCrc = algorithm(packet.dataForCrc);
        const actualCrc = packet.crc;
        
        const matches = this.compareCrc(calculatedCrc, actualCrc);
        if (matches) {
          correct++;
        }
        
        details.push({
          hex: packet.hex,
          calculated: HexUtils.bufferToHex(calculatedCrc),
          actual: HexUtils.bufferToHex(actualCrc),
          matches: matches
        });
        
        total++;
      } catch (error) {
        console.log(`⚠️  Error testing ${name} on packet: ${error.message}`);
      }
    }
    
    const successRate = total > 0 ? correct / total : 0;
    
    return {
      name: name,
      successRate: successRate,
      correct: correct,
      total: total,
      details: details
    };
  }

  /**
   * Compare calculated CRC with actual CRC
   */
  compareCrc(calculated, actual) {
    if (calculated.length !== actual.length) return false;
    
    for (let i = 0; i < calculated.length; i++) {
      if (calculated[i] !== actual[i]) return false;
    }
    
    return true;
  }

  /**
   * CRC-16-CCITT implementation
   */
  crc16ccitt(data) {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 8;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    
    return Buffer.from([(crc >> 8) & 0xFF, crc & 0xFF]);
  }

  /**
   * CRC-16-Modbus implementation
   */
  crc16modbus(data) {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16-IBM implementation
   */
  crc16ibm(data) {
    let crc = 0x0000;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16-ANSI implementation
   */
  crc16ansi(data) {
    let crc = 0x0000;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8005;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16-USB implementation
   */
  crc16usb(data) {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-24 implementation
   */
  crc24(data) {
    let crc = 0x000000;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 16;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x800000) {
          crc = (crc << 1) ^ 0x864CFB;
        } else {
          crc <<= 1;
        }
      }
    }
    
    return Buffer.from([
      (crc >> 16) & 0xFF,
      (crc >> 8) & 0xFF,
      crc & 0xFF
    ]);
  }

  /**
   * CRC-32 implementation
   */
  crc32(data) {
    let crc = 0xFFFFFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x00000001) {
          crc = (crc >> 1) ^ 0xEDB88320;
        } else {
          crc >>= 1;
        }
      }
    }
    
    crc ^= 0xFFFFFFFF;
    
    return Buffer.from([
      (crc >> 24) & 0xFF,
      (crc >> 16) & 0xFF,
      (crc >> 8) & 0xFF,
      crc & 0xFF
    ]);
  }

  /**
   * 8-bit sum
   */
  sum8(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) & 0xFF;
    }
    return Buffer.from([sum]);
  }

  /**
   * 16-bit sum
   */
  sum16(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) & 0xFFFF;
    }
    return Buffer.from([(sum >> 8) & 0xFF, sum & 0xFF]);
  }

  /**
   * 8-bit XOR
   */
  xor8(data) {
    let xor = 0;
    for (let i = 0; i < data.length; i++) {
      xor ^= data[i];
    }
    return Buffer.from([xor]);
  }

  /**
   * 16-bit XOR
   */
  xor16(data) {
    let xor = 0;
    for (let i = 0; i < data.length; i++) {
      xor ^= data[i];
    }
    return Buffer.from([(xor >> 8) & 0xFF, xor & 0xFF]);
  }

  /**
   * Save test results
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      totalPackets: this.packets.length,
      algorithms: this.testResults
    };
    
    fs.writeFileSync(
      'test-vectors/crc-analysis-results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('💾 Saved CRC analysis results to test-vectors/crc-analysis-results.json');
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n📊 CRC Analysis Summary:');
    console.log(`   Total packets tested: ${this.packets.length}`);
    
    // Sort by success rate
    const sorted = this.testResults.sort((a, b) => b.successRate - a.successRate);
    
    console.log('\n🏆 Top Performing Algorithms:');
    sorted.slice(0, 5).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.name}: ${(result.successRate * 100).toFixed(1)}% (${result.correct}/${result.total})`);
    });
    
    // Find best algorithm
    const best = sorted[0];
    if (best && best.successRate > 0.5) {
      console.log(`\n✅ Best Algorithm: ${best.name} with ${(best.successRate * 100).toFixed(1)}% accuracy`);
      console.log('   This algorithm should be implemented in src/protocol/crc.js');
    } else {
      console.log('\n⚠️  No algorithm achieved >50% accuracy');
      console.log('   Consider building a lookup table from known good packets');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new CRCComprehensiveTester();
  tester.runAnalysis().catch(console.error);
}

module.exports = CRCComprehensiveTester;
