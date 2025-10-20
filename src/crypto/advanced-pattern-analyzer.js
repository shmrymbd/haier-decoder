/**
 * Advanced Pattern Analyzer for Haier Rolling Codes
 * 
 * This module performs sophisticated analysis of the authentication patterns
 * focusing on the specific byte patterns observed in the real-time data.
 */

const HexUtils = require('../utils/hex-utils');

class AdvancedPatternAnalyzer {
  constructor() {
    this.sessions = [];
    this.patterns = {};
    this.insights = {};
  }

  /**
   * Load authentication sessions
   */
  loadSessions(sessions) {
    this.sessions = sessions;
    console.log(`📊 Loaded ${sessions.length} authentication sessions`);
  }

  /**
   * Analyze the specific byte patterns from real-time data
   */
  analyzeRealTimePatterns() {
    console.log('\n🔍 Analyzing Real-Time Data Patterns...');
    
    const patterns = {
      challengeStructure: {},
      responseStructure: {},
      bytePositions: {},
      transformations: []
    };

    for (const session of this.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);

      console.log(`\nSession ${session.id}:`);
      console.log(`  Challenge: ${HexUtils.bufferToHex(challenge)}`);
      console.log(`  Response:  ${HexUtils.bufferToHex(response)}`);

      // Analyze structure
      const challengeAnalysis = this.analyzePacketStructure(challenge, 'Challenge');
      const responseAnalysis = this.analyzePacketStructure(response, 'Response');

      patterns.challengeStructure[session.id] = challengeAnalysis;
      patterns.responseStructure[session.id] = responseAnalysis;

      // Analyze byte positions
      const positionAnalysis = this.analyzeBytePositions(challenge, response);
      patterns.bytePositions[session.id] = positionAnalysis;

      // Test specific transformations
      const transformations = this.testSpecificTransformations(challenge, response);
      patterns.transformations.push({
        session: session.id,
        transformations: transformations
      });
    }

