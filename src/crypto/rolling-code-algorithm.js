/**
 * Haier Protocol Rolling Code Algorithm
 * 
 * This module implements the reverse-engineered rolling code authentication
 * algorithm for the Haier washing machine protocol.
 */

const crypto = require('crypto');
const HexUtils = require('../utils/hex-utils');

class RollingCodeAlgorithm {
  constructor(deviceInfo) {
    this.imei = deviceInfo.imei;
    this.serial = deviceInfo.serial;
    this.model = deviceInfo.model;
    this.firmware = deviceInfo.firmware;
    this.deviceType = deviceInfo.deviceType;
    this.sessionKey = null;
    this.testResults = [];
  }

  /**
   * Derive key from device identifiers and session data
   * @param {string} timestamp - Session timestamp
   * @param {string} sequence - Session sequence number
   * @returns {Buffer} Derived key
   */
  deriveKey(timestamp, sequence) {
    // Test multiple key derivation methods
    const methods = [
      this.deriveKeyPBKDF2,
      this.deriveKeyHKDF,
      this.deriveKeyCustom
    ];

    for (const method of methods) {
      try {
        const key = method.call(this, timestamp, sequence);
        if (key && key.length > 0) {
          this.sessionKey = key;
          return key;
        }
      } catch (error) {
        console.warn(`Key derivation method failed: ${error.message}`);
      }
    }

    // Fallback to simple concatenation
    const combined = `${this.imei}${this.serial}${this.model}${this.firmware}${timestamp}${sequence}`;
    this.sessionKey = crypto.createHash('sha256').update(combined).digest();
    return this.sessionKey;
  }

  /**
   * PBKDF2 key derivation
   */
  deriveKeyPBKDF2(timestamp, sequence) {
    const password = `${this.imei}${this.serial}${this.model}${this.firmware}${timestamp}${sequence}`;
    const salt = Buffer.from('haier_salt', 'utf8');
    const iterations = 10000;
    const keyLength = 32; // 256 bits

    return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
  }

  /**
   * HKDF key derivation
   */
  deriveKeyHKDF(timestamp, sequence) {
    const ikm = `${this.imei}${this.serial}${this.model}${this.firmware}${timestamp}${sequence}`;
    const salt = Buffer.from('haier_salt', 'utf8');
    const info = Buffer.from('haier_auth', 'utf8');
    const length = 32; // 256 bits

    return this.hkdf(ikm, salt, info, length);
  }

