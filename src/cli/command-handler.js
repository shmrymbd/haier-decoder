const chalk = require('chalk');
const HexUtils = require('../utils/hex-utils');

class CommandHandler {
  constructor(communicator) {
    this.communicator = communicator;
    this.commands = {
      // Authentication
      'auth': this.authenticate.bind(this),
      'challenge': this.sendChallenge.bind(this),
      
      // Status & Info
      'status': this.getStatus.bind(this),
      'info': this.getDeviceInfo.bind(this),
      'model': this.getModel.bind(this),
      'serial': this.getSerial.bind(this),
      
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
    // Create authentication challenge packet (command 0x12)
    const header = Buffer.from([0xff, 0xff]);
    const length = Buffer.from([0x25]); // 37 bytes total
    const frameType = Buffer.from([0x40]);
    const sequence = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const command = Buffer.from([0x12]);
    const payload = Buffer.from([0x10, 0x02, 0x00, 0x01]); // Challenge header
    const challenge = Buffer.from([0x78, 0x8c, 0x6f, 0xf2, 0xd9, 0x2d, 0xc8, 0x55]); // Example challenge
    const crc = Buffer.from([0x00, 0x00, 0x00]); // Placeholder CRC
    
    return Buffer.concat([header, length, frameType, sequence, command, payload, challenge, crc]);
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
