/**
 * Additional Session Extractor
 * 
 * This module extracts authentication sessions from binding.txt and rolling.txt
 * to expand our dataset for rolling code analysis.
 */

const HexUtils = require('../utils/hex-utils');
const fs = require('fs');

class AdditionalSessionExtractor {
  constructor() {
    this.sessions = [];
    this.deviceInfo = {
      imei: '862817068367949',
      serial: '0021800078EHD5108DUZ00000002',
      model: 'CEAB9UQ00',
      firmware: 'E++2.17'
    };
  }

  /**
   * Extract all authentication sessions from both files
   */
  async extractAllSessions() {
    console.log('🔍 Extracting authentication sessions from additional data...');
    
    // Extract from binding.txt
    await this.extractFromFile('binding.txt', 'binding');
    
    // Extract from rolling.txt
    await this.extractFromFile('rolling.txt', 'rolling');
    
    console.log(`📊 Total sessions extracted: ${this.sessions.length}`);
    
    // Save all sessions
    this.saveSessions();
    
    return this.sessions;
  }

  /**
   * Extract sessions from a specific file
   */
  async extractFromFile(filename, source) {
    try {
      const data = fs.readFileSync(filename, 'utf8');
      const lines = data.split('\n');
      
      console.log(`📁 Processing ${filename} (${lines.length} lines)...`);
      
      let sessionCount = 0;
      let currentSession = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Look for authentication packets (command 12 and 11)
        if (this.isAuthenticationPacket(line)) {
          const packet = this.parsePacket(line);
          
          if (packet.command === 0x12) {
            // Challenge packet
            if (currentSession) {
              // Save previous session if incomplete
              if (currentSession.challenge && !currentSession.response) {
                console.log(`⚠️  Incomplete session from ${source}: challenge only`);
              }
            }
            
            currentSession = {
              id: this.sessions.length + 1,
              source: source,
              timestamp: this.extractTimestamp(line),
              challenge: packet.payload,
              response: null,
              deviceInfo: this.deviceInfo
            };
            
          } else if (packet.command === 0x11 && currentSession) {
            // Response packet
            currentSession.response = packet.payload;
            currentSession.sequence = packet.sequence;
            
            // Complete session
            this.sessions.push(currentSession);
            sessionCount++;
            
            console.log(`✅ Session ${currentSession.id} from ${source}: ${currentSession.challenge.slice(0, 16)}... → ${currentSession.response.slice(0, 16)}...`);
            
            currentSession = null;
          } else if (packet.command === 0x11 && !currentSession) {
            // Orphaned response - create new session
            currentSession = {
              id: this.sessions.length + 1,
              source: source,
              timestamp: this.extractTimestamp(line),
              challenge: null,
              response: packet.payload,
              deviceInfo: this.deviceInfo
            };
            
            // Save as incomplete session
            this.sessions.push(currentSession);
            sessionCount++;
            
            console.log(`⚠️  Orphaned response session ${currentSession.id} from ${source}: ${currentSession.response.slice(0, 16)}...`);
            
            currentSession = null;
          }
        }
      }
      
      // Handle incomplete session
      if (currentSession && currentSession.challenge) {
        console.log(`⚠️  Incomplete session from ${source}: challenge only`);
      }
      
      console.log(`📊 Extracted ${sessionCount} complete sessions from ${filename}`);
      
    } catch (error) {
      console.log(`❌ Error processing ${filename}: ${error.message}`);
    }
  }

  /**
   * Check if line contains authentication packet
   */
  isAuthenticationPacket(line) {
    // Look for authentication packets with command 12 (challenge) or 11 (response)
    return line.includes('10 02 00 01');
  }

  /**
   * Parse packet from line
   */
  parsePacket(line) {
    try {
      // Extract hex data from line
      const hexMatch = line.match(/([0-9a-fA-F\s]+)$/);
      if (!hexMatch) return null;
      
      const hexString = hexMatch[1].replace(/\s+/g, '');
      const bytes = HexUtils.hexToBuffer(hexString);
      
      if (bytes.length < 10) return null;
      
      // Parse packet structure
      const header = bytes.slice(0, 2);
      const length = bytes[2];
      const frameType = bytes[3];
      const sequence = bytes.slice(4, 8);
      const command = bytes[8];
      const payload = bytes.slice(9, -3); // Exclude CRC
      const crc = bytes.slice(-3);
      
      return {
        header: header,
        length: length,
        frameType: frameType,
        sequence: sequence,
        command: command,
        payload: HexUtils.bufferToHex(payload),
        crc: crc
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract timestamp from line
   */
  extractTimestamp(line) {
    const timestampMatch = line.match(/(\d+)\s*-/);
    return timestampMatch ? parseInt(timestampMatch[1]) : null;
  }

  /**
   * Save all sessions to file
   */
  saveSessions() {
    const data = {
      timestamp: new Date().toISOString(),
      totalSessions: this.sessions.length,
      deviceInfo: this.deviceInfo,
      sessions: this.sessions
    };
    
    fs.writeFileSync(
      'test-vectors/additional-auth-sessions.json',
      JSON.stringify(data, null, 2)
    );
    
    console.log('💾 Saved additional sessions to test-vectors/additional-auth-sessions.json');
  }

  /**
   * Analyze session patterns
   */
  analyzePatterns() {
    console.log('\n🔍 Analyzing session patterns...');
    
    const patterns = {
      totalSessions: this.sessions.length,
      sources: {},
      timestamps: [],
      challenges: [],
      responses: []
    };
    
    for (const session of this.sessions) {
      // Count by source
      patterns.sources[session.source] = (patterns.sources[session.source] || 0) + 1;
      
      // Collect timestamps
      if (session.timestamp) {
        patterns.timestamps.push(session.timestamp);
      }
      
      // Collect challenge/response pairs
      patterns.challenges.push(session.challenge);
      patterns.responses.push(session.response);
    }
    
    // Calculate time deltas
    if (patterns.timestamps.length > 1) {
      patterns.timestamps.sort((a, b) => a - b);
      const deltas = [];
      for (let i = 1; i < patterns.timestamps.length; i++) {
        deltas.push(patterns.timestamps[i] - patterns.timestamps[i-1]);
      }
      patterns.timeDeltas = deltas;
      patterns.avgTimeDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
    
    console.log('📊 Pattern Analysis:');
    console.log(`   Total sessions: ${patterns.totalSessions}`);
    console.log(`   Sources: ${JSON.stringify(patterns.sources)}`);
    console.log(`   Time range: ${patterns.timestamps[0]} - ${patterns.timestamps[patterns.timestamps.length - 1]}`);
    if (patterns.avgTimeDelta) {
      console.log(`   Average time delta: ${patterns.avgTimeDelta.toFixed(1)} seconds`);
    }
    
    return patterns;
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new AdditionalSessionExtractor();
  extractor.extractAllSessions()
    .then(() => extractor.analyzePatterns())
    .catch(console.error);
}

module.exports = AdditionalSessionExtractor;
