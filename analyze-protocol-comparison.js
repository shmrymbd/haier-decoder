#!/usr/bin/env node

/**
 * Protocol Comparison Analysis
 * Compares decoded protocol data with known pyhOn library patterns
 * Based on information from Andre0512/hon and fastfend/HaierACBridge repositories
 */

const fs = require('fs');
const path = require('path');

class ProtocolComparison {
  constructor() {
    this.dualLogsPath = path.join(__dirname, 'dualLogs.txt');
    this.protocolSpecPath = path.join(__dirname, 'PROTOCOL_SPECIFICATION.md');
    
    // Known pyhOn library command patterns (based on repository analysis)
    this.pyhOnCommands = {
      // Program control commands from pyhOn
      startProgram: {
        description: "Start wash program",
        pyhOnFormat: "startProgram command",
        protocolFormat: "FF FF 0E 40 00 00 00 00 00 60 00 01 [program] 00 00 00 [crc]",
        examples: [
          "FF FF 0E 40 00 00 00 00 00 60 00 01 01 00 00 00 B0 34 AD", // Program 1
          "FF FF 0E 40 00 00 00 00 00 60 00 01 02 00 00 00 B1 70 AD", // Program 2
          "FF FF 0E 40 00 00 00 00 00 60 00 01 03 00 00 00 B2 8C AC", // Program 3
          "FF FF 0E 40 00 00 00 00 00 60 00 01 04 00 00 00 B3 F8 AD"  // Program 4
        ]
      },
      pauseProgram: {
        description: "Pause current program",
        pyhOnFormat: "pauseProgram command",
        protocolFormat: "Not yet identified in protocol",
        status: "MISSING"
      },
      resumeProgram: {
        description: "Resume paused program", 
        pyhOnFormat: "resumeProgram command",
        protocolFormat: "Not yet identified in protocol",
        status: "MISSING"
      },
      stopProgram: {
        description: "Stop current program",
        pyhOnFormat: "stopProgram command", 
        protocolFormat: "FF FF 0C 40 00 00 00 00 00 01 5D 1F 00 01 [crc]",
        examples: [
          "FF FF 0C 40 00 00 00 00 00 01 5D 1F 00 01 CA BB 9B" // Reset/Stop
        ]
      }
    };

    // Status mappings from pyhOn library
    this.pyhOnStatusMappings = {
      // Machine status indicators
      "01 30 30": "Standby/Ready - Machine ready for commands",
      "01 30 10": "Ready with parameters - Machine ready with parameter mode 1", 
      "02 B0 31": "Busy/Error - Device busy or error condition (API error 60015)",
      "04 30 30": "Reset in progress - Reset operation initiated",
      "01 B0 31": "Program 1 running - Program 1 is active",
      "02 B0 31": "Program 2 running - Program 2 is active", 
      "03 B0 31": "Program 3 running - Program 3 is active",
      "04 B0 31": "Program 4 running - Program 4 is active"
    };

    // Authentication patterns from pyhOn
    this.pyhOnAuthPatterns = {
      challengeFormat: "FF FF 25 40 00 00 00 00 00 11 10 02 00 01 [challenge:8] 01 [encrypted:16-24]",
      responseFormat: "FF FF 25 40 00 00 00 00 00 12 10 02 00 01 [challenge:8] 01 [encrypted:16-24]",
      description: "Rolling code authentication system with 8-byte challenges and encrypted responses"
    };

    // Device attributes from pyhOn
    this.pyhOnDeviceAttributes = {
      actualWeight: "Current load weight",
      airWashTempLevel: "Air wash temperature level",
      airWashTime: "Air wash duration",
      antiAllergyStatus: "Anti-allergy mode status",
      doorStatus: "Door open/closed status",
      doorLockStatus: "Door lock status",
      errors: "Current error codes",
      extraRinse1: "Extra rinse option 1",
      extraRinse2: "Extra rinse option 2", 
      extraRinse3: "Extra rinse option 3",
      goodNight: "Good night mode status",
      machMode: "Machine mode",
      programName: "Current program name",
      prPhase: "Program phase",
      remainingTimeMM: "Remaining time in minutes",
      remoteControl: "Remote control status",
      spinSpeed: "Current spin speed",
      stainType: "Stain type selection",
      steamLevel: "Steam level",
      totalElectricityUsed: "Total electricity consumption",
      totalWashCycle: "Total wash cycles completed",
      totalWaterUsed: "Total water consumption"
    };
  }

