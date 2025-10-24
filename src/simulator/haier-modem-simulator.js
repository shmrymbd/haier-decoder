#!/usr/bin/env node

/**
 * Haier Modem Simulator
 * Simulates the modem/controller side of Haier washing machine communication
 * Handles rolling code authentication challenges
 */

const { SerialPort } = require('serialport');
const chalk = require('chalk');

class HaierModemSimulator {
  constructor(options = {}) {
    this.port = options.port || '/dev/ttyUSB0';
    this.baudRate = options.baudRate || 9600;
    this.verbose = options.verbose || false;
    
    // Authentication lookup table from captured data
    this.authPairs = new Map();
    this.loadAuthenticationPairs();
    
    // Session state
    this.sessionActive = false;
    this.sequenceNumber = 0;
    this.lastHeartbeat = Date.now();
    
    // Data filtering
    this.lastDataTime = 0;
    this.dataCount = 0;
    this.dataRateLimit = 100; // ms between data displays
    
    // Serial connection
    this.serialPort = null;
    this.parser = null;
  }

  /**
   * Load known challenge-response pairs from captured data
   */
  loadAuthenticationPairs() {
    const pairs = [
      {
        challenge: "64 29 1b 0f 17 76 3c c6",
        response: "60 90 9c fd 8b 87 f0 41 14 7e dc 8b 70 cf cb 8f 2f 1d 88",
        direction: "machine_to_modem"
      },
      {
        challenge: "49 4c 4c 7a 77 53 6e 6a", 
        response: "08 2d 03 b4 eb f6 c5 55 6e f0 ca 18 74 66 db 1d 80 17 c4",
        direction: "modem_to_machine"
      },
      {
        challenge: "a7 b7 50 cd 2d 97 dd fa",
        response: "0d cb 41 e0 d2 ef 96 9a c7 cc 02 aa 47 e3 da 43 11 16 a2",
        direction: "machine_to_modem"
      },
      {
        challenge: "30 4f 6a 38 34 58 53 4b",
        response: "fb a6 62 9b 7b 9f 1b 7e 28 d4 ce c8 13 41 cf 4c 27 7d 5b",
        direction: "modem_to_machine"
      },
      {
        challenge: "e6 2e cd 0f 1a 7a 35 74",
        response: "38 93 79 42 3b 3a d2 d1 bc 44 41 11 59 ea 5a ab f0 28 00",
        direction: "machine_to_modem"
      },
      {
        challenge: "79 42 61 53 6f 53 56 39",
        response: "83 ca 66 a0 e7 9a 67 48 70 9f d2 f6 ec 4f ac 72 fd 3c e3",
        direction: "modem_to_machine"
      },
      {
        challenge: "af a5 09 96 54 74 68 0b",
        response: "86 89 93 b5 8c 2d 2f ad 07 5d e6 cf 04 41 51 f1 45 0c 7c",
        direction: "machine_to_modem"
      },
      {
        challenge: "4c 4a 79 34 58 69 68 79",
        response: "60 68 89 45 d5 38 12 b5 d8 11 8b 51 7e f3 4c 42 9d 22 1f",
        direction: "modem_to_machine"
      }
    ];

    pairs.forEach(pair => {
      this.authPairs.set(pair.challenge.toLowerCase(), pair);
    });

    if (this.verbose) {
      console.log(chalk.green(`✅ Loaded ${this.authPairs.size} authentication pairs`));
    }
  }

  /**
   * Start the modem simulator
   */
  async start() {
    try {
      console.log(chalk.blue('🚀 Starting Haier Modem Simulator...'));
      console.log(chalk.blue(`📡 Port: ${this.port}`));
      console.log(chalk.blue(`⚡ Baud Rate: ${this.baudRate}`));

      // Initialize serial connection
      this.serialPort = new SerialPort({
        path: this.port,
        baudRate: this.baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
      });

      // Use raw data parser instead of readline to handle binary data
      this.parser = this.serialPort;

      // Set up event handlers
      this.setupEventHandlers();

      // Start session initialization
      await this.initializeSession();

    } catch (error) {
      console.error(chalk.red('❌ Failed to start simulator:'), error.message);
      throw error;
    }
  }

