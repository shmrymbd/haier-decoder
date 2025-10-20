/**
 * Haier Protocol Key Derivation Tester
 * 
 * This module systematically tests key derivation combinations
 * with real device identifiers from captured data.
 */

const crypto = require('crypto');
const HexUtils = require('../utils/hex-utils');

class KeyDerivationTester {
  constructor() {
    this.deviceInfo = {
      imei: '862817068367949',
      serial: '0021800078EHD5108DUZ00000002',
      model: 'CEAB9UQ00',
      firmware: 'E++2.17'
    };
    
    this.testResults = [];
  }

  /**
   * Test all key derivation combinations
   */
  async testAllCombinations() {
    console.log('🔐 Testing Key Derivation Combinations...');
    console.log(`📱 Device Info: ${JSON.stringify(this.deviceInfo, null, 2)}`);
    
    const combinations = this.generateCombinations();
    console.log(`🧪 Testing ${combinations.length} combinations...`);
    
    for (let i = 0; i < combinations.length; i++) {
      const combination = combinations[i];
      console.log(`\n🔍 Testing combination ${i + 1}/${combinations.length}: ${combination.name}`);
      
      try {
        const result = await this.testCombination(combination);
        this.testResults.push(result);
        
        if (result.success) {
          console.log(`✅ SUCCESS: ${combination.name}`);
          console.log(`   Key: ${HexUtils.bufferToHex(result.key)}`);
          console.log(`   Method: ${combination.method}`);
        } else {
          console.log(`❌ Failed: ${combination.name}`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${combination.name}: ${error.message}`);
        this.testResults.push({
          name: combination.name,
          success: false,
          error: error.message
        });
      }
    }
    
    this.saveResults();
    this.printSummary();
  }

  /**
   * Generate all possible combinations
   */
  generateCombinations() {
    const combinations = [];
    
    // Test individual identifiers
    const identifiers = [
      { name: 'IMEI', value: this.deviceInfo.imei },
      { name: 'Serial', value: this.deviceInfo.serial },
      { name: 'Model', value: this.deviceInfo.model },
      { name: 'Firmware', value: this.deviceInfo.firmware }
    ];
    
    // Test individual identifiers
    identifiers.forEach(id => {
      combinations.push({
        name: `Single-${id.name}`,
        method: 'direct',
        inputs: [id.value],
        hashFunction: 'sha256'
      });
    });
    
    // Test combinations of identifiers
    const pairs = this.getPairs(identifiers);
    pairs.forEach(pair => {
      combinations.push({
        name: `Pair-${pair[0].name}-${pair[1].name}`,
        method: 'concatenate',
        inputs: [pair[0].value, pair[1].value],
        hashFunction: 'sha256'
      });
    });
    
    // Test all identifiers together
    combinations.push({
      name: 'All-Identifiers',
      method: 'concatenate',
      inputs: identifiers.map(id => id.value),
      hashFunction: 'sha256'
    });
    
    // Test with different hash functions
    const hashFunctions = ['sha256', 'sha1', 'md5'];
    hashFunctions.forEach(hash => {
      combinations.push({
        name: `IMEI-${hash.toUpperCase()}`,
        method: 'direct',
        inputs: [this.deviceInfo.imei],
        hashFunction: hash
      });
    });
    
    // Test PBKDF2 with different iterations
    const iterations = [1000, 10000, 100000];
    iterations.forEach(iter => {
      combinations.push({
        name: `PBKDF2-${iter}`,
        method: 'pbkdf2',
        inputs: [this.deviceInfo.imei],
        hashFunction: 'sha256',
        iterations: iter,
        salt: this.deviceInfo.serial
      });
    });
    
    // Test HKDF
    combinations.push({
      name: 'HKDF-IMEI-Serial',
      method: 'hkdf',
      inputs: [this.deviceInfo.imei],
      hashFunction: 'sha256',
      salt: this.deviceInfo.serial,
      info: this.deviceInfo.model
    });
    
    // Test with timestamps
    const timestamps = [1760889649, 1760889650, 1760889651];
    timestamps.forEach(ts => {
      combinations.push({
        name: `IMEI-Timestamp-${ts}`,
        method: 'concatenate',
        inputs: [this.deviceInfo.imei, ts.toString()],
        hashFunction: 'sha256'
      });
    });
    
    return combinations;
  }

  /**
   * Get all pairs from an array
   */
  getPairs(array) {
    const pairs = [];
    for (let i = 0; i < array.length; i++) {
      for (let j = i + 1; j < array.length; j++) {
        pairs.push([array[i], array[j]]);
      }
    }
    return pairs;
  }

  /**
   * Test a specific combination
   */
  async testCombination(combination) {
    let key;
    
    try {
      switch (combination.method) {
        case 'direct':
          key = this.hashInput(combination.inputs[0], combination.hashFunction);
          break;
          
        case 'concatenate':
          const concatenated = combination.inputs.join('');
          key = this.hashInput(concatenated, combination.hashFunction);
          break;
          
        case 'pbkdf2':
          key = this.pbkdf2Derive(
            combination.inputs[0],
            combination.salt,
            combination.iterations,
            combination.hashFunction
          );
          break;
          
        case 'hkdf':
          key = this.hkdfDerive(
            combination.inputs[0],
            combination.salt,
            combination.info,
            combination.hashFunction
          );
          break;
          
        default:
          throw new Error(`Unknown method: ${combination.method}`);
      }
      
      // Test if key produces valid results
      const isValid = await this.validateKey(key, combination);
      
      return {
        name: combination.name,
        success: isValid,
        key: key,
        method: combination.method,
        inputs: combination.inputs,
        hashFunction: combination.hashFunction
      };
      
    } catch (error) {
      return {
        name: combination.name,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Hash input with specified function
   */
  hashInput(input, hashFunction) {
    const hash = crypto.createHash(hashFunction);
    hash.update(input);
    return hash.digest();
  }

  /**
   * PBKDF2 key derivation
   */
  pbkdf2Derive(password, salt, iterations, hashFunction) {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, hashFunction);
  }

  /**
   * HKDF key derivation
   */
  hkdfDerive(ikm, salt, info, hashFunction) {
    // Simple HKDF implementation
    const prk = crypto.createHmac(hashFunction, salt).update(ikm).digest();
    const okm = crypto.createHmac(hashFunction, prk).update(info).update(Buffer.from([0x01])).digest();
    return okm;
  }

  /**
   * Validate if key produces valid results
   */
  async validateKey(key, combination) {
    // Load test sessions
    const sessions = await this.loadTestSessions();
    
    // Test key against known challenge-response pairs
    for (const session of sessions) {
      const challenge = HexUtils.hexToBuffer(session.challenge);
      const response = HexUtils.hexToBuffer(session.response);
      
      // Test if key can transform challenge to response
      const transformed = this.transformWithKey(challenge, key);
      const matches = this.compareBuffers(transformed, response);
      
      if (matches) {
        console.log(`   ✅ Key matches session ${session.id}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Transform challenge with key
   */
  transformWithKey(challenge, key) {
    // Simple XOR transformation for testing
    const result = Buffer.alloc(challenge.length);
    for (let i = 0; i < challenge.length; i++) {
      result[i] = challenge[i] ^ key[i % key.length];
    }
    return result;
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
   * Load test sessions
   */
  async loadTestSessions() {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile('test-vectors/authentication-sessions.json', 'utf8');
      const sessions = JSON.parse(data);
      return Array.isArray(sessions) ? sessions : [sessions];
    } catch (error) {
      console.log('⚠️  Could not load test sessions, using mock data');
      return [
        {
          id: 1,
          challenge: 'db616e43471e374f01796d401a3574798c910b91390002e9a84a195f',
          response: '565765564943375501d287c94b779b59d7e268e2a880ff5524068bcfd8'
        }
      ];
    }
  }

  /**
   * Save test results
   */
  saveResults() {
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      deviceInfo: this.deviceInfo,
      totalTests: this.testResults.length,
      successfulTests: this.testResults.filter(r => r.success).length,
      results: this.testResults
    };
    
    fs.writeFileSync(
      'test-vectors/key-derivation-results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('💾 Saved key derivation results to test-vectors/key-derivation-results.json');
  }

  /**
   * Print summary
   */
  printSummary() {
    const successful = this.testResults.filter(r => r.success);
    const failed = this.testResults.filter(r => !r.success);
    
    console.log('\n📊 Key Derivation Test Summary:');
    console.log(`   Total tests: ${this.testResults.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Successful Key Derivation Methods:');
      successful.forEach(result => {
        console.log(`   • ${result.name}: ${result.method} (${result.hashFunction})`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Methods:');
      failed.slice(0, 5).forEach(result => {
        console.log(`   • ${result.name}: ${result.error || 'No match found'}`);
      });
      if (failed.length > 5) {
        console.log(`   ... and ${failed.length - 5} more`);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new KeyDerivationTester();
  tester.testAllCombinations().catch(console.error);
}

module.exports = KeyDerivationTester;
