const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const chalk = require('chalk');
const PacketParser = require('../protocol/parser');
const RollingCodeImplementation = require('../crypto/rolling-code-implementation');
const HexUtils = require('../utils/hex-utils');

class DeviceCommunicator extends EventEmitter {
  constructor(port) {
    super();
    this.portPath = port;
    this.port = null;
    this.parser = new PacketParser();
    this.rollingCode = null;
    this.pendingCommands = new Map();
    this.isConnected = false;
    this.authenticated = false;
    this.deviceInfo = null;
    this.commandTimeout = 5000; // 5 seconds
  }

  async connect() {
    try {
      console.log(chalk.yellow(`🔌 Connecting to ${this.portPath}...`));
      
      // Initialize serial port
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      });

      // Setup event handlers
      this.port.on('open', () => {
        this.isConnected = true;
        console.log(chalk.green('✅ Serial port opened'));
        this.emit('connected');
      });

      this.port.on('error', (error) => {
        console.error(chalk.red('❌ Serial port error:'), error.message);
        this.emit('error', error);
      });

      this.port.on('close', () => {
        this.isConnected = false;
        console.log(chalk.yellow('⚠️ Serial port closed'));
        this.emit('disconnected');
      });

      this.port.on('data', (data) => {
        this.handleIncomingData(data);
      });