  /**
   * Parse dual logs file and extract command patterns
   */
  parseDualLogs() {
    if (!fs.existsSync(this.dualLogsPath)) {
      console.log("❌ dualLogs.txt not found");
      return [];
    }

    const content = fs.readFileSync(this.dualLogsPath, 'utf8');
    const lines = content.split('\n');
    const commands = [];

    for (const line of lines) {
      if (line.includes('Unknown Command') && line.includes('FF FF')) {
        const match = line.match(/FF FF [A-F0-9\s]+/);
        if (match) {
          const hexData = match[0].replace(/\s+/g, ' ').trim();
          const direction = line.includes('→') ? 'TX' : 'RX';
          const timestamp = line.match(/\[([^\]]+)\]/)?.[1] || 'unknown';
          
          commands.push({
            timestamp,
            direction,
            hexData,
            rawLine: line.trim()
          });
        }
      }
    }

    return commands;
  }

  /**
   * Identify command types in the captured data
   */
  identifyCommands(commands) {
    const identified = {
      programCommands: [],
      statusResponses: [],
      authentication: [],
      acknowledgments: [],
      deviceInfo: [],
      unknown: []
    };

    for (const cmd of commands) {
      const hex = cmd.hexData.replace(/\s+/g, '');
      
      // Program commands (60 00 01)
      if (hex.includes('600001')) {
        identified.programCommands.push(cmd);
      }
      // Status responses (6D 01)
      else if (hex.includes('6D01')) {
        identified.statusResponses.push(cmd);
      }
      // Authentication (10 02)
      else if (hex.includes('1002')) {
        identified.authentication.push(cmd);
      }
      // Acknowledgments (4D 61)
      else if (hex.includes('4D61')) {
        identified.acknowledgments.push(cmd);
      }
      // Device info (62, EC, EA, 11 00 F0)
      else if (hex.includes('62') || hex.includes('EC') || hex.includes('EA') || hex.includes('1100F0')) {
        identified.deviceInfo.push(cmd);
      }
      else {
        identified.unknown.push(cmd);
      }
    }

    return identified;
  }

  /**
   * Compare with pyhOn library patterns
   */
  compareWithPyhOn(identified) {
    const comparison = {
      matches: [],
      missing: [],
      differences: []
    };

    // Check program commands
    if (identified.programCommands.length > 0) {
      comparison.matches.push({
        type: 'Program Commands',
        count: identified.programCommands.length,
        description: 'Matches pyhOn startProgram command pattern',
        pyhOnCommand: 'startProgram',
        protocolFormat: 'FF FF 0E 40 00 00 00 00 00 60 00 01 [program] 00 00 00 [crc]'
      });
    }

    // Check for missing commands
    const missingCommands = ['pauseProgram', 'resumeProgram'];
    for (const missing of missingCommands) {
      comparison.missing.push({
        command: missing,
        pyhOnFormat: this.pyhOnCommands[missing].pyhOnFormat,
        status: 'Not found in protocol capture',
        suggestion: 'May be implemented differently or not supported'
      });
    }

    // Check status responses
    if (identified.statusResponses.length > 0) {
      comparison.matches.push({
        type: 'Status Responses',
        count: identified.statusResponses.length,
        description: 'Matches pyhOn status mapping patterns',
        pyhOnMapping: 'Machine status indicators (machMode, prPhase, etc.)'
      });
    }

    // Check authentication
    if (identified.authentication.length > 0) {
      comparison.matches.push({
        type: 'Authentication',
        count: identified.authentication.length,
        description: 'Rolling code authentication system',
        pyhOnPattern: 'Challenge-response authentication',
        protocolFormat: this.pyhOnAuthPatterns.challengeFormat
      });
    }

    return comparison;
  }

  /**
   * Analyze status codes against pyhOn mappings
   */
  analyzeStatusCodes(identified) {
    const statusAnalysis = {
      found: [],
      missing: [],
      unknown: []
    };

    for (const status of identified.statusResponses) {
      const hex = status.hexData.replace(/\s+/g, '');
      
      // Extract status bytes (typically after 6D 01)
      const statusMatch = hex.match(/6D01([A-F0-9]{6})/);
      if (statusMatch) {
        const statusBytes = statusMatch[1].match(/.{2}/g).join(' ');
        
        if (this.pyhOnStatusMappings[statusBytes]) {
          statusAnalysis.found.push({
            statusBytes,
            meaning: this.pyhOnStatusMappings[statusBytes],
            timestamp: status.timestamp,
            direction: status.direction
          });
        } else {
          statusAnalysis.unknown.push({
            statusBytes,
            timestamp: status.timestamp,
            direction: status.direction,
            hexData: status.hexData
          });
        }
      }
    }

    return statusAnalysis;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('🔍 Haier Protocol Comparison Analysis');
    console.log('=====================================\n');

    const commands = this.parseDualLogs();
    console.log(`📊 Parsed ${commands.length} commands from dualLogs.txt\n`);

    const identified = this.identifyCommands(commands);
    console.log('📋 Command Identification:');
    console.log(`  • Program Commands: ${identified.programCommands.length}`);
    console.log(`  • Status Responses: ${identified.statusResponses.length}`);
    console.log(`  • Authentication: ${identified.authentication.length}`);
    console.log(`  • Acknowledgments: ${identified.acknowledgments.length}`);
    console.log(`  • Device Info: ${identified.deviceInfo.length}`);
    console.log(`  • Unknown: ${identified.unknown.length}\n`);

    const comparison = this.compareWithPyhOn(identified);
    console.log('🔄 pyhOn Library Comparison:');
    console.log('\n✅ Matches:');
    for (const match of comparison.matches) {
      console.log(`  • ${match.type}: ${match.description}`);
      console.log(`    Count: ${match.count}, pyhOn: ${match.pyhOnCommand || match.pyhOnMapping || match.pyhOnPattern}`);
    }

    console.log('\n❌ Missing Commands:');
    for (const missing of comparison.missing) {
      console.log(`  • ${missing.command}: ${missing.status}`);
      console.log(`    pyhOn Format: ${missing.pyhOnFormat}`);
    }

    const statusAnalysis = this.analyzeStatusCodes(identified);
    console.log('\n📊 Status Code Analysis:');
    console.log(`  • Recognized: ${statusAnalysis.found.length}`);
    console.log(`  • Unknown: ${statusAnalysis.unknown.length}`);

    if (statusAnalysis.found.length > 0) {
      console.log('\n✅ Recognized Status Codes:');
      for (const status of statusAnalysis.found) {
        console.log(`  • ${status.statusBytes}: ${status.meaning}`);
      }
    }

    if (statusAnalysis.unknown.length > 0) {
      console.log('\n❓ Unknown Status Codes:');
      for (const status of statusAnalysis.unknown) {
        console.log(`  • ${status.statusBytes} (${status.timestamp})`);
      }
    }

    console.log('\n🎯 Recommendations:');
    console.log('  1. Implement missing pauseProgram and resumeProgram commands');
    console.log('  2. Map unknown status codes to pyhOn device attributes');
    console.log('  3. Validate authentication patterns against pyhOn rolling code system');
    console.log('  4. Cross-reference device info commands with pyhOn attribute mappings');

    return {
      commands,
      identified,
      comparison,
      statusAnalysis
    };
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new ProtocolComparison();
  analyzer.generateReport();
}

module.exports = ProtocolComparison;
