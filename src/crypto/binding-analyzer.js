#!/usr/bin/env node

/**
 * Binding Data Analyzer
 * 
 * This script analyzes the binding.txt file to identify authentication patterns
 * and extract challenge/response pairs.
 */

const fs = require('fs');
const path = require('path');
const HexUtils = require('../utils/hex-utils');

class BindingAnalyzer {
  constructor() {
    this.packets = [];
    this.authenticationPairs = [];
  }

  /**
   * Load and analyze binding data
   */
  analyzeBindingData() {
    const bindingPath = path.join(__dirname, '../../binding.txt');
    
    try {
      const data = fs.readFileSync(bindingPath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      console.log(`📊 Loaded ${lines.length} lines from binding.txt`);
      
      // Parse all packets
      this.parseAllPackets(lines);
      
      // Find authentication patterns
      this.findAuthenticationPatterns();
      
      // Analyze patterns
      this.analyzePatterns();
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to analyze binding data: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse all packets from binding data
   */
  parseAllPackets(lines) {
    console.log('\n🔍 Parsing all packets...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line === 'bind' || line === 'unbind') {
        continue;
      }

      // Parse line format: "modem/machine timestamp - hex_data"
      const match = line.match(/^(modem|machine)\s+(\d+)\s+-\s+(.+)$/);
      if (!match) continue;

      const [, source, timestamp, hexData] = match;
      const packet = this.parsePacket(hexData);
      
      if (packet) {
        this.packets.push({
          source: source,
          timestamp: timestamp,
          hexData: hexData,
          packet: packet,
          length: packet.length,
          command: this.extractCommand(packet),
          sequence: this.extractSequence(packet)
        });
      }
    }

    console.log(`✅ Parsed ${this.packets.length} packets`);
  }

  /**
   * Parse hex packet
   */
  parsePacket(hexData) {
    try {
      const bytes = hexData.split(' ').map(hex => parseInt(hex, 16));
      return Buffer.from(bytes);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract command from packet
   */
  extractCommand(packet) {
    if (packet.length < 9) return null;
    return packet.slice(8, 12).toString('hex').toUpperCase();
  }

  /**
   * Extract sequence from packet
   */
  extractSequence(packet) {
    if (packet.length < 8) return null;
    return packet.slice(4, 8).toString('hex').toUpperCase();
  }

  /**
   * Find authentication patterns
   */
  findAuthenticationPatterns() {
    console.log('\n🔍 Looking for authentication patterns...');
    
    // Look for packets with command 10 02 00 01 (authentication)
    const authPackets = this.packets.filter(p => p.command === '10020001');
    
    console.log(`Found ${authPackets.length} authentication packets`);
    
    // Group by sequence to find challenge/response pairs
    const sequenceGroups = {};
    
    for (const packet of authPackets) {
      const sequence = packet.sequence;
      if (!sequenceGroups[sequence]) {
        sequenceGroups[sequence] = [];
      }
      sequenceGroups[sequence].push(packet);
    }
    
    // Find challenge/response pairs
    for (const [sequence, packets] of Object.entries(sequenceGroups)) {
      if (packets.length >= 2) {
        const machinePacket = packets.find(p => p.source === 'machine');
        const modemPacket = packets.find(p => p.source === 'modem');
        
        if (machinePacket && modemPacket) {
          this.authenticationPairs.push({
            sequence: sequence,
            challenge: machinePacket,
            response: modemPacket,
            timestamp: machinePacket.timestamp
          });
        }
      }
    }
    
    console.log(`✅ Found ${this.authenticationPairs.length} authentication pairs`);
  }

  /**
   * Analyze authentication patterns
   */
  analyzePatterns() {
    console.log('\n📊 Analyzing authentication patterns...');
    
    for (let i = 0; i < this.authenticationPairs.length; i++) {
      const pair = this.authenticationPairs[i];
      
      console.log(`\nAuthentication Pair ${i + 1}:`);
      console.log(`  Sequence: ${pair.sequence}`);
      console.log(`  Timestamp: ${pair.timestamp}`);
      console.log(`  Challenge: ${pair.challenge.hexData}`);
      console.log(`  Response:  ${pair.response.hexData}`);
      
      // Analyze packet structure
      const challengePacket = pair.challenge.packet;
      const responsePacket = pair.response.packet;
      
      console.log(`  Challenge Length: ${challengePacket.length} bytes`);
      console.log(`  Response Length: ${responsePacket.length} bytes`);
      
      // Extract challenge/response data (after command)
      const challengeData = challengePacket.slice(12); // Skip header + command
      const responseData = responsePacket.slice(12);
      
      console.log(`  Challenge Data: ${HexUtils.bufferToHex(challengeData)}`);
      console.log(`  Response Data:  ${HexUtils.bufferToHex(responseData)}`);
      
      // Analyze first 8 bytes (random challenge)
      const challengeRandom = challengeData.slice(0, 8);
      const responseRandom = responseData.slice(0, 8);
      
      console.log(`  Challenge Random: ${HexUtils.bufferToHex(challengeRandom)}`);
      console.log(`  Response Random:  ${HexUtils.bufferToHex(responseRandom)}`);
      
      // Test XOR transformation
      const xorResult = Buffer.from(challengeRandom.map((byte, index) => byte ^ responseRandom[index]));
      console.log(`  XOR Result: ${HexUtils.bufferToHex(xorResult)}`);
    }
  }

  /**
   * Save authentication pairs to test vectors
   */
  saveAuthenticationPairs() {
    const deviceInfo = {
      imei: "862817068367949",
      serial: "0021800078EHD5108DUZ00000002",
      model: "CEAB9UQ00", 
      firmware: "E++2.17",
      deviceType: "U-WMT"
    };

    const sessions = this.authenticationPairs.map((pair, index) => ({
      id: index + 1,
      timestamp: pair.timestamp,
      sequence: pair.sequence,
      challenge: pair.challenge.hexData,
      response: pair.response.hexData,
      source: 'binding.txt',
      deviceInfo: deviceInfo
    }));

    const testData = {
      deviceInfo: deviceInfo,
      sessions: sessions,
      analysis: {
        totalSessions: sessions.length,
        source: 'binding.txt',
        extractedAt: new Date().toISOString()
      }
    };

    const outputPath = path.join(__dirname, '../../test-vectors/binding-authentication-sessions.json');
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
      console.log(`\n💾 Saved ${sessions.length} authentication sessions to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save sessions: ${error.message}`);
      return false;
    }
  }

  /**
   * Run analysis
   */
  runAnalysis() {
    console.log('🚀 Starting Binding Data Analysis...\n');
    
    // Analyze binding data
    if (!this.analyzeBindingData()) {
      return false;
    }

    // Save authentication pairs
    this.saveAuthenticationPairs();

    console.log('\n✅ Analysis complete!');
    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new BindingAnalyzer();
  analyzer.runAnalysis();
}

module.exports = BindingAnalyzer;