  /**
   * Set up serial port event handlers
   */
  setupEventHandlers() {
    this.serialPort.on('open', () => {
      console.log(chalk.green('✅ Serial port opened'));
    });

    this.serialPort.on('error', (error) => {
      console.error(chalk.red('❌ Serial port error:'), error.message);
    });

    this.serialPort.on('data', (data) => {
      this.handleIncomingData(data);
    });
  }

  /**
   * Handle incoming data from the machine
   */
  handleIncomingData(data) {
    const now = Date.now();
    this.dataCount++;
    
    // Rate limiting to reduce spam
    if (now - this.lastDataTime < this.dataRateLimit) {
      return; // Skip this data to reduce noise
    }
    this.lastDataTime = now;
    
    // Convert to hex display for better readability
    const hexData = this.bufferToHex(data);
    
    if (this.verbose) {
      console.log(chalk.yellow(`📥 Received (${data.length} bytes): ${hexData}`));
    }

    // Filter out corrupted or incomplete data
    if (!this.isValidPacket(data)) {
      if (this.verbose && this.dataCount % 10 === 0) { // Only show every 10th invalid packet
        console.log(chalk.red(`❌ Invalid packet (${this.dataCount}): ${hexData}`));
      }
      return;
    }

    // Parse the data
    const packet = this.parsePacket(data);
    if (!packet) {
      if (this.verbose) {
        console.log(chalk.gray(`📦 Failed to parse: ${hexData}`));
      }
      return;
    }

    // Handle different packet types
    switch (packet.command) {
      case '10 02': // Authentication challenge
        this.handleAuthChallenge(packet);
        break;
      case '6d 01': // Status response
        this.handleStatusResponse(packet);
        break;
      case '4d 61': // ACK
        this.handleAck(packet);
        break;
      case '05 4d': // Heartbeat response
        this.handleHeartbeatResponse(packet);
        break;
      case '04 0F': // Reset confirmation
        this.handleResetConfirmation(packet);
        break;
      case '0F 5A': // Reset confirmation (alternative)
        this.handleResetConfirmation(packet);
        break;
      default:
        if (this.verbose) {
          console.log(chalk.gray(`📦 Unknown command: ${packet.command} (${hexData})`));
        }
    }
  }

  /**
   * Convert buffer to hex string
   */
  bufferToHex(buffer) {
    // Handle both string and buffer data
    if (Buffer.isBuffer(buffer)) {
      return buffer.toString('hex').toUpperCase().match(/.{2}/g).join(' ');
    } else if (typeof buffer === 'string') {
      // Convert string to buffer using binary encoding
      return Buffer.from(buffer, 'binary').toString('hex').toUpperCase().match(/.{2}/g).join(' ');
    } else {
      // Handle other data types
      return Buffer.from(buffer).toString('hex').toUpperCase().match(/.{2}/g).join(' ');
    }
  }

  /**
   * Check if packet is valid
   */
  isValidPacket(data) {
    if (!data || data.length < 3) return false;
    
    // Check for minimum packet structure
    const hex = this.bufferToHex(data);
    const parts = hex.split(' ');
    
    // Must have at least 3 bytes
    if (parts.length < 3) return false;
    
    // Filter out UTF-8 replacement characters (EF BF BD)
    if (hex.includes('EF BF BD')) {
      return false; // This is corrupted data
    }
    
    // Allow FF FF headers (standard protocol)
    const header = parts.slice(0, 2).join(' ');
    if (header === 'FF FF' || header === 'ff ff') {
      return parts.length >= 4;
    }
    
    // Allow 33 headers (device-specific protocol)
    if (header === '33' || parts[0] === '33') {
      return parts.length >= 6; // Minimum valid packet
    }
    
    // Filter out common garbage patterns
    const garbagePatterns = [
      '3@Z', '@Z', '@', '', '', '', ''
    ];
    
    const dataStr = data.toString();
    for (const pattern of garbagePatterns) {
      if (dataStr.includes(pattern)) {
        return false;
      }
    }
    
    // Allow other valid-looking packets
    return parts.length >= 3;
  }

  /**
   * Handle heartbeat response
   */
  handleHeartbeatResponse(packet) {
    if (this.verbose) {
      console.log(chalk.green('💓 Heartbeat response received'));
    }
    this.lastHeartbeat = Date.now();
  }

  /**
   * Handle reset confirmation
   */
  handleResetConfirmation(packet) {
    if (this.verbose) {
      console.log(chalk.blue('🔄 Reset confirmation received'));
    }
    // Update session state if needed
  }

