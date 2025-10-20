/**
 * Haier Protocol Pattern Analyzer
 * 
 * This module analyzes patterns in the captured data
 * to identify the authentication algorithm structure.
 */

const HexUtils = require('../utils/hex-utils');

class PatternAnalyzer {
  constructor() {
    this.patterns = {};
    this.statistics = {};
  }

  /**
   * Analyze hex patterns in captured data
   */
  analyzeHexPatterns(data) {
    console.log('🔍 Analyzing hex patterns...');
    
    const patterns = {
      byteFrequency: {},
      bytePairs: {},
      byteTriplets: {},
      entropy: 0,
      distribution: {}
    };
    
    // Convert hex string to bytes
    const bytes = HexUtils.hexToBuffer(data);
    
    // Analyze byte frequency
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      patterns.byteFrequency[byte] = (patterns.byteFrequency[byte] || 0) + 1;
      
      // Analyze byte pairs
      if (i < bytes.length - 1) {
        const pair = `${byte.toString(16).padStart(2, '0')}${bytes[i + 1].toString(16).padStart(2, '0')}`;
        patterns.bytePairs[pair] = (patterns.bytePairs[pair] || 0) + 1;
      }
      
      // Analyze byte triplets
      if (i < bytes.length - 2) {
        const triplet = `${byte.toString(16).padStart(2, '0')}${bytes[i + 1].toString(16).padStart(2, '0')}${bytes[i + 2].toString(16).padStart(2, '0')}`;
        patterns.byteTriplets[triplet] = (patterns.byteTriplets[triplet] || 0) + 1;
      }
    }
    
    // Calculate entropy
    patterns.entropy = this.calculateEntropy(bytes);
    
    // Calculate distribution
    patterns.distribution = this.calculateDistribution(patterns.byteFrequency, bytes.length);
    
