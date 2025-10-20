/**
 * Haier Protocol Transformation Analyzer
 * 
 * This module analyzes challenge-response transformation patterns
 * to identify the authentication algorithm.
 */

const crypto = require('crypto');
const HexUtils = require('../utils/hex-utils');

class TransformationAnalyzer {
  constructor() {
    this.sessions = [];
    this.transformationMethods = {
      'XOR': this.testXOR,
      'AES-128-CBC': this.testAESCBC,
      'AES-128-GCM': this.testAESGCM,
      'AES-128-CTR': this.testAESCTR,
      'AES-256-CBC': this.testAES256CBC,
      'Substitution': this.testSubstitution,
      'Arithmetic': this.testArithmetic,
      'Lookup': this.testLookup,
      'HMAC': this.testHMAC
    };
  }

  /**
   * Run comprehensive transformation analysis
   */
  async runAnalysis() {
    console.log('🔍 Starting Transformation Analysis...');
    
    // Load authentication sessions
    await this.loadSessions();
    console.log(`📊 Loaded ${this.sessions.length} authentication sessions`);
    
    // Analyze each transformation method
    const results = [];
    
    for (const [name, method] of Object.entries(this.transformationMethods)) {
      console.log(`\n🧪 Testing ${name}...`);
      const result = await this.testTransformation(name, method);
      results.push(result);
      
      if (result.successRate > 0.5) {
        console.log(`✅ ${name}: ${(result.successRate * 100).toFixed(1)}% success rate`);
      } else {
        console.log(`❌ ${name}: ${(result.successRate * 100).toFixed(1)}% success rate`);
      }
    }
    
    // Save results
    this.saveResults(results);
    this.printSummary(results);
  }

  /**
   * Load authentication sessions
   */
  async loadSessions() {
    try {
      const fs = require('fs').promises;
      
      // Load original sessions
      const originalData = await fs.readFile('test-vectors/authentication-sessions.json', 'utf8');
      const originalSessions = JSON.parse(originalData);
      
      // Load binding sessions
      const bindingData = await fs.readFile('test-vectors/binding-auth-sessions.json', 'utf8');
      const bindingSessions = JSON.parse(bindingData);
      
      this.sessions = [
        ...(Array.isArray(originalSessions) ? originalSessions : [originalSessions]),
        ...(Array.isArray(bindingSessions) ? bindingSessions : [bindingSessions])
      ];
      
    } catch (error) {
      console.log('⚠️  Could not load sessions, using mock data');
      this.sessions = [
        {
          id: 1,
          challenge: 'db616e43471e374f01796d401a3574798c910b91390002e9a84a195f',
          response: '565765564943375501d287c94b779b59d7e268e2a880ff5524068bcfd8'
        }
      ];
    }
  }

  /**
   * Test a specific transformation method
   */
  async testTransformation(name, method) {
    let correct = 0;
    let total = 0;
    const details = [];
    
    for (const session of this.sessions) {
      try {
        const challenge = HexUtils.hexToBuffer(session.challenge);
        const response = HexUtils.hexToBuffer(session.response);
        
        // Extract first 8 bytes for transformation testing
        const challenge8 = challenge.slice(0, 8);
        const response8 = response.slice(0, 8);
        
        const transformed = await method(challenge8, session);
        const matches = this.compareBuffers(transformed, response8);
        
        if (matches) {
          correct++;
        }
        
        details.push({
          sessionId: session.id,
          challenge: HexUtils.bufferToHex(challenge8),
          response: HexUtils.bufferToHex(response8),
          transformed: HexUtils.bufferToHex(transformed),
          matches: matches
        });
        
        total++;
      } catch (error) {
        console.log(`⚠️  Error testing ${name} on session ${session.id}: ${error.message}`);
      }
    }
    
    const successRate = total > 0 ? correct / total : 0;
    
    return {
      name: name,
      successRate: successRate,
      correct: correct,
      total: total,
      details: details
    };
  }