  /**
   * Parse incoming packet data
   */
  parsePacket(data) {
    try {
      // Convert to hex if needed
      const hexData = this.bufferToHex(data);
      const parts = hexData.split(' ');
      
      if (parts.length < 4) return null;

      // Handle different packet formats
      let header, length, frameType, sequence, command, payload, crc;
      
      // Check for standard Haier protocol format (FF FF header)
      if (parts[0] === 'FF' && parts[1] === 'FF' && parts.length >= 8) {
        header = parts.slice(0, 2).join(' ');
        length = parseInt(parts[2], 16);
        frameType = parts[3];
        sequence = parts.slice(4, 10).join(' ');
        command = parts.slice(10, 12).join(' ');
        payload = parts.slice(12, -3);
        crc = parts.slice(-3);
      } else {
        // Handle shorter packets or different formats
        header = parts.slice(0, 2).join(' ');
        length = parts.length;
        frameType = parts[2] || '00';
        sequence = parts.slice(3, 6).join(' ') || '00 00 00';
        command = parts.slice(6, 8).join(' ') || '00 00';
        payload = parts.slice(8, -1);
        crc = parts.slice(-1);
      }

      return {
        header,
        length,
        frameType,
        sequence,
        command,
        payload,
        crc,
        raw: data,
        hex: hexData
      };
    } catch (error) {
      if (this.verbose) {
        console.error(chalk.red('❌ Failed to parse packet:'), error.message);
      }
      return null;
    }
  }

  /**
   * Handle authentication challenge from machine
   */
  handleAuthChallenge(packet) {
    console.log(chalk.blue('🔐 Authentication challenge received'));

    // Extract challenge bytes (8 bytes after command)
    const challengeBytes = packet.payload.slice(0, 8);
    const challenge = challengeBytes.join(' ').toLowerCase();

    if (this.verbose) {
      console.log(chalk.blue(`🎯 Challenge: ${challenge}`));
    }

    // Look up response
    const authPair = this.authPairs.get(challenge);
    if (authPair) {
      console.log(chalk.green('✅ Found matching authentication pair'));
      this.sendAuthResponse(authPair.response);
    } else {
      console.log(chalk.red('❌ Unknown challenge - generating generic response'));
      this.sendGenericAuthResponse(challengeBytes);
    }
  }

  /**
   * Send authentication response
   */
  sendAuthResponse(responseHex) {
    const responseBytes = responseHex.split(' ').map(hex => parseInt(hex, 16));
    const packet = this.buildAuthResponsePacket(responseBytes);
    this.sendPacket(packet);
  }

  /**
   * Send generic authentication response (experimental)
   */
  sendGenericAuthResponse(challengeBytes) {
    // Generate a generic response
    const responseBytes = new Array(20).fill(0).map(() => Math.floor(Math.random() * 256));
    const packet = this.buildAuthResponsePacket(responseBytes);
    this.sendPacket(packet);
  }

  /**
   * Build authentication response packet
   */
  buildAuthResponsePacket(responseBytes) {
    const header = 'ff ff';
    const length = 0x25; // 37 bytes total
    const frameType = '40';
    const sequence = this.getNextSequence();
    const command = '10 02 00 01';
    const separator = '01';
    
    // Combine all parts
    const packetParts = [
      header,
      length.toString(16).padStart(2, '0'),
      frameType,
      ...sequence.split(' '),
      ...command.split(' '),
      ...responseBytes.map(b => b.toString(16).padStart(2, '0')),
      separator
    ];

    // Add CRC (placeholder - you may need to calculate this)
    const crc = this.calculateCRC(packetParts);
    packetParts.push(...crc);

    return packetParts.join(' ');
  }

  /**
   * Handle status response from machine
   */
  handleStatusResponse(packet) {
    const statusBytes = packet.payload.slice(0, 3);
    const status = statusBytes.join(' ');

    console.log(chalk.blue(`📊 Status: ${status}`));

    switch (status) {
      case '01 30 30':
        console.log(chalk.green('✅ Machine ready (standby)'));
        break;
      case '01 30 10':
        console.log(chalk.green('✅ Machine ready (parameter mode)'));
        break;
      case '02 b0 31':
        console.log(chalk.yellow('⚠️ Machine busy/error'));
        break;
      default:
        console.log(chalk.gray(`📦 Status: ${status}`));
    }
  }

