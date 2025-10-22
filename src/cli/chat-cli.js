const readline = require('readline');
const chalk = require('chalk');
const { EventEmitter } = require('events');

class ChatCLI extends EventEmitter {
  constructor(port, options = {}) {
    super();
    this.port = port;
    this.options = options;
    this.mode = options.auto ? 'automated' : 'interactive';
    this.isConnected = false;
    this.rl = null;
    this.communicator = null;
    this.commandHandler = null;
    this.sessionManager = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.waitingForPowerOn = true;
    this.powerOnDetected = false;
  }

  async start() {
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Setup readline interface
      this.setupReadline();
      
      // Display welcome message
      this.displayWelcome();
      
      // Start prompt loop
      this.startPrompt();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start CLI:'), error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    // Import components dynamically to avoid circular dependencies
    const DeviceCommunicator = require('./device-communicator');
    const CommandHandler = require('./command-handler');
    const SessionManager = require('./session-manager');
    
    this.communicator = new DeviceCommunicator(this.port, { autoInitialize: !this.options.noInit });
    this.commandHandler = new CommandHandler(this.communicator);
    this.sessionManager = new SessionManager();
    
    // Setup event handlers
    this.communicator.on('connected', () => {
      this.isConnected = true;
      console.log(chalk.green('✅ Connected to device'));
    });
    
    this.communicator.on('disconnected', () => {
      this.isConnected = false;
      console.log(chalk.red('❌ Disconnected from device'));
    });
    
    this.communicator.on('packet', (packet) => {
      this.handleIncomingPacket(packet);
    });
    
    // Connect to device
    await this.communicator.connect();
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('haier> '),
      completer: this.getCompleter.bind(this)
    });

    // Handle user input
    this.rl.on('line', (input) => {
      this.processCommand(input.trim());
    });

    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      this.exit();
    });

    // Handle history navigation
    this.rl.on('SIGTSTP', () => {
      // Handle Ctrl+Z if needed
    });
  }

  getCompleter(line) {
    const commands = [
      'auth', 'challenge', 'status', 'info', 'model', 'serial',
      'reset', 'standby', 'start', 'stop', 'program1', 'program2', 'program3', 'program4',
      'send', 'hex', 'history', 'clear', 'save', 'load',
      'complex', 'query', 'firmware', 'sync',
      'mode', 'auto', 'manual', 'help', 'exit', 'quit'
    ];
    
    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits, line];
  }

  displayWelcome() {
    console.log(chalk.blue.bold('\n🔧 Haier Device Chat Interface'));
    console.log(chalk.gray('====================================='));
    console.log(chalk.yellow(`Mode: ${this.mode}`));
    console.log(chalk.yellow(`Port: ${this.port}`));
    if (this.waitingForPowerOn) {
      console.log(chalk.cyan('🔋 Waiting for machine power on request...'));
      console.log(chalk.gray('   The system will automatically respond when the machine powers on.'));
    }
    if (this.options.noInit) {
      console.log(chalk.yellow('⚠️ Auto-initialization disabled. Use \'init\' command when machine is ready.'));
    }
    console.log(chalk.gray('Type \'help\' for commands, \'exit\' to quit\n'));
  }

  startPrompt() {
    this.rl.prompt();
  }

  async processCommand(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }

    // Add to history
    this.addToHistory(input);
    
    // Parse command and arguments
    const [command, ...args] = input.split(' ');
    
    try {
      // Handle special commands
      if (command === 'exit' || command === 'quit') {
        this.exit();
        return;
      }
      
      // If waiting for power on, only allow certain commands
      if (this.waitingForPowerOn && !this.isAllowedDuringPowerOnWait(command)) {
        console.log(chalk.yellow('⚠️ Waiting for machine power on request. Only limited commands available.'));
        console.log(chalk.gray('   Available: help, status, conn, exit'));
        this.rl.prompt();
        return;
      }
      
      if (command === 'help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }
      
      if (command === 'history') {
        this.showHistory(args[0] ? parseInt(args[0]) : 10);
        this.rl.prompt();
        return;
      }
      
      if (command === 'mode') {
        this.switchMode(args[0]);
        this.rl.prompt();
        return;
      }
      
      if (command === 'auto') {
        this.switchMode('automated');
        this.rl.prompt();
        return;
      }
      
      if (command === 'manual') {
        this.switchMode('interactive');
        this.rl.prompt();
        return;
      }
      
      // Execute command through handler
      const result = await this.commandHandler.execute(command, args);
      
      // Log command and result
      this.sessionManager.logCommand(command, args, result);
      
      // Display result
      this.displayResult(result);
      
    } catch (error) {
      console.error(chalk.red('❌ Command failed:'), error.message);
      this.sessionManager.logCommand(command, args, { error: error.message });
    }
    
    this.rl.prompt();
  }

  addToHistory(input) {
    this.commandHistory.push(input);
    this.historyIndex = this.commandHistory.length;
    
    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
      this.historyIndex--;
    }
  }

  switchMode(mode) {
    if (mode === 'interactive' || mode === 'automated') {
      this.mode = mode;
      console.log(chalk.yellow(`🔄 Switched to ${mode} mode`));
    } else {
      console.log(chalk.red('❌ Invalid mode. Use \'interactive\' or \'automated\''));
    }
  }

  showHelp() {
    console.log(chalk.blue.bold('\nHaier Device Chat Interface'));
    console.log(chalk.gray('============================\n'));
    
    if (this.waitingForPowerOn) {
      console.log(chalk.cyan.bold('🔋 Power On Mode:'));
      console.log('  The system is waiting for machine power on request');
      console.log('  When the machine powers on, the system will automatically:');
      console.log('    • Detect the power on request');
      console.log('    • Send session initialization sequence');
      console.log('    • Establish communication protocol');
      console.log('    • Ready for command input\n');
    }
    
    console.log(chalk.yellow.bold('Authentication & Initialization Commands:'));
    console.log('  auth              - Authenticate with device (auto-response enabled)');
    console.log('  challenge         - Send authentication challenge');
    console.log('  init              - Initialize device protocol session (when machine is on)\n');
    
    console.log(chalk.yellow.bold('Status & Info Commands:'));
    console.log('  status            - Get current device status');
    console.log('  info              - Get device information');
    console.log('  model             - Get device model');
    console.log('  serial            - Get device serial number');
    console.log('  conn              - Get connection status\n');
    
    console.log(chalk.yellow.bold('Control Commands:'));
    console.log('  reset             - Reset device to standby');
    console.log('  standby           - Set device to standby mode');
    console.log('  start <program>   - Start wash program (1-4)');
    console.log('  stop              - Stop current program');
    console.log('  program1-4        - Quick start program 1-4\n');
    
    console.log(chalk.yellow.bold('Raw Commands:'));
    console.log('  send <hex>        - Send raw hex packet');
    console.log('  hex <hex>         - Send raw hex packet\n');
    
    console.log(chalk.yellow.bold('Advanced Commands:'));
    console.log('  complex           - Send complex command (F7)');
    console.log('  query             - Send status query (F3)');
    console.log('  firmware          - Get firmware information');
    console.log('  model             - Get model information');
    console.log('  serial            - Get serial information');
    console.log('  sync              - Synchronize timestamp\n');
    
    console.log(chalk.yellow.bold('Session Commands:'));
    console.log('  history [n]       - Show last n commands (default: 10)');
    console.log('  clear             - Clear command history');
    console.log('  save <file>       - Save session to file');
    console.log('  load <file>       - Load previous session\n');
    
    console.log(chalk.yellow.bold('Mode Commands:'));
    console.log('  mode <mode>       - Switch mode (interactive/automated)');
    console.log('  auto              - Switch to automated mode');
    console.log('  manual            - Switch to interactive mode\n');
    
    console.log(chalk.yellow.bold('System Commands:'));
    console.log('  help              - Show this help');
    console.log('  exit, quit        - Exit chat interface\n');
  }

  showHistory(count = 10) {
    const history = this.sessionManager.getHistory(count);
    if (history.length === 0) {
      console.log(chalk.yellow('No command history available'));
      return;
    }
    
    console.log(chalk.blue.bold(`\nLast ${history.length} commands:`));
    history.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      console.log(chalk.gray(`${index + 1}. [${timestamp}] ${entry.command} ${entry.args.join(' ')}`));
      if (entry.result && !entry.result.error) {
        console.log(chalk.green(`   → ${entry.result.message || 'Success'}`));
      } else if (entry.result && entry.result.error) {
        console.log(chalk.red(`   → Error: ${entry.result.error}`));
      }
    });
  }

  displayResult(result) {
    if (result.error) {
      console.log(chalk.red(`❌ ${result.error}`));
    } else if (result.message) {
      console.log(chalk.green(`✅ ${result.message}`));
    } else if (result.data) {
      console.log(chalk.cyan('📊 Response:'));
      console.log(result.data);
    }
  }

  handleIncomingPacket(packet) {
    // Handle incoming packets from device
    if (this.mode === 'automated') {
      // Auto-respond to authentication challenges
      if (packet.command === 0x12) {
        console.log(chalk.yellow('🔐 Auto-responding to authentication challenge...'));
        this.communicator.authenticate(packet.payload);
      }
    }
    
    // Check for machine power on request
    if (this.waitingForPowerOn && this.isPowerOnRequest(packet)) {
      this.handlePowerOnRequest();
    }
  }

  isPowerOnRequest(packet) {
    // Check if this is a machine power on request
    // Power on request is typically: ff ff 0a 00 00 00 00 00 00 61 00 07 72
    if (!packet.raw || packet.raw.length < 13) {
      return false;
    }
    
    // Check for session start command (0x61)
    const rawHex = packet.raw.toString('hex').toLowerCase();
    return rawHex.includes('ff ff 0a 00 00 00 00 00 00 61 00 07 72') ||
           (packet.command === 0x61 && packet.frameType === 0x00);
  }

  async handlePowerOnRequest() {
    if (this.powerOnDetected) {
      return; // Already handled
    }
    
    this.powerOnDetected = true;
    this.waitingForPowerOn = false;
    
    console.log(chalk.green('\n🔋 Machine power on request detected!'));
    console.log(chalk.yellow('📡 Responding with session initialization...'));
    
    try {
      // Send session start response
      await this.communicator.sendSessionStart();
      await this.delay(100);
      
      // Send controller ready
      await this.communicator.sendControllerReady();
      await this.delay(100);
      
      // Send handshake
      await this.communicator.sendHandshake();
      await this.delay(200);
      
      // Send device ID
      await this.communicator.exchangeDeviceId();
      await this.delay(100);
      
      // Send status query
      await this.communicator.queryStatus();
      await this.delay(100);
      
      // Send timestamp sync
      await this.communicator.syncTimestamp();
      await this.delay(100);
      
      console.log(chalk.green('✅ Session initialization complete!'));
      console.log(chalk.cyan('🎮 Ready for commands. Type \'help\' for available commands.'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to respond to power on request:'), error.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isAllowedDuringPowerOnWait(command) {
    const allowedCommands = ['help', 'status', 'conn', 'exit', 'quit'];
    return allowedCommands.includes(command.toLowerCase());
  }

  async exit() {
    console.log(chalk.yellow('\n👋 Goodbye!'));
    
    // Save session
    const logFile = this.sessionManager.saveSession();
    if (logFile) {
      console.log(chalk.gray(`Session saved to ${logFile}`));
    }
    
    // Close connections
    if (this.communicator) {
      await this.communicator.disconnect();
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    process.exit(0);
  }
}

module.exports = ChatCLI;
