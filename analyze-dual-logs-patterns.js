#!/usr/bin/env node

/**
 * Analyze Dual-Logs Authentication Patterns
 * 
 * This script analyzes the patterns in the dual-logs authentication data
 * to understand the rolling code algorithm better.
 */

const fs = require('fs');

console.log('🔍 Analyzing Dual-Logs Authentication Patterns\n');

// Load the authentication sessions
const authData = JSON.parse(fs.readFileSync('test-vectors/authentication-sessions.json', 'utf8'));
const dualLogsSessions = authData.sessions.slice(3);

console.log('📊 Session Details:');
dualLogsSessions.forEach((session, index) => {
  console.log(`\nSession ${session.id}:`);
  console.log(`   Timestamp: ${session.timestamp}`);
  console.log(`   Sequence: ${session.sequence}`);
  console.log(`   Challenge: ${session.challenge.split(' ').slice(0, 8).join(' ')}`);
  console.log(`   Response:  ${session.response.split(' ').slice(0, 8).join(' ')}`);
});

// Analyze timestamps
console.log('\n⏰ Timestamp Analysis:');
const timestamps = dualLogsSessions.map(s => parseInt(s.timestamp));
console.log(`   All timestamps identical: ${timestamps.every(t => t === timestamps[0]) ? '✅' : '❌'}`);
console.log(`   Timestamp: ${timestamps[0]}`);

// Analyze sequence numbers
console.log('\n🔢 Sequence Analysis:');
const sequences = dualLogsSessions.map(s => parseInt(s.sequence));
console.log(`   Sequences: ${sequences.join(', ')}`);
console.log(`   Sequential: ${sequences.every((s, i) => s === i + 1) ? '✅' : '❌'}`);

// Analyze the encrypted payloads
console.log('\n🔐 Encrypted Payload Analysis:');
dualLogsSessions.forEach((session, index) => {
  const challengePayload = session.challenge.split(' ').slice(8).join(' ');
  const responsePayload = session.response.split(' ').slice(8).join(' ');
  
  console.log(`\nSession ${session.id}:`);
  console.log(`   Challenge Payload: ${challengePayload}`);
  console.log(`   Response Payload:  ${responsePayload}`);
  console.log(`   Payload Length: ${challengePayload.split(' ').length} bytes`);
});

// Test time-based algorithms
console.log('\n🧪 Testing Time-Based Algorithms:');
const baseTime = timestamps[0];
const baseResponse = Buffer.from(dualLogsSessions[0].response.split(' ').slice(0, 8).join(''), 'hex');

dualLogsSessions.forEach((session, index) => {
  const sequence = parseInt(session.sequence);
  const response = Buffer.from(session.response.split(' ').slice(0, 8).join(''), 'hex');
  
  console.log(`\nSession ${session.id} (Sequence ${sequence}):`);
  
  // Test sequence-based transformations
  const seqBuffer = Buffer.alloc(8);
  seqBuffer.writeUInt32LE(sequence, 0);
  seqBuffer.writeUInt32LE(sequence, 4);
  
  // XOR with sequence
  const xorWithSeq = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    xorWithSeq[i] = baseResponse[i] ^ seqBuffer[i];
  }
  
  console.log(`   Base Response: ${baseResponse.toString('hex').toUpperCase()}`);
  console.log(`   Actual Response: ${response.toString('hex').toUpperCase()}`);
  console.log(`   XOR with Seq: ${xorWithSeq.toString('hex').toUpperCase()}`);
  console.log(`   Matches: ${xorWithSeq.equals(response) ? '✅' : '❌'}`);
  
  // Test addition with sequence
  const addWithSeq = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    addWithSeq[i] = (baseResponse[i] + seqBuffer[i]) & 0xFF;
  }
  console.log(`   ADD with Seq: ${addWithSeq.toString('hex').toUpperCase()}`);
  console.log(`   Matches: ${addWithSeq.equals(response) ? '✅' : '❌'}`);
});

// Test if there's a pattern in the response differences
console.log('\n🔍 Response Difference Analysis:');
const responses = dualLogsSessions.map(s => Buffer.from(s.response.split(' ').slice(0, 8).join(''), 'hex'));

for (let i = 1; i < responses.length; i++) {
  const diff = Buffer.alloc(8);
  for (let j = 0; j < 8; j++) {
    diff[j] = responses[0][j] ^ responses[i][j];
  }
  console.log(`   Response ${i + 1} vs Response 1: ${diff.toString('hex').toUpperCase()}`);
}

// Test if the algorithm uses a rolling counter
console.log('\n🔄 Rolling Counter Analysis:');
const challenge = Buffer.from(dualLogsSessions[0].challenge.split(' ').slice(0, 8).join(''), 'hex');

// Test if responses are derived from challenge + sequence
dualLogsSessions.forEach((session, index) => {
  const sequence = parseInt(session.sequence);
  const response = Buffer.from(session.response.split(' ').slice(0, 8).join(''), 'hex');
  
  // Create a rolling counter
  const counter = Buffer.alloc(8);
  counter.writeUInt32LE(sequence, 0);
  counter.writeUInt32LE(sequence, 4);
  
  // Test challenge + counter
  const challengePlusCounter = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    challengePlusCounter[i] = (challenge[i] + counter[i]) & 0xFF;
  }
  
  // Test challenge XOR counter
  const challengeXorCounter = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    challengeXorCounter[i] = challenge[i] ^ counter[i];
  }
  
  console.log(`\nSession ${session.id}:`);
  console.log(`   Challenge: ${challenge.toString('hex').toUpperCase()}`);
  console.log(`   Counter:   ${counter.toString('hex').toUpperCase()}`);
  console.log(`   Challenge + Counter: ${challengePlusCounter.toString('hex').toUpperCase()}`);
  console.log(`   Challenge XOR Counter: ${challengeXorCounter.toString('hex').toUpperCase()}`);
  console.log(`   Actual Response: ${response.toString('hex').toUpperCase()}`);
  console.log(`   + Counter Matches: ${challengePlusCounter.equals(response) ? '✅' : '❌'}`);
  console.log(`   XOR Counter Matches: ${challengeXorCounter.equals(response) ? '✅' : '❌'}`);
});

console.log('\n✅ Pattern analysis complete!');