  /**
   * Handle ACK from machine
   */
  handleAck(packet) {
    console.log(chalk.green('✅ ACK received'));
    this.lastHeartbeat = Date.now();
  }

  /**
   * Initialize communication session
   */
  async initializeSession() {
    console.log(chalk.blue('🚀 Initializing session...'));

    // Wait a bit for connection to stabilize
    await this.sleep(100);

    // Send session start
    await this.sendSessionStart();
    await this.sleep(100);

    // Send controller ready
    await this.sendControllerReady();
    await this.sleep(100);

    // Send handshake
    await this.sendHandshake();
    await this.sleep(100);

    // Start heartbeat loop
    this.startHeartbeatLoop();
    
    // Mark session as active
    this.sessionActive = true;

    console.log(chalk.green('✅ Session initialized'));
  }

  /**
   * Send session start command
   */
  async sendSessionStart() {
    const packet = 'ff ff 0a 00 00 00 00 00 00 61 00 07 72';
    console.log(chalk.blue('📤 Sending session start'));
    this.sendPacket(packet);
  }

  /**
   * Send controller ready command
   */
  async sendControllerReady() {
    const packet = 'ff ff 08 40 00 00 00 00 00 70 b8 86 41';
    console.log(chalk.blue('📤 Sending controller ready'));
    this.sendPacket(packet);
  }

  /**
   * Send handshake command
   */
  async sendHandshake() {
    const packet = 'ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4';
    console.log(chalk.blue('📤 Sending handshake'));
    this.sendPacket(packet);
  }

  /**
   * Send device ID (IMEI)
   */
  async sendDeviceId() {
    const imei = '38 36 32 38 31 37 30 36 38 33 36 37 39 34 39';
    const packet = `ff ff 19 40 00 00 00 00 00 11 00 f0 ${imei} 7e cc 81`;
    console.log(chalk.blue('📤 Sending device ID'));
    this.sendPacket(packet);
  }

  /**
   * Send status query
   */
  async sendStatusQuery() {
    const packet = 'ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1';
    console.log(chalk.blue('📤 Sending status query'));
    this.sendPacket(packet);
  }

  /**
   * Send program command
   */
  async sendProgramCommand(programNumber) {
    const commands = {
      1: 'ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad',
      2: 'ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad',
      3: 'ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac',
      4: 'ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad'
    };

    const packet = commands[programNumber];
    if (packet) {
      console.log(chalk.blue(`📤 Sending program ${programNumber} command`));
      this.sendPacket(packet);
    } else {
      console.log(chalk.red(`❌ Invalid program number: ${programNumber}`));
    }
  }

  /**
   * Send reset command
   */
  async sendResetCommand() {
    const packet = 'ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b';
    console.log(chalk.blue('📤 Sending reset command'));
    this.sendPacket(packet);
  }

  /**
   * Start heartbeat loop
   */
  startHeartbeatLoop() {
    setInterval(() => {
      if (this.sessionActive) {
        this.sendHeartbeat();
      }
    }, 3000); // Every 3 seconds
  }

  /**
   * Send heartbeat ACK
   */
  async sendHeartbeat() {
    const packet = 'ff ff 08 40 00 00 00 00 00 05 4d 61 80';
    if (this.verbose) {
      console.log(chalk.blue('💓 Sending heartbeat...'));
    }
    this.sendPacket(packet);
  }

  /**
   * Send packet over serial
   */
  sendPacket(packet) {
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.write(packet + '\n');
      if (this.verbose) {
        console.log(chalk.green(`📤 Sent: ${packet}`));
      }
    } else {
      console.log(chalk.red('❌ Serial port not open'));
    }
  }

  /**
   * Get next sequence number
   */
  getNextSequence() {
    this.sequenceNumber++;
    return `00 00 00 00 00 ${this.sequenceNumber.toString(16).padStart(2, '0')}`;
  }

  /**
   * Calculate CRC (placeholder - implement actual algorithm)
   */
  calculateCRC(packetParts) {
    // This is a placeholder - you need to implement the actual CRC algorithm
    // For now, return a dummy CRC
    return ['80', '00', '00'];
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the simulator
   */
  async stop() {
    console.log(chalk.blue('🛑 Stopping simulator...'));
    this.sessionActive = false;
    
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    
    console.log(chalk.green('✅ Simulator stopped'));
  }
}

module.exports = HaierModemSimulator;
