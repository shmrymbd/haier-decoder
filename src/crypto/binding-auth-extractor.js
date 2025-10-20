#!/usr/bin/env node

/**
 * Binding Authentication Extractor
 * 
 * This script extracts the specific authentication sessions from binding.txt
 * that contain the 10 02 00 01 command pattern.
 */

const fs = require('fs');
const path = require('path');
const HexUtils = require('../utils/hex-utils');

class BindingAuthExtractor {
  constructor() {
    this.sessions = [];
    this.deviceInfo = {
      imei: "862817068367949",
      serial: "0021800078EHD5108DUZ00000002",
      model: "CEAB9UQ00",
      firmware: "E++2.17",
      deviceType: "U-WMT"
    };
  }

  /**
   * Extract authentication sessions from binding data
   */
  extractAuthenticationSessions() {
    const bindingPath = path.join(__dirname, '../../binding.txt');
    
    try {
      const data = fs.readFileSync(bindingPath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      console.log(`📊 Loaded ${lines.length} lines from binding.txt`);
      
      // Find authentication packets
      const authPackets = this.findAuthenticationPackets(lines);
      
      // Create sessions from authentication packets
      this.createSessions(authPackets);
      
      // Analyze sessions
      this.analyzeSessions();
      
      // Save sessions
      this.saveSessions();
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to extract authentication sessions: ${error.message}`);
      return false;
    }
  }

  /**
   * Find authentication packets with 10 02 00 01 command
   */
  findAuthenticationPackets(lines) {
    console.log('\n🔍 Looking for authentication packets...');
    
    const authPackets = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line === 'bind' || line === 'unbind') {
        continue;
      }

      // Parse line format: "modem/machine timestamp - hex_data"
      const match = line.match(/^(modem|machine)\s+(\d+)\s+-\s+(.+)$/);
      if (!match) continue;

      const [, source, timestamp, hexData] = match;
      
      // Check if this packet contains authentication command
      if (hexData.includes('10 02 00 01')) {
        const packet = this.parsePacket(hexData);
        
        if (packet) {
          authPackets.push({
            source: source,
            timestamp: timestamp,
            hexData: hexData,
            packet: packet,
            lineNumber: i + 1
          });
          
          console.log(`✅ Found auth packet: ${source} ${timestamp} (line ${i + 1})`);
        }
      }
    }
    
    console.log(`✅ Found ${authPackets.length} authentication packets`);
    return authPackets;
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
   * Create sessions from authentication packets
   */
  createSessions(authPackets) {
    console.log('\n🔍 Creating authentication sessions...');
    
    // Group packets by sequence number
    const sequenceGroups = {};
    
    for (const packet of authPackets) {
      const sequence = packet.packet.slice(4, 8).toString('hex').toUpperCase();
      
      if (!sequenceGroups[sequence]) {
        sequenceGroups[sequence] = [];
      }
      sequenceGroups[sequence].push(packet);
    }
    
    // Create sessions from groups
    let sessionId = 1;
    
    for (const [sequence, packets] of Object.entries(sequenceGroups)) {
      if (packets.length >= 2) {
        const machinePacket = packets.find(p => p.source === 'machine');
        const modemPacket = packets.find(p => p.source === 'modem');
        
        if (machinePacket && modemPacket) {
          const session = {
            id: sessionId,
            timestamp: machinePacket.timestamp,
            sequence: sequence,
            challenge: machinePacket.hexData,
            response: modemPacket.hexData,
            source: 'binding.txt',
            deviceInfo: this.deviceInfo
          };
          
          this.sessions.push(session);
          sessionId++;
          
          console.log(`✅ Created session ${sessionId - 1}: ${sequence}`);
        }
      }
    }
    
    console.log(`✅ Created ${this.sessions.length} authentication sessions`);
  }

  /**
   * Analyze extracted sessions
   */
  analyzeSessions() {
    console.log('\n📊 Analyzing extracted sessions...');
    
    for (const session of this.sessions) {
      console.log(`\nSession ${session.id}:`);
      console.log(`  Timestamp: ${session.timestamp}`);
      console.log(`  Sequence: ${session.sequence}`);
      console.log(`  Challenge: ${session.challenge}`);
      console.log(`  Response:  ${session.response}`);
      
      // Parse packets for analysis
      const challengePacket = this.parsePacket(session.challenge);
      const responsePacket = this.parsePacket(session.response);
      
      if (challengePacket && responsePacket) {
        console.log(`  Challenge Length: ${challengePacket.length} bytes`);
        console.log(`  Response Length: ${responsePacket.length} bytes`);
        
        // Extract challenge/response data (after command 10 02 00 01)
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
          
          // Calculate accuracy
          const accuracy = this.calculateAccuracy(challengeRandom, responseRandom);
          console.log(`  Random Accuracy: ${accuracy.toFixed(2)}%`);
        }
      }
    }
  }

  /**
   * Calculate accuracy between two buffers
   */
  calculateAccuracy(buffer1, buffer2) {
    if (buffer1.length !== buffer2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < buffer1.length; i++) {
      if (buffer1[i] === buffer2[i]) {
        matches++;
      }
    }
    
    return matches / buffer1.length;
  }

  /**
   * Save sessions to test vectors
   */
  saveSessions() {
    const testData = {
      deviceInfo: this.deviceInfo,
      sessions: this.sessions,
      analysis: {
        totalSessions: this.sessions.length,
        source: 'binding.txt',
        extractedAt: new Date().toISOString()
      }
    };

    const outputPath = path.join(__dirname, '../../test-vectors/binding-auth-sessions.json');
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
      console.log(`\n💾 Saved ${this.sessions.length} authentication sessions to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save sessions: ${error.message}`);
      return false;
    }
  }

  /**
   * Run extraction
   */
  runExtraction() {
    console.log('🚀 Starting Binding Authentication Extraction...\n');
    
    // Extract authentication sessions
    if (!this.extractAuthenticationSessions()) {
      return false;
    }

    console.log('\n✅ Extraction complete!');
    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new BindingAuthExtractor();
  extractor.runExtraction();
}

module.exports = BindingAuthExtractor;