    return patterns;
  }

  /**
   * Analyze challenge-response patterns
   */
  analyzeChallengeResponse(challenge, response) {
    console.log('🔍 Analyzing challenge-response patterns...');
    
    const patterns = {
      challenge: this.analyzeHexPatterns(challenge),
      response: this.analyzeHexPatterns(response),
      correlation: {},
      transformation: {}
    };
    
    // Analyze correlation between challenge and response
    patterns.correlation = this.analyzeCorrelation(challenge, response);
    
    // Analyze transformation patterns
    patterns.transformation = this.analyzeTransformation(challenge, response);
    
    return patterns;
  }

  /**
   * Analyze correlation between challenge and response
   */
  analyzeCorrelation(challenge, response) {
    const challengeBytes = HexUtils.hexToBuffer(challenge);
    const responseBytes = HexUtils.hexToBuffer(response);
    
    const correlation = {
      length: challengeBytes.length === responseBytes.length,
      byteCorrelation: [],
      positionCorrelation: {},
      patternCorrelation: {}
    };
    
    // Analyze byte-by-byte correlation
    for (let i = 0; i < Math.min(challengeBytes.length, responseBytes.length); i++) {
      const challengeByte = challengeBytes[i];
      const responseByte = responseBytes[i];
      
      correlation.byteCorrelation.push({
        position: i,
        challenge: challengeByte,
        response: responseByte,
        difference: (responseByte - challengeByte + 256) % 256,
        xor: challengeByte ^ responseByte,
        sum: (challengeByte + responseByte) % 256
      });
    }
    
    // Analyze position-based correlation
    for (let i = 0; i < correlation.byteCorrelation.length; i++) {
      const corr = correlation.byteCorrelation[i];
      correlation.positionCorrelation[i] = {
        difference: corr.difference,
        xor: corr.xor,
        sum: corr.sum
      };
    }
    
    // Analyze pattern correlation
    correlation.patternCorrelation = this.analyzePatternCorrelation(challengeBytes, responseBytes);
    
    return correlation;
  }

  /**
   * Analyze transformation patterns
   */
  analyzeTransformation(challenge, response) {
    const challengeBytes = HexUtils.hexToBuffer(challenge);
    const responseBytes = HexUtils.hexToBuffer(response);
    
    const transformation = {
      linear: this.testLinearTransformation(challengeBytes, responseBytes),
      polynomial: this.testPolynomialTransformation(challengeBytes, responseBytes),
      exponential: this.testExponentialTransformation(challengeBytes, responseBytes),
      logarithmic: this.testLogarithmicTransformation(challengeBytes, responseBytes),
      custom: this.testCustomTransformation(challengeBytes, responseBytes)
    };
    
    return transformation;
  }

  /**
   * Test linear transformation
   */
  testLinearTransformation(challenge, response) {
    // Test if response = a * challenge + b (mod 256)
    const results = [];
    
    for (let a = 1; a < 256; a++) {
      for (let b = 0; b < 256; b++) {
        let matches = 0;
        for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
          const expected = (a * challenge[i] + b) % 256;
          if (expected === response[i]) {
            matches++;
          }
        }
        
        if (matches > 0) {
          results.push({
            a: a,
            b: b,
            matches: matches,
            accuracy: matches / Math.min(challenge.length, response.length)
          });
        }
      }
    }
    
    return results.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Test polynomial transformation
   */
  testPolynomialTransformation(challenge, response) {
    // Test if response = a * challenge^2 + b * challenge + c (mod 256)
    const results = [];
    
    for (let a = 0; a < 256; a++) {
      for (let b = 0; b < 256; b++) {
        for (let c = 0; c < 256; c++) {
          let matches = 0;
          for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
            const expected = (a * challenge[i] * challenge[i] + b * challenge[i] + c) % 256;
            if (expected === response[i]) {
              matches++;
            }
          }
          
          if (matches > 0) {
            results.push({
              a: a,
              b: b,
              c: c,
              matches: matches,
              accuracy: matches / Math.min(challenge.length, response.length)
            });
          }
        }
      }
    }
    
    return results.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Test exponential transformation
   */
  testExponentialTransformation(challenge, response) {
    // Test if response = a^challenge (mod 256)
    const results = [];
    
    for (let a = 2; a < 256; a++) {
      let matches = 0;
      for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
        const expected = this.modPow(a, challenge[i], 256);
        if (expected === response[i]) {
          matches++;
        }
      }
      
      if (matches > 0) {
        results.push({
          a: a,
          matches: matches,
          accuracy: matches / Math.min(challenge.length, response.length)
        });
      }
    }
    
    return results.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Test logarithmic transformation
   */
  testLogarithmicTransformation(challenge, response) {
    // Test if response = log_a(challenge) (mod 256)
    const results = [];
    
    for (let a = 2; a < 256; a++) {
      let matches = 0;
      for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
        const expected = this.modLog(challenge[i], a, 256);
        if (expected === response[i]) {
          matches++;
        }
      }
      
      if (matches > 0) {
        results.push({
          a: a,
          matches: matches,
          accuracy: matches / Math.min(challenge.length, response.length)
        });
      }
    }
    
    return results.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Test custom transformation
   */
  testCustomTransformation(challenge, response) {
    // Test if response follows a custom pattern
    // This is where we'd implement the actual Haier algorithm once discovered
    
    const results = [];
    
    // Test if response is a rotation of challenge
    for (let shift = 1; shift < 8; shift++) {
      let matches = 0;
      for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
        const expected = ((challenge[i] << shift) | (challenge[i] >> (8 - shift))) & 0xFF;
        if (expected === response[i]) {
          matches++;
        }
      }
      
      if (matches > 0) {
        results.push({
          type: 'rotation',
          shift: shift,
          matches: matches,
          accuracy: matches / Math.min(challenge.length, response.length)
        });
      }
    }
    
    // Test if response is a bitwise operation of challenge
    const bitwiseOps = ['and', 'or', 'xor', 'not'];
    for (const op of bitwiseOps) {
      let matches = 0;
      for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
        let expected;
        switch (op) {
          case 'and':
            expected = challenge[i] & response[i];
            break;
          case 'or':
            expected = challenge[i] | response[i];
            break;
          case 'xor':
            expected = challenge[i] ^ response[i];
            break;
          case 'not':
            expected = ~challenge[i] & 0xFF;
            break;
        }
        
        if (expected === response[i]) {
          matches++;
        }
      }
      
      if (matches > 0) {
        results.push({
          type: 'bitwise',
          operation: op,
          matches: matches,
          accuracy: matches / Math.min(challenge.length, response.length)
        });
      }
    }
    
    return results.sort((a, b) => b.accuracy - a.accuracy);
  }

  /**
   * Analyze pattern correlation
   */
  analyzePatternCorrelation(challenge, response) {
    const correlation = {
      length: challenge.length === response.length,
      bytePatterns: {},
      positionPatterns: {},
      sequencePatterns: {}
    };
    
    // Analyze byte patterns
    for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
      const challengeByte = challenge[i];
      const responseByte = response[i];
      
      const pattern = `${challengeByte.toString(16).padStart(2, '0')}->${responseByte.toString(16).padStart(2, '0')}`;
      correlation.bytePatterns[pattern] = (correlation.bytePatterns[pattern] || 0) + 1;
    }
    
    // Analyze position patterns
    for (let i = 0; i < Math.min(challenge.length, response.length); i++) {
      const challengeByte = challenge[i];
      const responseByte = response[i];
      
      correlation.positionPatterns[i] = {
        challenge: challengeByte,
        response: responseByte,
        difference: (responseByte - challengeByte + 256) % 256,
        xor: challengeByte ^ responseByte
      };
    }
    
    // Analyze sequence patterns
    correlation.sequencePatterns = this.analyzeSequencePatterns(challenge, response);
    
    return correlation;
  }

  /**
   * Analyze sequence patterns
   */
  analyzeSequencePatterns(challenge, response) {
    const patterns = {
      increasing: this.isIncreasing(challenge) && this.isIncreasing(response),
      decreasing: this.isDecreasing(challenge) && this.isDecreasing(response),
      alternating: this.isAlternating(challenge) && this.isAlternating(response),
      periodic: this.isPeriodic(challenge) && this.isPeriodic(response)
    };
    
    return patterns;
  }

  /**
   * Check if sequence is increasing
   */
  isIncreasing(sequence) {
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] <= sequence[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if sequence is decreasing
   */
  isDecreasing(sequence) {
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] >= sequence[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if sequence is alternating
   */
  isAlternating(sequence) {
    if (sequence.length < 2) return false;
    
    const first = sequence[0];
    const second = sequence[1];
    
    for (let i = 2; i < sequence.length; i++) {
      if (i % 2 === 0) {
        if (sequence[i] !== first) return false;
      } else {
        if (sequence[i] !== second) return false;
      }
    }
    
    return true;
  }

  /**
   * Check if sequence is periodic
   */
  isPeriodic(sequence) {
    for (let period = 1; period <= sequence.length / 2; period++) {
      let isPeriodic = true;
      for (let i = period; i < sequence.length; i++) {
        if (sequence[i] !== sequence[i - period]) {
          isPeriodic = false;
          break;
        }
      }
      if (isPeriodic) return true;
    }
    return false;
  }

  /**
   * Calculate entropy
   */
  calculateEntropy(bytes) {
    const frequency = {};
    for (const byte of bytes) {
      frequency[byte] = (frequency[byte] || 0) + 1;
    }
    
    let entropy = 0;
    const length = bytes.length;
    
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  /**
   * Calculate distribution
   */
  calculateDistribution(frequency, length) {
    const distribution = {};
    
    for (const [byte, count] of Object.entries(frequency)) {
      distribution[byte] = {
        count: count,
        percentage: (count / length) * 100,
        frequency: count / length
      };
    }
    
    return distribution;
  }

  /**
   * Modular exponentiation
   */
  modPow(base, exponent, modulus) {
    let result = 1;
    base = base % modulus;
    
    while (exponent > 0) {
      if (exponent % 2 === 1) {
        result = (result * base) % modulus;
      }
      exponent = Math.floor(exponent / 2);
      base = (base * base) % modulus;
    }
    
    return result;
  }

  /**
   * Modular logarithm
   */
  modLog(value, base, modulus) {
    for (let i = 0; i < modulus; i++) {
      if (this.modPow(base, i, modulus) === value) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📊 Pattern Analysis Report:');
    console.log('===========================');
    
    for (const [name, pattern] of Object.entries(this.patterns)) {
      console.log(`\n${name}:`);
      console.log(`  Entropy: ${pattern.entropy.toFixed(2)}`);
      console.log(`  Unique bytes: ${Object.keys(pattern.byteFrequency).length}`);
      console.log(`  Most frequent byte: ${this.getMostFrequent(pattern.byteFrequency)}`);
      console.log(`  Distribution: ${JSON.stringify(pattern.distribution, null, 2)}`);
    }
  }

  /**
   * Get most frequent byte
   */
  getMostFrequent(frequency) {
    let maxCount = 0;
    let mostFrequent = null;
    
    for (const [byte, count] of Object.entries(frequency)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = byte;
      }
    }
    
    return mostFrequent;
  }
}

module.exports = PatternAnalyzer;
