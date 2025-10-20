#!/usr/bin/env node

/**
 * Binding Data Extractor
 * 
 * This script extracts authentication sessions from the binding.txt file
 * and creates additional test vectors for rolling code analysis.
 */

const fs = require('fs');
const path = require('path');
const HexUtils = require('../utils/hex-utils');

class BindingDataExtractor {
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
   * Load and parse binding.txt file
   */
  loadBindingData() {
    const bindingPath = path.join(__dirname, '../../binding.txt');
    
    try {
      const data = fs.readFileSync(bindingPath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      console.log(`📊 Loaded ${lines.length} lines from binding.txt`);
      return this.parseBindingData(lines);
    } catch (error) {
      console.error(`❌ Failed to load binding data: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse binding data and extract authentication sessions
   */
  parseBindingData(lines) {
    console.log('\n🔍 Parsing binding data for authentication sessions...');
    
    const sessions = [];
    let currentSession = null;
    let sessionId = 1;

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
      
      if (!packet) continue;

      // Look for authentication packets (command 10 02 00 01)
      if (this.isAuthenticationPacket(packet)) {
        if (source === 'machine') {
          // This is a challenge from machine
          if (currentSession) {
            // Complete previous session
            if (currentSession.challenge) {
              sessions.push(currentSession);
              sessionId++;
            }
          }
          
          currentSession = {
            id: sessionId,
            timestamp: timestamp,
            sequence: this.extractSequence(packet),
            challenge: hexData,
            response: null,
            source: 'binding.txt',
            deviceInfo: this.deviceInfo
          };
        } else if (source === 'modem' && currentSession) {
          // This is a response from modem
          currentSession.response = hexData;
          currentSession.responseTimestamp = timestamp;
        }
      }
    }

    // Add final session if it exists
    if (currentSession && currentSession.challenge && currentSession.response) {
      sessions.push(currentSession);
    }

    console.log(`✅ Extracted ${sessions.length} authentication sessions`);
    return sessions;
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
   * Check if packet is authentication packet
   */
  isAuthenticationPacket(packet) {
    if (packet.length < 10) return false;
    
    // Look for authentication command pattern: 10 02 00 01
    // This appears after the sequence (bytes 4-7)
    const commandStart = 8;
    if (packet.length < commandStart + 4) return false;
    
    return packet[commandStart] === 0x10 && 
           packet[commandStart + 1] === 0x02 && 
           packet[commandStart + 2] === 0x00 && 
           packet[commandStart + 3] === 0x01;
  }

  /**
   * Extract sequence number from packet
   */
  extractSequence(packet) {
    if (packet.length < 8) return "00";
    return packet.slice(4, 8).toString('hex').toUpperCase();
  }

  /**
   * Analyze extracted sessions
   */
  analyzeSessions(sessions) {
    console.log('\n📊 Analyzing extracted sessions...');
    
    for (const session of sessions) {
      console.log(`\nSession ${session.id}:`);
      console.log(`  Timestamp: ${session.timestamp}`);
      console.log(`  Sequence: ${session.sequence}`);
      console.log(`  Challenge: ${session.challenge.substring(0, 50)}...`);
      console.log(`  Response:  ${session.response.substring(0, 50)}...`);
      
      // Analyze packet structure
      const challengePacket = this.parsePacket(session.challenge);
      const responsePacket = this.parsePacket(session.response);
      
      if (challengePacket && responsePacket) {
        console.log(`  Challenge Length: ${challengePacket.length} bytes`);
        console.log(`  Response Length: ${responsePacket.length} bytes`);
        
        // Extract challenge/response data (skip headers)
        const challengeData = challengePacket.slice(12); // Skip header + command
        const responseData = responsePacket.slice(12);
        
        console.log(`  Challenge Data: ${HexUtils.bufferToHex(challengeData)}`);
        console.log(`  Response Data:  ${HexUtils.bufferToHex(responseData)}`);
      }
    }
  }

  /**
   * Save sessions to test vectors
   */
  saveSessions(sessions) {
    const testData = {
      deviceInfo: this.deviceInfo,
      sessions: sessions,
      analysis: {
        totalSessions: sessions.length,
        source: 'binding.txt',
        extractedAt: new Date().toISOString()
      }
    };

    const outputPath = path.join(__dirname, '../../test-vectors/binding-sessions.json');
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
      console.log(`\n💾 Saved ${sessions.length} sessions to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save sessions: ${error.message}`);
      return false;
    }
  }

  /**
   * Run extraction process
   */
  runExtraction() {
    console.log('🚀 Starting Binding Data Extraction...\n');
    
    // Load binding data
    const sessions = this.loadBindingData();
    if (!sessions) {
      return false;
    }

    // Analyze sessions
    this.analyzeSessions(sessions);

    // Save sessions
    this.saveSessions(sessions);

    console.log('\n✅ Extraction complete!');
    return sessions;
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new BindingDataExtractor();
  extractor.runExtraction();
}

module.exports = BindingDataExtractor;
