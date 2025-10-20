#!/usr/bin/env node

/**
 * Combined Authentication Analysis
 * 
 * This script combines all authentication sessions from different sources
 * and runs comprehensive analysis on the expanded dataset.
 */

const fs = require('fs');
const path = require('path');
const HexUtils = require('../utils/hex-utils');
const AdvancedPatternAnalyzer = require('./advanced-pattern-analyzer');

class CombinedAnalysis {
  constructor() {
    this.allSessions = [];
    this.analyzer = new AdvancedPatternAnalyzer();
  }

  /**
   * Load all authentication sessions
   */
  loadAllSessions() {
    console.log('📊 Loading all authentication sessions...\n');
    
    // Load original sessions
    const originalPath = path.join(__dirname, '../../test-vectors/authentication-sessions.json');
    if (fs.existsSync(originalPath)) {
      const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
      this.allSessions.push(...originalData.sessions);
      console.log(`✅ Loaded ${originalData.sessions.length} sessions from original data`);
    }
    
    // Load binding sessions
    const bindingPath = path.join(__dirname, '../../test-vectors/binding-auth-sessions.json');
    if (fs.existsSync(bindingPath)) {
      const bindingData = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
      this.allSessions.push(...bindingData.sessions);
      console.log(`✅ Loaded ${bindingData.sessions.length} sessions from binding data`);
    }
    
    console.log(`📊 Total sessions: ${this.allSessions.length}`);
    return this.allSessions;
  }

  /**
   * Run comprehensive analysis on all sessions
   */
  runComprehensiveAnalysis() {
    console.log('\n🔍 Running comprehensive analysis on all sessions...');
    
    // Run advanced pattern analysis
    const analysis = this.analyzer.runAnalysis(this.allSessions);
    
    // Run additional analysis
    this.runAdditionalAnalysis();
    
    return analysis;
  }

  /**
   * Run additional analysis specific to combined dataset
   */
  runAdditionalAnalysis() {
    console.log('\n📊 Running additional analysis...');
    
    // Analyze session patterns
    this.analyzeSessionPatterns();
    
    // Analyze transformation consistency
    this.analyzeTransformationConsistency();
    
    // Test algorithm hypotheses with larger dataset
    this.testAlgorithmHypotheses();
  }

  /**
   * Analyze session patterns
   */
  analyzeSessionPatterns() {
    console.log('\n🔍 Analyzing session patterns...');
    
    const patterns = {
      timestampPatterns: {},
      sequencePatterns: {},
      challengePatterns: {},
      responsePatterns: {}
    };
    
    for (const session of this.allSessions) {
      // Analyze timestamps
      const timestamp = session.timestamp;
      const timeGroup = Math.floor(parseInt(timestamp) / 1000) * 1000; // Group by 1000ms
      patterns.timestampPatterns[timeGroup] = (patterns.timestampPatterns[timeGroup] || 0) + 1;
      
      // Analyze sequences
      const sequence = session.sequence;
      patterns.sequencePatterns[sequence] = (patterns.sequencePatterns[sequence] || 0) + 1;
      
      // Analyze challenge patterns
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const challengeRandom = challenge.slice(0, 8);
      const challengeHex = HexUtils.bufferToHex(challengeRandom);
      patterns.challengePatterns[challengeHex] = (patterns.challengePatterns[challengeHex] || 0) + 1;
      
      // Analyze response patterns
      const response = HexUtils.hexToBuffer(session.response);
      const responseRandom = response.slice(0, 8);
      const responseHex = HexUtils.bufferToHex(responseRandom);
      patterns.responsePatterns[responseHex] = (patterns.responsePatterns[responseHex] || 0) + 1;
    }
    
    console.log(`  Timestamp groups: ${Object.keys(patterns.timestampPatterns).length}`);
    console.log(`  Sequence patterns: ${Object.keys(patterns.sequencePatterns).length}`);
    console.log(`  Challenge patterns: ${Object.keys(patterns.challengePatterns).length}`);
    console.log(`  Response patterns: ${Object.keys(patterns.responsePatterns).length}`);
    
    // Look for duplicate patterns
    const duplicateChallenges = Object.entries(patterns.challengePatterns).filter(([, count]) => count > 1);
    const duplicateResponses = Object.entries(patterns.responsePatterns).filter(([, count]) => count > 1);
    
    if (duplicateChallenges.length > 0) {
      console.log(`  ⚠️  Found ${duplicateChallenges.length} duplicate challenge patterns`);
    }
    
    if (duplicateResponses.length > 0) {
      console.log(`  ⚠️  Found ${duplicateResponses.length} duplicate response patterns`);
    }
    
    return patterns;
  }

