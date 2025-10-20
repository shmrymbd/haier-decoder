#!/usr/bin/env node

/**
 * Comprehensive Analysis Script for Haier Rolling Codes
 * 
 * This script performs deep analysis of the authentication patterns
 * to identify the exact transformation algorithm.
 */

const EnhancedPatternAnalyzer = require('./enhanced-pattern-analyzer');
const RollingCodeAlgorithm = require('./rolling-code-algorithm');
const fs = require('fs');
const path = require('path');

class ComprehensiveAnalysis {
  constructor() {
    this.analyzer = new EnhancedPatternAnalyzer();
    this.algorithm = null;
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
   * Run enhanced pattern analysis
   */
  runPatternAnalysis() {
    console.log('\n🔍 Running Enhanced Pattern Analysis...');
    
    const analysis = this.analyzer.runAnalysis(this.testData.sessions);
    this.results.patternAnalysis = analysis;
    
    return analysis;
  }

  /**
   * Test specific transformation hypotheses
   */
  testTransformationHypotheses() {
    console.log('\n🧪 Testing Transformation Hypotheses...');
    
    const hypotheses = [
      {
        name: 'Simple XOR with Key',
        test: this.testSimpleXOR
      },
      {
        name: 'AES Encryption',
        test: this.testAESEncryption
      },
      {
        name: 'Arithmetic Operations',
        test: this.testArithmeticOperations
      },
      {
        name: 'Lookup Table',
        test: this.testLookupTable
      },
      {
        name: 'Combined Operations',
        test: this.testCombinedOperations
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
   * Test simple XOR transformation
   */
  testSimpleXOR() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test XOR with different keys
      let bestAccuracy = 0;
      let bestKey = null;
      
      for (let key = 0; key < 256; key++) {
        const xorResult = Buffer.from(challengeRandom.map(byte => byte ^ key));
        const accuracy = this.calculateAccuracy(responseRandom, xorResult);
        
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestKey = key;
        }
      }
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        key: bestKey
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
   * Test AES encryption
   */
  testAESEncryption() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test AES with different keys
      let bestAccuracy = 0;
      let bestKey = null;
      
      for (let keySeed = 0; keySeed < 256; keySeed++) {
        const key = Buffer.alloc(32);
        key.fill(keySeed);
        
        try {
          const cipher = require('crypto').createCipher('aes-256-cbc', key);
          let encrypted = cipher.update(challengeRandom);
          encrypted = Buffer.concat([encrypted, cipher.final()]);
          
          const accuracy = this.calculateAccuracy(responseRandom, encrypted.slice(0, 8));
          
          if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy;
            bestKey = keySeed;
          }
        } catch (error) {
          // Skip invalid keys
        }
      }
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        key: bestKey
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
   * Test arithmetic operations
   */
  testArithmeticOperations() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test addition
      let bestAccuracy = 0;
      let bestOperation = null;
      
      for (let value = 1; value < 256; value++) {
        const addResult = Buffer.from(challengeRandom.map(byte => (byte + value) % 256));
        const subResult = Buffer.from(challengeRandom.map(byte => (byte - value + 256) % 256));
        
        const addAccuracy = this.calculateAccuracy(responseRandom, addResult);
        const subAccuracy = this.calculateAccuracy(responseRandom, subResult);
        
        if (addAccuracy > bestAccuracy) {
          bestAccuracy = addAccuracy;
          bestOperation = `ADD-${value}`;
        }
        
        if (subAccuracy > bestAccuracy) {
          bestAccuracy = subAccuracy;
          bestOperation = `SUB-${value}`;
        }
      }
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        operation: bestOperation
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
   * Test lookup table
   */
  testLookupTable() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test lookup table with different seeds
      let bestAccuracy = 0;
      let bestSeed = null;
      
      for (let seed = 0; seed < 256; seed++) {
        const lookup = this.generateLookupTable(seed);
        const lookupResult = Buffer.from(challengeRandom.map(byte => lookup[byte]));
        const accuracy = this.calculateAccuracy(responseRandom, lookupResult);
        
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestSeed = seed;
        }
      }
      
      results.push({
        session: session.id,
        accuracy: bestAccuracy,
        seed: bestSeed
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
   * Test combined operations
   */
  testCombinedOperations() {
    const results = [];
    
    for (const session of this.testData.sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      const challengeRandom = challenge.slice(0, 8);
      const responseRandom = response.slice(0, 8);
      
      // Test combined operations (XOR + addition)
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
  runComprehensiveAnalysis() {
    console.log('🚀 Starting Comprehensive Analysis...\n');
    
    // Load test data
    if (!this.loadTestData()) {
      return false;
    }
    
    // Run pattern analysis
    this.runPatternAnalysis();
    
    // Test transformation hypotheses
    this.testTransformationHypotheses();
    
    // Generate final report
    this.generateFinalReport();
    
    return true;
  }

  /**
   * Generate final report
   */
  generateFinalReport() {
    console.log('\n📊 Comprehensive Analysis Report');
    console.log('================================');
    
    // Pattern analysis results
    if (this.results.patternAnalysis) {
      console.log('\n🔍 Pattern Analysis Results:');
      const patterns = this.results.patternAnalysis.patterns;
      if (patterns.transformations) {
        const allTransformations = patterns.transformations.flatMap(t => t.transformations);
        const bestTransformations = allTransformations
          .sort((a, b) => b.accuracy - a.accuracy)
          .slice(0, 3);
        
        console.log('  Top Transformation Methods:');
        bestTransformations.forEach((transform, index) => {
          console.log(`    ${index + 1}. ${transform.name}: ${transform.accuracy.toFixed(2)}% accuracy`);
        });
      }
    }
    
    // Hypothesis testing results
    if (this.results.hypotheses) {
      console.log('\n🧪 Hypothesis Testing Results:');
      for (const [name, result] of Object.entries(this.results.hypotheses)) {
        if (result.success) {
          console.log(`  ✅ ${name}: ${result.accuracy.toFixed(2)}% accuracy`);
        } else {
          console.log(`  ❌ ${name}: Failed`);
        }
      }
    }
    
    // Recommendations
    console.log('\n🎯 Recommendations:');
    console.log('1. Focus on successful transformation methods');
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
    const resultsPath = path.join(__dirname, '../../test-vectors/analysis-results.json');
    
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
  const analysis = new ComprehensiveAnalysis();
  analysis.runComprehensiveAnalysis();
}

module.exports = ComprehensiveAnalysis;
