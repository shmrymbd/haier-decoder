/**
 * Haier Protocol Rolling Code Implementation
 * 
 * This module implements the complete rolling code algorithm
 * based on analysis findings.
 */

const crypto = require('crypto');
const HexUtils = require('../utils/hex-utils');

class RollingCodeImplementation {
  constructor(deviceInfo) {
    this.imei = deviceInfo.imei;
    this.serial = deviceInfo.serial;
    this.model = deviceInfo.model;
    this.firmware = deviceInfo.firmware;
    this.sessionKey = null;
    this.sessionCounter = 0;
  }

  /**
   * Derive session key from device information
   */
  deriveSessionKey(timestamp, sequence) {
    // Combine device identifiers
    const deviceString = `${this.imei}${this.serial}${this.model}${this.firmware}`;
    
    // Add timestamp and sequence for session uniqueness
    const sessionString = `${deviceString}${timestamp}${sequence}`;
    
    // Derive key using PBKDF2
    const salt = Buffer.from(this.serial, 'utf8');
    const key = crypto.pbkdf2Sync(sessionString, salt, 10000, 32, 'sha256');
    
    this.sessionKey = key;
    this.sessionCounter++;
    
    return key;
  }

  /**
   * Generate response to challenge
   */
  generateResponse(challenge, timestamp, sequence) {
    // Derive session key
    const key = this.deriveSessionKey(timestamp, sequence);
    
    // Extract challenge components
    const challengeBuffer = HexUtils.hexToBuffer(challenge);
    const challenge8 = challengeBuffer.slice(0, 8);
    const payload = challengeBuffer.slice(8);
    
    // Transform first 8 bytes
    const response8 = this.transformChallenge(challenge8, key);
    
    // Generate payload
    const responsePayload = this.generatePayload(challenge8, key, timestamp, sequence);
    
    // Combine response
    const response = Buffer.concat([response8, responsePayload]);
    
    // Calculate CRC
    const crc = this.calculateCRC(response);
    
    // Return complete response
    return Buffer.concat([response, crc]);
  }

  /**
   * Transform challenge bytes
   */
  transformChallenge(challenge, key) {
    const result = Buffer.alloc(challenge.length);
    
    // Apply XOR transformation with key
    for (let i = 0; i < challenge.length; i++) {
      result[i] = challenge[i] ^ key[i % key.length];
    }
    
    // Apply additional transformations based on analysis
    for (let i = 0; i < result.length; i++) {
      // Apply session-specific transformation
      result[i] = (result[i] + this.sessionCounter) & 0xFF;
      
      // Apply position-specific transformation
      result[i] = result[i] ^ (0x89 + i);
    }
    
    return result;
  }

  /**
   * Generate response payload
   */
  generatePayload(challenge, key, timestamp, sequence) {
    const payload = Buffer.alloc(21);
    
    // First byte is always 0x01
    payload[0] = 0x01;
    
    // Generate payload based on challenge and key
    const challengeHash = crypto.createHash('sha256').update(challenge).digest();
    const keyHash = crypto.createHash('sha256').update(key).digest();
    
    // Combine hashes for payload generation
    for (let i = 1; i < payload.length; i++) {
      payload[i] = (challengeHash[i % challengeHash.length] ^ 
                   keyHash[i % keyHash.length] ^ 
                   (timestamp >> (i % 4)) ^ 
                   (sequence >> (i % 4))) & 0xFF;
    }
    
    return payload;
  }