      // Open the port
      await new Promise((resolve, reject) => {
        this.port.open((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Initialize rolling code algorithm
      await this.initializeRollingCode();

    } catch (error) {
      console.error(chalk.red('❌ Failed to connect:'), error.message);
      throw error;
    }
  }

  async initializeRollingCode() {
    try {
      // Try to get device info first
      const deviceInfo = await this.getDeviceInfo();
      this.deviceInfo = deviceInfo;
      
      // Initialize rolling code with device info
      this.rollingCode = new RollingCodeImplementation(deviceInfo);
      console.log(chalk.green('🔐 Rolling code algorithm initialized'));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️ Could not initialize rolling code algorithm'));
      console.log(chalk.gray('   Authentication will be manual'));
    }
  }

  async getDeviceInfo() {
    // Try to extract device info from captured data
    // This is a simplified version - in practice, you'd query the device
    return {
      imei: '8628170683673949',
      serial: 'U-WMT',
      model: 'Haier Washing Machine',
      firmware: '2.17'
    };
  }

  handleIncomingData(data) {
    try {
      // Parse incoming data into packets
      const packets = this.parser.parseData(data);
      
      for (const packet of packets) {
        this.handleIncomingPacket(packet);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error parsing incoming data:'), error.message);
    }
  }

  handleIncomingPacket(packet) {
    console.log(chalk.blue('📥 Received:'), HexUtils.bufferToHex(packet.raw));
    
    // Check if this is a response to a pending command
    const pendingCommand = this.findPendingCommand(packet);
    if (pendingCommand) {
      pendingCommand.resolve(packet);
      this.pendingCommands.delete(pendingCommand.id);
      return;
    }
    
    // Handle authentication challenges
    if (packet.command === 0x12 && packet.payload) {
      console.log(chalk.yellow('🔐 Authentication challenge received'));
      this.handleAuthenticationChallenge(packet);
    }
    
    // Emit packet event
    this.emit('packet', packet);
  }

  findPendingCommand(packet) {
    for (const [id, pending] of this.pendingCommands) {
      if (pending.sequence === packet.sequence) {
        return pending;
      }
    }
    return null;
  }

  async handleAuthenticationChallenge(packet) {
    if (!this.rollingCode) {
      console.log(chalk.yellow('⚠️ No rolling code algorithm available'));
      return;
    }

    try {
      console.log(chalk.yellow('🔐 Generating authentication response...'));
      
      // Extract challenge from packet payload
      const challenge = packet.payload.slice(0, 8); // First 8 bytes
      
      // Generate response using rolling code algorithm
      const response = await this.rollingCode.generateResponse(challenge);
      
      // Send authentication response
      await this.sendAuthenticationResponse(response);
      
      this.authenticated = true;
      console.log(chalk.green('✅ Authentication successful'));
      
    } catch (error) {
      console.error(chalk.red('❌ Authentication failed:'), error.message);
    }
  }

  async sendAuthenticationResponse(response) {
    // Create authentication response packet
    const packet = this.createAuthenticationResponsePacket(response);
    await this.sendRawPacket(packet);
  }

  createAuthenticationResponsePacket(response) {
    // Create packet with correct frame structure
    const frameFlags = 0x40; // Has CRC
    const reserved = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const frameType = 0x11; // Authentication response
    const frameData = Buffer.concat([
      Buffer.from([0x10, 0x02, 0x00, 0x01]), // Authentication header
      response // 8-byte response
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

  async sendCommand(command, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to device');
    }

    const commandId = this.generateCommandId();
    const timeout = options.timeout || this.commandTimeout;
    
    // Create promise for response
    const responsePromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error('Command timeout'));
      }, timeout);
      
      this.pendingCommands.set(commandId, {
        id: commandId,
        command,
        resolve: (packet) => {
          clearTimeout(timeoutId);
          resolve(packet);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        sequence: command.sequence
      });
    });

    // Send command
    await this.sendRawPacket(command);
    
    // Wait for response
    return responsePromise;
  }

  async sendRawPacket(packet) {
    if (!this.isConnected) {
      throw new Error('Not connected to device');
    }

    console.log(chalk.blue('📤 Sending:'), HexUtils.bufferToHex(packet));
    
    return new Promise((resolve, reject) => {
      this.port.write(packet, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async sendRawHex(hexString) {
    try {
      const buffer = HexUtils.hexToBuffer(hexString);
      await this.sendRawPacket(buffer);
      return { success: true, message: 'Hex packet sent' };
    } catch (error) {
      return { error: error.message };
    }
  }

  generateCommandId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async authenticate(challenge) {
    if (!this.rollingCode) {
      throw new Error('Rolling code algorithm not initialized');
    }

    try {
      const response = await this.rollingCode.generateResponse(challenge);
      await this.sendAuthenticationResponse(response);
      this.authenticated = true;
      return { success: true, message: 'Authentication successful' };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getStatus() {
    // Create status query command
    const command = this.createStatusQueryCommand();
    const response = await this.sendCommand(command);
    return this.parseStatusResponse(response);
  }

  createStatusQueryCommand() {
    // Create status query packet with correct frame structure
    const frameFlags = 0x40; // Has CRC
    const reserved = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const frameType = 0x01; // Status query
    const frameData = Buffer.from([0x4d, 0x01]);
    
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

  parseStatusResponse(packet) {
    // Parse status response packet
    if (packet.command === 0x6d && packet.payload) {
      const status = packet.payload[0];
      const program = packet.payload[1];
      
      return {
        state: this.getStateName(status),
        program: program,
        raw: HexUtils.bufferToHex(packet.raw)
      };
    }
    
    return { error: 'Invalid status response' };
  }

  getStateName(status) {
    const states = {
      0x01: 'Standby',
      0x02: 'Running',
      0x03: 'Paused',
      0x04: 'Error'
    };
    
    return states[status] || 'Unknown';
  }

  async startProgram(programNumber) {
    if (programNumber < 1 || programNumber > 4) {
      throw new Error('Program number must be 1-4');
    }

    const command = this.createProgramStartCommand(programNumber);
    const response = await this.sendCommand(command);
    return this.parseProgramStartResponse(response);
  }

  createProgramStartCommand(programNumber) {
    // Create program start packet with correct frame structure
    const frameFlags = 0x40; // Has CRC
    const reserved = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const frameType = 0x60; // Program start
    const frameData = Buffer.from([0x00, 0x01, programNumber, 0x00, 0x00, 0x00]);
    
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

  parseProgramStartResponse(packet) {
    if (packet.command === 0x4d) {
      return { success: true, message: 'Program started successfully' };
    }
    
    return { error: 'Failed to start program' };
  }

  async reset() {
    const command = this.createResetCommand();
    const response = await this.sendCommand(command);
    return this.parseResetResponse(response);
  }

  createResetCommand() {
    // Create reset packet with correct frame structure
    const frameFlags = 0x40; // Has CRC
    const reserved = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const frameType = 0x01; // Reset command
    const frameData = Buffer.from([0x5d, 0x1f, 0x00, 0x01]);
    
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

  parseResetResponse(packet) {
    if (packet.command === 0x0f) {
      return { success: true, message: 'Device reset successfully' };
    }
    
    return { error: 'Failed to reset device' };
  }

  async disconnect() {
    if (this.port && this.isConnected) {
      return new Promise((resolve) => {
        this.port.close(() => {
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
}

module.exports = DeviceCommunicator;
