#!/usr/bin/env node

/**
 * Test CRC-16/ARC Algorithm Against Dual-Logs Authentication Packets
 * 
 * This script validates the CRC-16/ARC algorithm against the new
 * authentication packets from dual-logs real-time monitoring.
 */

const fs = require('fs');
const CRC = require('./src/protocol/crc');
const crc = new CRC();

console.log('🔍 Testing CRC-16/ARC Algorithm Against Dual-Logs Packets\n');

// Load the authentication sessions
const authData = JSON.parse(fs.readFileSync('test-vectors/authentication-sessions.json', 'utf8'));
const dualLogsSessions = authData.sessions.slice(3);

console.log(`📊 Testing ${dualLogsSessions.length} authentication packets\n`);

// Test each packet
dualLogsSessions.forEach((session, index) => {
  console.log(`🔍 Testing Session ${session.id}:`);
  
  // Extract the full hex data from the challenge packet
  const challengeHex = session.challenge;
  const responseHex = session.response;
  
  console.log(`   Challenge: ${challengeHex}`);
  console.log(`   Response:  ${responseHex}`);
  
  // Test challenge packet
  console.log(`   🧪 Testing Challenge Packet:`);
  const challengeValid = crc.validatePacket(challengeHex);
  console.log(`      Valid: ${challengeValid ? '✅' : '❌'}`);
  
  if (!challengeValid) {
    // Try to calculate the correct CRC
    const challengeBytes = Buffer.from(challengeHex.replace(/\s+/g, ''), 'hex');
    const calculatedCRC = crc.calculatePacketCRC(challengeHex);
    console.log(`      Calculated CRC: ${calculatedCRC.toString('hex').toUpperCase()}`);
    
    // Show the last 2 bytes (current CRC)
    const currentCRC = challengeBytes.slice(-2);
    console.log(`      Current CRC: ${currentCRC.toString('hex').toUpperCase()}`);
  }
  
  // Test response packet
  console.log(`   🧪 Testing Response Packet:`);
  const responseValid = crc.validatePacket(responseHex);
  console.log(`      Valid: ${responseValid ? '✅' : '❌'}`);
  
  if (!responseValid) {
    // Try to calculate the correct CRC
    const responseBytes = Buffer.from(responseHex.replace(/\s+/g, ''), 'hex');
    const calculatedCRC = crc.calculatePacketCRC(responseHex);
    console.log(`      Calculated CRC: ${calculatedCRC.toString('hex').toUpperCase()}`);
    
    // Show the last 2 bytes (current CRC)
    const currentCRC = responseBytes.slice(-2);
    console.log(`      Current CRC: ${currentCRC.toString('hex').toUpperCase()}`);
  }
  
  console.log('');
});

// Test packet structure parsing
console.log('📋 Packet Structure Analysis:\n');

dualLogsSessions.forEach((session, index) => {
  console.log(`Session ${session.id} Challenge Packet:`);
  const challengeHex = session.challenge;
  const bytes = Buffer.from(challengeHex.replace(/\s+/g, ''), 'hex');
  
  console.log(`   Length: ${bytes.length} bytes`);
  console.log(`   Header: ${bytes.slice(0, 2).toString('hex').toUpperCase()}`);
  console.log(`   Frame Length: ${bytes[2]} (0x${bytes[2].toString(16).toUpperCase()})`);
  console.log(`   Frame Flags: ${bytes[3]} (0x${bytes[3].toString(16).toUpperCase()})`);
  console.log(`   Reserved: ${bytes.slice(4, 9).toString('hex').toUpperCase()}`);
  console.log(`   Type: ${bytes[9]} (0x${bytes[9].toString(16).toUpperCase()})`);
  console.log(`   Data Length: ${bytes.length - 12} bytes`);
  console.log(`   Checksum: ${bytes[bytes.length - 3]} (0x${bytes[bytes.length - 3].toString(16).toUpperCase()})`);
  console.log(`   CRC: ${bytes.slice(-2).toString('hex').toUpperCase()}`);
  
  // Calculate frame data for CRC (excluding separator, checksum, and CRC)
  const frameData = bytes.slice(3, bytes.length - 3);
  console.log(`   Frame Data for CRC: ${frameData.toString('hex').toUpperCase()}`);
  
  // Calculate checksum (LSB of sum)
  const checksumData = bytes.slice(3, bytes.length - 3);
  const sum = checksumData.reduce((acc, byte) => acc + byte, 0);
  const calculatedChecksum = sum & 0xFF;
  console.log(`   Calculated Checksum: ${calculatedChecksum} (0x${calculatedChecksum.toString(16).toUpperCase()})`);
  console.log(`   Checksum Valid: ${calculatedChecksum === bytes[bytes.length - 3] ? '✅' : '❌'}`);
  
  console.log('');
});

console.log('✅ CRC testing complete!');