  /**
   * Analyze transformation consistency
   */
  analyzeTransformationConsistency() {
    console.log('\n🔍 Analyzing transformation consistency...');
    
    const transformations = [];
    
    for (const session of this.allSessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test various transformations
      const sessionTransformations = this.testTransformations(challengeRandom, responseRandom);
      transformations.push({
        session: session.id,
        transformations: sessionTransformations
      });
    }
    
    // Find consistent transformations across sessions
    const consistentTransformations = this.findConsistentTransformations(transformations);
    
    console.log(`  Found ${consistentTransformations.length} consistent transformations`);
    
    for (const transform of consistentTransformations.slice(0, 5)) {
      console.log(`    ${transform.name}: ${transform.consistency.toFixed(2)}% consistency`);
    }
    
    return consistentTransformations;
  }

  /**
   * Test transformations for a challenge/response pair
   */
  testTransformations(challenge, response) {
    const transformations = [];
    
    // Test XOR with different keys
    for (let key = 0; key < 256; key++) {
      const xorResult = Buffer.from(challenge.map(byte => byte ^ key));
      const accuracy = this.calculateAccuracy(response, xorResult);
      
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
      const addResult = Buffer.from(challenge.map(byte => (byte + value) % 256));
      const accuracy = this.calculateAccuracy(response, addResult);
      
      if (accuracy > 0.1) {
        transformations.push({
          name: `ADD-${value}`,
          accuracy: accuracy,
          result: HexUtils.bufferToHex(addResult)
        });
      }
    }
    
    return transformations.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Find consistent transformations across sessions
   */
  findConsistentTransformations(transformations) {
    const transformCounts = {};
    
    // Count occurrences of each transformation
    for (const session of transformations) {
      for (const transform of session.transformations) {
        const key = transform.name;
        if (!transformCounts[key]) {
          transformCounts[key] = { count: 0, totalAccuracy: 0 };
        }
        transformCounts[key].count++;
        transformCounts[key].totalAccuracy += transform.accuracy;
      }
    }
    
    // Calculate consistency
    const consistent = [];
    for (const [name, data] of Object.entries(transformCounts)) {
      const consistency = data.count / transformations.length;
      const avgAccuracy = data.totalAccuracy / data.count;
      
      if (consistency > 0.5) { // Appears in more than 50% of sessions
        consistent.push({
          name: name,
          consistency: consistency * 100,
          avgAccuracy: avgAccuracy,
          count: data.count
        });
      }
    }
    
    return consistent.sort((a, b) => b.consistency - a.consistency);
  }

  /**
   * Test algorithm hypotheses with larger dataset
   */
  testAlgorithmHypotheses() {
    console.log('\n🧪 Testing algorithm hypotheses with larger dataset...');
    
    const hypotheses = [
      {
        name: 'XOR with Session Key',
        test: this.testXORWithSessionKey
      },
      {
        name: 'AES with Derived Key',
        test: this.testAESWithDerivedKey
      },
      {
        name: 'Arithmetic with Session Data',
        test: this.testArithmeticWithSessionData
      }
    ];
    
    const results = {};
    
    for (const hypothesis of hypotheses) {
      console.log(`\nTesting: ${hypothesis.name}`);
      try {
        const result = hypothesis.test.call(this);
        results[hypothesis.name] = result;
        console.log(`  Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
        if (result.success) {
          console.log(`  Accuracy: ${result.accuracy.toFixed(2)}%`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
        results[hypothesis.name] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Test XOR with session key
   */
  testXORWithSessionKey() {
    const results = [];
    
    for (const session of this.allSessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session key
      const sessionKey = this.deriveSessionKey(session);
      
      // Test XOR with session key
      const xorResult = Buffer.from(challengeRandom.map((byte, index) => 
        byte ^ sessionKey[index % sessionKey.length]
      ));
      
      const accuracy = this.calculateAccuracy(responseRandom, xorResult);
      
      results.push({
        session: session.id,
        accuracy: accuracy
      });
    }
    
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    
    return {
      success: avgAccuracy > 0.5,
      accuracy: avgAccuracy,
      results: results
    };
  }

  /**
   * Test AES with derived key
   */
  testAESWithDerivedKey() {
    const results = [];
    
    for (const session of this.allSessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive key from session data
      const key = this.deriveSessionKey(session);
      
      try {
        const cipher = require('crypto').createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(challengeRandom);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const accuracy = this.calculateAccuracy(responseRandom, encrypted.slice(0, 8));
        
        results.push({
          session: session.id,
          accuracy: accuracy
        });
      } catch (error) {
        results.push({
          session: session.id,
          accuracy: 0,
          error: error.message
        });
      }
    }
    
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    
    return {
      success: avgAccuracy > 0.5,
      accuracy: avgAccuracy,
      results: results
    };
  }

  /**
   * Test arithmetic with session data
   */
  testArithmeticWithSessionData() {
    const results = [];
    
    for (const session of this.allSessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session value
      const sessionValue = this.deriveSessionValue(session);
      
      // Test addition
      const addResult = Buffer.from(challengeRandom.map(byte => (byte + sessionValue) % 256));
      const addAccuracy = this.calculateAccuracy(responseRandom, addResult);
      
      // Test subtraction
      const subResult = Buffer.from(challengeRandom.map(byte => (byte - sessionValue + 256) % 256));
      const subAccuracy = this.calculateAccuracy(responseRandom, subResult);
      
      const bestAccuracy = Math.max(addAccuracy, subAccuracy);
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy
      });
    }
    
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    
    return {
      success: avgAccuracy > 0.5,
      accuracy: avgAccuracy,
      results: results
    };
  }

  /**
   * Derive session key
   */
  deriveSessionKey(session) {
    const combined = `${session.deviceInfo.imei}${session.deviceInfo.serial}${session.deviceInfo.model}${session.deviceInfo.firmware}${session.timestamp}${session.sequence}`;
    return require('crypto').createHash('sha256').update(combined).digest();
  }

  /**
   * Derive session value
   */
  deriveSessionValue(session) {
    const combined = `${session.timestamp}${session.sequence}`;
    const hash = require('crypto').createHash('sha256').update(combined).digest();
    return hash[0];
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
   * Save combined analysis results
   */
  saveResults(analysis) {
    const results = {
      totalSessions: this.allSessions.length,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '../../test-vectors/combined-analysis-results.json');
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`\n💾 Saved combined analysis results to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save results: ${error.message}`);
      return false;
    }
  }

  /**
   * Run combined analysis
   */
  runCombinedAnalysis() {
    console.log('🚀 Starting Combined Authentication Analysis...\n');
    
    // Load all sessions
    this.loadAllSessions();
    
    // Run comprehensive analysis
    const analysis = this.runComprehensiveAnalysis();
    
    // Save results
    this.saveResults(analysis);
    
    console.log('\n✅ Combined analysis complete!');
    return true;
  }
}

// Run if called directly
if (require.main === module) {
  const analysis = new CombinedAnalysis();
  analysis.runCombinedAnalysis();
}

module.exports = CombinedAnalysis;
