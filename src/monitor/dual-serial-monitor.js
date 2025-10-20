const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');
const PacketParser = require('../protocol/parser');
const HexUtils = require('../utils/hex-utils');

const execAsync = promisify(exec);

class DualSerialMonitor extends EventEmitter {
  constructor(txPort, rxPort, options = {}) {
    super();
    this.txPort = txPort;  // Modem → Machine
    this.rxPort = rxPort;  // Machine → Modem
    this.options = {
      baudRate: parseInt(options.baud || 9600, 10),
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
      
      // Check and clean up any existing processes using the ports
      console.log(chalk.yellow('🔍 Checking for existing processes using monitored ports...'));
      await this.cleanupPortProcesses();
      
      // Verify ports are available
      await this.verifyPortsAvailable();
      
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
      const serialPort = new SerialPort({
        path: portPath,
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
    const cmd = packet.commandInfo?.name || this.getCommandName(packet.command);
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
    } else if (packet.command === 0xf7 && packet.payload) {
      console.log(chalk.gray(`   Complex Command: ${packet.payload.length} bytes`));
    } else if (packet.command === 0xf3 && packet.payload) {
      console.log(chalk.gray(`   Status Query F3`));
    } else if (packet.command === 0xf5 && packet.payload) {
      console.log(chalk.gray(`   Status Query F5`));
    } else if (packet.command === 0xec && packet.payload) {
      const model = packet.payload.slice(0, 10).toString('ascii').replace(/\0/g, '');
      console.log(chalk.gray(`   Model: ${model}`));
    } else if (packet.command === 0xea && packet.payload) {
      const serial = packet.payload.slice(0, 30).toString('ascii').replace(/\0/g, '');
      console.log(chalk.gray(`   Serial: ${serial}`));
    } else if (packet.command === 0x62 && packet.payload) {
      const firmware = packet.payload.slice(0, 20).toString('ascii').replace(/\0/g, '');
      console.log(chalk.gray(`   Firmware: ${firmware}`));
    } else if (packet.command === 0x61 && packet.payload) {
      console.log(chalk.gray(`   Session Start`));
    } else if (packet.command === 0x70 && packet.payload) {
      console.log(chalk.gray(`   Controller Ready`));
    } else if (packet.command === 0x4d && packet.payload) {
      const subCommand = packet.payload[0];
      console.log(chalk.gray(`   Handshake: 0x${subCommand.toString(16).padStart(2, '0')}`));
    }
  }

  displayPair(pair) {
    const responseTime = pair.responseTime;
    const state = this.conversationFlow ? this.conversationFlow.getCurrentState() : 'Unknown';
    
    console.log(chalk.gray(`   ↔ Paired (${responseTime}ms) | State: ${state}`));
  }

  getCommandName(command) {
    // Updated command mapping based on latest protocol analysis
    const commandMap = {
      // Basic commands
      0x01: 'Reset/Init',
      0x05: 'ACK',
      0x09: 'Control Signal',
      0x0f: 'Reset Confirm',
      
      // Authentication
      0x11: 'Auth Response/IMEI',
      0x12: 'Auth Challenge',
      
      // Program control
      0x60: 'Program Start',
      0x6d: 'Status Response',
      
      // Session management
      0x61: 'Session Start',
      0x70: 'Controller Ready',
      0x73: 'Handshake ACK',
      0x4d: 'Handshake Init/ACK',
      
      // New commands from latest protocol analysis
      0xf3: 'Status Query F3',
      0xf5: 'Status Query F5',
      0xf7: 'Complex Command',
      0xec: 'Device Info',
      0xea: 'Serial Info',
      0x62: 'Firmware Info'
    };
    
    return commandMap[command] || `Unknown(0x${command.toString(16).padStart(2, '0')})`;
  }

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

  setupGracefulShutdown() {
    // Call the comprehensive signal handler setup
    this.setupSignalHandlers();
  }

  /**
   * Find processes using the specified serial port
   * @param {string} portPath - Path to the serial port (e.g., /dev/ttyUSB0)
   * @returns {Promise<Array>} Array of process information
   */
  async findPortProcesses(portPath) {
    try {
      // Try multiple methods to find processes using the port
      const processes = [];
      
      // Method 1: Use lsof to find processes using the port
      try {
        const { stdout: lsofOutput } = await execAsync(`lsof ${portPath} 2>/dev/null || true`);
        
        if (lsofOutput.trim()) {
          const lines = lsofOutput.trim().split('\n');
          // Skip header line and parse process information
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length >= 2) {
              processes.push({
                command: parts[0],
                pid: parts[1],
                user: parts[2] || 'unknown',
                method: 'lsof'
              });
            }
          }
        }
      } catch (error) {
        // lsof failed, continue with other methods
      }
      
      // Method 2: Use fuser to find processes using the port
      try {
        const { stdout: fuserOutput } = await execAsync(`fuser ${portPath} 2>/dev/null || true`);
        
        if (fuserOutput.trim()) {
          const pids = fuserOutput.trim().split(/\s+/).filter(pid => pid && !isNaN(pid));
          for (const pid of pids) {
            try {
              // Get process name for this PID
              const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o comm= 2>/dev/null || true`);
              const command = psOutput.trim() || 'unknown';
              processes.push({
                command: command,
                pid: pid,
                user: 'unknown',
                method: 'fuser'
              });
            } catch (error) {
              // Process might have died between fuser and ps
              processes.push({
                command: 'unknown',
                pid: pid,
                user: 'unknown',
                method: 'fuser'
              });
            }
          }
        }
      } catch (error) {
        // fuser failed, continue
      }
      
      // Remove duplicates based on PID
      const uniqueProcesses = [];
      const seenPids = new Set();
      
      for (const proc of processes) {
        if (!seenPids.has(proc.pid)) {
          seenPids.add(proc.pid);
          uniqueProcesses.push(proc);
        }
      }
      
      return uniqueProcesses;
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not check processes for ${portPath}: ${error.message}`));
      return [];
    }
  }

  /**
   * Kill processes using the specified serial port
   * @param {string} portPath - Path to the serial port
   * @returns {Promise<boolean>} True if processes were killed, false otherwise
   */
  async killPortProcesses(portPath) {
    try {
      const processes = await this.findPortProcesses(portPath);
      
      if (processes.length === 0) {
        console.log(chalk.gray(`   No processes found using ${portPath}`));
        return false;
      }
      
      console.log(chalk.yellow(`   Found ${processes.length} process(es) using ${portPath}:`));
      
      for (const proc of processes) {
        console.log(chalk.gray(`     - ${proc.command} (PID: ${proc.pid}, User: ${proc.user})`));
        
        try {
          // Try graceful termination first (SIGTERM)
          await execAsync(`kill -TERM ${proc.pid}`);
          
          // Wait a moment for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if process still exists
          try {
            await execAsync(`kill -0 ${proc.pid} 2>/dev/null`);
            // Process still exists, force kill it
            console.log(chalk.yellow(`     Force killing PID ${proc.pid}...`));
            await execAsync(`kill -KILL ${proc.pid}`);
          } catch {
            // Process already terminated
            console.log(chalk.green(`     ✓ Process ${proc.pid} terminated gracefully`));
          }
        } catch (error) {
          console.log(chalk.red(`     ✗ Failed to kill PID ${proc.pid}: ${error.message}`));
        }
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red(`   Error killing processes for ${portPath}: ${error.message}`));
      return false;
    }
  }

  /**
   * Verify that both serial ports are available for use
   */
  async verifyPortsAvailable() {
    console.log(chalk.blue('🔍 Verifying serial ports are available...'));
    
    const ports = [
      { path: this.txPort, name: 'TX' },
      { path: this.rxPort, name: 'RX' }
    ];
    
    for (const port of ports) {
      try {
        // Check if port exists
        await execAsync(`test -e ${port.path} && echo "exists" || echo "missing"`);
        
        // Try to open and immediately close the port to check availability
        const testPort = new SerialPort({
          path: port.path,
          baudRate: this.options.baudRate,
          autoOpen: false
        });
        
        await new Promise((resolve, reject) => {
          testPort.open((error) => {
            if (error) {
              reject(new Error(`${port.name} port (${port.path}) is not available: ${error.message}`));
            } else {
              testPort.close(() => {
                console.log(chalk.green(`   ✓ ${port.name} port (${port.path}) is available`));
                resolve();
              });
            }
          });
        });
        
      } catch (error) {
        console.error(chalk.red(`   ✗ ${port.name} port verification failed: ${error.message}`));
        throw error;
      }
    }
    
    console.log(chalk.green('   ✓ All ports verified and available'));
  }

  /**
   * Try to force release port locks using fuser -k
   * @param {string} portPath - Path to the serial port
   * @returns {Promise<boolean>} True if force release was attempted
   */
  async forceReleasePortLock(portPath) {
    try {
      console.log(chalk.yellow(`   Attempting to force release lock on ${portPath}...`));
      
      // Try fuser -k to kill processes using the port
      try {
        await execAsync(`fuser -k ${portPath} 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Force release attempted for ${portPath}`));
        return true;
      } catch (error) {
        console.log(chalk.gray(`   No processes to force release on ${portPath}`));
        return false;
      }
    } catch (error) {
      console.log(chalk.yellow(`   ⚠️ Could not force release lock on ${portPath}: ${error.message}`));
      return false;
    }
  }

  /**
   * Clean up all processes using the monitored serial ports
   */
  async cleanupPortProcesses() {
    console.log(chalk.blue('🧹 Cleaning up processes using serial ports...'));
    
    let cleanupPerformed = false;
    
    // Clean up TX port processes
    if (await this.killPortProcesses(this.txPort)) {
      cleanupPerformed = true;
    }
    
    // Clean up RX port processes  
    if (await this.killPortProcesses(this.rxPort)) {
      cleanupPerformed = true;
    }
    
    // If no processes were found but we're still having port issues,
    // try force release
    if (!cleanupPerformed) {
      console.log(chalk.green('   ✓ No processes found using monitored ports'));
      
      // Try force release as a precaution
      await this.forceReleasePortLock(this.txPort);
      await this.forceReleasePortLock(this.rxPort);
    }
    
    // Wait a moment for processes to fully terminate
    if (cleanupPerformed) {
      console.log(chalk.gray('   Waiting for processes to terminate...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down gracefully...`));
      
      try {
        // Clean up processes first
        await this.cleanupPortProcesses();
        
        // Then stop the monitor
        await this.stop();
        
        console.log(chalk.green('✅ Graceful shutdown completed'));
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`❌ Error during shutdown: ${error.message}`));
        process.exit(1);
      }
    };
    
    // Handle various termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red(`❌ Uncaught exception: ${error.message}`));
      await this.cleanupPortProcesses();
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error(chalk.red(`❌ Unhandled rejection: ${reason}`));
      await this.cleanupPortProcesses();
      process.exit(1);
    });
  }

  async stop() {
    this.isRunning = false;
    this.stats.totalDuration = Date.now() - this.sessionStart;
    
    // Display final statistics
    this.displayStatistics();
    
    // Clean up processes using the ports
    await this.cleanupPortProcesses();
    
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
