const { EventEmitter } = require('events');
const SerialPort = require('serialport');
const chalk = require('chalk');
const PacketParser = require('../protocol/parser');
const HexUtils = require('../utils/hex-utils');

class DualSerialMonitor extends EventEmitter {
  constructor(txPort, rxPort, options = {}) {
    super();
    this.txPort = txPort;  // Modem → Machine
    this.rxPort = rxPort;  // Machine → Modem
    this.options = {
      baudRate: options.baud || 9600,
      verbose: options.verbose || false,
      logFile: options.output || 'logs/dual-monitor.log',
      enablePairing: options.pair || false,
      enableFlow: options.flow || false,
      ...options
    };
    
    this.txSerialPort = null;
    this.rxSerialPort = null;
    this.txParser = new PacketParser();
    this.rxParser = new PacketParser();
    this.timestampSync = null;
    this.unifiedLogger = null;
    this.packetPairer = null;
    this.conversationFlow = null;
    
    this.isRunning = false;
    this.sessionStart = null;
    this.stats = {
      txPackets: 0,
      rxPackets: 0,
      pairedPackets: 0,
      unpairedTx: 0,
      unpairedRx: 0,
      totalDuration: 0
    };
  }

  async start() {
    try {
      console.log(chalk.blue.bold('🔍 Starting Dual-Dongle Monitor...'));
      console.log(chalk.gray(`   TX Port: ${this.txPort} (Modem → Machine)`));
      console.log(chalk.gray(`   RX Port: ${this.rxPort} (Machine → Modem)`));
      console.log(chalk.gray(`   Pairing: ${this.options.enablePairing ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.gray(`   Flow Analysis: ${this.options.enableFlow ? 'Enabled' : 'Disabled'}`));
      
      // Initialize components
      await this.initializeComponents();
      
      // Connect to both serial ports
      await this.connectToPorts();
      
      // Start monitoring
      this.isRunning = true;
      this.sessionStart = Date.now();
      
      console.log(chalk.green('✅ Connected to both ports'));
      console.log(chalk.blue('\n━━━━ Session Start:', new Date().toLocaleString(), '━━━━\n'));
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start dual monitor:'), error.message);
      throw error;
    }
  }

  async initializeComponents() {
    // Initialize timestamp synchronization
    const TimestampSync = require('./timestamp-sync');
    this.timestampSync = new TimestampSync();
    
    // Initialize unified logger
    const UnifiedLogger = require('./unified-logger');
    this.unifiedLogger = new UnifiedLogger(this.options.logFile);
    
    // Initialize packet pairer if enabled
    if (this.options.enablePairing) {
      const PacketPairer = require('./packet-pairer');
      this.packetPairer = new PacketPairer();
    }
    
    // Initialize conversation flow if enabled
    if (this.options.enableFlow) {
      const ConversationFlow = require('./conversation-flow');
      this.conversationFlow = new ConversationFlow();
    }
  }

  async connectToPorts() {
    // Connect to TX port (Modem → Machine)
    await this.connectToPort('TX', this.txPort, this.txParser);
    
    // Connect to RX port (Machine → Modem)
    await this.connectToPort('RX', this.rxPort, this.rxParser);
  }

  async connectToPort(direction, portPath, parser) {
    return new Promise((resolve, reject) => {
      const serialPort = new SerialPort(portPath, {
        baudRate: this.options.baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      });

      serialPort.on('open', () => {
        console.log(chalk.green(`✅ ${direction} port opened: ${portPath}`));
        resolve(serialPort);
      });

      serialPort.on('error', (error) => {
        console.error(chalk.red(`❌ ${direction} port error: ${portPath}`), error.message);
        reject(error);
      });

      serialPort.on('close', () => {
        console.log(chalk.yellow(`⚠️ ${direction} port closed: ${portPath}`));
      });

      serialPort.on('data', (data) => {
        this.handleIncomingData(data, direction, parser);
      });

      // Store reference
      if (direction === 'TX') {
        this.txSerialPort = serialPort;
      } else {
        this.rxSerialPort = serialPort;
      }

      // Open the port
      serialPort.open((error) => {
        if (error) {
          reject(error);
        }
      });
    });
  }

  handleIncomingData(data, direction, parser) {
    try {
      // Parse incoming data into packets
      const packets = parser.parseData(data);
      
      for (const packet of packets) {
        this.handlePacket(packet, direction);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error parsing ${direction} data:`), error.message);
    }
  }