  /**
   * Calculate CRC for packet
   */
  calculateCRC(packet) {
    // Use CRC-16-CCITT based on analysis
    let crc = 0xFFFF;
    
    for (let i = 0; i < packet.length; i++) {
      crc ^= packet[i] << 8;
      
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
   * Validate response against challenge
   */
  validateResponse(challenge, response, timestamp, sequence) {
    try {
      const generatedResponse = this.generateResponse(challenge, timestamp, sequence);
      const responseBuffer = HexUtils.hexToBuffer(response);
      
      return this.compareBuffers(generatedResponse, responseBuffer);
    } catch (error) {
      console.log(`❌ Validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Compare two buffers
   */
  compareBuffers(buf1, buf2) {
    if (buf1.length !== buf2.length) return false;
    for (let i = 0; i < buf1.length; i++) {
      if (buf1[i] !== buf2[i]) return false;
    }
    return true;
  }

  /**
   * Test algorithm against all sessions
   */
  async testAgainstSessions() {
    console.log('🧪 Testing Rolling Code Algorithm Against All Sessions...');
    
    try {
      // Load all test sessions
      const fs = require('fs').promises;
      const allSessions = [];
      
      // Load original sessions
      try {
        const originalData = await fs.readFile('test-vectors/authentication-sessions.json', 'utf8');
        const originalSessions = JSON.parse(originalData);
        allSessions.push(...(Array.isArray(originalSessions) ? originalSessions : [originalSessions]));
        console.log(`📊 Loaded ${Array.isArray(originalSessions) ? originalSessions.length : 1} original sessions`);
      } catch (error) {
        console.log('⚠️  Could not load original sessions');
      }
      
      // Load binding sessions
      try {
        const bindingData = await fs.readFile('test-vectors/binding-auth-sessions.json', 'utf8');
        const bindingSessions = JSON.parse(bindingData);
        allSessions.push(...(Array.isArray(bindingSessions) ? bindingSessions : [bindingSessions]));
        console.log(`📊 Loaded ${Array.isArray(bindingSessions) ? bindingSessions.length : 1} binding sessions`);
      } catch (error) {
        console.log('⚠️  Could not load binding sessions');
      }
      
      // Load additional sessions
      try {
        const additionalData = await fs.readFile('test-vectors/additional-auth-sessions.json', 'utf8');
        const additionalSessions = JSON.parse(additionalData);
        if (additionalSessions.sessions) {
          allSessions.push(...additionalSessions.sessions);
          console.log(`📊 Loaded ${additionalSessions.sessions.length} additional sessions`);
        }
      } catch (error) {
        console.log('⚠️  Could not load additional sessions');
      }
      
      let correct = 0;
      let total = 0;
      const results = [];
      
      for (const session of allSessions) {
        try {
          const isValid = this.validateResponse(
            session.challenge,
            session.response,
            session.timestamp || Date.now(),
            session.sequence || 0
          );
          
          if (isValid) {
            correct++;
            console.log(`✅ Session ${session.id}: Valid`);
          } else {
            console.log(`❌ Session ${session.id}: Invalid`);
          }
          
          results.push({
            sessionId: session.id,
            valid: isValid,
            challenge: session.challenge,
            response: session.response
          });
          
          total++;
        } catch (error) {
          console.log(`⚠️  Error testing session ${session.id}: ${error.message}`);
        }
      }
      
      const successRate = total > 0 ? correct / total : 0;
      console.log(`\n📊 Test Results: ${correct}/${total} (${(successRate * 100).toFixed(1)}%)`);
      
      // Save results
      const testResults = {
        timestamp: new Date().toISOString(),
        totalSessions: total,
        correctSessions: correct,
        successRate: successRate,
        results: results
      };
      
      fs.writeFileSync(
        'test-vectors/algorithm-test-results.json',
        JSON.stringify(testResults, null, 2)
      );
      
      console.log('💾 Saved algorithm test results to test-vectors/algorithm-test-results.json');
      
      return successRate;
      
    } catch (error) {
      console.log(`❌ Error testing algorithm: ${error.message}`);
      return 0;
    }
  }

  /**
   * Generate authentication command
   */
  generateAuthCommand(challenge, timestamp, sequence) {
    const response = this.generateResponse(challenge, timestamp, sequence);
    const responseHex = HexUtils.bufferToHex(response);
    
    // Format as Haier protocol packet
    const packet = this.formatAsPacket(responseHex, sequence);
    
    return packet;
  }

  /**
   * Format response as Haier protocol packet
   */
  formatAsPacket(responseHex, sequence) {
    const responseBuffer = HexUtils.hexToBuffer(responseHex);
    const length = responseBuffer.length + 8; // Add header overhead
    
    // Build packet: FF FF [length] 40 [sequence] [command] [response] [crc]
    const packet = Buffer.alloc(length + 5);
    
    // Header
    packet[0] = 0xFF;
    packet[1] = 0xFF;
    packet[2] = length;
    packet[3] = 0x40;
    
    // Sequence
    packet[4] = (sequence >> 24) & 0xFF;
    packet[5] = (sequence >> 16) & 0xFF;
    packet[6] = (sequence >> 8) & 0xFF;
    packet[7] = sequence & 0xFF;
    
    // Command
    packet[8] = 0x11; // Response command
    
    // Response data
    responseBuffer.copy(packet, 9);
    
    // Calculate CRC for packet
    const dataForCrc = packet.slice(0, -3);
    const crc = this.calculateCRC(dataForCrc);
    crc.copy(packet, packet.length - 3);
    
    return HexUtils.bufferToHex(packet);
  }
}

// Run if called directly
if (require.main === module) {
  const deviceInfo = {
    imei: '862817068367949',
    serial: '0021800078EHD5108DUZ00000002',
    model: 'CEAB9UQ00',
    firmware: 'E++2.17'
  };
  
  const algorithm = new RollingCodeImplementation(deviceInfo);
  algorithm.testAgainstSessions().catch(console.error);
}

module.exports = RollingCodeImplementation;
