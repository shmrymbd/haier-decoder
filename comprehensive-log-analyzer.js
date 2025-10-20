#!/usr/bin/env node

/**
 * Comprehensive Log File Analyzer
 * 
 * This script analyzes all provided log files to extract authentication sessions,
 * identify patterns, and provide a complete overview of the Haier protocol communication.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Log File Analysis\n');

// Define log files to analyze
const logFiles = [
  { name: 'dualLogs.txt', description: 'Dual-dongle real-time monitoring' },
  { name: 'startup.txt', description: 'Startup sequence captures' },
  { name: 'rolling.txt', description: 'Rolling code authentication sessions' },
  { name: 'binding.txt', description: 'Device binding communication' },
  { name: 'commands-logs.txt', description: 'Command execution logs' }
];

// Authentication session storage
const allSessions = [];
const fileStats = {};

// Analyze each log file
logFiles.forEach(file => {
  console.log(`📁 Analyzing ${file.name} (${file.description})...`);
  
  try {
    const content = fs.readFileSync(file.name, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const stats = {
      totalLines: lines.length,
      machinePackets: 0,
      modemPackets: 0,
      authChallenges: 0,
      authResponses: 0,
      sessionResets: 0,
      uniqueCommands: new Set(),
      timestamps: []
    };
    
    // Extract authentication sessions
    const sessions = extractAuthenticationSessions(lines, file.name);
    allSessions.push(...sessions);
    
    // Analyze packet patterns
    lines.forEach(line => {
      if (line.includes('machine')) stats.machinePackets++;
      if (line.includes('modem')) stats.modemPackets++;
      if (line.includes('00')) stats.sessionResets++;
      
      // Extract timestamps
      const timestampMatch = line.match(/(\d{10})/);
      if (timestampMatch) {
        stats.timestamps.push(parseInt(timestampMatch[1]));
      }
      
      // Extract command IDs
      const commandMatch = line.match(/ff ff \w+ 40 00 00 00 00 00 (\w+)/);
      if (commandMatch) {
        stats.uniqueCommands.add(commandMatch[1]);
      }
    });
    
    // Authentication packet analysis
    lines.forEach(line => {
      if (line.includes('12 10 02 00 01')) stats.authChallenges++;
      if (line.includes('11 10 02 00 01')) stats.authResponses++;
    });
    
    fileStats[file.name] = {
      ...stats,
      uniqueCommands: Array.from(stats.uniqueCommands),
      timeRange: stats.timestamps.length > 0 ? {
        start: Math.min(...stats.timestamps),
        end: Math.max(...stats.timestamps),
        duration: Math.max(...stats.timestamps) - Math.min(...stats.timestamps)
      } : null,
      authSessions: sessions.length
    };
    
    console.log(`   ✅ ${stats.totalLines} lines, ${sessions.length} auth sessions, ${stats.uniqueCommands.size} unique commands`);
    
  } catch (error) {
    console.log(`   ❌ Error reading ${file.name}: ${error.message}`);
    fileStats[file.name] = { error: error.message };
  }
});

console.log('\n📊 COMPREHENSIVE ANALYSIS RESULTS\n');

// Overall statistics
console.log('📈 Overall Statistics:');
console.log(`   Total Authentication Sessions: ${allSessions.length}`);
console.log(`   Total Log Files Analyzed: ${logFiles.length}`);

// File-by-file breakdown
console.log('\n📋 File-by-File Breakdown:');
Object.entries(fileStats).forEach(([filename, stats]) => {
  if (stats.error) {
    console.log(`   ${filename}: ❌ ${stats.error}`);
    return;
  }
  
  console.log(`\n   📁 ${filename}:`);
  console.log(`      Lines: ${stats.totalLines}`);
  console.log(`      Machine Packets: ${stats.machinePackets}`);
  console.log(`      Modem Packets: ${stats.modemPackets}`);
  console.log(`      Auth Challenges: ${stats.authChallenges}`);
  console.log(`      Auth Responses: ${stats.authResponses}`);
  console.log(`      Session Resets: ${stats.sessionResets}`);
  console.log(`      Unique Commands: ${stats.uniqueCommands.length}`);
  console.log(`      Auth Sessions: ${stats.authSessions}`);
  
  if (stats.timeRange) {
    console.log(`      Time Range: ${stats.timeRange.duration}s (${new Date(stats.timeRange.start * 1000).toISOString()} - ${new Date(stats.timeRange.end * 1000).toISOString()})`);
  }
});

// Authentication session analysis
console.log('\n🔐 Authentication Session Analysis:');
if (allSessions.length > 0) {
  const challenges = allSessions.map(s => s.challenge);
  const responses = allSessions.map(s => s.response);
  
  console.log(`   Total Sessions: ${allSessions.length}`);
  console.log(`   Unique Challenges: ${new Set(challenges).size}`);
  console.log(`   Unique Responses: ${new Set(responses).size}`);
  
  // Group by source
  const bySource = {};
  allSessions.forEach(session => {
    if (!bySource[session.source]) bySource[session.source] = [];
    bySource[session.source].push(session);
  });
  
  console.log('\n   📊 Sessions by Source:');
  Object.entries(bySource).forEach(([source, sessions]) => {
    console.log(`      ${source}: ${sessions.length} sessions`);
  });
  
  // Multiple response analysis
  const challengeGroups = {};
  allSessions.forEach(session => {
    if (!challengeGroups[session.challenge]) {
      challengeGroups[session.challenge] = [];
    }
    challengeGroups[session.challenge].push(session);
  });
  
  const multipleResponses = Object.entries(challengeGroups).filter(([challenge, sessions]) => sessions.length > 1);
  console.log(`\n   🔄 Multiple Response Patterns: ${multipleResponses.length}`);
  
  multipleResponses.forEach(([challenge, sessions]) => {
    console.log(`      Challenge: ${challenge.substring(0, 16)}... (${sessions.length} responses)`);
    sessions.forEach((session, i) => {
      console.log(`         Response ${i + 1}: ${session.response.substring(0, 16)}... (${session.source})`);
    });
  });
}

// Command analysis
console.log('\n🎯 Command Analysis:');
const allCommands = new Set();
Object.values(fileStats).forEach(stats => {
  if (stats.uniqueCommands) {
    stats.uniqueCommands.forEach(cmd => allCommands.add(cmd));
  }
});

console.log(`   Total Unique Commands: ${allCommands.size}`);
console.log('   Command List:', Array.from(allCommands).sort().join(', '));

// Protocol pattern analysis
console.log('\n🔍 Protocol Pattern Analysis:');
const protocolPatterns = {
  sessionReset: '00',
  authenticationChallenge: '12 10 02 00 01',
  authenticationResponse: '11 10 02 00 01',
  statusQuery: '6d 01',
  dataResponse: '6d 02',
  heartbeat: '4d 61',
  deviceInfo: '00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39'
};

Object.entries(protocolPatterns).forEach(([pattern, hex]) => {
  let count = 0;
  Object.entries(fileStats).forEach(([filename, stats]) => {
    if (stats.error) return;
    // This would need to be implemented with actual pattern matching
  });
  console.log(`   ${pattern}: ${hex}`);
});

// Save comprehensive results
const results = {
  analysisDate: new Date().toISOString(),
  totalFiles: logFiles.length,
  totalSessions: allSessions.length,
  fileStats,
  authenticationSessions: allSessions,
  uniqueCommands: Array.from(allCommands),
  protocolPatterns
};

fs.writeFileSync('comprehensive-analysis-results.json', JSON.stringify(results, null, 2));
console.log('\n💾 Results saved to comprehensive-analysis-results.json');

console.log('\n✅ Comprehensive analysis complete!');

/**
 * Extract authentication sessions from log lines
 */
