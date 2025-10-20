#!/usr/bin/env node

/**
 * Rolling Code Algorithm Test Script
 * 
 * This script tests the rolling code algorithm against captured data
 * and provides detailed analysis of the results.
 */

const RollingCodeAlgorithm = require('./rolling-code-algorithm');
const fs = require('fs');
const path = require('path');

class RollingCodeTester {
  constructor() {
    this.algorithm = null;
    this.testData = null;
    this.results = {};
  }

  /**
   * Load test data from file
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
   * Initialize algorithm with device info
   */
  initializeAlgorithm() {
    if (!this.testData) {
      console.error('❌ No test data loaded');
      return false;
    }

    this.algorithm = new RollingCodeAlgorithm(this.testData.deviceInfo);
    console.log('✅ Algorithm initialized with device info');
    return true;
  }

  /**
   * Test key derivation methods
   */
  testKeyDerivation() {
    console.log('\n🔐 Testing Key Derivation Methods...');
    
    const results = {
      pbkdf2: [],
      hkdf: [],
      custom: []
    };

    for (const session of this.testData.sessions) {
      console.log(`\nSession ${session.id}:`);
      
      // Test PBKDF2
      try {
        const pbkdf2Key = this.algorithm.deriveKeyPBKDF2(session.timestamp, session.sequence);
        results.pbkdf2.push({
          session: session.id,
          key: pbkdf2Key.toString('hex'),
          length: pbkdf2Key.length
        });
        console.log(`  PBKDF2: ${pbkdf2Key.toString('hex').substring(0, 16)}...`);
      } catch (error) {
        console.log(`  PBKDF2: Failed - ${error.message}`);
      }

      // Test HKDF
      try {
        const hkdfKey = this.algorithm.deriveKeyHKDF(session.timestamp, session.sequence);
        results.hkdf.push({
          session: session.id,
          key: hkdfKey.toString('hex'),
          length: hkdfKey.length
        });
        console.log(`  HKDF: ${hkdfKey.toString('hex').substring(0, 16)}...`);
      } catch (error) {
        console.log(`  HKDF: Failed - ${error.message}`);
      }

      // Test Custom
      try {
        const customKey = this.algorithm.deriveKeyCustom(session.timestamp, session.sequence);
        if (customKey) {
          results.custom.push({
            session: session.id,
            key: customKey.toString('hex'),
            length: customKey.length
          });
          console.log(`  Custom: ${customKey.toString('hex').substring(0, 16)}...`);
        } else {
          console.log(`  Custom: No valid key found`);
        }
      } catch (error) {
        console.log(`  Custom: Failed - ${error.message}`);
      }
    }

    this.results.keyDerivation = results;
    return results;
  }

  /**
   * Test challenge-response transformations
   */
  testTransformations() {
    console.log('\n🔄 Testing Challenge-Response Transformations...');
    
    const results = {
      xor: [],
      aes: [],
      arithmetic: [],
      lookup: []
    };

    for (const session of this.testData.sessions) {
      console.log(`\nSession ${session.id}:`);
      
      const challenge = session.challenge;
      const actualResponse = session.response;
      const key = this.algorithm.deriveKey(session.timestamp, session.sequence);

      // Test XOR transformation
      try {
        const xorResponse = this.algorithm.transformXOR(
          HexUtils.hexToBuffer(challenge).slice(0, 8),
          HexUtils.hexToBuffer(challenge).slice(8, 29),
          key
        );
        const accuracy = this.calculateAccuracy(actualResponse.replace(/\s/g, ''), xorResponse.replace(/\s/g, ''));
        results.xor.push({
          session: session.id,
          response: xorResponse,
          accuracy: accuracy
        });
        console.log(`  XOR: ${accuracy.toFixed(2)}% accuracy`);
      } catch (error) {
        console.log(`  XOR: Failed - ${error.message}`);
      }

      // Test AES transformation
      try {
        const aesResponse = this.algorithm.transformAES(
          HexUtils.hexToBuffer(challenge).slice(0, 8),
          HexUtils.hexToBuffer(challenge).slice(8, 29),
          key
        );
        if (aesResponse) {
          const accuracy = this.calculateAccuracy(actualResponse.replace(/\s/g, ''), aesResponse.replace(/\s/g, ''));
          results.aes.push({
            session: session.id,
            response: aesResponse,
            accuracy: accuracy
          });
          console.log(`  AES: ${accuracy.toFixed(2)}% accuracy`);
        } else {
          console.log(`  AES: No response generated`);
        }
      } catch (error) {
        console.log(`  AES: Failed - ${error.message}`);
      }

      // Test Arithmetic transformation
      try {
        const arithmeticResponse = this.algorithm.transformArithmetic(
          HexUtils.hexToBuffer(challenge).slice(0, 8),
          HexUtils.hexToBuffer(challenge).slice(8, 29),
          key
        );
        const accuracy = this.calculateAccuracy(actualResponse.replace(/\s/g, ''), arithmeticResponse.replace(/\s/g, ''));
        results.arithmetic.push({
          session: session.id,
          response: arithmeticResponse,
          accuracy: accuracy
        });
        console.log(`  Arithmetic: ${accuracy.toFixed(2)}% accuracy`);
      } catch (error) {
        console.log(`  Arithmetic: Failed - ${error.message}`);
      }

      // Test Lookup transformation
      try {
        const lookupResponse = this.algorithm.transformLookup(
          HexUtils.hexToBuffer(challenge).slice(0, 8),
          HexUtils.hexToBuffer(challenge).slice(8, 29),
          key
        );
        const accuracy = this.calculateAccuracy(actualResponse.replace(/\s/g, ''), lookupResponse.replace(/\s/g, ''));
        results.lookup.push({
          session: session.id,
          response: lookupResponse,
          accuracy: accuracy
        });
        console.log(`  Lookup: ${accuracy.toFixed(2)}% accuracy`);
      } catch (error) {
        console.log(`  Lookup: Failed - ${error.message}`);
      }
    }

    this.results.transformations = results;
    return results;
  }

