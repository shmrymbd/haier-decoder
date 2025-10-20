#!/usr/bin/env node

/**
 * Authentication Pattern Analysis
 * Analyzes rolling code authentication patterns from dualLogs.txt
 * Compares with pyhOn library authentication mechanisms
 */

const fs = require('fs');
const path = require('path');

class AuthenticationAnalyzer {
  constructor() {
    this.dualLogsPath = path.join(__dirname, 'dualLogs.txt');
    
    // Authentication patterns from pyhOn library analysis
    this.pyhOnAuthPatterns = {
      challengeFormat: "FF FF 25 40 00 00 00 00 00 11 10 02 00 01 [challenge:8] 01 [encrypted:16-24]",
      responseFormat: "FF FF 25 40 00 00 00 00 00 12 10 02 00 01 [challenge:8] 01 [encrypted:16-24]",
      description: "Rolling code authentication with 8-byte challenges and encrypted responses",
      securityFeatures: [
        "Rolling codes - Each session generates unique challenges",
        "Encryption - Responses are encrypted using unknown algorithm", 
        "Session-based - Authentication tied to communication session",
        "Timeout - Authentication expires after session timeout"
      ]
    };
  }

  /**
   * Parse authentication packets from dual logs
   */
  parseAuthenticationPackets() {
    if (!fs.existsSync(this.dualLogsPath)) {
      console.log("❌ dualLogs.txt not found");
      return [];
    }

    const content = fs.readFileSync(this.dualLogsPath, 'utf8');
    const lines = content.split('\n');
    const authPackets = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('FF FF 25 40') && line.includes('10 02')) {
        const direction = line.includes('→') ? 'TX' : 'RX';
        const timestamp = line.match(/\[([^\]]+)\]/)?.[1] || 'unknown';
        
