#!/usr/bin/env node

/**
 * Haier Modem Simulator CLI
 * Command-line interface for the Haier modem simulator
 */

const { Command } = require('commander');
const HaierModemSimulator = require('./haier-modem-simulator');
const chalk = require('chalk');

const program = new Command();

program
  .name('haier-modem-simulator')
  .description('Haier Washing Machine Modem Simulator with Authentication Bypass')
  .version('1.0.0');

// Main simulator command
program
  .command('start <port>')
  .description('Start the modem simulator')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .option('-v, --verbose', 'Verbose output')
  .action(async (port, options) => {
    try {
      console.log(chalk.blue('🚀 Haier Modem Simulator'));
      console.log(chalk.blue('🔐 Authentication bypass enabled'));
      
      const simulator = new HaierModemSimulator({
        port: port,
        baudRate: parseInt(options.baud),
        verbose: options.verbose
      });

      // Set up graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Shutting down simulator...'));
        await simulator.stop();
        process.exit(0);
      });

      await simulator.start();
      
      // Keep the process running
      console.log(chalk.green('✅ Simulator running. Press Ctrl+C to stop.'));
      
    } catch (error) {
      console.error(chalk.red('❌ Simulator failed:'), error.message);
      process.exit(1);
    }
  });

// Interactive command mode
program
  .command('interactive <port>')
  .description('Start simulator in interactive mode')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .option('-v, --verbose', 'Verbose output')
  .action(async (port, options) => {
    try {
      const simulator = new HaierModemSimulator({
        port: port,
        baudRate: parseInt(options.baud),
        verbose: options.verbose
      });

      await simulator.start();
      
      // Set up interactive commands
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.blue('modem> ')
      });

      rl.prompt();

      rl.on('line', async (line) => {
        const input = line.trim().toLowerCase();
        
        switch (input) {
          case 'help':
            console.log(chalk.blue('Available commands:'));
            console.log('  status     - Send status query');
            console.log('  program1   - Send program 1 command');
            console.log('  program2   - Send program 2 command');
            console.log('  program3   - Send program 3 command');
            console.log('  program4   - Send program 4 command');
            console.log('  reset      - Send reset command');
            console.log('  deviceid   - Send device ID');
            console.log('  heartbeat  - Send heartbeat');
            console.log('  quit       - Exit simulator');
            break;
            
          case 'status':
            await simulator.sendStatusQuery();
            break;
            
          case 'program1':
            await simulator.sendProgramCommand(1);
            break;
            
          case 'program2':
            await simulator.sendProgramCommand(2);
            break;
            
          case 'program3':
            await simulator.sendProgramCommand(3);
            break;
            
          case 'program4':
            await simulator.sendProgramCommand(4);
            break;
            
          case 'reset':
            await simulator.sendResetCommand();
            break;
            
          case 'deviceid':
            await simulator.sendDeviceId();
            break;
            
          case 'heartbeat':
            await simulator.sendHeartbeat();
            break;
            
          case 'quit':
          case 'exit':
            console.log(chalk.yellow('👋 Goodbye!'));
            await simulator.stop();
            rl.close();
            process.exit(0);
            break;
            
          default:
            console.log(chalk.red('❌ Unknown command. Type "help" for available commands.'));
        }
        
        rl.prompt();
      });

      rl.on('close', async () => {
        await simulator.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('❌ Interactive mode failed:'), error.message);
      process.exit(1);
    }
  });

// Test authentication pairs
program
  .command('test-auth')
  .description('Test authentication pairs')
  .action(() => {
    console.log(chalk.blue('🔐 Testing Authentication Pairs'));
    
    const simulator = new HaierModemSimulator({ verbose: true });
    
    console.log(chalk.green(`✅ Loaded ${simulator.authPairs.size} authentication pairs:`));
    
    simulator.authPairs.forEach((pair, challenge) => {
      console.log(chalk.blue(`  Challenge: ${challenge}`));
      console.log(chalk.gray(`  Response:  ${pair.response}`));
      console.log(chalk.gray(`  Direction: ${pair.direction}`));
      console.log('');
    });
  });

// Show available serial ports
program
  .command('ports')
  .description('List available serial ports')
  .action(async () => {
    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      
      console.log(chalk.blue('📡 Available Serial Ports:'));
      if (ports.length === 0) {
        console.log(chalk.yellow('  No serial ports found'));
      } else {
        ports.forEach(port => {
          console.log(chalk.green(`  ${port.path} - ${port.manufacturer || 'Unknown'}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to list ports:'), error.message);
    }
  });

program.parse();