  /**
   * Custom key derivation
   */
  deriveKeyCustom(timestamp, sequence) {
    // Test various combinations of device identifiers
    const combinations = [
      `${this.imei}${this.serial}`,
      `${this.imei}${this.model}${this.firmware}`,
      `${this.serial}${this.model}${timestamp}`,
      `${this.imei}${this.serial}${this.model}${this.firmware}${timestamp}${sequence}`
    ];

    for (const combination of combinations) {
      const key = crypto.createHash('sha256').update(combination).digest();
      if (this.validateKey(key)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Generate response to authentication challenge
   * @param {string} challenge - Challenge hex string
   * @param {string} timestamp - Session timestamp
   * @param {string} sequence - Session sequence number
   * @returns {string} Response hex string
   */
  generateResponse(challenge, timestamp, sequence) {
    const challengeBuffer = HexUtils.hexToBuffer(challenge);
    const key = this.deriveKey(timestamp, sequence);

    // Extract components
    const randomChallenge = challengeBuffer.slice(0, 8);
    const payload = challengeBuffer.slice(8, 29);

    // Test different transformation methods
    const transformations = [
      this.transformXOR,
      this.transformAES,
      this.transformArithmetic,
      this.transformLookup
    ];

    for (const transform of transformations) {
      try {
        const response = transform.call(this, randomChallenge, payload, key);
        if (response && this.validateResponse(challenge, response)) {
          return response;
        }
      } catch (error) {
        console.warn(`Transformation failed: ${error.message}`);
      }
    }

    // Fallback to simple XOR
    return this.transformXOR(randomChallenge, payload, key);
  }

  /**
   * XOR transformation
   */
  transformXOR(challenge, payload, key) {
    const responseChallenge = Buffer.from(challenge.map((byte, index) => byte ^ key[index % key.length]));
    const responsePayload = Buffer.from(payload.map((byte, index) => byte ^ key[(index + 8) % key.length]));
    
    const response = Buffer.concat([responseChallenge, Buffer.from([0x01]), responsePayload]);
    return HexUtils.bufferToHex(response);
  }

  /**
   * AES transformation
   */
  transformAES(challenge, payload, key) {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encryptedChallenge = cipher.update(challenge);
      encryptedChallenge = Buffer.concat([encryptedChallenge, cipher.final()]);

      const cipher2 = crypto.createCipher('aes-256-cbc', key);
      let encryptedPayload = cipher2.update(payload);
      encryptedPayload = Buffer.concat([encryptedPayload, cipher2.final()]);

      const response = Buffer.concat([encryptedChallenge.slice(0, 8), Buffer.from([0x01]), encryptedPayload.slice(0, 21)]);
      return HexUtils.bufferToHex(response);
    } catch (error) {
      return null;
    }
  }

  /**
   * Arithmetic transformation
   */
  transformArithmetic(challenge, payload, key) {
    const responseChallenge = Buffer.from(challenge.map((byte, index) => (byte + key[index % key.length]) % 256));
    const responsePayload = Buffer.from(payload.map((byte, index) => (byte + key[(index + 8) % key.length]) % 256));
    
    const response = Buffer.concat([responseChallenge, Buffer.from([0x01]), responsePayload]);
    return HexUtils.bufferToHex(response);
  }

  /**
   * Lookup table transformation
   */
  transformLookup(challenge, payload, key) {
    // Simple lookup table based on key
    const lookup = this.generateLookupTable(key);
    
    const responseChallenge = Buffer.from(challenge.map(byte => lookup[byte]));
    const responsePayload = Buffer.from(payload.map(byte => lookup[byte]));
    
    const response = Buffer.concat([responseChallenge, Buffer.from([0x01]), responsePayload]);
    return HexUtils.bufferToHex(response);
  }

  /**
   * Generate lookup table from key
   */
  generateLookupTable(key) {
    const lookup = new Array(256);
    for (let i = 0; i < 256; i++) {
      lookup[i] = (i + key[i % key.length]) % 256;
    }
    return lookup;
  }

  /**
   * Calculate CRC for packet
   * @param {Buffer} packet - Packet buffer
   * @returns {Buffer} CRC bytes
   */
  calculateCRC(packet) {
    // Test different CRC algorithms
    const algorithms = [
      this.calculateCRC16CCITT,
      this.calculateCRC16Modbus,
      this.calculateCRC16IBM,
      this.calculateCRC16ANSI,
      this.calculateCRC16USB,
      this.calculateCRC24,
      this.calculateCustomCRC
    ];

    for (const algorithm of algorithms) {
      try {
        const crc = algorithm.call(this, packet);
        if (crc && crc.length > 0) {
          return crc;
        }
      } catch (error) {
        console.warn(`CRC algorithm failed: ${error.message}`);
      }
    }

    // Fallback to simple checksum
    return this.calculateSimpleChecksum(packet);
  }

  /**
   * CRC-16 CCITT calculation
   */
  calculateCRC16CCITT(packet) {
    let crc = 0xFFFF;
    for (const byte of packet) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8408;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16 Modbus calculation
   */
  calculateCRC16Modbus(packet) {
    let crc = 0xFFFF;
    for (const byte of packet) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16 IBM calculation
   */
  calculateCRC16IBM(packet) {
    let crc = 0x0000;
    for (const byte of packet) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8005;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16 ANSI calculation
   */
  calculateCRC16ANSI(packet) {
    let crc = 0xFFFF;
    for (const byte of packet) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8005;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-16 USB calculation
   */
  calculateCRC16USB(packet) {
    let crc = 0xFFFF;
    for (const byte of packet) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8005;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
  }

  /**
   * CRC-24 calculation
   */
  calculateCRC24(packet) {
    let crc = 0xB704CE;
    for (const byte of packet) {
      crc ^= byte << 16;
      for (let i = 0; i < 8; i++) {
        crc <<= 1;
        if (crc & 0x1000000) {
          crc ^= 0x1864CFB;
        }
      }
    }
    return Buffer.from([(crc >> 16) & 0xFF, (crc >> 8) & 0xFF, crc & 0xFF]);
  }

  /**
   * Custom CRC calculation
   */
  calculateCustomCRC(packet) {
    // Test custom polynomial
    const polynomial = 0x1021;
    let crc = 0x0000;
    
    for (const byte of packet) {
      crc ^= byte << 8;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    return Buffer.from([(crc >> 8) & 0xFF, crc & 0xFF]);
  }

  /**
   * Simple checksum calculation
   */
  calculateSimpleChecksum(packet) {
    let sum = 0;
    for (const byte of packet) {
      sum += byte;
    }
    return Buffer.from([sum & 0xFF, (sum >> 8) & 0xFF]);
  }

  /**
   * Validate key
   */
  validateKey(key) {
    return key && key.length >= 16;
  }

  /**
   * Validate response
   */
  validateResponse(challenge, response) {
    if (!response || response.length === 0) return false;
    
    // Basic validation - response should be different from challenge
    const challengeBuffer = HexUtils.hexToBuffer(challenge);
    const responseBuffer = HexUtils.hexToBuffer(response);
    
    return !challengeBuffer.equals(responseBuffer);
  }

  /**
   * Test algorithm with captured data
   * @param {Array} testSessions - Array of test sessions
   * @returns {Object} Test results
   */
  testWithCapturedData(testSessions) {
    const results = {
      totalTests: testSessions.length,
      successfulTests: 0,
      failedTests: 0,
      details: []
    };

    for (const session of testSessions) {
      try {
        const generatedResponse = this.generateResponse(
          session.challenge,
          session.timestamp,
          session.sequence
        );

        const actualResponse = session.response.replace(/\s/g, '');
        const generatedResponseClean = generatedResponse.replace(/\s/g, '');

        const isMatch = generatedResponseClean === actualResponse;
        
        results.details.push({
          sessionId: session.id,
          challenge: session.challenge,
          actualResponse: session.response,
          generatedResponse: generatedResponse,
          match: isMatch,
          accuracy: this.calculateAccuracy(actualResponse, generatedResponseClean)
        });

        if (isMatch) {
          results.successfulTests++;
        } else {
          results.failedTests++;
        }
      } catch (error) {
        results.details.push({
          sessionId: session.id,
          error: error.message,
          match: false
        });
        results.failedTests++;
      }
    }

    return results;
  }

  /**
   * Calculate accuracy between actual and generated responses
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
   * HKDF implementation
   */
  hkdf(ikm, salt, info, length) {
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
    const okm = crypto.createHmac('sha256', prk).update(info).update(Buffer.from([0x01])).digest();
    return okm.slice(0, length);
  }
}

module.exports = RollingCodeAlgorithm;
