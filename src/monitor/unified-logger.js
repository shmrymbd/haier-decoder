const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const HexUtils = require('../utils/hex-utils');

/**
 * Unified Logger for Dual-Dongle Monitoring
 * 
 * Merges both TX and RX streams into a single timestamped log
 * with direction indicators and comprehensive packet information.
 */

class UnifiedLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.packetBuffer = [];
    this.sessionStart = Date.now();
    this.sessionId = this.sessionStart;
    this.packetCount = 0;
    this.txCount = 0;
    this.rxCount = 0;
    
    // Ensure logs directory exists
    this.ensureLogsDirectory();
    
    // Initialize log file
    this.initializeLogFile();
  }

  ensureLogsDirectory() {
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  initializeLogFile() {
    const header = [
      '# Dual-Dongle Monitor Log',
      `# Session ID: ${this.sessionId}`,
      `# Start Time: ${new Date(this.sessionStart).toISOString()}`,
      `# TX Port: Modem → Machine`,
      `# RX Port: Machine → Modem`,
      '# Format: [timestamp] DIRECTION: command_name: hex_data',
      '# Direction indicators: → (TX), ← (RX)',
      '#',
      ''
    ].join('\n');
    
    fs.writeFileSync(this.logFile, header);
  }

  /**
   * Log a packet with direction and timestamp
   * @param {object} packet - Parsed packet object
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Synchronized timestamp
   */
  logPacket(packet, direction, timestamp) {
    this.packetCount++;
    
    if (direction === 'TX') {
      this.txCount++;
    } else {
      this.rxCount++;
    }
    
    // Create log entry
    const logEntry = this.formatLogEntry(packet, direction, timestamp);
    
    // Add to buffer
    this.packetBuffer.push({
      timestamp,
      direction,
      packet,
      logEntry,
      packetNumber: this.packetCount
    });
    
    // Write to file immediately
    this.writeToFile(logEntry);
    
    // Flush buffer if it gets too large
    if (this.packetBuffer.length > 1000) {
      this.flushBuffer();
    }
  }

  /**
   * Format a log entry with all relevant information
   * @param {object} packet - Parsed packet object
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Synchronized timestamp
   * @returns {string} Formatted log entry
   */
  formatLogEntry(packet, direction, timestamp) {
    const arrow = direction === 'TX' ? '→' : '←';
    const time = new Date(timestamp).toISOString();
    const hex = HexUtils.bufferToHex(packet.raw);
    const command = packet.commandInfo?.name || 'Unknown';
    const commandHex = packet.command ? `0x${packet.command.toString(16).padStart(2, '0')}` : '0x??';
    
    // Basic log line
    let logLine = `[${time}] ${arrow} ${command} (${commandHex}): ${hex}`;
    
    // Add additional information for specific commands
    if (packet.command === 0x12 && packet.payload) {
      const challenge = HexUtils.bufferToHex(packet.payload.slice(0, 8));
      logLine += ` | Challenge: ${challenge}`;
    } else if (packet.command === 0x11 && packet.payload) {
      const response = HexUtils.bufferToHex(packet.payload.slice(0, 8));
      logLine += ` | Response: ${response}`;
    } else if (packet.command === 0x6d && packet.payload) {
      const status = packet.payload[0];
      const program = packet.payload[1];
      const statusName = this.getStatusName(status);
      logLine += ` | Status: ${statusName} (0x${status.toString(16)}), Program: ${program}`;
    } else if (packet.command === 0x60 && packet.payload) {
      const program = packet.payload[2];
      logLine += ` | Program: ${program}`;
    } else if (packet.command === 0x01 && packet.payload) {
      const subCommand = packet.payload[0];
      logLine += ` | SubCommand: 0x${subCommand.toString(16).padStart(2, '0')}`;
    } else if (packet.command === 0xf7 && packet.payload) {
      logLine += ` | Complex Command: ${packet.payload.length} bytes`;
    } else if (packet.command === 0xec && packet.payload) {
      const model = packet.payload.slice(0, 10).toString('ascii').replace(/\0/g, '');
      logLine += ` | Model: ${model}`;
    } else if (packet.command === 0x62 && packet.payload) {
      const firmware = packet.payload.slice(0, 20).toString('ascii').replace(/\0/g, '');
      logLine += ` | Firmware: ${firmware}`;
    } else if (packet.command === 0xea && packet.payload) {
      const serial = packet.payload.slice(0, 30).toString('ascii').replace(/\0/g, '');
      logLine += ` | Serial: ${serial}`;
    } else if (packet.command === 0x61 && packet.payload) {
      logLine += ` | Session Start`;
    } else if (packet.command === 0x70 && packet.payload) {
      logLine += ` | Controller Ready`;
    } else if (packet.command === 0x4d && packet.payload) {
      const subCommand = packet.payload[0];
      logLine += ` | Handshake: 0x${subCommand.toString(16).padStart(2, '0')}`;
    }
    
    // Add CRC validation status
    if (packet.crcValid !== undefined) {
      const crcStatus = packet.crcValid ? '✓' : '✗';
      logLine += ` | CRC: ${crcStatus}`;
    }
    
    // Add sequence number if available
    if (packet.sequence !== undefined) {
      logLine += ` | Seq: ${packet.sequence}`;
    }
    
    return logLine;
  }

  /**
   * Write log entry to file
   * @param {string} logEntry - Formatted log entry
   */
  writeToFile(logEntry) {
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error(chalk.red('❌ Failed to write to log file:'), error.message);
    }
  }

  /**
   * Flush packet buffer to JSON file
   */
  flushBuffer() {
    if (this.packetBuffer.length === 0) return;
    
    const jsonFile = this.logFile.replace('.log', '.json');
    const sessionData = {
      sessionId: this.sessionId,
      sessionStart: new Date(this.sessionStart).toISOString(),
      sessionEnd: new Date().toISOString(),
      duration: Date.now() - this.sessionStart,
      totalPackets: this.packetCount,
      txPackets: this.txCount,
      rxPackets: this.rxCount,
      packets: this.packetBuffer.map(entry => ({
        timestamp: entry.timestamp,
        direction: entry.direction,
        packetNumber: entry.packetNumber,
        command: entry.packet.command,
        commandName: entry.packet.commandInfo?.name || 'Unknown',
        hex: HexUtils.bufferToHex(entry.packet.raw),
        payload: entry.packet.payload ? HexUtils.bufferToHex(entry.packet.payload) : null,
        crcValid: entry.packet.crcValid,
        sequence: entry.packet.sequence
      }))
    };
    
    try {
      fs.writeFileSync(jsonFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.error(chalk.red('❌ Failed to write JSON log:'), error.message);
    }
    
    // Clear buffer
    this.packetBuffer = [];
  }

  /**
   * Get status name from status code
   * @param {number} status - Status code
   * @returns {string} Status name
   */
  getStatusName(status) {
    // Updated status mapping based on latest protocol analysis
    const statusMap = {
      // Basic status codes
      0x01: 'Standby',
      0x02: 'Running',
      0x03: 'Paused',
      0x04: 'Error',
      0x05: 'Completed',
      0x06: 'Cancelled',
      
      // Specific status patterns from protocol analysis
      '01 30 10': 'Ready with parameters',
      '01 30 30': 'Standby/Ready',
      '02 B0 31': 'Busy/Error (API error 60015)',
      '04 30 30': 'Reset in progress',
      '01 B0 31': 'Program 1 running',
      '02 B0 31': 'Program 2 running', 
      '03 B0 31': 'Program 3 running',
      '04 B0 31': 'Program 4 running'
    };
    
    // Handle both hex values and string patterns
    if (typeof status === 'string') {
      return statusMap[status] || `Unknown(${status})`;
    }
    
    return statusMap[status] || `Unknown(0x${status.toString(16)})`;
  }

  /**
   * Finalize logging session
   */
  async finalize() {
    // Flush remaining buffer
    this.flushBuffer();
    
    // Write session summary
    this.writeSessionSummary();
    
    console.log(chalk.green(`📝 Session logged to: ${this.logFile}`));
    console.log(chalk.gray(`   JSON format: ${this.logFile.replace('.log', '.json')}`));
  }

  /**
   * Write session summary to log file
   */
  writeSessionSummary() {
    const summary = [
      '',
      '# Session Summary',
      `# Total Packets: ${this.packetCount}`,
      `# TX Packets: ${this.txCount}`,
      `# RX Packets: ${this.rxCount}`,
      `# Duration: ${Math.round((Date.now() - this.sessionStart) / 1000)}s`,
      `# End Time: ${new Date().toISOString()}`,
      ''
    ].join('\n');
    
    fs.appendFileSync(this.logFile, summary);
  }

  /**
   * Get current session statistics
   * @returns {object} Session statistics
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart,
      duration: Date.now() - this.sessionStart,
      totalPackets: this.packetCount,
      txPackets: this.txCount,
      rxPackets: this.rxCount,
      bufferSize: this.packetBuffer.length
    };
  }

  /**
   * Export specific packet range
   * @param {number} startPacket - Starting packet number
   * @param {number} endPacket - Ending packet number
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Export file path
   */
  exportPacketRange(startPacket, endPacket, format = 'json') {
    const filteredPackets = this.packetBuffer.filter(
      entry => entry.packetNumber >= startPacket && entry.packetNumber <= endPacket
    );
    
    const timestamp = Date.now();
    const exportFile = `logs/export-${timestamp}.${format}`;
    
    if (format === 'json') {
      const exportData = {
        sessionId: this.sessionId,
        exportTime: new Date().toISOString(),
        packetRange: { start: startPacket, end: endPacket },
        packets: filteredPackets.map(entry => ({
          packetNumber: entry.packetNumber,
          timestamp: entry.timestamp,
          direction: entry.direction,
          command: entry.packet.command,
          commandName: entry.packet.commandInfo?.name || 'Unknown',
          hex: HexUtils.bufferToHex(entry.packet.raw),
          payload: entry.packet.payload ? HexUtils.bufferToHex(entry.packet.payload) : null
        }))
      };
      
      fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    } else if (format === 'csv') {
      const csvData = [
        'PacketNumber,Timestamp,Direction,Command,CommandName,Hex,Payload',
        ...filteredPackets.map(entry => [
          entry.packetNumber,
          new Date(entry.timestamp).toISOString(),
          entry.direction,
          entry.packet.command,
          entry.packet.commandInfo?.name || 'Unknown',
          HexUtils.bufferToHex(entry.packet.raw),
          entry.packet.payload ? HexUtils.bufferToHex(entry.packet.payload) : ''
        ].join(','))
      ].join('\n');
      
      fs.writeFileSync(exportFile, csvData);
    }
    
    return exportFile;
  }

  /**
   * Search packets by criteria
   * @param {object} criteria - Search criteria
   * @returns {array} Matching packets
   */
  searchPackets(criteria) {
    return this.packetBuffer.filter(entry => {
      if (criteria.direction && entry.direction !== criteria.direction) {
        return false;
      }
      
      if (criteria.command && entry.packet.command !== criteria.command) {
        return false;
      }
      
      if (criteria.commandName && entry.packet.commandInfo?.name !== criteria.commandName) {
        return false;
      }
      
      if (criteria.startTime && entry.timestamp < criteria.startTime) {
        return false;
      }
      
      if (criteria.endTime && entry.timestamp > criteria.endTime) {
        return false;
      }
      
      return true;
    });
  }
}

module.exports = UnifiedLogger;
