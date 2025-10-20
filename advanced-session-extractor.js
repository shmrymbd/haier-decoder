#!/usr/bin/env node

/**
 * Advanced Session Extractor
 * 
 * This script extracts all authentication sessions from the comprehensive analysis
 * and creates a detailed analysis of patterns and transformations.
 */

const fs = require('fs');

console.log('🔍 Advanced Session Extraction and Analysis\n');

// Load comprehensive analysis results
const results = JSON.parse(fs.readFileSync('comprehensive-analysis-results.json', 'utf8'));

console.log(`📊 Processing ${results.totalSessions} authentication sessions from ${results.totalFiles} log files\n`);

// Extract all authentication sessions
const allSessions = results.authenticationSessions;

// Group sessions by source for analysis
const sessionsBySource = {};
allSessions.forEach(session => {
  if (!sessionsBySource[session.source]) {
    sessionsBySource[session.source] = [];
  }
  sessionsBySource[session.source].push(session);
});

console.log('📋 Sessions by Source:');
Object.entries(sessionsBySource).forEach(([source, sessions]) => {
  console.log(`   ${source}: ${sessions.length} sessions`);
});

// Analyze challenge-response patterns
console.log('\n🔍 Challenge-Response Pattern Analysis:');

const challengeGroups = {};
allSessions.forEach(session => {
  // Extract first 8 bytes of challenge (the actual challenge data)
  const challengeBytes = session.challenge.split(' ').slice(0, 8).join(' ');
  if (!challengeGroups[challengeBytes]) {
    challengeGroups[challengeBytes] = [];
  }
  challengeGroups[challengeBytes].push(session);
});

// Find multiple responses to same challenge
const multipleResponses = Object.entries(challengeGroups).filter(([challenge, sessions]) => sessions.length > 1);

console.log(`   Unique Challenges: ${Object.keys(challengeGroups).length}`);
console.log(`   Multiple Response Patterns: ${multipleResponses.length}`);

if (multipleResponses.length > 0) {
  console.log('\n   🔄 Multiple Response Analysis:');
  multipleResponses.forEach(([challenge, sessions]) => {
    console.log(`\n   Challenge: ${challenge}`);
    console.log(`   Responses (${sessions.length}):`);
    sessions.forEach((session, i) => {
      const responseBytes = session.response.split(' ').slice(0, 8).join(' ');
      console.log(`      ${i + 1}. ${responseBytes} (${session.source})`);
    });
  });
}

// Analyze transformation patterns
console.log('\n🧪 Transformation Pattern Analysis:');

// Test XOR patterns between challenges and responses
const xorPatterns = {};
allSessions.forEach(session => {
  const challengeBytes = session.challenge.split(' ').slice(0, 8).map(b => parseInt(b, 16));
  const responseBytes = session.response.split(' ').slice(0, 8).map(b => parseInt(b, 16));
  
  const xor = challengeBytes.map((c, i) => c ^ responseBytes[i]);
  const xorHex = xor.map(b => b.toString(16).padStart(2, '0')).join(' ');
  
  if (!xorPatterns[xorHex]) {
    xorPatterns[xorHex] = [];
  }
  xorPatterns[xorHex].push(session);
});

console.log(`   Unique XOR Patterns: ${Object.keys(xorPatterns).length}`);

// Find common XOR patterns
const commonXorPatterns = Object.entries(xorPatterns).filter(([pattern, sessions]) => sessions.length > 1);
if (commonXorPatterns.length > 0) {
  console.log('\n   🔑 Common XOR Patterns:');
  commonXorPatterns.forEach(([pattern, sessions]) => {
    console.log(`      ${pattern}: ${sessions.length} occurrences`);
  });
}

// Analyze sequence patterns
console.log('\n🔢 Sequence Pattern Analysis:');

