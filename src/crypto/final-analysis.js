#!/usr/bin/env node

/**
 * Final Comprehensive Analysis for Haier Rolling Codes
 * 
 * This script performs the most sophisticated analysis of the authentication patterns
 * to identify the exact transformation algorithm.
 */

const AdvancedPatternAnalyzer = require('./advanced-pattern-analyzer');
const fs = require('fs');
const path = require('path');

class FinalAnalysis {
  constructor() {
    this.analyzer = new AdvancedPatternAnalyzer();
    this.testData = null;
    this.results = {};
  }

  /**
   * Load test data
   */
  loadTestData() {
    const testDataPath = path.join(__dirname, '../../test-vectors/authentication-sessions.json');
    
    try {
      const data = fs.readFileSync(testDataPath, 'utf8');
      this.testData = JSON.parse(data);
      console.log(`✅ Loaded test data: ${this.testData.sessions.length} sessions`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load test data: ${error.message}`);
      return false;
    }
  }

  /**
   * Run advanced pattern analysis
   */
  runAdvancedPatternAnalysis() {
    console.log('\n🔍 Running Advanced Pattern Analysis...');
    
    const analysis = this.analyzer.runAnalysis(this.testData.sessions);
    this.results.advancedAnalysis = analysis;
    
    return analysis;
  }

  /**
   * Test specific algorithm hypotheses
   */
  testAlgorithmHypotheses() {
    console.log('\n🧪 Testing Algorithm Hypotheses...');
    
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
      },
      {
        name: 'Lookup Table with Session Seed',
        test: this.testLookupTableWithSessionSeed
      },
      {
        name: 'Combined Operations with Session Context',
        test: this.testCombinedOperationsWithSessionContext
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

    this.results.hypotheses = results;
    return results;
  }

  /**
   * Test XOR with session key
   */
  testXORWithSessionKey() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session key from device info and session data
      const sessionKey = this.deriveSessionKey(session);
      
      // Test XOR with session key
      const xorResult = Buffer.from(challengeRandom.map((byte, index) => 
        byte ^ sessionKey[index % sessionKey.length]
      ));
      
      const accuracy = this.calculateAccuracy(responseRandom, xorResult);
      
      results.push({
        session: session.id,
        accuracy: accuracy,
        key: sessionKey.toString('hex').substring(0, 16) + '...'
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
    
    for (const session of this.testData.sessions) {
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
          accuracy: accuracy,
          key: key.toString('hex').substring(0, 16) + '...'
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
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session value from session data
      const sessionValue = this.deriveSessionValue(session);
      
      // Test addition
      const addResult = Buffer.from(challengeRandom.map(byte => (byte + sessionValue) % 256));
      const addAccuracy = this.calculateAccuracy(responseRandom, addResult);
      
      // Test subtraction
      const subResult = Buffer.from(challengeRandom.map(byte => (byte - sessionValue + 256) % 256));
      const subAccuracy = this.calculateAccuracy(responseRandom, subResult);
      
      const bestAccuracy = Math.max(addAccuracy, subAccuracy);
      const bestOperation = addAccuracy > subAccuracy ? 'ADD' : 'SUB';
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        operation: bestOperation,
        value: sessionValue
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
   * Test lookup table with session seed
   */
  testLookupTableWithSessionSeed() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session seed from session data
      const sessionSeed = this.deriveSessionSeed(session);
      
      // Generate lookup table
      const lookup = this.generateLookupTable(sessionSeed);
      const lookupResult = Buffer.from(challengeRandom.map(byte => lookup[byte]));
      
      const accuracy = this.calculateAccuracy(responseRandom, lookupResult);
      
      results.push({
        session: session.id,
        accuracy: accuracy,
        seed: sessionSeed
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
   * Test combined operations with session context
   */
  testCombinedOperationsWithSessionContext() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Derive session context
      const sessionContext = this.deriveSessionContext(session);
      
      // Test combined operations
      let bestAccuracy = 0;
      let bestCombination = null;
      
      for (let xorKey = 0; xorKey < 256; xorKey++) {
        for (let addValue = 1; addValue < 256; addValue++) {
          const xorResult = Buffer.from(challengeRandom.map(byte => byte ^ xorKey));
          const combinedResult = Buffer.from(xorResult.map(byte => (byte + addValue) % 256));
          const accuracy = this.calculateAccuracy(responseRandom, combinedResult);
          
          if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy;
            bestCombination = `XOR-${xorKey}-ADD-${addValue}`;
          }
        }
      }
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        combination: bestCombination
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
   * Derive session key from session data
   */
  deriveSessionKey(session) {
    const combined = `${this.testData.deviceInfo.imei}${this.testData.deviceInfo.serial}${this.testData.deviceInfo.model}${this.testData.deviceInfo.firmware}${session.timestamp}${session.sequence}`;
    return require('crypto').createHash('sha256').update(combined).digest();
  }

  /**
   * Derive session value from session data
   */
  deriveSessionValue(session) {
    const combined = `${session.timestamp}${session.sequence}`;
    const hash = require('crypto').createHash('sha256').update(combined).digest();
    return hash[0]; // Use first byte as value
  }

  /**
   * Derive session seed from session data
   */
  deriveSessionSeed(session) {
    const combined = `${session.timestamp}${session.sequence}`;
    const hash = require('crypto').createHash('sha256').update(combined).digest();
    return hash[0]; // Use first byte as seed
  }

  /**
   * Derive session context from session data
   */
  deriveSessionContext(session) {
    return {
      timestamp: session.timestamp,
      sequence: session.sequence,
      key: this.deriveSessionKey(session),
      value: this.deriveSessionValue(session),
      seed: this.deriveSessionSeed(session)
    };
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
   * Run final comprehensive analysis
   */
  runFinalAnalysis() {
    console.log('🚀 Starting Final Comprehensive Analysis...\n');
    
    // Load test data
    if (!this.loadTestData()) {
      return false;
    }
    
    // Run advanced pattern analysis
    this.runAdvancedPatternAnalysis();
    
    // Test algorithm hypotheses
    this.testAlgorithmHypotheses();
    
    // Generate final report
    this.generateFinalReport();
    
    return true;
  }

  /**
   * Generate final report
   */
  generateFinalReport() {
    console.log('\n📊 Final Comprehensive Analysis Report');
    console.log('=====================================');
    
    // Advanced analysis results
    if (this.results.advancedAnalysis) {
      console.log('\n🔍 Advanced Pattern Analysis Results:');
      const insights = this.results.advancedAnalysis.insights;
      if (insights.keyFindings) {
        console.log('  Key Findings:');
        insights.keyFindings.forEach(finding => console.log(`    • ${finding}`));
      }
    }
    
    // Hypothesis testing results
    if (this.results.hypotheses) {
      console.log('\n🧪 Algorithm Hypothesis Testing Results:');
      for (const [name, result] of Object.entries(this.results.hypotheses)) {
        if (result.success) {
          console.log(`  ✅ ${name}: ${result.accuracy.toFixed(2)}% accuracy`);
        } else {
          console.log(`  ❌ ${name}: Failed`);
        }
      }
    }
    
    // Final recommendations
    console.log('\n🎯 Final Recommendations:');
    console.log('1. Focus on successful algorithm configurations');
    console.log('2. Test with additional captured data');
    console.log('3. Implement working algorithm');
    console.log('4. Validate with real device communication');
    
    // Save results
    this.saveResults();
  }

  /**
   * Save analysis results
   */
  saveResults() {
    const resultsPath = path.join(__dirname, '../../test-vectors/final-analysis-results.json');
    
    try {
      fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Results saved to: ${resultsPath}`);
    } catch (error) {
      console.error(`❌ Failed to save results: ${error.message}`);
    }
  }
}

// Import HexUtils
const HexUtils = require('../utils/hex-utils');

// Run if called directly
if (require.main === module) {
  const analysis = new FinalAnalysis();
  analysis.runFinalAnalysis();
}

module.exports = FinalAnalysis;