  /**
   * Test XOR transformation
   */
  async testXOR(challenge, session) {
    // Try different XOR keys
    const keys = this.generateXORKeys(session);
    
    for (const key of keys) {
      const result = Buffer.alloc(challenge.length);
      for (let i = 0; i < challenge.length; i++) {
        result[i] = challenge[i] ^ key[i % key.length];
      }
      
      // Check if this matches the response
      if (this.compareBuffers(result, HexUtils.hexToBuffer(session.response).slice(0, 8))) {
        return result;
      }
    }
    
    // Return default XOR if no match
    const key = Buffer.from([0x89, 0x84, 0x8B, 0x8A, 0x8D, 0x8C, 0x8F, 0x8E]);
    const result = Buffer.alloc(challenge.length);
    for (let i = 0; i < challenge.length; i++) {
      result[i] = challenge[i] ^ key[i % key.length];
    }
    return result;
  }

  /**
   * Test AES-128-CBC
   */
  async testAESCBC(challenge, session) {
    const keys = this.generateAESKeys(session);
    
    for (const key of keys) {
      try {
        const cipher = crypto.createCipher('aes-128-cbc', key);
        let encrypted = cipher.update(challenge);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.slice(0, 8);
      } catch (error) {
        continue;
      }
    }
    
    return challenge; // Return unchanged if no match
  }

  /**
   * Test AES-128-GCM
   */
  async testAESGCM(challenge, session) {
    const keys = this.generateAESKeys(session);
    
    for (const key of keys) {
      try {
        const cipher = crypto.createCipher('aes-128-gcm', key);
        let encrypted = cipher.update(challenge);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.slice(0, 8);
      } catch (error) {
        continue;
      }
    }
    
    return challenge;
  }

  /**
   * Test AES-128-CTR
   */
  async testAESCTR(challenge, session) {
    const keys = this.generateAESKeys(session);
    
    for (const key of keys) {
      try {
        const cipher = crypto.createCipher('aes-128-ctr', key);
        let encrypted = cipher.update(challenge);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.slice(0, 8);
      } catch (error) {
        continue;
      }
    }
    
    return challenge;
  }

  /**
   * Test AES-256-CBC
   */
  async testAES256CBC(challenge, session) {
    const keys = this.generateAES256Keys(session);
    
    for (const key of keys) {
      try {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(challenge);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.slice(0, 8);
      } catch (error) {
        continue;
      }
    }
    
    return challenge;
  }

  /**
   * Test substitution cipher
   */
  async testSubstitution(challenge, session) {
    const sbox = this.generateSBox(session);
    const result = Buffer.alloc(challenge.length);
    
    for (let i = 0; i < challenge.length; i++) {
      result[i] = sbox[challenge[i]];
    }
    
    return result;
  }

  /**
   * Test arithmetic operations
   */
  async testArithmetic(challenge, session) {
    const result = Buffer.alloc(challenge.length);
    
    for (let i = 0; i < challenge.length; i++) {
      // Try different arithmetic operations
      result[i] = (challenge[i] + 0x89) & 0xFF; // Addition
      // result[i] = (challenge[i] - 0x84) & 0xFF; // Subtraction
      // result[i] = (challenge[i] * 2) & 0xFF; // Multiplication
    }
    
    return result;
  }

  /**
   * Test lookup table
   */
  async testLookup(challenge, session) {
    const lookup = this.generateLookupTable(session);
    const result = Buffer.alloc(challenge.length);
    
    for (let i = 0; i < challenge.length; i++) {
      result[i] = lookup[challenge[i]];
    }
    
    return result;
  }

  /**
   * Test HMAC
   */
  async testHMAC(challenge, session) {
    const keys = this.generateHMACKeys(session);
    
    for (const key of keys) {
      try {
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(challenge);
        const result = hmac.digest();
        return result.slice(0, 8);
      } catch (error) {
        continue;
      }
    }
    
    return challenge;
  }

