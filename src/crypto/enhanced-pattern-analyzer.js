/**
 * Enhanced Pattern Analyzer for Haier Rolling Codes
 * 
 * This module performs deep analysis of the authentication patterns
 * to identify the exact transformation algorithm.
 */

const HexUtils = require('../utils/hex-utils');

class EnhancedPatternAnalyzer {
  constructor() {
    this.sessions = [];
    this.patterns = {};
    this.correlations = {};
  }

  /**
   * Load authentication sessions
   */
  loadSessions(sessions) {
    this.sessions = sessions;
    console.log(`📊 Loaded ${sessions.length} authentication sessions`);
  }

  /**
   * Analyze byte-by-byte patterns
   */
  analyzeBytePatterns() {
    console.log('\n🔍 Analyzing Byte-by-Byte Patterns...');
    
    const patterns = {
      challengeBytes: [],
      responseBytes: [],
      transformations: [],
      correlations: []
    };

    for (const session of this.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);

      // Analyze first 8 bytes (random challenge)
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);

      patterns.challengeBytes.push(challengeRandom);
      patterns.responseBytes.push(responseRandom);

      // Test various transformations
      const transformations = this.testTransformations(challengeRandom, responseRandom);
      patterns.transformations.push({
        session: session.id,
        transformations: transformations
      });

      console.log(`Session ${session.id}:`);
      console.log(`  Challenge: ${HexUtils.bufferToHex(challengeRandom)}`);
      console.log(`  Response:  ${HexUtils.bufferToHex(responseRandom)}`);
      
