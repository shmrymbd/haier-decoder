const chalk = require('chalk');
const HexUtils = require('../utils/hex-utils');

class CommandHandler {
  constructor(communicator) {
    this.communicator = communicator;
    this.commands = {
      // Authentication & Initialization
      'auth': this.authenticate.bind(this),
      'challenge': this.sendChallenge.bind(this),
      'init': this.initializeDevice.bind(this),
      
      // Status & Info
      'status': this.getStatus.bind(this),
      'info': this.getDeviceInfo.bind(this),
      'model': this.getModel.bind(this),
      'serial': this.getSerial.bind(this),
      'conn': this.getConnectionStatus.bind(this),
      
      // Control
      'reset': this.sendReset.bind(this),
      'standby': this.setStandby.bind(this),
      'start': this.startProgram.bind(this),
      'stop': this.stopProgram.bind(this),
      
      // Program Commands
      'program1': () => this.startProgram(1),
      'program2': () => this.startProgram(2),
      'program3': () => this.startProgram(3),
      'program4': () => this.startProgram(4),
      
      // Raw Commands
      'send': this.sendRawHex.bind(this),
      'hex': this.sendRawHex.bind(this),
      
      // Missing Commands from Latest Protocol Analysis
      'complex': this.sendComplexCommand.bind(this),
      'query': this.sendStatusQuery.bind(this),
      'firmware': this.getFirmwareInfo.bind(this),
      'model': this.getModelInfo.bind(this),
      'serial': this.getSerialInfo.bind(this),
      'sync': this.syncTimestamp.bind(this),
      
      // Session Management
      'history': this.showHistory.bind(this),
      'clear': this.clearHistory.bind(this),
      'save': this.saveSession.bind(this),
      'load': this.loadSession.bind(this),
      
      // Mode Control
      'mode': this.switchMode.bind(this),
      'auto': () => this.switchMode('automated'),
      'manual': () => this.switchMode('interactive'),
      
      // System
      'help': this.showHelp.bind(this),
      'exit': this.exit.bind(this),
      'quit': this.exit.bind(this)
    };
  }

  async execute(commandName, args = []) {
    if (!this.commands[commandName]) {
      return { error: `Unknown command: ${commandName}. Type 'help' for available commands.` };
    }

    try {
      return await this.commands[commandName](...args);
    } catch (error) {
      return { error: error.message };
    }
  }

  async initializeDevice() {
    if (!this.communicator.isReady()) {
      await this.communicator.manualInitialize();
      return { message: 'Device initialized successfully' };
    } else {
      return { message: 'Device already initialized' };
    }
  }

