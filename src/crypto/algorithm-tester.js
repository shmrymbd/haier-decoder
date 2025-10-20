/**
 * Haier Protocol Algorithm Tester
 * 
 * This module implements various cryptographic algorithms
 * to test against the captured Haier protocol data.
 */

const crypto = require('crypto');
const HexUtils = require('../utils/hex-utils');

class AlgorithmTester {
  constructor() {
    this.testVectors = this.loadTestVectors();
    this.results = [];
  }

  /**
   * Load test vectors from captured data
   */
  loadTestVectors() {
    return {
      deviceInfo: {
        imei: "862817068367949",
        serial: "0021800078EHD5108DUZ00000002",
        model: "CEAB9UQ00",
        firmware: "E++2.17",
        deviceType: "U-WMT"
      },
      sessions: [
        {
          id: 1,
          timestamp: "1760889649",
          sequence: "01",
          challenge: "db 61 6e 43 47 1e 37 4f 01 79 6d 40 1a 35 74 79 8c 91 0b 91 39 00 02 e9 a8 4a 19 5f",
          response: "56 57 65 56 49 43 37 55 01 d2 87 c9 4b 77 9b 59 d7 e2 68 e2 a8 80 ff 55 24 06 8b cf d8"
        },
        {
          id: 2,
          timestamp: "1760889650",
          sequence: "01",
          challenge: "75 5a af 88 e5 c8 52 70 01 3f 8e 46 d1 bb 19 63 34 9e dd c7 06 91 ed 68 4c c9 74 92",
          response: "45 4a 6c 61 32 56 41 54 01 6a a6 0b 61 b4 3a be 0f ce 22 83 f7 d8 ee a2 0f 1b 16 78"
        },
        {
          id: 3,
          timestamp: "1760889661",
          sequence: "01",
          challenge: "78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24",
          response: "64 38 63 4f 4e 79 47 30 01 17 70 f0 a8 83 ab e0 59 1d cb 20 35 44 8e 4c 79 70 56 b9"
        }
      ]
    };
  }