        // Extract hex data from the first line
        const match = line.match(/FF FF [A-F0-9\s]+/);
        if (match) {
          let hexData = match[0].replace(/\s+/g, ' ').trim();
          
          // Check for continuation lines
          let j = i + 1;
          while (j < lines.length && lines[j].trim().match(/^[A-F0-9\s]+\|/)) {
            const continuationMatch = lines[j].match(/^([A-F0-9\s]+)/);
            if (continuationMatch) {
              hexData += ' ' + continuationMatch[1].trim();
            }
            j++;
          }
          
          authPackets.push({
            timestamp,
            direction,
            hexData: hexData.replace(/\s+/g, ' ').trim(),
            rawLine: line.trim()
          });
        }
      }
    }

    return authPackets;
  }

  /**
   * Extract challenge and response data from authentication packets
   */
  extractAuthData(authPackets) {
    const authData = {
      challenges: [],
      responses: [],
      pairs: []
    };

    for (const packet of authPackets) {
      const hex = packet.hexData.replace(/\s+/g, '');
      console.log(`Debug: Processing packet ${packet.direction} - Full hex: ${hex}`);
      
      // Look for challenge pattern: FF FF 25 40 00 00 00 00 00 11 10 02 00 01 [challenge:8] [encrypted:16-24]
      if (hex.includes('1110020001') && packet.direction === 'TX') {
        console.log(`Debug: Found TX challenge packet`);
        // Extract the full packet data after the header
        const dataStart = hex.indexOf('1110020001') + 10; // After "1110020001"
        const remainingData = hex.substring(dataStart);
        console.log(`Debug: Remaining data: ${remainingData.substring(0, 50)}...`);
        
        if (remainingData.length >= 16) { // At least 8 bytes challenge
          const challenge = remainingData.substring(0, 16);
          const encrypted = remainingData.substring(16);
          console.log(`Debug: Challenge: ${challenge}, Encrypted: ${encrypted.substring(0, 32)}...`);
          
          authData.challenges.push({
            timestamp: packet.timestamp,
            challenge: challenge.match(/.{2}/g).join(' '),
            challengeHex: challenge,
            encrypted: encrypted.match(/.{2}/g).join(' '),
            encryptedHex: encrypted,
            rawPacket: packet.hexData
          });
        } else {
          console.log(`Debug: Not enough data, length: ${remainingData.length}`);
        }
      }
      
      // Look for response pattern: FF FF 25 40 00 00 00 00 00 12 10 02 00 01 [challenge:8] [encrypted:16-24]
      if (hex.includes('1210020001') && packet.direction === 'RX') {
        // Extract the full packet data after the header
        const dataStart = hex.indexOf('1210020001') + 10; // After "1210020001"
        const remainingData = hex.substring(dataStart);
        
        if (remainingData.length >= 16) { // At least 8 bytes challenge
          const challenge = remainingData.substring(0, 16);
          const encrypted = remainingData.substring(16);
          
          authData.responses.push({
            timestamp: packet.timestamp,
            challenge: challenge.match(/.{2}/g).join(' '),
            challengeHex: challenge,
            encrypted: encrypted.match(/.{2}/g).join(' '),
            encryptedHex: encrypted,
            rawPacket: packet.hexData
          });
        }
      }
    }

    // Try to pair challenges with responses
    for (const challenge of authData.challenges) {
      for (const response of authData.responses) {
        if (challenge.challengeHex === response.challengeHex) {
          authData.pairs.push({
            challenge,
            response,
            timeDiff: this.calculateTimeDiff(challenge.timestamp, response.timestamp)
          });
        }
      }
    }

    return authData;
  }

  /**
   * Calculate time difference between timestamps
   */
  calculateTimeDiff(timestamp1, timestamp2) {
    try {
      const date1 = new Date(timestamp1);
      const date2 = new Date(timestamp2);
      return Math.abs(date2 - date1);
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Analyze rolling code patterns
   */
  analyzeRollingCodes(authData) {
    const analysis = {
      challengePatterns: [],
      responsePatterns: [],
      rollingCodeAnalysis: {
        isRolling: false,
        patterns: [],
        observations: []
      }
    };

    // Analyze challenge patterns
    for (const challenge of authData.challenges) {
      const challengeBytes = challenge.challengeHex.match(/.{2}/g);
      analysis.challengePatterns.push({
        timestamp: challenge.timestamp,
        bytes: challengeBytes,
        ascii: this.hexToAscii(challenge.challengeHex)
      });
    }

    // Analyze response patterns
    for (const response of authData.responses) {
      const responseBytes = response.encryptedHex.match(/.{2}/g);
      analysis.responsePatterns.push({
        timestamp: response.timestamp,
        bytes: responseBytes,
        length: responseBytes.length
      });
    }

    // Check for rolling code patterns
    if (authData.challenges.length > 1) {
      const challenges = authData.challenges.map(c => c.challengeHex);
      const isRolling = challenges.every((challenge, index) => {
        if (index === 0) return true;
        return challenge !== challenges[index - 1];
      });

      analysis.rollingCodeAnalysis.isRolling = isRolling;
      
      if (isRolling) {
        analysis.rollingCodeAnalysis.observations.push("✅ Rolling code pattern detected - each challenge is unique");
      } else {
        analysis.rollingCodeAnalysis.observations.push("❌ Non-rolling pattern - some challenges are repeated");
      }
    }

    return analysis;
  }

  /**
   * Convert hex string to ASCII
   */
  hexToAscii(hex) {
    try {
      return hex.match(/.{2}/g)
        .map(byte => String.fromCharCode(parseInt(byte, 16)))
        .join('')
        .replace(/[^\x20-\x7E]/g, '.'); // Replace non-printable chars
    } catch (e) {
      return 'invalid';
    }
  }

  /**
   * Compare with pyhOn authentication patterns
   */
  compareWithPyhOn(authData, analysis) {
    const comparison = {
      formatMatch: false,
      securityFeatures: [],
      differences: [],
      recommendations: []
    };

    // Check format match
    if (authData.challenges.length > 0) {
      const firstChallenge = authData.challenges[0];
      const expectedFormat = "FF FF 25 40 00 00 00 00 00 11 10 02 00 01 [challenge:8] 01 [encrypted:16-24]";
      
      if (firstChallenge.rawPacket.includes('FF FF 25 40') && 
          firstChallenge.rawPacket.includes('11 10 02 00 01')) {
        comparison.formatMatch = true;
        comparison.securityFeatures.push("✅ Format matches pyhOn authentication pattern");
      } else {
        comparison.differences.push("❌ Format differs from pyhOn pattern");
      }
    }

    // Check rolling code implementation
    if (analysis.rollingCodeAnalysis.isRolling) {
      comparison.securityFeatures.push("✅ Rolling code implementation matches pyhOn security model");
    } else {
      comparison.differences.push("❌ Rolling code not implemented as expected");
    }

    // Check challenge-response pairing
    if (authData.pairs.length > 0) {
      comparison.securityFeatures.push("✅ Challenge-response pairing detected");
    } else {
      comparison.differences.push("❌ No challenge-response pairs found");
    }

    // Generate recommendations
    if (comparison.formatMatch) {
      comparison.recommendations.push("Format matches pyhOn - authentication structure is correct");
    }
    
    if (analysis.rollingCodeAnalysis.isRolling) {
      comparison.recommendations.push("Rolling code system is working - implement encryption algorithm analysis");
    }

    return comparison;
  }

  /**
   * Generate comprehensive authentication report
   */
  generateReport() {
    console.log('🔐 Haier Authentication Pattern Analysis');
    console.log('========================================\n');

    const authPackets = this.parseAuthenticationPackets();
    console.log(`📊 Found ${authPackets.length} authentication packets\n`);

    if (authPackets.length === 0) {
      console.log('❌ No authentication packets found in dualLogs.txt');
      return;
    }

    const authData = this.extractAuthData(authPackets);
    console.log('📋 Authentication Data:');
    console.log(`  • Challenges: ${authData.challenges.length}`);
    console.log(`  • Responses: ${authData.responses.length}`);
    console.log(`  • Pairs: ${authData.pairs.length}\n`);

    if (authData.challenges.length > 0) {
      console.log('🔑 Challenge Analysis:');
      for (const challenge of authData.challenges) {
        console.log(`  • ${challenge.timestamp}: ${challenge.challenge} (${this.hexToAscii(challenge.challengeHex)})`);
        console.log(`    Encrypted: ${challenge.encrypted.substring(0, 32)}...`);
      }
      console.log();
    }

    if (authData.responses.length > 0) {
      console.log('🔓 Response Analysis:');
      for (const response of authData.responses) {
        console.log(`  • ${response.timestamp}: ${response.challenge} → ${response.encrypted.substring(0, 32)}...`);
      }
      console.log();
    }

    if (authData.pairs.length > 0) {
      console.log('🔗 Challenge-Response Pairs:');
      for (const pair of authData.pairs) {
        console.log(`  • Challenge: ${pair.challenge.challenge} (${pair.challenge.timestamp})`);
        console.log(`    Response: ${pair.response.encrypted.substring(0, 32)}... (${pair.response.timestamp})`);
        console.log(`    Time diff: ${pair.timeDiff}ms`);
      }
      console.log();
    }

    const analysis = this.analyzeRollingCodes(authData);
    console.log('🔄 Rolling Code Analysis:');
    console.log(`  • Is Rolling: ${analysis.rollingCodeAnalysis.isRolling ? '✅ Yes' : '❌ No'}`);
    for (const observation of analysis.rollingCodeAnalysis.observations) {
      console.log(`  • ${observation}`);
    }
    console.log();

    const comparison = this.compareWithPyhOn(authData, analysis);
    console.log('🔄 pyhOn Library Comparison:');
    console.log(`  • Format Match: ${comparison.formatMatch ? '✅ Yes' : '❌ No'}`);
    
    if (comparison.securityFeatures.length > 0) {
      console.log('\n✅ Security Features:');
      for (const feature of comparison.securityFeatures) {
        console.log(`  • ${feature}`);
      }
    }

    if (comparison.differences.length > 0) {
      console.log('\n❌ Differences:');
      for (const diff of comparison.differences) {
        console.log(`  • ${diff}`);
      }
    }

    if (comparison.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      for (const rec of comparison.recommendations) {
        console.log(`  • ${rec}`);
      }
    }

    console.log('\n📚 pyhOn Authentication Reference:');
    console.log(`  • Format: ${this.pyhOnAuthPatterns.challengeFormat}`);
    console.log(`  • Description: ${this.pyhOnAuthPatterns.description}`);
    console.log('  • Security Features:');
    for (const feature of this.pyhOnAuthPatterns.securityFeatures) {
      console.log(`    - ${feature}`);
    }

    return {
      authPackets,
      authData,
      analysis,
      comparison
    };
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new AuthenticationAnalyzer();
  analyzer.generateReport();
}

module.exports = AuthenticationAnalyzer;
