#!/usr/bin/env node

/**
 * Haier Protocol Serial Monitor & Testing Tool
 * Main CLI entry point
 */

const { Command } = require('commander');
const SerialMonitor = require('./monitor/serial-monitor');
const SequenceReplayer = require('./replay/sequence-replayer');
const PacketParser = require('./protocol/parser');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('haier-monitor')
  .description('Haier Washing Machine Protocol Serial Monitor & Testing Tool')
  .version('1.0.0');

// Monitor command
program
  .command('monitor <port>')
  .description('Monitor serial port for Haier protocol communication')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .option('-o, --output <file>', 'Log file path', 'logs/haier-protocol.log')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-crc', 'Skip CRC validation')
  .action(async (port, options) => {
    try {
      console.log('🔍 Starting Haier Protocol Monitor...');
      
      const monitor = new SerialMonitor({
        port: port,
        baudRate: parseInt(options.baud),
        verbose: options.verbose,
        logFile: options.output
      });

      // Add packet handler for real-time analysis
      monitor.addPacketHandler((packet, direction) => {
        if (options.verbose) {
          console.log(`\n📊 Packet Analysis:`);
          console.log(`   Direction: ${direction}`);
          console.log(`   Type: ${packet.commandInfo?.type || 'Unknown'}`);
          console.log(`   Command: ${packet.commandInfo?.name || 'Unknown'}`);
          console.log(`   CRC Valid: ${packet.crcValid ? '✅' : '❌'}`);
        }
      });

      await monitor.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        await monitor.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error(`❌ Monitor failed: ${error.message}`);
      process.exit(1);
    }
  });

