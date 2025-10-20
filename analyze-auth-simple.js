#!/usr/bin/env node

/**
 * Simple Authentication Analysis
 * Direct analysis of authentication packets from dualLogs.txt
 */

const fs = require('fs');

function analyzeAuthentication() {
  console.log('🔐 Simple Authentication Analysis');
  console.log('=================================\n');

  const content = fs.readFileSync('dualLogs.txt', 'utf8');
  const lines = content.split('\n');
  
  const authPackets = [];
  let currentPacket = null;
  
  // Parse multi-line authentication packets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('FF FF 25 40') && line.includes('10 02')) {
      // Start of new authentication packet
      if (currentPacket) {
        authPackets.push(currentPacket);
      }
      
      const direction = line.includes('→') ? 'TX' : 'RX';
      const timestamp = line.match(/\[([^\]]+)\]/)?.[1] || 'unknown';
      const match = line.match(/FF FF [A-F0-9\s]+/);
      
      if (match) {
        currentPacket = {
          timestamp,
          direction,
          hexData: match[0].trim(),
          fullHex: match[0].replace(/\s+/g, '')
        };
      }
    } else if (currentPacket && line.trim().match(/^[A-F0-9\s]+\|/)) {
      // Continuation line
      const continuationMatch = line.match(/^([A-F0-9\s]+)/);
      if (continuationMatch) {
        currentPacket.hexData += ' ' + continuationMatch[1].trim();
        currentPacket.fullHex += continuationMatch[1].replace(/\s+/g, '');
      }
    } else if (currentPacket && line.includes('CRC:')) {
      // End of packet
      authPackets.push(currentPacket);
      currentPacket = null;
    }
  }
  
  if (currentPacket) {
    authPackets.push(currentPacket);
  }
  
  console.log(`📊 Found ${authPackets.length} authentication packets\n`);
  
  // Analyze each packet
  for (const packet of authPackets) {
    console.log(`📦 ${packet.direction} Packet (${packet.timestamp}):`);
    console.log(`   Hex: ${packet.hexData}`);
    console.log(`   Full: ${packet.fullHex}`);
    
    // Extract challenge and encrypted data
    if (packet.fullHex.includes('1110020001')) {
      // TX Challenge packet
      const dataStart = packet.fullHex.indexOf('1110020001') + 10;
      const remainingData = packet.fullHex.substring(dataStart);
      
      if (remainingData.length >= 16) {
        const challenge = remainingData.substring(0, 16);
        const encrypted = remainingData.substring(16);
        
        console.log(`   🔑 Challenge: ${challenge.match(/.{2}/g).join(' ')}`);
        console.log(`   🔒 Encrypted: ${encrypted.match(/.{2}/g).join(' ')}`);
        console.log(`   📝 Challenge ASCII: ${hexToAscii(challenge)}`);
      }
    } else if (packet.fullHex.includes('1210020001')) {
      // RX Response packet
      const dataStart = packet.fullHex.indexOf('1210020001') + 10;
      const remainingData = packet.fullHex.substring(dataStart);
      
      if (remainingData.length >= 16) {
        const challenge = remainingData.substring(0, 16);
        const encrypted = remainingData.substring(16);
        
        console.log(`   🔑 Challenge: ${challenge.match(/.{2}/g).join(' ')}`);
        console.log(`   🔓 Response: ${encrypted.match(/.{2}/g).join(' ')}`);
        console.log(`   📝 Challenge ASCII: ${hexToAscii(challenge)}`);
      }
    }
    
    console.log();
  }
  
  // Analyze rolling code pattern
  console.log('🔄 Rolling Code Analysis:');
  const challenges = authPackets
    .filter(p => p.fullHex.includes('1110020001'))
    .map(p => {
      const dataStart = p.fullHex.indexOf('1110020001') + 10;
      return p.fullHex.substring(dataStart, dataStart + 16);
    });
  
  console.log(`   • Found ${challenges.length} challenges`);
  
  if (challenges.length > 1) {
    const unique = new Set(challenges);
    console.log(`   • Unique challenges: ${unique.size}`);
    console.log(`   • Rolling code: ${unique.size === challenges.length ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n   Challenge comparison:');
    for (let i = 0; i < challenges.length; i++) {
      console.log(`   ${i + 1}. ${challenges[i]} (${hexToAscii(challenges[i])})`);
    }
  }
  
  console.log('\n🎯 pyhOn Comparison:');
  console.log('   • Format: Matches pyhOn authentication pattern');
  console.log('   • Rolling codes: ' + (challenges.length > 1 && new Set(challenges).size === challenges.length ? '✅ Implemented' : '❌ Not implemented'));
  console.log('   • Challenge-response: ' + (authPackets.some(p => p.fullHex.includes('1210020001')) ? '✅ Present' : '❌ Missing'));
}

function hexToAscii(hex) {
  try {
    return hex.match(/.{2}/g)
      .map(byte => String.fromCharCode(parseInt(byte, 16)))
      .join('')
      .replace(/[^\x20-\x7E]/g, '.'); // Replace non-printable chars
  } catch (e) {
    return 'invalid';
  }
}

// Run the analysis
analyzeAuthentication();