    this.patterns = patterns;
    return patterns;
  }

  /**
   * Analyze packet structure
   */
  analyzePacketStructure(packet, type) {
    const analysis = {
      type: type,
      length: packet.length,
      header: packet.slice(0, 2), // FF FF
      lengthByte: packet[2],
      frameType: packet[3],
      sequence: packet.slice(4, 8),
      command: packet.slice(8, 9),
      payload: packet.slice(9, packet.length - 3),
      crc: packet.slice(-3)
    };

    console.log(`  ${type} Structure:`);
    console.log(`    Header: ${HexUtils.bufferToHex(analysis.header)}`);
    console.log(`    Length: ${analysis.lengthByte} (0x${analysis.lengthByte.toString(16)})`);
    console.log(`    Frame Type: 0x${analysis.frameType.toString(16)}`);
    console.log(`    Sequence: ${HexUtils.bufferToHex(analysis.sequence)}`);
    console.log(`    Command: 0x${analysis.command[0].toString(16)}`);
    console.log(`    Payload: ${HexUtils.bufferToHex(analysis.payload)}`);
    console.log(`    CRC: ${HexUtils.bufferToHex(analysis.crc)}`);

    return analysis;
  }

  /**
   * Analyze byte positions
   */
  analyzeBytePositions(challenge, response) {
    const analysis = {
      constantBytes: [],
      variableBytes: [],
      patterns: []
    };

    // Compare byte by byte
    for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
      if (challenge[i] === response[i]) {
        analysis.constantBytes.push({
          position: i,
          value: challenge[i],
          hex: challenge[i].toString(16).padStart(2, '0')
        });
      } else {
        const difference = (response[i] - challenge[i] + 256) % 256;
        analysis.variableBytes.push({
          position: i,
          challenge: challenge[i],
          response: response[i],
          difference: difference,
          hexChallenge: challenge[i].toString(16).padStart(2, '0'),
          hexResponse: response[i].toString(16).padStart(2, '0'),
          hexDifference: difference.toString(16).padStart(2, '0')
        });
      }
    }

    // Look for patterns in variable bytes
    for (const variable of analysis.variableBytes) {
      const pattern = this.findBytePattern(variable.challenge, variable.response);
      if (pattern) {
        analysis.patterns.push({
          position: variable.position,
          pattern: pattern
        });
      }
    }

    console.log(`  Byte Position Analysis:`);
    console.log(`    Constant bytes: ${analysis.constantBytes.length}`);
    console.log(`    Variable bytes: ${analysis.variableBytes.length}`);
    
    if (analysis.patterns.length > 0) {
      console.log(`    Patterns found: ${analysis.patterns.length}`);
      analysis.patterns.forEach(pattern => {
        console.log(`      Position ${pattern.position}: ${pattern.pattern.type} = ${pattern.pattern.value}`);
      });
    }

    return analysis;
  }

  /**
   * Find pattern between two bytes
   */
  findBytePattern(challenge, response) {
    const patterns = [];

    // Test XOR
    const xor = challenge ^ response;
    if (xor !== 0) {
      patterns.push({ type: 'XOR', value: xor });
    }

    // Test addition
    const add = (response - challenge + 256) % 256;
    if (add !== 0) {
      patterns.push({ type: 'ADD', value: add });
    }

    // Test subtraction
    const sub = (challenge - response + 256) % 256;
    if (sub !== 0) {
      patterns.push({ type: 'SUB', value: sub });
    }

    // Test multiplication
    for (let mult = 2; mult < 256; mult++) {
      if ((challenge * mult) % 256 === response) {
        patterns.push({ type: 'MULT', value: mult });
      }
    }

    // Test division
    for (let div = 2; div < 256; div++) {
      if ((challenge / div) % 256 === response) {
        patterns.push({ type: 'DIV', value: div });
      }
    }

    return patterns.length > 0 ? patterns[0] : null;
  }

  /**
   * Test specific transformations based on observed patterns
   */
  testSpecificTransformations(challenge, response) {
    const transformations = [];

    // Extract components
    const challengeRandom = challenge.slice(0, 8);
    const responseRandom = response.slice(0, 8);
    const challengePayload = challenge.slice(8, 29);
    const responsePayload = response.slice(8, 29);

    // Test XOR with different keys
    for (let key = 0; key < 256; key++) {
      const xorResult = Buffer.from(challengeRandom.map(byte => byte ^ key));
      const accuracy = this.calculateAccuracy(responseRandom, xorResult);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `XOR-${key.toString(16).padStart(2, '0')}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(xorResult)
        });
      }
    }

    // Test addition with different values
    for (let value = 1; value < 256; value++) {
      const addResult = Buffer.from(challengeRandom.map(byte => (byte + value) % 256));
      const accuracy = this.calculateAccuracy(responseRandom, addResult);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `ADD-${value}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(addResult)
        });
      }
    }

    // Test subtraction with different values
    for (let value = 1; value < 256; value++) {
      const subResult = Buffer.from(challengeRandom.map(byte => (byte - value + 256) % 256));
      const accuracy = this.calculateAccuracy(responseRandom, subResult);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `SUB-${value}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(subResult)
        });
      }
    }

    // Test rotation
    for (let shift = 1; shift < 8; shift++) {
      const rotated = Buffer.from(challengeRandom.map(byte => 
        ((byte << shift) | (byte >> (8 - shift))) & 0xFF
      ));
      const accuracy = this.calculateAccuracy(responseRandom, rotated);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `ROT-${shift}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(rotated)
        });
      }
    }

    // Test lookup table
    for (let seed = 0; seed < 256; seed++) {
      const lookup = this.generateLookupTable(seed);
      const lookupResult = Buffer.from(challengeRandom.map(byte => lookup[byte]));
      const accuracy = this.calculateAccuracy(responseRandom, lookupResult);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `LOOKUP-${seed.toString(16).padStart(2, '0')}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(lookupResult)
        });
      }
    }

    return transformations.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Analyze payload patterns
   */
  analyzePayloadPatterns() {
    console.log('\n🔍 Analyzing Payload Patterns...');
    
    const payloads = {
      challenges: [],
      responses: [],
      patterns: []
    };

    for (const session of this.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);

      // Extract payload (bytes 9-29, 21 bytes total)
      const challengePayload = challenge.slice(8, 29);
      const responsePayload = response.slice(8, 29);

      payloads.challenges.push(challengePayload);
      payloads.responses.push(responsePayload);

      console.log(`\nSession ${session.id} Payload Analysis:`);
      console.log(`  Challenge: ${HexUtils.bufferToHex(challengePayload)}`);
      console.log(`  Response:  ${HexUtils.bufferToHex(responsePayload)}`);

      // Analyze payload structure
      const payloadAnalysis = this.analyzePayloadStructure(challengePayload, responsePayload);
      payloads.patterns.push({
        session: session.id,
        analysis: payloadAnalysis
      });
    }

    return payloads;
  }

  /**
   * Analyze payload structure
   */
  analyzePayloadStructure(challengePayload, responsePayload) {
    const analysis = {
      length: challengePayload.length,
      constantBytes: [],
      variableBytes: [],
      patterns: []
    };

    // Identify constant vs variable bytes
    for (let i = 0; i < challengePayload.length; i++) {
      if (challengePayload[i] === responsePayload[i]) {
        analysis.constantBytes.push({
          position: i,
          value: challengePayload[i]
        });
      } else {
        analysis.variableBytes.push({
          position: i,
          challenge: challengePayload[i],
          response: responsePayload[i],
          difference: (responsePayload[i] - challengePayload[i] + 256) % 256
        });
      }
    }

    // Look for patterns in variable bytes
    for (const variable of analysis.variableBytes) {
      const pattern = this.findBytePattern(variable.challenge, variable.response);
      if (pattern) {
        analysis.patterns.push({
          position: variable.position,
          pattern: pattern
        });
      }
    }

    console.log(`  Constant bytes: ${analysis.constantBytes.length}`);
    console.log(`  Variable bytes: ${analysis.variableBytes.length}`);
    console.log(`  Patterns found: ${analysis.patterns.length}`);

    return analysis;
  }

  /**
   * Generate lookup table
   */
  generateLookupTable(seed) {
    const lookup = new Array(256);
    for (let i = 0; i < 256; i++) {
      lookup[i] = (i + seed) % 256;
    }
    return lookup;
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
   * Run comprehensive analysis
   */
  runAnalysis(sessions) {
    console.log('🚀 Starting Advanced Pattern Analysis...\n');
    
    this.loadSessions(sessions);
    
    // Analyze real-time patterns
    this.analyzeRealTimePatterns();
    
    // Analyze payload patterns
    this.analyzePayloadPatterns();
    
    // Generate insights
    this.generateInsights();
    
    return {
      patterns: this.patterns,
      insights: this.insights
    };
  }

  /**
   * Generate insights from analysis
   */
  generateInsights() {
    console.log('\n💡 Generating Insights...');
    
    const insights = {
      keyFindings: [],
      recommendations: [],
      nextSteps: []
    };

    // Analyze patterns across sessions
    if (this.patterns.bytePositions) {
      const allConstantBytes = [];
      const allVariableBytes = [];
      
      for (const [sessionId, positionAnalysis] of Object.entries(this.patterns.bytePositions)) {
        allConstantBytes.push(...positionAnalysis.constantBytes);
        allVariableBytes.push(...positionAnalysis.variableBytes);
      }

      insights.keyFindings.push(`Found ${allConstantBytes.length} constant bytes across all sessions`);
      insights.keyFindings.push(`Found ${allVariableBytes.length} variable bytes across all sessions`);

      // Look for consistent patterns
      const patternCounts = {};
      for (const variable of allVariableBytes) {
        const pattern = this.findBytePattern(variable.challenge, variable.response);
        if (pattern) {
          const key = `${pattern.type}-${pattern.value}`;
          patternCounts[key] = (patternCounts[key] || 0) + 1;
        }
      }

      const topPatterns = Object.entries(patternCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (topPatterns.length > 0) {
        insights.keyFindings.push('Top transformation patterns:');
        topPatterns.forEach(([pattern, count]) => {
          insights.keyFindings.push(`  ${pattern}: ${count} occurrences`);
        });
      }
    }

    // Generate recommendations
    insights.recommendations.push('Focus on the most frequent transformation patterns');
    insights.recommendations.push('Test with additional captured data to validate patterns');
    insights.recommendations.push('Implement working algorithm based on successful patterns');
    insights.recommendations.push('Validate with real device communication');

    // Generate next steps
    insights.nextSteps.push('Capture more authentication sessions from real device');
    insights.nextSteps.push('Test identified patterns with larger dataset');
    insights.nextSteps.push('Implement working rolling code algorithm');
    insights.nextSteps.push('Create test suite for validation');

    this.insights = insights;

    console.log('\n🔍 Key Findings:');
    insights.keyFindings.forEach(finding => console.log(`  • ${finding}`));
    
    console.log('\n💡 Recommendations:');
    insights.recommendations.forEach(rec => console.log(`  • ${rec}`));
    
    console.log('\n📋 Next Steps:');
    insights.nextSteps.forEach(step => console.log(`  • ${step}`));
  }
}

module.exports = AdvancedPatternAnalyzer;