  /**
   * Generate XOR keys for testing
   */
  generateXORKeys(session) {
    const keys = [];
    
    // Common XOR patterns from analysis
    keys.push(Buffer.from([0x89, 0x84, 0x8B, 0x8A, 0x8D, 0x8C, 0x8F, 0x8E]));
    keys.push(Buffer.from([0x84, 0x8B, 0x8A, 0x8D, 0x8C, 0x8F, 0x8E, 0x89]));
    keys.push(Buffer.from([0x8B, 0x8A, 0x8D, 0x8C, 0x8F, 0x8E, 0x89, 0x84]));
    
    // Session-based keys
    if (session.imei) {
      const imeiHash = crypto.createHash('sha256').update(session.imei).digest();
      keys.push(imeiHash.slice(0, 8));
    }
    
    return keys;
  }

  /**
   * Generate AES keys for testing
   */
  generateAESKeys(session) {
    const keys = [];
    
    // Session-based keys
    if (session.imei) {
      const imeiHash = crypto.createHash('sha256').update(session.imei).digest();
      keys.push(imeiHash.slice(0, 16));
    }
    
    if (session.serial) {
      const serialHash = crypto.createHash('sha256').update(session.serial).digest();
      keys.push(serialHash.slice(0, 16));
    }
    
    return keys;
  }

  /**
   * Generate AES-256 keys for testing
   */
  generateAES256Keys(session) {
    const keys = [];
    
    if (session.imei && session.serial) {
      const combined = session.imei + session.serial;
      const combinedHash = crypto.createHash('sha256').update(combined).digest();
      keys.push(combinedHash);
    }
    
    return keys;
  }

  /**
   * Generate HMAC keys for testing
   */
  generateHMACKeys(session) {
    const keys = [];
    
    if (session.imei) {
      keys.push(session.imei);
    }
    
    if (session.serial) {
      keys.push(session.serial);
    }
    
    return keys;
  }

  /**
   * Generate substitution box
   */
  generateSBox(session) {
    const sbox = new Array(256);
    
    // Initialize with identity
    for (let i = 0; i < 256; i++) {
      sbox[i] = i;
    }
    
    // Apply session-based permutation
    if (session.imei) {
      const seed = parseInt(session.imei.slice(-8), 16);
      for (let i = 0; i < 256; i++) {
        const j = (i + seed) % 256;
        [sbox[i], sbox[j]] = [sbox[j], sbox[i]];
      }
    }
    
    return sbox;
  }

  /**
   * Generate lookup table
   */
  generateLookupTable(session) {
    const lookup = new Array(256);
    
    for (let i = 0; i < 256; i++) {
      lookup[i] = (i + 0x89) & 0xFF;
    }
    
    return lookup;
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
   * Save results
   */
  saveResults(results) {
    const fs = require('fs');
    const data = {
      timestamp: new Date().toISOString(),
      totalSessions: this.sessions.length,
      results: results
    };
    
    fs.writeFileSync(
      'test-vectors/transformation-analysis-results.json',
      JSON.stringify(data, null, 2)
    );
    
    console.log('💾 Saved transformation analysis results to test-vectors/transformation-analysis-results.json');
  }

  /**
   * Print summary
   */
  printSummary(results) {
    console.log('\n📊 Transformation Analysis Summary:');
    console.log(`   Total sessions tested: ${this.sessions.length}`);
    
    // Sort by success rate
    const sorted = results.sort((a, b) => b.successRate - a.successRate);
    
    console.log('\n🏆 Top Performing Transformations:');
    sorted.slice(0, 5).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.name}: ${(result.successRate * 100).toFixed(1)}% (${result.correct}/${result.total})`);
    });
    
    // Find best transformation
    const best = sorted[0];
    if (best && best.successRate > 0.5) {
      console.log(`\n✅ Best Transformation: ${best.name} with ${(best.successRate * 100).toFixed(1)}% accuracy`);
    } else {
      console.log('\n⚠️  No transformation achieved >50% accuracy');
      console.log('   Consider combining multiple methods or using session-specific keys');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new TransformationAnalyzer();
  analyzer.runAnalysis().catch(console.error);
}

module.exports = TransformationAnalyzer;