function extractAuthenticationSessions(lines, source) {
  const sessions = [];
  let currentChallenge = null;
  
  lines.forEach((line, index) => {
    // Look for authentication challenges (command 12)
    if (line.includes('12 10 02 00 01')) {
      const hexMatch = line.match(/ff ff \w+ 40 00 00 00 00 00 12 10 02 00 01 ([a-f0-9\s]+)/i);
      if (hexMatch) {
        currentChallenge = hexMatch[1].replace(/\s+/g, ' ').trim();
      }
    }
    
    // Look for authentication responses (command 11)
    if (line.includes('11 10 02 00 01') && currentChallenge) {
      const hexMatch = line.match(/ff ff \w+ 40 00 00 00 00 00 11 10 02 00 01 ([a-f0-9\s]+)/i);
      if (hexMatch) {
        const response = hexMatch[1].replace(/\s+/g, ' ').trim();
        
        // Extract timestamp
        const timestampMatch = line.match(/(\d{10})/);
        const timestamp = timestampMatch ? timestampMatch[1] : Date.now().toString();
        
        sessions.push({
          id: sessions.length + 1,
          timestamp,
          source,
          challenge: currentChallenge,
          response: response,
          lineNumber: index + 1
        });
        
        currentChallenge = null; // Reset for next session
      }
    }
  });
  
  return sessions;
}