  // Authentication Commands
  async authenticate() {
    try {
      console.log(chalk.yellow('🔐 Authenticating...'));
      
      // Request authentication from device
      const result = await this.communicator.authenticate();
      
      if (result.success) {
        return { message: 'Authentication successful' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Authentication failed: ${error.message}` };
    }
  }

  async sendChallenge() {
    try {
      console.log(chalk.yellow('🔐 Sending authentication challenge...'));
      
      // Create authentication challenge packet
      const challenge = this.createAuthenticationChallenge();
      await this.communicator.sendRawPacket(challenge);
      
      return { message: 'Authentication challenge sent' };
    } catch (error) {
      return { error: `Failed to send challenge: ${error.message}` };
    }
  }

  createAuthenticationChallenge() {
    // Generate rolling challenge
    const challenge = this.communicator.generateRollingChallenge();
    const challengeBuffer = HexUtils.hexToBuffer(challenge);
    
    // Create authentication challenge packet with correct frame structure
    const frameFlags = 0x40; // Has CRC
    const reserved = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const frameType = 0x11; // Authentication challenge (TX direction)
    const frameData = Buffer.concat([
      Buffer.from([0x10, 0x02, 0x00, 0x01]), // Challenge header
      challengeBuffer // 8-byte rolling challenge
    ]);
    
    // Calculate checksum (LSB of sum of flags+reserved+type+data)
    const sumData = Buffer.concat([Buffer.from([frameFlags]), reserved, Buffer.from([frameType]), frameData]);
    let sum = 0;
    for (let i = 0; i < sumData.length; i++) sum = (sum + sumData[i]) & 0xFF;
    const checksum = sum;
    
    // Calculate CRC-16/ARC
    const CRC = require('../protocol/crc');
    const crc = new CRC();
    const crcValue = crc.calculateCRC16ARC(sumData);
    
    // Build complete packet
    const frameLength = 1 + 5 + 1 + frameData.length + 1; // flags + reserved + type + data + checksum
    const packet = Buffer.concat([
      Buffer.from([0xFF, 0xFF]), // Frame separator
      Buffer.from([frameLength]), // Frame length
      Buffer.from([frameFlags]), // Frame flags
      reserved, // Reserved space
      Buffer.from([frameType]), // Frame type
      frameData, // Frame data
      Buffer.from([checksum]), // Checksum
      Buffer.from([(crcValue >> 8) & 0xFF, crcValue & 0xFF]) // CRC
    ]);
    
    return packet;
  }

  // Status & Info Commands
  async getStatus() {
    try {
      console.log(chalk.yellow('📊 Getting device status...'));
      
      const status = await this.communicator.getStatus();
      
      if (status.error) {
        return { error: status.error };
      }
      
      return {
        message: 'Device status retrieved',
        data: `State: ${status.state}\nProgram: ${status.program}\nRaw: ${status.raw}`
      };
    } catch (error) {
      return { error: `Failed to get status: ${error.message}` };
    }
  }

  async getConnectionStatus() {
    const status = this.communicator.getConnectionStatus();
    return {
      message: 'Connection status retrieved',
      data: `Connected: ${status.connected ? '✅' : '❌'}\nReady: ${status.ready ? '✅' : '❌'}\nAuthenticated: ${status.authenticated ? '✅' : '❌'}\nAuto-Init: ${status.autoInitialize ? '✅' : '❌'}`
    };
  }

  async getDeviceInfo() {
    try {
      console.log(chalk.yellow('ℹ️ Getting device information...'));
      
      const info = this.communicator.deviceInfo;
      if (!info) {
        return { error: 'Device information not available' };
      }
      
      return {
        message: 'Device information retrieved',
        data: `Model: ${info.model}\nSerial: ${info.serial}\nIMEI: ${info.imei}\nFirmware: ${info.firmware}`
      };
    } catch (error) {
      return { error: `Failed to get device info: ${error.message}` };
    }
  }

  async getModel() {
    try {
      const info = this.communicator.deviceInfo;
      if (!info) {
        return { error: 'Device information not available' };
      }
      
      return {
        message: 'Device model retrieved',
        data: info.model
      };
    } catch (error) {
      return { error: `Failed to get model: ${error.message}` };
    }
  }

  async getSerial() {
    try {
      const info = this.communicator.deviceInfo;
      if (!info) {
        return { error: 'Device information not available' };
      }
      
      return {
        message: 'Device serial retrieved',
        data: info.serial
      };
    } catch (error) {
      return { error: `Failed to get serial: ${error.message}` };
    }
  }

  // Control Commands
  async sendReset() {
    try {
      console.log(chalk.yellow('🔄 Resetting device...'));
      
      const result = await this.communicator.reset();
      
      if (result.success) {
        return { message: result.message };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to reset device: ${error.message}` };
    }
  }

  async setStandby() {
    try {
      console.log(chalk.yellow('⏸️ Setting device to standby...'));
      
      // Standby is same as reset for this device
      const result = await this.communicator.reset();
      
      if (result.success) {
        return { message: 'Device set to standby' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to set standby: ${error.message}` };
    }
  }

  async startProgram(programNumber) {
    try {
      if (!programNumber) {
        return { error: 'Program number required (1-4)' };
      }
      
      console.log(chalk.yellow(`🚀 Starting program ${programNumber}...`));
      
      const result = await this.communicator.startProgram(programNumber);
      
      if (result.success) {
        return { message: result.message };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to start program: ${error.message}` };
    }
  }

  async stopProgram() {
    try {
      console.log(chalk.yellow('⏹️ Stopping current program...'));
      
      // Stop program by sending reset
      const result = await this.communicator.reset();
      
      if (result.success) {
        return { message: 'Program stopped' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to stop program: ${error.message}` };
    }
  }

  // Raw Commands
  async sendRawHex(hexString) {
    try {
      if (!hexString) {
        return { error: 'Hex string required' };
      }
      
      console.log(chalk.yellow('📤 Sending raw hex packet...'));
      
      const result = await this.communicator.sendRawHex(hexString);
      
      if (result.success) {
        return { message: result.message };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to send raw hex: ${error.message}` };
    }
  }

  // Missing Commands from Latest Protocol Analysis
  async sendComplexCommand() {
    try {
      console.log(chalk.yellow('🔄 Sending complex command (F7)...'));
      
      // Complex Command (Mode 2 - Alternate format)
      const complexHex = 'ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04 00 02 17 00 96 22 e4';
      
      const result = await this.communicator.sendRawHex(complexHex);
      
      if (result.success) {
        return { message: 'Complex command sent successfully' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to send complex command: ${error.message}` };
    }
  }

  async sendStatusQuery() {
    try {
      console.log(chalk.yellow('📊 Sending status query (F3)...'));
      
      // Status Query Command
      const queryHex = 'ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1';
      
      const result = await this.communicator.sendRawHex(queryHex);
      
      if (result.success) {
        return { message: 'Status query sent successfully' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to send status query: ${error.message}` };
    }
  }

  async getFirmwareInfo() {
    try {
      console.log(chalk.yellow('ℹ️ Requesting firmware information...'));
      
      // Request firmware info (command 62)
      const firmwareHex = 'ff ff 0a 40 00 00 00 00 00 62 00 00 3d d0 e1';
      
      const result = await this.communicator.sendRawHex(firmwareHex);
      
      if (result.success) {
        return { message: 'Firmware info request sent' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to get firmware info: ${error.message}` };
    }
  }

  async getModelInfo() {
    try {
      console.log(chalk.yellow('ℹ️ Requesting model information...'));
      
      // Request model info (command EC)
      const modelHex = 'ff ff 0a 40 00 00 00 00 00 ec 00 00 3d d0 e1';
      
      const result = await this.communicator.sendRawHex(modelHex);
      
      if (result.success) {
        return { message: 'Model info request sent' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to get model info: ${error.message}` };
    }
  }

  async getSerialInfo() {
    try {
      console.log(chalk.yellow('ℹ️ Requesting serial information...'));
      
      // Request serial info (command EA)
      const serialHex = 'ff ff 0a 40 00 00 00 00 00 ea 00 00 3d d0 e1';
      
      const result = await this.communicator.sendRawHex(serialHex);
      
      if (result.success) {
        return { message: 'Serial info request sent' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to get serial info: ${error.message}` };
    }
  }

  async syncTimestamp() {
    try {
      console.log(chalk.yellow('🕐 Synchronizing timestamp...'));
      
      // Timestamp sync command (11 10 00)
      const timestampHex = 'ff ff 0a 40 00 00 00 00 00 11 10 00 3d d0 e1';
      
      const result = await this.communicator.sendRawHex(timestampHex);
      
      if (result.success) {
        return { message: 'Timestamp sync sent successfully' };
      } else {
        return { error: result.error };
      }
    } catch (error) {
      return { error: `Failed to sync timestamp: ${error.message}` };
    }
  }

  // Session Management Commands
  async showHistory(count = 10) {
    // This will be handled by the CLI, not here
    return { message: 'History command handled by CLI' };
  }

  async clearHistory() {
    // This will be handled by the CLI, not here
    return { message: 'Clear history command handled by CLI' };
  }

  async saveSession(filename) {
    // This will be handled by the CLI, not here
    return { message: 'Save session command handled by CLI' };
  }

  async loadSession(filename) {
    // This will be handled by the CLI, not here
    return { message: 'Load session command handled by CLI' };
  }

  // Mode Control Commands
  async switchMode(mode) {
    if (!mode || (mode !== 'interactive' && mode !== 'automated')) {
      return { error: 'Invalid mode. Use \'interactive\' or \'automated\'' };
    }
    
    return { message: `Mode switched to ${mode}` };
  }

  // System Commands
  async showHelp() {
    // This will be handled by the CLI, not here
    return { message: 'Help command handled by CLI' };
  }

  async exit() {
    return { message: 'Exit command handled by CLI' };
  }

  // Utility Methods
  validateHexString(hexString) {
    // Remove spaces and convert to lowercase
    const cleanHex = hexString.replace(/\s+/g, '').toLowerCase();
    
    // Check if it's valid hex
    if (!/^[0-9a-f]+$/.test(cleanHex)) {
      throw new Error('Invalid hex string');
    }
    
    // Check if length is even
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex string length must be even');
    }
    
    return cleanHex;
  }

  formatHexOutput(buffer) {
    return HexUtils.bufferToHex(buffer).toUpperCase().replace(/(.{2})/g, '$1 ').trim();
  }

  parseCommandArgs(args) {
    // Parse command arguments
    const parsed = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        // Long option
        const key = arg.substring(2);
        const value = args[i + 1];
        parsed[key] = value;
        i++; // Skip next argument
      } else if (arg.startsWith('-')) {
        // Short option
        const key = arg.substring(1);
        const value = args[i + 1];
        parsed[key] = value;
        i++; // Skip next argument
      } else {
        // Positional argument
        if (!parsed._) {
          parsed._ = [];
        }
        parsed._.push(arg);
      }
    }
    
    return parsed;
  }
}

module.exports = CommandHandler;
