#!/usr/bin/env node

/**
 * Test Rolling Code Algorithm Against New Dual-Logs Authentication Data
 * 
 * This script specifically tests the rolling code algorithm against the new
 * authentication sessions captured from dual-logs real-time monitoring.
 */

const fs = require('fs');
const crypto = require('crypto');
const HexUtils = require('./src/utils/hex-utils');

console.log('🧪 Testing Rolling Code Algorithm Against New Dual-Logs Data\n');

// Load the new authentication sessions
const authData = JSON.parse(fs.readFileSync('test-vectors/authentication-sessions.json', 'utf8'));

// Extract the new dual-logs sessions (4-6)
const dualLogsSessions = authData.sessions.slice(3);
console.log(`📊 Testing ${dualLogsSessions.length} new authentication sessions from dual-logs\n`);

// Device information
const deviceInfo = authData.deviceInfo;
console.log('📱 Device Info:');
console.log(`   IMEI: ${deviceInfo.imei}`);
console.log(`   Serial: ${deviceInfo.serial}`);
console.log(`   Model: ${deviceInfo.model}`);
console.log(`   Firmware: ${deviceInfo.firmware}\n`);

// Test each session
dualLogsSessions.forEach((session, index) => {
  console.log(`🔍 Testing Session ${session.id} (${session.source}):`);
  
  // Extract challenge and response (first 8 bytes)
  const challengeHex = session.challenge.split(' ').slice(0, 8).join(' ');
  const responseHex = session.response.split(' ').slice(0, 8).join(' ');
  
  console.log(`   Challenge: ${challengeHex}`);
  console.log(`   Response:  ${responseHex}`);
  
  // Convert to buffers
  const challenge = Buffer.from(challengeHex.replace(/\s+/g, ''), 'hex');
  const response = Buffer.from(responseHex.replace(/\s+/g, ''), 'hex');
  
  // Test various transformation methods
  testTransformations(challenge, response, session.id);
  
  console.log('');
});

/**
 * Test various transformation methods
 */
function testTransformations(challenge, response, sessionId) {
  console.log(`   🧪 Testing transformations for session ${sessionId}:`);
  
  // 1. XOR Analysis
  const xor = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    xor[i] = challenge[i] ^ response[i];
  }
  console.log(`      XOR: ${xor.toString('hex').toUpperCase()}`);
  
  // 2. Addition Analysis
  const add = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    add[i] = (challenge[i] + response[i]) & 0xFF;
  }
  console.log(`      ADD: ${add.toString('hex').toUpperCase()}`);
  
  // 3. Subtraction Analysis
  const sub = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    sub[i] = (challenge[i] - response[i]) & 0xFF;
  }
  console.log(`      SUB: ${sub.toString('hex').toUpperCase()}`);
  
  // 4. Key-based transformations
  testKeyBasedTransformations(challenge, response, sessionId);
}

/**
 * Test key-based transformations using device identifiers
 */
function testKeyBasedTransformations(challenge, response, sessionId) {
  console.log(`      🔑 Testing key-based transformations:`);
  
  // Create various keys from device info
  const keys = {
    imei: Buffer.from(deviceInfo.imei, 'utf8'),
    serial: Buffer.from(deviceInfo.serial, 'utf8'),
    model: Buffer.from(deviceInfo.model, 'utf8'),
    firmware: Buffer.from(deviceInfo.firmware, 'utf8'),
    combined: Buffer.from(`${deviceInfo.imei}${deviceInfo.serial}${deviceInfo.model}${deviceInfo.firmware}`, 'utf8')
  };
  
  // Test each key
  Object.entries(keys).forEach(([keyName, key]) => {
    // XOR with key (truncated to 8 bytes)
    const key8 = key.slice(0, 8);
    const xorWithKey = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      xorWithKey[i] = challenge[i] ^ key8[i % key8.length];
    }
    
    // Check if this matches the response
    const matches = xorWithKey.equals(response);
    console.log(`         ${keyName}: ${xorWithKey.toString('hex').toUpperCase()} ${matches ? '✅' : '❌'}`);
  });
  
  // Test PBKDF2 derived keys
  testPBKDF2Keys(challenge, response, sessionId);
}

/**
 * Test PBKDF2 derived keys
 */
function testPBKDF2Keys(challenge, response, sessionId) {
  console.log(`      🔐 Testing PBKDF2 derived keys:`);
  
  const salt = Buffer.from(deviceInfo.serial, 'utf8');
  const iterations = [1000, 10000, 100000];
  
  iterations.forEach(iter => {
    const key = crypto.pbkdf2Sync(deviceInfo.imei, salt, iter, 8, 'sha256');
    
    // XOR challenge with derived key
    const transformed = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      transformed[i] = challenge[i] ^ key[i];
    }
    
    const matches = transformed.equals(response);
    console.log(`         PBKDF2-${iter}: ${transformed.toString('hex').toUpperCase()} ${matches ? '✅' : '❌'}`);
  });
}

// Analyze patterns across all sessions
console.log('📊 PATTERN ANALYSIS ACROSS ALL SESSIONS\n');

const challenges = dualLogsSessions.map(s => Buffer.from(s.challenge.split(' ').slice(0, 8).join('').replace(/\s+/g, ''), 'hex'));
const responses = dualLogsSessions.map(s => Buffer.from(s.response.split(' ').slice(0, 8).join('').replace(/\s+/g, ''), 'hex'));

console.log('🔍 Challenge Analysis:');
console.log(`   All challenges identical: ${challenges.every(c => c.equals(challenges[0])) ? '✅' : '❌'}`);
if (challenges.every(c => c.equals(challenges[0]))) {
  console.log(`   Challenge: ${challenges[0].toString('hex').toUpperCase()}`);
}

console.log('\n🔍 Response Analysis:');
console.log(`   All responses different: ${responses.every((r, i) => responses.every((r2, j) => i === j || !r.equals(r2))) ? '✅' : '❌'}`);
responses.forEach((r, i) => {
  console.log(`   Response ${i + 1}: ${r.toString('hex').toUpperCase()}`);
});

// Test if responses follow a pattern
console.log('\n🔍 Response Pattern Analysis:');
const baseResponse = responses[0];
responses.slice(1).forEach((r, i) => {
  const diff = Buffer.alloc(8);
  for (let j = 0; j < 8; j++) {
    diff[j] = baseResponse[j] ^ r[j];
  }
  console.log(`   Response ${i + 2} vs Response 1: ${diff.toString('hex').toUpperCase()}`);
});

console.log('\n✅ Algorithm testing complete!');
console.log('\n📋 Key Findings:');
console.log('   • All sessions use the same challenge (9E 58 13 43 4C 84 E6 D5)');
console.log('   • Each session has a different response');
console.log('   • This suggests a time-based or sequence-based algorithm');
console.log('   • Multiple responses to same challenge indicate retry/timeout mechanism');