      // Show best transformation
      const bestTransform = transformations.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best
      );
      console.log(`  Best: ${bestTransform.name} (${bestTransform.accuracy.toFixed(2)}% accuracy)`);
    }

    this.patterns = patterns;
    return patterns;
  }

  /**
   * Test various transformation methods
   */
  testTransformations(challenge, response) {
    const transformations = [];

    // Test XOR with different keys
    for (let keyByte = 0; keyByte < 256; keyByte++) {
      const xorResult = Buffer.from(challenge.map(byte => byte ^ keyByte));
      const accuracy = this.calculateAccuracy(response, xorResult);
      if (accuracy > 0.1) { // Only keep promising results
        transformations.push({
          name: `XOR-${keyByte.toString(16).padStart(2, '0')}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(xorResult)
        });
      }
    }

    // Test addition/subtraction
    for (let value = 1; value < 256; value++) {
      const addResult = Buffer.from(challenge.map(byte => (byte + value) % 256));
      const subResult = Buffer.from(challenge.map(byte => (byte - value + 256) % 256));
      
      const addAccuracy = this.calculateAccuracy(response, addResult);
      const subAccuracy = this.calculateAccuracy(response, subResult);
      
      if (addAccuracy > 0.1) {
        transformations.push({
          name: `ADD-${value}`,
          accuracy: addAccuracy,
          result: HexUtils.bufferToHex(addResult)
        });
      }
      
      if (subAccuracy > 0.1) {
        transformations.push({
          name: `SUB-${value}`,
          accuracy: subAccuracy,
          result: HexUtils.bufferToHex(subResult)
        });
      }
    }

    // Test rotation
    for (let shift = 1; shift < 8; shift++) {
      const rotated = Buffer.from(challenge.map(byte => 
        ((byte << shift) | (byte >> (8 - shift))) & 0xFF
      ));
      const accuracy = this.calculateAccuracy(response, rotated);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `ROT-${shift}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(rotated)
        });
      }
    }

    // Test lookup table approach
    for (let seed = 0; seed < 256; seed++) {
      const lookup = this.generateLookupTable(seed);
      const lookupResult = Buffer.from(challenge.map(byte => lookup[byte]));
      const accuracy = this.calculateAccuracy(response, lookupResult);
      
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
   * Analyze payload patterns (bytes 9-29)
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

      console.log(`Session ${session.id}:`);
      console.log(`  Challenge Payload: ${HexUtils.bufferToHex(challengePayload)}`);
      console.log(`  Response Payload:  ${HexUtils.bufferToHex(responsePayload)}`);

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

    return analysis;
  }

  /**
   * Find pattern between two bytes
   */
  findBytePattern(challenge, response) {
    const patterns = [];

    // Test XOR
    const xor = challenge ^ response;
    patterns.push({ type: 'XOR', value: xor });

    // Test addition
    const add = (response - challenge + 256) % 256;
    patterns.push({ type: 'ADD', value: add });

    // Test subtraction
    const sub = (challenge - response + 256) % 256;
    patterns.push({ type: 'SUB', value: sub });

    // Test multiplication
    for (let mult = 2; mult < 256; mult++) {
      if ((challenge * mult) % 256 === response) {
        patterns.push({ type: 'MULT', value: mult });
      }
    }

    return patterns;
  }

  /**
   * Analyze cross-session correlations
   */
  analyzeCrossSessionCorrelations() {
    console.log('\n🔗 Analyzing Cross-Session Correlations...');
    
    const correlations = {
      challengeSimilarity: 0,
      responseSimilarity: 0,
      transformationConsistency: 0,
      keyDerivationConsistency: 0
    };

    if (this.sessions.length < 2) {
      console.log('⚠️  Need at least 2 sessions for correlation analysis');
      return correlations;
    }

    // Calculate challenge similarity
    let challengeSimilarity = 0;
    for (let i = 0; i < this.sessions.length - 1; i++) {
      for (let j = i + 1; j < this.sessions.length; j++) {
        const sim = this.calculateSimilarity(
          HexUtils.hexToBuffer(this.sessions[i].challenge),
          HexUtils.hexToBuffer(this.sessions[j].challenge)
        );
        challengeSimilarity += sim;
      }
    }
    correlations.challengeSimilarity = challengeSimilarity / (this.sessions.length * (this.sessions.length - 1) / 2);

    // Calculate response similarity
    let responseSimilarity = 0;
    for (let i = 0; i < this.sessions.length - 1; i++) {
      for (let j = i + 1; j < this.sessions.length; j++) {
        const sim = this.calculateSimilarity(
          HexUtils.hexToBuffer(this.sessions[i].response),
          HexUtils.hexToBuffer(this.sessions[j].response)
        );
        responseSimilarity += sim;
      }
    }
    correlations.responseSimilarity = responseSimilarity / (this.sessions.length * (this.sessions.length - 1) / 2);

    console.log(`  Challenge similarity: ${correlations.challengeSimilarity.toFixed(2)}`);
    console.log(`  Response similarity: ${correlations.responseSimilarity.toFixed(2)}`);

    this.correlations = correlations;
    return correlations;
  }

  /**
   * Calculate similarity between two buffers
   */
  calculateSimilarity(buffer1, buffer2) {
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
   * Run comprehensive analysis
   */
  runAnalysis(sessions) {
    console.log('🚀 Starting Enhanced Pattern Analysis...\n');
    
    this.loadSessions(sessions);
    
    // Analyze byte patterns
    this.analyzeBytePatterns();
    
    // Analyze payload patterns
    this.analyzePayloadPatterns();
    
    // Analyze cross-session correlations
    this.analyzeCrossSessionCorrelations();
    
    // Generate recommendations
    this.generateRecommendations();
    
    return {
      patterns: this.patterns,
      correlations: this.correlations
    };
  }

  /**
   * Generate analysis recommendations
   */
  generateRecommendations() {
    console.log('\n🎯 Analysis Recommendations:');
    console.log('============================');
    
    if (this.patterns.transformations) {
      const allTransformations = this.patterns.transformations.flatMap(t => t.transformations);
      const bestTransformations = allTransformations
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 5);
      
      console.log('\n🔝 Top Transformation Methods:');
      bestTransformations.forEach((transform, index) => {
        console.log(`  ${index + 1}. ${transform.name}: ${transform.accuracy.toFixed(2)}% accuracy`);
      });
    }
    
    if (this.correlations.challengeSimilarity < 0.1) {
      console.log('\n✅ Low challenge similarity suggests good randomness');
    } else {
      console.log('\n⚠️  High challenge similarity may indicate weak randomness');
    }
    
    if (this.correlations.responseSimilarity < 0.1) {
      console.log('\n✅ Low response similarity suggests good transformation');
    } else {
      console.log('\n⚠️  High response similarity may indicate weak transformation');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Focus on top transformation methods');
    console.log('2. Test with additional captured data');
    console.log('3. Implement working algorithm');
    console.log('4. Validate with real device communication');
  }
}

module.exports = EnhancedPatternAnalyzer;