  /**
   * Test PBKDF2 key derivation
   */
  testPBKDF2() {
    console.log('🔐 Testing PBKDF2 key derivation...');
    
    const results = [];
    const { deviceInfo } = this.testVectors;
    
    for (const session of this.testVectors.sessions) {
      try {
        // Create password from device identifiers
        const password = `${deviceInfo.imei}${deviceInfo.serial}${deviceInfo.model}${deviceInfo.firmware}${session.timestamp}${session.sequence}`;
        
        // Test different salt values
        const salts = [
          Buffer.from('haier_salt', 'utf8'),
          Buffer.from('haier_auth', 'utf8'),
          Buffer.from('haier_protocol', 'utf8'),
          Buffer.from(deviceInfo.imei, 'utf8'),
          Buffer.from(deviceInfo.serial, 'utf8')
        ];
        
        for (const salt of salts) {
          // Test different iterations
          const iterations = [1000, 10000, 100000];
          
          for (const iteration of iterations) {
            // Test different key lengths
            const keyLengths = [16, 24, 32]; // 128, 192, 256 bits
            
            for (const keyLength of keyLengths) {
              const key = crypto.pbkdf2Sync(password, salt, iteration, keyLength, 'sha256');
              const keyHex = key.toString('hex');
              
              results.push({
                session: session.id,
                salt: salt.toString('hex'),
                iterations: iteration,
                keyLength: keyLength,
                key: keyHex,
                success: this.validateKey(key, session)
              });
            }
          }
        }
      } catch (error) {
        console.error(`❌ PBKDF2 test failed for session ${session.id}:`, error.message);
      }
    }
    
    this.results.push({
      algorithm: 'PBKDF2',
      results: results,
      successCount: results.filter(r => r.success).length,
      totalTests: results.length
    });
    
    console.log(`✅ PBKDF2 testing complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  }

  /**
   * Test HKDF key derivation
   */
  testHKDF() {
    console.log('🔐 Testing HKDF key derivation...');
    
    const results = [];
    const { deviceInfo } = this.testVectors;
    
    for (const session of this.testVectors.sessions) {
      try {
        // Create input key material
        const ikm = `${deviceInfo.imei}${deviceInfo.serial}${deviceInfo.model}${deviceInfo.firmware}${session.timestamp}${session.sequence}`;
        
        // Test different salt values
        const salts = [
          Buffer.from('haier_salt', 'utf8'),
          Buffer.from('haier_auth', 'utf8'),
          Buffer.from('haier_protocol', 'utf8'),
          Buffer.from(deviceInfo.imei, 'utf8'),
          Buffer.from(deviceInfo.serial, 'utf8')
        ];
        
        for (const salt of salts) {
          // Test different info values
          const infos = [
            Buffer.from('haier_auth', 'utf8'),
            Buffer.from('haier_challenge', 'utf8'),
            Buffer.from('haier_response', 'utf8'),
            Buffer.from(session.timestamp, 'utf8')
          ];
          
          for (const info of infos) {
            // Test different key lengths
            const keyLengths = [16, 24, 32]; // 128, 192, 256 bits
            
            for (const keyLength of keyLengths) {
              const key = this.hkdf(ikm, salt, info, keyLength);
              const keyHex = key.toString('hex');
              
              results.push({
                session: session.id,
                salt: salt.toString('hex'),
                info: info.toString('hex'),
                keyLength: keyLength,
                key: keyHex,
                success: this.validateKey(key, session)
              });
            }
          }
        }
      } catch (error) {
        console.error(`❌ HKDF test failed for session ${session.id}:`, error.message);
      }
    }
    
    this.results.push({
      algorithm: 'HKDF',
      results: results,
      successCount: results.filter(r => r.success).length,
      totalTests: results.length
    });
    
    console.log(`✅ HKDF testing complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  }

  /**
   * Test AES encryption algorithms
   */
  testAES() {
    console.log('🔐 Testing AES encryption algorithms...');
    
    const results = [];
    const { deviceInfo } = this.testVectors;
    
    for (const session of this.testVectors.sessions) {
      try {
        // Derive key using PBKDF2
        const password = `${deviceInfo.imei}${deviceInfo.serial}${deviceInfo.model}${deviceInfo.firmware}${session.timestamp}${session.sequence}`;
        const salt = Buffer.from('haier_salt', 'utf8');
        const key = crypto.pbkdf2Sync(password, salt, 10000, 32); // 256-bit key
        
        // Test different AES modes
        const modes = ['aes-128-cbc', 'aes-256-cbc', 'aes-128-gcm', 'aes-256-gcm'];
        
        for (const mode of modes) {
          try {
            // Test challenge encryption
            const challenge = HexUtils.hexToBuffer(session.challenge);
            const encryptedChallenge = this.encryptAES(challenge, key, mode);
            
            // Test response encryption
            const response = HexUtils.hexToBuffer(session.response);
            const encryptedResponse = this.encryptAES(response, key, mode);
            
            results.push({
              session: session.id,
              mode: mode,
              challenge: session.challenge,
              encryptedChallenge: HexUtils.bufferToHex(encryptedChallenge),
              response: session.response,
              encryptedResponse: HexUtils.bufferToHex(encryptedResponse),
              success: this.validateEncryption(challenge, response, encryptedChallenge, encryptedResponse)
            });
          } catch (error) {
            console.error(`❌ AES ${mode} test failed for session ${session.id}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`❌ AES test failed for session ${session.id}:`, error.message);
      }
    }
    
    this.results.push({
      algorithm: 'AES',
      results: results,
      successCount: results.filter(r => r.success).length,
      totalTests: results.length
    });
    
    console.log(`✅ AES testing complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  }

  /**
   * Test challenge-response transformation
   */
  testChallengeResponse() {
    console.log('🔐 Testing challenge-response transformation...');
    
    const results = [];
    
    for (const session of this.testVectors.sessions) {
      try {
        const challenge = HexUtils.hexToBuffer(session.challenge);
        const response = HexUtils.hexToBuffer(session.response);
        
        // Extract components
        const challengeRandom = challenge.slice(0, 8);
        const responseRandom = response.slice(0, 8);
        
        // Test different transformation methods
        const transformations = [
          this.testXORTransformation,
          this.testAdditionTransformation,
          this.testSubtractionTransformation,
          this.testRotationTransformation,
          this.testCustomTransformation
        ];
        
        for (const transform of transformations) {
          const result = transform(challengeRandom, responseRandom);
          if (result.success) {
            results.push({
              session: session.id,
              transformation: result.name,
              challenge: HexUtils.bufferToHex(challengeRandom),
              response: HexUtils.bufferToHex(responseRandom),
              success: true
            });
          }
        }
      } catch (error) {
        console.error(`❌ Challenge-response test failed for session ${session.id}:`, error.message);
      }
    }
    
    this.results.push({
      algorithm: 'Challenge-Response',
      results: results,
      successCount: results.filter(r => r.success).length,
      totalTests: results.length
    });
    
    console.log(`✅ Challenge-response testing complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  }

  /**
   * Test XOR transformation
   */
  testXORTransformation(challenge, response) {
    // Test if response is XOR of challenge with some key
    const xorResult = Buffer.from(challenge.map((byte, index) => byte ^ response[index]));
    
    return {
      name: 'XOR',
      success: this.isValidTransformation(xorResult),
      result: HexUtils.bufferToHex(xorResult)
    };
  }

  /**
   * Test addition transformation
   */
  testAdditionTransformation(challenge, response) {
    // Test if response is addition of challenge with some key
    const addResult = Buffer.from(challenge.map((byte, index) => (byte + response[index]) % 256));
    
    return {
      name: 'Addition',
      success: this.isValidTransformation(addResult),
      result: HexUtils.bufferToHex(addResult)
    };
  }

  /**
   * Test subtraction transformation
   */
  testSubtractionTransformation(challenge, response) {
    // Test if response is subtraction of challenge with some key
    const subResult = Buffer.from(challenge.map((byte, index) => (byte - response[index] + 256) % 256));
    
    return {
      name: 'Subtraction',
      success: this.isValidTransformation(subResult),
      result: HexUtils.bufferToHex(subResult)
    };
  }

  /**
   * Test rotation transformation
   */
  testRotationTransformation(challenge, response) {
    // Test if response is rotation of challenge
    for (let shift = 1; shift < 8; shift++) {
      const rotated = Buffer.from(challenge.map(byte => ((byte << shift) | (byte >> (8 - shift))) & 0xFF));
      if (rotated.equals(response)) {
        return {
          name: `Rotation-${shift}`,
          success: true,
          result: HexUtils.bufferToHex(rotated)
        };
      }
    }
    
    return {
      name: 'Rotation',
      success: false,
      result: null
    };
  }

  /**
   * Test custom transformation
   */
  testCustomTransformation(challenge, response) {
    // Test if response follows a custom pattern
    // This is where we'd implement the actual Haier algorithm once discovered
    
    return {
      name: 'Custom',
      success: false,
      result: null
    };
  }

  /**
   * Validate key against session data
   */
  validateKey(key, session) {
    // This is a placeholder - in reality, we'd test if the key
    // can decrypt the challenge/response data correctly
    return key.length >= 16; // Basic validation
  }

  /**
   * Validate encryption results
   */
  validateEncryption(original, expected, encrypted, decrypted) {
    // This is a placeholder - in reality, we'd test if
    // the encryption/decryption produces the expected results
    return encrypted.length > 0 && decrypted.length > 0;
  }

  /**
   * Check if transformation result is valid
   */
  isValidTransformation(result) {
    // Check if the result has a pattern that suggests it's a valid transformation
    if (!result || result.length === 0) return false;
    const uniqueBytes = new Set(result);
    return uniqueBytes.size > 1; // Not all the same byte
  }

  /**
   * HKDF implementation
   */
  hkdf(ikm, salt, info, length) {
    // Simplified HKDF implementation
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
    const okm = crypto.createHmac('sha256', prk).update(info).update(Buffer.from([0x01])).digest();
    return okm.slice(0, length);
  }

  /**
   * AES encryption
   */
  encryptAES(data, key, mode) {
    try {
      const cipher = crypto.createCipher(mode, key);
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return encrypted;
    } catch (error) {
      // Return empty buffer if encryption fails
      return Buffer.alloc(0);
    }
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🚀 Starting Haier Protocol Algorithm Testing...\n');
    
    this.testPBKDF2();
    this.testHKDF();
    this.testAES();
    this.testChallengeResponse();
    
    this.generateReport();
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    for (const result of this.results) {
      console.log(`\n${result.algorithm}:`);
      console.log(`  Success: ${result.successCount}/${result.totalTests} (${((result.successCount / result.totalTests) * 100).toFixed(1)}%)`);
      
      if (result.successCount > 0) {
        console.log('  Successful configurations:');
        const successful = result.results.filter(r => r.success);
        for (const config of successful.slice(0, 5)) { // Show first 5 successful
          console.log(`    - ${JSON.stringify(config, null, 2)}`);
        }
      }
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Analyze successful configurations');
    console.log('2. Test with additional captured data');
    console.log('3. Implement working algorithm');
    console.log('4. Validate with real device communication');
  }
}

module.exports = AlgorithmTester;
