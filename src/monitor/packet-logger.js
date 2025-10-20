/**
 * Packet logging system for Haier protocol monitoring
 */

const winston = require('winston');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class PacketLogger {
  constructor(options = {}) {
    this.options = {
      consoleLevel: options.consoleLevel || 'info',
      fileLevel: options.fileLevel || 'debug',
      logFile: options.logFile || 'logs/haier-protocol.log',
      verbose: options.verbose || false,
      ...options
    };

    this.setupLogging();
    this.sessionId = this.generateSessionId();
    this.packetCount = 0;
  }

  /**
   * Setup Winston logging configuration
   */
  setupLogging() {
    // Ensure logs directory exists
    const logDir = path.dirname(this.options.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: this.options.fileLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: this.options.logFile,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        })
      ]
    });

    // Add console transport for debug level
    if (this.options.consoleLevel === 'debug') {
      this.logger.add(new winston.transports.Console({
        level: 'debug',
        format: winston.format.simple()
      }));
    }
  }

  /**
   * Log parsed packet
   * @param {Object} packet - Parsed packet object
   * @param {string} direction - 'sent' or 'received'
   */
  logPacket(packet, direction = 'unknown') {
    this.packetCount++;
    
    // Console output
    this.logToConsole(packet, direction);
    
    // File logging
    this.logToFile(packet, direction);
  }

  /**
   * Log packet to console with colored output
   * @param {Object} packet - Parsed packet object
   * @param {string} direction - Direction indicator
   */
  logToConsole(packet, direction) {
    const timestamp = packet.timestamp.toISOString();
    const directionSymbol = direction === 'sent' ? '→' : direction === 'received' ? '←' : '?';
    const directionColor = direction === 'sent' ? chalk.green : direction === 'received' ? chalk.blue : chalk.gray;
    
    console.log('\n' + '='.repeat(80));
    console.log(`${directionColor(directionSymbol)} Packet #${packet.id} - ${timestamp}`);
    console.log('='.repeat(80));
    
    // Basic packet info
    console.log(chalk.bold('Packet Info:'));
    console.log(`  Length: ${chalk.cyan(packet.length)} bytes`);
    console.log(`  Frame Type: ${chalk.cyan(packet.frameType ? '0x' + packet.frameType.toString(16).toUpperCase() : 'Unknown')}`);
    console.log(`  Sequence: ${chalk.cyan(packet.sequence || 'Unknown')}`);
    console.log(`  Command: ${chalk.yellow(packet.command || 'Unknown')}`);
    
    // Command information
    if (packet.commandInfo) {
      console.log(chalk.bold('\nCommand:'));
      console.log(`  Type: ${chalk.magenta(packet.commandInfo.type)}`);
      console.log(`  Name: ${chalk.magenta(packet.commandInfo.name)}`);
      console.log(`  Description: ${chalk.gray(packet.commandInfo.description)}`);
      
      // Additional command-specific info
      if (packet.commandInfo.statusText) {
        console.log(`  Status: ${chalk.green(packet.commandInfo.statusText)}`);
      }
      if (packet.commandInfo.program) {
        console.log(`  Program: ${chalk.cyan(packet.commandInfo.program)}`);
      }
      if (packet.commandInfo.challenge) {
        console.log(`  Challenge: ${chalk.yellow(packet.commandInfo.challenge)}`);
      }
      if (packet.commandInfo.firmware) {
        console.log(`  Firmware: ${chalk.green(packet.commandInfo.firmware)}`);
      }
      if (packet.commandInfo.model) {
        console.log(`  Model: ${chalk.green(packet.commandInfo.model)}`);
      }
      if (packet.commandInfo.serial) {
        console.log(`  Serial: ${chalk.green(packet.commandInfo.serial)}`);
      }
      if (packet.commandInfo.imei) {
        console.log(`  IMEI: ${chalk.green(packet.commandInfo.imei)}`);
      }
      if (packet.commandInfo.complexCommandLength) {
        console.log(`  Complex Command Length: ${chalk.cyan(packet.commandInfo.complexCommandLength)} bytes`);
      }
      if (packet.commandInfo.sessionStart) {
        console.log(`  Session Start: ${chalk.green(packet.commandInfo.sessionStart)}`);
      }
      if (packet.commandInfo.controllerReady) {
        console.log(`  Controller Ready: ${chalk.green(packet.commandInfo.controllerReady)}`);
      }
      if (packet.commandInfo.handshake) {
        console.log(`  Handshake: ${chalk.green(packet.commandInfo.handshake)}`);
      }
    }
    
    // CRC validation
    console.log(chalk.bold('\nCRC Validation:'));
    if (packet.crcValid) {
      console.log(`  Status: ${chalk.green('✓ Valid')}`);
      console.log(`  Algorithm: ${chalk.cyan(packet.crcAlgorithm)}`);
    } else {
      console.log(`  Status: ${chalk.red('✗ Invalid')}`);
      console.log(`  Reason: ${chalk.red(packet.crcReason)}`);
    }
    console.log(`  Received: ${chalk.yellow(packet.receivedCRC)}`);
    
    // ASCII strings
    if (packet.asciiStrings && packet.asciiStrings.length > 0) {
      console.log(chalk.bold('\nASCII Strings:'));
      packet.asciiStrings.forEach((str, index) => {
        console.log(`  ${index + 1}: ${chalk.green(str.value)} (pos: ${str.position}, len: ${str.length})`);
      });
    }
    
    // Hex dump
    if (this.options.verbose) {
      console.log(chalk.bold('\nHex Dump:'));
      console.log(chalk.gray(packet.hexDump));
    } else {
      console.log(chalk.bold('\nRaw Data:'));
      console.log(chalk.gray(packet.raw));
    }
    
    // Error information
    if (packet.error) {
      console.log(chalk.bold('\nError:'));
      console.log(chalk.red(packet.error));
    }
  }

  /**
   * Log packet to file
   * @param {Object} packet - Parsed packet object
   * @param {string} direction - Direction indicator
   */
  logToFile(packet, direction) {
    const logEntry = {
      sessionId: this.sessionId,
      packetId: packet.id,
      timestamp: packet.timestamp,
      direction: direction,
      length: packet.length,
      frameType: packet.frameType,
      sequence: packet.sequence,
      command: packet.command,
      payload: packet.payload,
      receivedCRC: packet.receivedCRC,
      crcValid: packet.crcValid,
      crcAlgorithm: packet.crcAlgorithm,
      crcReason: packet.crcReason,
      commandInfo: packet.commandInfo,
      raw: packet.raw,
      asciiStrings: packet.asciiStrings,
      error: packet.error
    };

    this.logger.info('packet', logEntry);
  }

  /**
   * Log session start
   * @param {string} port - Serial port
   * @param {Object} options - Connection options
   */
  logSessionStart(port, options) {
    const sessionInfo = {
      sessionId: this.sessionId,
      port: port,
      options: options,
      timestamp: new Date()
    };

    console.log(chalk.bold.green('\n🚀 Starting Haier Protocol Monitor'));
    console.log(`Port: ${chalk.cyan(port)}`);
    console.log(`Baud Rate: ${chalk.cyan(options.baudRate || 9600)}`);
    console.log(`Session ID: ${chalk.gray(this.sessionId)}`);
    console.log('='.repeat(80));

    this.logger.info('session_start', sessionInfo);
  }

  /**
   * Log session end
   * @param {string} reason - End reason
   */
  logSessionEnd(reason = 'normal') {
    const sessionInfo = {
      sessionId: this.sessionId,
      reason: reason,
      packetCount: this.packetCount,
      timestamp: new Date()
    };

    console.log(chalk.bold.red('\n🛑 Session Ended'));
    console.log(`Reason: ${chalk.yellow(reason)}`);
    console.log(`Packets Processed: ${chalk.cyan(this.packetCount)}`);
    console.log('='.repeat(80));

    this.logger.info('session_end', sessionInfo);
  }

  /**
   * Log connection error
   * @param {Error} error - Error object
   */
  logConnectionError(error) {
    console.log(chalk.bold.red('\n❌ Connection Error'));
    console.log(chalk.red(error.message));
    
    this.logger.error('connection_error', {
      sessionId: this.sessionId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
  }

  /**
   * Log statistics
   * @param {Object} stats - Statistics object
   */
  logStats(stats) {
    console.log(chalk.bold('\n📊 Session Statistics'));
    console.log(`Packets Parsed: ${chalk.cyan(stats.packetsParsed)}`);
    console.log(`Buffer Size: ${chalk.cyan(stats.bufferSize)} bytes`);
    console.log(`CRC Algorithm: ${chalk.cyan(stats.crcStats.validatedAlgorithm)}`);
    console.log(`Lookup Table: ${chalk.cyan(stats.crcStats.lookupTableSize)} entries`);
    
    this.logger.info('session_stats', {
      sessionId: this.sessionId,
      stats: stats,
      timestamp: new Date()
    });
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get log file path
   * @returns {string} Log file path
   */
  getLogFilePath() {
    return this.options.logFile;
  }

  /**
   * Get session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get packet count
   * @returns {number} Packet count
   */
  getPacketCount() {
    return this.packetCount;
  }
}

module.exports = PacketLogger;