  handlePacket(packet, direction) {
    const timestamp = Date.now();
    
    // Synchronize timestamp
    const syncTimestamp = this.timestampSync.syncTimestamp(timestamp, direction);
    packet.timestamp = syncTimestamp;
    packet.direction = direction;
    
    // Update statistics
    if (direction === 'TX') {
      this.stats.txPackets++;
    } else {
      this.stats.rxPackets++;
    }
    
    // Log packet to unified logger
    this.unifiedLogger.logPacket(packet, direction, syncTimestamp);
    
    // Display packet in real-time
    this.displayPacket(packet, direction);
    
    // Attempt packet pairing if enabled
    let pair = null;
    if (this.options.enablePairing && this.packetPairer) {
      pair = this.packetPairer.addPacket(packet, direction, syncTimestamp);
      if (pair) {
        this.stats.pairedPackets++;
        this.displayPair(pair);
      } else {
        if (direction === 'TX') {
          this.stats.unpairedTx++;
        } else {
          this.stats.unpairedRx++;
        }
      }
    }
    
    // Update conversation flow if enabled
    if (this.options.enableFlow && this.conversationFlow) {
      this.conversationFlow.processPacket(packet, direction, syncTimestamp);
    }
    
    // Emit packet event
    this.emit('packet', packet, direction, pair);
  }

  displayPacket(packet, direction) {
    const arrow = direction === 'TX' ? chalk.blue('→') : chalk.green('←');
    const time = new Date(packet.timestamp).toLocaleTimeString();
    const cmd = packet.commandInfo?.name || 'Unknown';
    const hex = HexUtils.bufferToHex(packet.raw);
    
    console.log(`${time} ${arrow} ${chalk.yellow(cmd)}`);
    console.log(`   ${hex}`);
    
    // Show additional info for specific commands
    if (packet.command === 0x12 && packet.payload) {
      const challenge = HexUtils.bufferToHex(packet.payload.slice(0, 8));
      console.log(chalk.gray(`   Challenge: ${challenge}`));
    } else if (packet.command === 0x11 && packet.payload) {
      const response = HexUtils.bufferToHex(packet.payload.slice(0, 8));
      console.log(chalk.gray(`   Response: ${response}`));
    } else if (packet.command === 0x6d && packet.payload) {
      const status = packet.payload[0];
      const program = packet.payload[1];
      console.log(chalk.gray(`   Status: ${this.getStatusName(status)}, Program: ${program}`));
    }
  }

  displayPair(pair) {
    const responseTime = pair.responseTime;
    const state = this.conversationFlow ? this.conversationFlow.getCurrentState() : 'Unknown';
    
    console.log(chalk.gray(`   ↔ Paired (${responseTime}ms) | State: ${state}`));
  }

  getStatusName(status) {
    const statusMap = {
      0x01: 'Standby',
      0x02: 'Running',
      0x03: 'Paused',
      0x04: 'Error'
    };
    return statusMap[status] || 'Unknown';
  }

  setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Shutting down dual monitor...'));
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    this.isRunning = false;
    this.stats.totalDuration = Date.now() - this.sessionStart;
    
    // Display final statistics
    this.displayStatistics();
    
    // Close serial ports
    if (this.txSerialPort) {
      await this.closePort(this.txSerialPort, 'TX');
    }
    
    if (this.rxSerialPort) {
      await this.closePort(this.rxSerialPort, 'RX');
    }
    
    // Save final logs
    if (this.unifiedLogger) {
      await this.unifiedLogger.finalize();
    }
    
    console.log(chalk.green('✅ Dual monitor stopped'));
  }

  async closePort(serialPort, direction) {
    return new Promise((resolve) => {
      serialPort.close(() => {
        console.log(chalk.gray(`   ${direction} port closed`));
        resolve();
      });
    });
  }

  displayStatistics() {
    const duration = Math.round(this.stats.totalDuration / 1000);
    const pairingRate = this.stats.txPackets > 0 ? 
      (this.stats.pairedPackets / this.stats.txPackets * 100).toFixed(1) : 0;
    
    console.log(chalk.blue.bold('\n📊 Session Statistics:'));
    console.log(chalk.gray('==================='));
    console.log(chalk.cyan(`Duration: ${duration}s`));
    console.log(chalk.cyan(`TX Packets: ${this.stats.txPackets}`));
    console.log(chalk.cyan(`RX Packets: ${this.stats.rxPackets}`));
    console.log(chalk.green(`Paired: ${this.stats.pairedPackets} (${pairingRate}%)`));
    console.log(chalk.red(`Unpaired TX: ${this.stats.unpairedTx}`));
    console.log(chalk.red(`Unpaired RX: ${this.stats.unpairedRx}`));
    
    if (this.conversationFlow) {
      const flowSummary = this.conversationFlow.getConversationSummary();
      console.log(chalk.yellow(`Authentication Attempts: ${flowSummary.authAttempts} (${flowSummary.authSuccessRate}% success)`));
    }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      sessionStart: this.sessionStart,
      totalDuration: this.stats.totalDuration
    };
  }

  // Method to get paired sequences for analysis
  getPairedSequences() {
    if (this.packetPairer) {
      return this.packetPairer.getPairedSequences();
    }
    return [];
  }

  // Method to get conversation flow summary
  getConversationSummary() {
    if (this.conversationFlow) {
      return this.conversationFlow.getConversationSummary();
    }
    return null;
  }
}

module.exports = DualSerialMonitor;