// Group by source and analyze sequences
Object.entries(sessionsBySource).forEach(([source, sessions]) => {
  if (sessions.length > 1) {
    console.log(`\n   ${source} (${sessions.length} sessions):`);
    
    // Sort by timestamp
    sessions.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
    
    sessions.forEach((session, i) => {
      const challengeBytes = session.challenge.split(' ').slice(0, 8).join(' ');
      const responseBytes = session.response.split(' ').slice(0, 8).join(' ');
      console.log(`      Session ${i + 1}: ${challengeBytes} → ${responseBytes}`);
    });
  }
});

// Create enhanced test vectors
console.log('\n💾 Creating Enhanced Test Vectors...');

const enhancedSessions = allSessions.map((session, index) => {
  const challengeBytes = session.challenge.split(' ').slice(0, 8).join(' ');
  const responseBytes = session.response.split(' ').slice(0, 8).join(' ');
  
  // Calculate XOR pattern
  const challengeInts = session.challenge.split(' ').slice(0, 8).map(b => parseInt(b, 16));
  const responseInts = session.response.split(' ').slice(0, 8).map(b => parseInt(b, 16));
  const xorPattern = challengeInts.map((c, i) => c ^ responseInts[i]).map(b => b.toString(16).padStart(2, '0')).join(' ');
  
  return {
    id: index + 1,
    timestamp: session.timestamp,
    source: session.source,
    challenge: challengeBytes,
    response: responseBytes,
    xorPattern: xorPattern,
    fullChallenge: session.challenge,
    fullResponse: session.response,
    lineNumber: session.lineNumber
  };
});

// Save enhanced test vectors
const enhancedTestVectors = {
  analysisDate: new Date().toISOString(),
  totalSessions: enhancedSessions.length,
  sources: Object.keys(sessionsBySource),
  sessions: enhancedSessions,
  patterns: {
    uniqueChallenges: Object.keys(challengeGroups).length,
    multipleResponsePatterns: multipleResponses.length,
    uniqueXorPatterns: Object.keys(xorPatterns).length,
    commonXorPatterns: commonXorPatterns.length
  },
  statistics: {
    sessionsBySource: Object.fromEntries(
      Object.entries(sessionsBySource).map(([source, sessions]) => [source, sessions.length])
    ),
    xorPatternFrequency: Object.fromEntries(
      Object.entries(xorPatterns).map(([pattern, sessions]) => [pattern, sessions.length])
    )
  }
};

fs.writeFileSync('test-vectors/enhanced-authentication-sessions.json', JSON.stringify(enhancedTestVectors, null, 2));

console.log(`   ✅ Enhanced test vectors saved with ${enhancedSessions.length} sessions`);
console.log(`   📊 ${Object.keys(challengeGroups).length} unique challenges`);
console.log(`   🔄 ${multipleResponses.length} multiple response patterns`);
console.log(`   🔑 ${Object.keys(xorPatterns).length} unique XOR patterns`);

// Update existing authentication sessions file
const existingSessions = JSON.parse(fs.readFileSync('test-vectors/authentication-sessions.json', 'utf8'));

// Add new sessions to existing ones
const allExistingSessions = existingSessions.sessions || [];
const newSessions = enhancedSessions.filter(newSession => 
  !allExistingSessions.some(existing => 
    existing.challenge === newSession.challenge && existing.response === newSession.response
  )
);

const updatedSessions = {
  ...existingSessions,
  sessions: [...allExistingSessions, ...newSessions],
  analysis: {
    ...existingSessions.analysis,
    totalSessions: allExistingSessions.length + newSessions.length,
    lastUpdated: new Date().toISOString(),
    sources: [...new Set([...(Array.isArray(existingSessions.analysis?.sources) ? existingSessions.analysis.sources : []), ...Object.keys(sessionsBySource)])]
  }
};

fs.writeFileSync('test-vectors/authentication-sessions.json', JSON.stringify(updatedSessions, null, 2));

console.log(`\n📈 Updated authentication sessions: ${allExistingSessions.length} existing + ${newSessions.length} new = ${updatedSessions.sessions.length} total`);

console.log('\n✅ Advanced session extraction complete!');