// Replay command
program
  .command('replay <port> <sequence-file>')
  .description('Replay captured sequence to serial port')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .option('-t, --timing <factor>', 'Timing factor', '1.0')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-validate', 'Skip response validation')
  .action(async (port, sequenceFile, options) => {
    try {
      console.log('🎬 Starting Sequence Replay...');
      
      const replayer = new SequenceReplayer({
        timingFactor: parseFloat(options.timing),
        verbose: options.verbose,
        validateResponses: options.validate !== false
      });

      const monitor = new SerialMonitor({
        port: port,
        baudRate: parseInt(options.baud)
      });

      // Load sequence
      await replayer.loadSequence(sequenceFile);
      
      // Start monitor
      await monitor.start();
      
      // Setup response handling
      const responseBuffer = [];
      monitor.addPacketHandler((packet, direction) => {
        if (direction === 'received') {
          responseBuffer.push(packet);
        }
      });

      // Replay sequence
      const results = await replayer.replaySequence(
        async (packet) => {
          await monitor.sendPacket(packet);
        },
        async () => {
          return responseBuffer.shift() || null;
        }
      );

      // Display results
      console.log('\n📊 Replay Results:');
      console.log(`   Success: ${results.success ? '✅' : '❌'}`);
      console.log(`   Duration: ${results.duration}ms`);
      console.log(`   Packets: ${results.packetsSent}`);
      
      if (results.error) {
        console.log(`   Error: ${results.error}`);
      }

      await monitor.stop();
      
    } catch (error) {
      console.error(`❌ Replay failed: ${error.message}`);
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive <port>')
  .description('Interactive mode with manual command sending')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .option('-v, --verbose', 'Verbose output')
  .action(async (port, options) => {
    try {
      console.log('🎮 Starting Interactive Mode...');
      
      const monitor = new SerialMonitor({
        port: port,
        baudRate: parseInt(options.baud),
        verbose: options.verbose
      });

      await monitor.start();
      
      console.log('\n📝 Available Commands:');
      console.log('   send <hex>     - Send hex packet');
      console.log('   programs       - Show program commands');
      console.log('   status         - Show connection status');
      console.log('   stats          - Show statistics');
      console.log('   clear          - Clear buffer');
      console.log('   quit           - Exit');
      
      // Setup readline for interactive input
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'haier> '
      });

      rl.prompt();

      rl.on('line', async (line) => {
        const [command, ...args] = line.trim().split(' ');
        
        switch (command.toLowerCase()) {
          case 'send':
            if (args.length === 0) {
              console.log('❌ Usage: send <hex_string>');
              break;
            }
            try {
              await monitor.sendHexPacket(args.join(' '));
              console.log('✅ Packet sent');
            } catch (error) {
              console.error(`❌ Send failed: ${error.message}`);
            }
            break;
            
          case 'programs':
            console.log('\n📋 Program Commands:');
            console.log('   Program 1: ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad');
            console.log('   Program 2: ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad');
            console.log('   Program 3: ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac');
            console.log('   Program 4: ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad');
            console.log('   Reset:     ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b');
            break;
            
          case 'status':
            const status = monitor.getStatus();
            console.log('\n📊 Connection Status:');
            console.log(`   Connected: ${status.connected ? '✅' : '❌'}`);
            console.log(`   Monitoring: ${status.monitoring ? '✅' : '❌'}`);
            console.log(`   Port: ${status.port}`);
            console.log(`   Baud Rate: ${status.baudRate}`);
            console.log(`   Packets: ${status.packetCount}`);
            break;
            
          case 'stats':
            const stats = monitor.getStats();
            console.log('\n📈 Statistics:');
            console.log(`   Packets Parsed: ${stats.packetsParsed}`);
            console.log(`   Buffer Size: ${stats.bufferSize} bytes`);
            console.log(`   CRC Algorithm: ${stats.crcStats.validatedAlgorithm}`);
            break;
            
          case 'clear':
            monitor.clearBuffer();
            console.log('✅ Buffer cleared');
            break;
            
          case 'quit':
          case 'exit':
            console.log('👋 Goodbye!');
            await monitor.stop();
            rl.close();
            process.exit(0);
            break;
            
          default:
            console.log('❌ Unknown command. Type "quit" to exit.');
        }
        
        rl.prompt();
      });

      rl.on('close', async () => {
        await monitor.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error(`❌ Interactive mode failed: ${error.message}`);
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze <log-file>')
  .description('Analyze captured log file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (logFile, options) => {
    try {
      console.log('📊 Analyzing log file...');
      
      if (!fs.existsSync(logFile)) {
        throw new Error(`Log file not found: ${logFile}`);
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const parser = new PacketParser();
      const packets = parser.parseCapturedFile(content);
      
      console.log(`📁 Loaded ${packets.length} packets from ${logFile}`);
      
      // Analyze packet types
      const packetTypes = {};
      const commandTypes = {};
      let validCRCs = 0;
      let totalCRCs = 0;
      
      for (const packet of packets) {
        // Count packet types
        const type = packet.commandInfo?.type || 'UNKNOWN';
        packetTypes[type] = (packetTypes[type] || 0) + 1;
        
        // Count command types
        const command = packet.commandInfo?.name || 'Unknown';
        commandTypes[command] = (commandTypes[command] || 0) + 1;
        
        // Count CRC validation
        if (packet.crcValid !== undefined) {
          totalCRCs++;
          if (packet.crcValid) {
            validCRCs++;
          }
        }
      }
      
      console.log('\n📈 Analysis Results:');
      console.log(`   Total Packets: ${packets.length}`);
      console.log(`   Valid CRCs: ${validCRCs}/${totalCRCs} (${totalCRCs > 0 ? (validCRCs/totalCRCs*100).toFixed(1) : 0}%)`);
      
      console.log('\n📋 Packet Types:');
      Object.entries(packetTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      
      console.log('\n🔧 Commands:');
      Object.entries(commandTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([command, count]) => {
          console.log(`   ${command}: ${count}`);
        });
      
      // Find ASCII strings
      const allStrings = [];
      for (const packet of packets) {
        if (packet.asciiStrings) {
          allStrings.push(...packet.asciiStrings);
        }
      }
      
      if (allStrings.length > 0) {
        console.log('\n📝 ASCII Strings Found:');
        const uniqueStrings = [...new Set(allStrings.map(s => s.value))];
        uniqueStrings.forEach(str => {
          console.log(`   "${str}"`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Analysis failed: ${error.message}`);
      process.exit(1);
    }
  });

// List ports command
program
  .command('ports')
  .description('List available serial ports')
  .action(async () => {
    try {
      console.log('🔍 Scanning for serial ports...');
      
      const ports = await SerialMonitor.listPorts();
      
      if (ports.length === 0) {
        console.log('❌ No serial ports found');
        return;
      }
      
      console.log(`\n📡 Found ${ports.length} serial port(s):`);
      ports.forEach((port, index) => {
        console.log(`\n${index + 1}. ${port.path}`);
        console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
        console.log(`   Serial Number: ${port.serialNumber || 'Unknown'}`);
        console.log(`   Product ID: ${port.productId || 'Unknown'}`);
        console.log(`   Vendor ID: ${port.vendorId || 'Unknown'}`);
      });
      
    } catch (error) {
      console.error(`❌ Failed to list ports: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`❌ Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ Unhandled Rejection: ${reason}`);
  process.exit(1);
});
