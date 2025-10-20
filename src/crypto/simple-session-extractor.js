/**
 * Simple Session Extractor
 * 
 * Direct extraction of authentication sessions from the data files.
 */

const fs = require('fs');

class SimpleSessionExtractor {
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
   * Extract all sessions
   */
  async extractAllSessions() {
    console.log('🔍 Extracting authentication sessions...');
    
    // Extract from binding.txt
    await this.extractFromFile('binding.txt', 'binding');
    
    // Extract from rolling.txt
    await this.extractFromFile('rolling.txt', 'rolling');
    
    console.log(`📊 Total sessions extracted: ${this.sessions.length}`);
    
    // Save sessions
    this.saveSessions();
    
    return this.sessions;
  }

  /**
   * Extract from file
   */
  async extractFromFile(filename, source) {
    try {
      const data = fs.readFileSync(filename, 'utf8');
      const lines = data.split('\n');
      
      console.log(`📁 Processing ${filename} (${lines.length} lines)...`);
      
      let sessionCount = 0;
      const challenges = [];
      const responses = [];
      
      for (const line of lines) {
        if (line.includes('10 02 00 01')) {
          const timestamp = this.extractTimestamp(line);
          const hexData = this.extractHexData(line);
          
          if (line.includes('00 12 10 02 00 01')) {
            // Challenge packet (command 12)
            const challenge = hexData.substring(18); // Remove header and command
            challenges.push({ timestamp, challenge, line });
            console.log(`📤 Challenge: ${challenge.substring(0, 16)}...`);
            
          } else if (line.includes('00 11 10 02 00 01')) {
            // Response packet (command 11)
            const response = hexData.substring(18); // Remove header and command
            responses.push({ timestamp, response, line });
            console.log(`📥 Response: ${response.substring(0, 16)}...`);
          }
        }
      }
      
      // Match challenges with responses by timestamp proximity
      for (const challenge of challenges) {
        const response = this.findMatchingResponse(challenge, responses);
        
        if (response) {
          const session = {
            id: this.sessions.length + 1,
            source: source,
            timestamp: challenge.timestamp,
            challenge: challenge.challenge,
            response: response.response,
            deviceInfo: this.deviceInfo
          };
          
          this.sessions.push(session);
          sessionCount++;
          
          console.log(`✅ Session ${session.id} from ${source}: ${session.challenge.substring(0, 16)}... → ${session.response.substring(0, 16)}...`);
        } else {
          console.log(`⚠️  Unmatched challenge from ${source}: ${challenge.challenge.substring(0, 16)}...`);
        }
      }
      
      console.log(`📊 Extracted ${sessionCount} complete sessions from ${filename}`);
      
    } catch (error) {
      console.log(`❌ Error processing ${filename}: ${error.message}`);
    }
  }

  /**
   * Extract timestamp from line
   */
  extractTimestamp(line) {
    const match = line.match(/(\d+)\s*-/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract hex data from line
   */
  extractHexData(line) {
    const match = line.match(/([0-9a-fA-F\s]+)$/);
    return match ? match[1].replace(/\s+/g, '') : '';
  }

  /**
   * Find matching response for challenge
   */
  findMatchingResponse(challenge, responses) {
    // Find response within 10 seconds of challenge
    const timeWindow = 10;
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      if (response.timestamp && challenge.timestamp) {
        const timeDiff = Math.abs(response.timestamp - challenge.timestamp);
        if (timeDiff <= timeWindow) {
          // Remove this response from the list to avoid reuse
          responses.splice(i, 1);
          return response;
        }
      }
    }
    
    return null;
  }

  /**
   * Save sessions
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
}

// Run if called directly
if (require.main === module) {
  const extractor = new SimpleSessionExtractor();
  extractor.extractAllSessions().catch(console.error);
}

module.exports = SimpleSessionExtractor;