  /**
   * Test CRC algorithms
   */
  testCRCAlgorithms() {
    console.log('\n🔢 Testing CRC Algorithms...');
    
    const results = {
      crc16ccitt: [],
      crc16modbus: [],
      crc16ibm: [],
      crc16ansi: [],
      crc16usb: [],
      crc24: [],
      custom: []
    };

    // Test with all captured packets
    const testPackets = [
      { name: 'Challenge 1', data: 'db 61 6e 43 47 1e 37 4f 01 79 6d 40 1a 35 74 79 8c 91 0b 91 39 00 02 e9 a8 4a 19 5f', expected: '5f' },
      { name: 'Response 1', data: '56 57 65 56 49 43 37 55 01 d2 87 c9 4b 77 9b 59 d7 e2 68 e2 a8 80 ff 55 24 06 8b cf d8', expected: 'd8' },
      { name: 'Challenge 2', data: '75 5a af 88 e5 c8 52 70 01 3f 8e 46 d1 bb 19 63 34 9e dd c7 06 91 ed 68 4c c9 74 92', expected: '92' },
      { name: 'Response 2', data: '45 4a 6c 61 32 56 41 54 01 6a a6 0b 61 b4 3a be 0f ce 22 83 f7 d8 ee a2 0f 1b 16 78', expected: '78' }
    ];

    for (const packet of testPackets) {
      console.log(`\n${packet.name}:`);
      const packetBuffer = HexUtils.hexToBuffer(packet.data);

      // Test CRC-16 CCITT
      try {
        const crc = this.algorithm.calculateCRC16CCITT(packetBuffer);
        const matches = this.checkCRCMatch(crc, packet.expected);
        results.crc16ccitt.push({
          packet: packet.name,
          calculated: crc.toString('hex'),
          expected: packet.expected,
          match: matches
        });
        console.log(`  CRC-16 CCITT: ${crc.toString('hex')} (${matches ? '✓' : '✗'})`);
      } catch (error) {
        console.log(`  CRC-16 CCITT: Failed - ${error.message}`);
      }

      // Test CRC-16 Modbus
      try {
        const crc = this.algorithm.calculateCRC16Modbus(packetBuffer);
        const matches = this.checkCRCMatch(crc, packet.expected);
        results.crc16modbus.push({
          packet: packet.name,
          calculated: crc.toString('hex'),
          expected: packet.expected,
          match: matches
        });
        console.log(`  CRC-16 Modbus: ${crc.toString('hex')} (${matches ? '✓' : '✗'})`);
      } catch (error) {
        console.log(`  CRC-16 Modbus: Failed - ${error.message}`);
      }

      // Test other algorithms...
      // (Similar pattern for other CRC algorithms)
    }

    this.results.crc = results;
    return results;
  }

  /**
   * Run comprehensive test
   */
  runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive Rolling Code Test...\n');

    // Load test data
    if (!this.loadTestData()) {
      return false;
    }

    // Initialize algorithm
    if (!this.initializeAlgorithm()) {
      return false;
    }

    // Test key derivation
    this.testKeyDerivation();

    // Test transformations
    this.testTransformations();

    // Test CRC algorithms
    this.testCRCAlgorithms();

    // Generate final report
    this.generateReport();

    return true;
  }

  /**
   * Calculate accuracy between two hex strings
   */
  calculateAccuracy(actual, generated) {
    if (actual.length !== generated.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === generated[i]) {
        matches++;
      }
    }
    
    return matches / actual.length;
  }

  /**
   * Check if CRC matches expected value
   */
  checkCRCMatch(crc, expected) {
    const crcHex = crc.toString('hex');
    return crcHex.includes(expected.toLowerCase()) || crcHex.includes(expected.toUpperCase());
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    // Key derivation results
    if (this.results.keyDerivation) {
      console.log('\n🔐 Key Derivation Results:');
      for (const [method, results] of Object.entries(this.results.keyDerivation)) {
        console.log(`  ${method.toUpperCase()}: ${results.length} tests`);
      }
    }

    // Transformation results
    if (this.results.transformations) {
      console.log('\n🔄 Transformation Results:');
      for (const [method, results] of Object.entries(this.results.transformations)) {
        if (results.length > 0) {
          const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
          console.log(`  ${method.toUpperCase()}: ${avgAccuracy.toFixed(2)}% average accuracy`);
        }
      }
    }

    // CRC results
    if (this.results.crc) {
      console.log('\n🔢 CRC Results:');
      for (const [method, results] of Object.entries(this.results.crc)) {
        if (results.length > 0) {
          const matches = results.filter(r => r.match).length;
          console.log(`  ${method.toUpperCase()}: ${matches}/${results.length} matches`);
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

// Import HexUtils
const HexUtils = require('../utils/hex-utils');

// Run if called directly
if (require.main === module) {
  const tester = new RollingCodeTester();
  tester.runComprehensiveTest();
}

module.exports = RollingCodeTester;
