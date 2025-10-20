#!/usr/bin/env node

/**
 * Detailed Binding Data Analyzer
 * 
 * This script performs detailed analysis of the binding.txt file
 * to understand packet structure and find authentication patterns.
 */

const fs = require('fs');
const path = require('path');
const HexUtils = require('../utils/hex-utils');

class DetailedBindingAnalyzer {
  constructor() {
    this.packets = [];
    this.commands = {};
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
      
      // Analyze packet structure
      this.analyzePacketStructure();
      
      // Find authentication patterns
      this.findAuthenticationPatterns();
      
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
        const packetInfo = {
          source: source,
          timestamp: timestamp,
          hexData: hexData,
          packet: packet,
          length: packet.length,
          header: packet.slice(0, 2).toString('hex').toUpperCase(),
          lengthByte: packet[2],
          frameType: packet[3],
          sequence: packet.slice(4, 8).toString('hex').toUpperCase(),
          command: packet.length > 8 ? packet.slice(8, 12).toString('hex').toUpperCase() : null,
          payload: packet.length > 12 ? packet.slice(12, -3).toString('hex').toUpperCase() : null,
          crc: packet.length > 3 ? packet.slice(-3).toString('hex').toUpperCase() : null
        };
        
        this.packets.push(packetInfo);
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
   * Analyze packet structure
   */
  analyzePacketStructure() {
    console.log('\n📊 Analyzing packet structure...');
    
    // Group packets by command
    for (const packet of this.packets) {
      if (packet.command) {
        if (!this.commands[packet.command]) {
          this.commands[packet.command] = [];
        }
        this.commands[packet.command].push(packet);
      }
    }
    
    console.log(`\nFound ${Object.keys(this.commands).length} different commands:`);
    for (const [command, packets] of Object.entries(this.commands)) {
      console.log(`  ${command}: ${packets.length} packets`);
    }
    
    // Look for authentication-related commands
    console.log('\n🔍 Looking for authentication-related commands...');
    
    const authCommands = [
      '10020001', // Authentication command
      '10020000', // Alternative auth command
      '10000001', // Another possible auth command
      '10000000'  // Yet another possible auth command
    ];
    
    for (const authCmd of authCommands) {
      if (this.commands[authCmd]) {
        console.log(`\nFound ${this.commands[authCmd].length} packets with command ${authCmd}:`);
        for (const packet of this.commands[authCmd]) {
          console.log(`  ${packet.source} ${packet.timestamp}: ${packet.hexData.substring(0, 50)}...`);
        }
      }
    }
  }

  /**
   * Find authentication patterns
   */
  findAuthenticationPatterns() {
    console.log('\n🔍 Looking for authentication patterns...');
    
    // Look for packets with specific patterns that might be authentication
    const potentialAuthPackets = this.packets.filter(p => {
      // Look for packets with command starting with 10
      return p.command && p.command.startsWith('10');
    });
    
    console.log(`Found ${potentialAuthPackets.length} packets with command starting with '10'`);
    
    // Group by sequence to find pairs
    const sequenceGroups = {};
    
    for (const packet of potentialAuthPackets) {
      const sequence = packet.sequence;
      if (!sequenceGroups[sequence]) {
        sequenceGroups[sequence] = [];
      }
      sequenceGroups[sequence].push(packet);
    }
    
    // Find potential challenge/response pairs
    const authPairs = [];
    
    for (const [sequence, packets] of Object.entries(sequenceGroups)) {
      if (packets.length >= 2) {
        const machinePacket = packets.find(p => p.source === 'machine');
        const modemPacket = packets.find(p => p.source === 'modem');
        
        if (machinePacket && modemPacket) {
          authPairs.push({
            sequence: sequence,
            challenge: machinePacket,
            response: modemPacket,
            timestamp: machinePacket.timestamp
          });
        }
      }
    }
    
    console.log(`✅ Found ${authPairs.length} potential authentication pairs`);
    
    // Analyze each pair
    for (let i = 0; i < authPairs.length; i++) {
      const pair = authPairs[i];
      
      console.log(`\nAuthentication Pair ${i + 1}:`);
      console.log(`  Sequence: ${pair.sequence}`);
      console.log(`  Timestamp: ${pair.timestamp}`);
      console.log(`  Challenge Command: ${pair.challenge.command}`);
      console.log(`  Response Command: ${pair.response.command}`);
      console.log(`  Challenge: ${pair.challenge.hexData}`);
      console.log(`  Response:  ${pair.response.hexData}`);
      
      // Analyze packet structure
      const challengePacket = pair.challenge.packet;
      const responsePacket = pair.response.packet;
      
      console.log(`  Challenge Length: ${challengePacket.length} bytes`);
      console.log(`  Response Length: ${responsePacket.length} bytes`);
      
      // Extract challenge/response data (after command)
      if (challengePacket.length > 12 && responsePacket.length > 12) {
        const challengeData = challengePacket.slice(12); // Skip header + command
        const responseData = responsePacket.slice(12);
        
        console.log(`  Challenge Data: ${HexUtils.bufferToHex(challengeData)}`);
        console.log(`  Response Data:  ${HexUtils.bufferToHex(responseData)}`);
        
        // Analyze first 8 bytes (random challenge)
        if (challengeData.length >= 8 && responseData.length >= 8) {
          const challengeRandom = challengeData.slice(0, 8);
          const responseRandom = responseData.slice(0, 8);
          
          console.log(`  Challenge Random: ${HexUtils.bufferToHex(challengeRandom)}`);
          console.log(`  Response Random:  ${HexUtils.bufferToHex(responseRandom)}`);
          
          // Test XOR transformation
          const xorResult = Buffer.from(challengeRandom.map((byte, index) => byte ^ responseRandom[index]));
          console.log(`  XOR Result: ${HexUtils.bufferToHex(xorResult)}`);
        }
      }
    }
    
    return authPairs;
  }

  /**
   * Run analysis
   */
  runAnalysis() {
    console.log('🚀 Starting Detailed Binding Data Analysis...\n');
    
    // Analyze binding data
    if (!this.analyzeBindingData()) {
      return false;
    }

    console.log('\n✅ Analysis complete!');
    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new DetailedBindingAnalyzer();
  analyzer.runAnalysis();
}

module.exports = DetailedBindingAnalyzer;
