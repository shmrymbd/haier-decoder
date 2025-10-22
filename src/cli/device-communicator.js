const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const chalk = require('chalk');
const PacketParser = require('../protocol/parser');
const RollingCodeImplementation = require('../crypto/rolling-code-implementation');
const HexUtils = require('../utils/hex-utils');

class DeviceCommunicator extends EventEmitter {
  constructor(port, options = {}) {
    super();
    this.portPath = port;
    this.port = null;
    this.parser = new PacketParser();
    this.rollingCode = null;
    this.pendingCommands = new Map();
    this.isConnected = false;
    this.authenticated = false;
    this.deviceInfo = null;
    this.ready = false;
    this.autoInitialize = options.autoInitialize !== false; // Default to true for backward compatibility
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
      
      // Initialize complete protocol session (only if auto-initialization is enabled)
      if (this.autoInitialize) {
        await this.initializeSession();
      } else {
        console.log(chalk.yellow('⚠️ Auto-initialization disabled. Use \'init\' command to initialize manually.'));
        this.ready = false;
      }

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
      
      // Generate initial session key
      this.sessionTimestamp = Date.now().toString();
      this.sessionSequence = 0;
      
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
      const challengeHex = HexUtils.bufferToHex(challenge);
      
      // Generate response using rolling code algorithm with session data
      const response = await this.rollingCode.generateResponse(
        challengeHex, 
        this.sessionTimestamp, 
        this.sessionSequence.toString()
      );
      
      // Send authentication response
      await this.sendAuthenticationResponse(response);
      
      this.authenticated = true;
      this.sessionSequence++;
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
      // Generate unique challenge if none provided
      if (!challenge) {
        challenge = this.generateRollingChallenge();
      }
      
      const response = await this.rollingCode.generateResponse(
        challenge, 
        this.sessionTimestamp, 
        this.sessionSequence.toString()
      );
      
      await this.sendAuthenticationResponse(response);
      this.authenticated = true;
      this.sessionSequence++;
      
      return { success: true, message: 'Authentication successful' };
    } catch (error) {
      return { error: error.message };
    }
  }

  generateRollingChallenge() {
    // Generate 8-byte rolling challenge
    const challenge = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      challenge[i] = Math.floor(Math.random() * 256);
    }
    return HexUtils.bufferToHex(challenge);
  }

  async initializeSession() {
    try {
      console.log(chalk.yellow('🔄 Initializing complete protocol session...'));
      
      // 1. Session start
      await this.sendSessionStart();
      await this.delay(100);
      
      // 2. Controller ready
      await this.sendControllerReady();
      await this.delay(100);
      
      // 3. Handshake
      await this.sendHandshake();
      await this.delay(100);
      
      // 4. Wait for handshake ACK (handled by packet parser)
      console.log(chalk.gray('   Waiting for handshake ACK...'));
      await this.delay(200);
      
      // 5. Device ID exchange
      await this.exchangeDeviceId();
      await this.delay(100);
      
      // 6. Status query
      await this.queryStatus();
      await this.delay(100);
      
      // 7. Machine info dump (handled by packet parser)
      console.log(chalk.gray('   Waiting for machine info...'));
      await this.delay(200);
      
      // 8. Authentication
      await this.authenticate();
      await this.delay(100);
      
      // 9. Timestamp sync
      await this.syncTimestamp();
      await this.delay(100);
      
      // 10. Ready for commands
      this.ready = true;
      console.log(chalk.green('✅ Complete protocol session initialized'));
      
    } catch (error) {
      console.error(chalk.red('❌ Session initialization failed:'), error.message);
      throw error;
    }
  }

  async manualInitialize() {
    if (!this.isConnected) {
      throw new Error('Device not connected. Connect first before initializing.');
    }
    
    if (this.ready) {
      console.log(chalk.yellow('⚠️ Device already initialized.'));
      return;
    }
    
    try {
      await this.initializeSession();
    } catch (error) {
      console.error(chalk.red('❌ Manual initialization failed:'), error.message);
      throw error;
    }
  }

  isReady() {
    return this.ready;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      ready: this.ready,
      authenticated: this.authenticated,
      autoInitialize: this.autoInitialize
    };
  }

  async sendSessionStart() {
    const sessionStartHex = 'ff ff 0a 00 00 00 00 00 00 61 00 07 72';
    await this.sendRawHex(sessionStartHex);
  }

  async sendControllerReady() {
    const controllerReadyHex = 'ff ff 08 40 00 00 00 00 00 70 b8 86 41';
    await this.sendRawHex(controllerReadyHex);
  }

  async sendHandshake() {
    const handshakeHex = 'ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4';
    await this.sendRawHex(handshakeHex);
  }

  async exchangeDeviceId() {
    const deviceIdHex = 'ff ff 19 40 00 00 00 00 00 11 00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39 7e cc 81';
    await this.sendRawHex(deviceIdHex);
  }

  async queryStatus() {
    const statusQueryHex = 'ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1';
    await this.sendRawHex(statusQueryHex);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async syncTimestamp() {
    // Send timestamp synchronization packet
    const timestampHex = 'ff ff 0a 40 00 00 00 00 00 f4 00 00 3e d0 e2';
    await this.sendRawHex(timestampHex);
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
    // Updated status mapping based on latest protocol analysis
    const states = {
      // Basic status codes
      0x01: 'Standby',
      0x02: 'Running', 
      0x03: 'Paused',
      0x04: 'Error',
      
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
      return states[status] || 'Unknown';
    } else {
      return states[status] || states[status.toString(16).padStart(2, '0')] || 'Unknown';
    }
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
