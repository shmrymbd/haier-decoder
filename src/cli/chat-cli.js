const readline = require('readline');
const chalk = require('chalk');
const { EventEmitter } = require('events');

class ChatCLI extends EventEmitter {
  constructor(port, options = {}) {
    super();
    this.port = port;
    this.options = options;
    this.mode = options.auto ? 'automated' : 'interactive';
    this.aiMode = options.ai || false;
    this.isConnected = false;
    this.rl = null;
    this.communicator = null;
    this.commandHandler = null;
    this.sessionManager = null;
    this.aiIntegration = null;
    this.commandHistory = [];
    this.historyIndex = -1;
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
    
    this.communicator = new DeviceCommunicator(this.port);
    this.commandHandler = new CommandHandler(this.communicator);
    this.sessionManager = new SessionManager();
    
    // Initialize AI integration if enabled
    if (this.aiMode) {
      const AIIntegration = require('./ai-integration');
      this.aiIntegration = new AIIntegration({
        enabled: true,
        mode: this.mode,
        verbose: this.options.verbose
      });
      
      try {
        await this.aiIntegration.initialize();
        console.log(chalk.green('✓ AI Agent initialized successfully'));
      } catch (error) {
        console.warn(chalk.yellow('⚠️ AI Agent initialization failed:'), error.message);
        console.log(chalk.gray('Continuing without AI features...'));
        this.aiMode = false;
        this.aiIntegration = null;
      }
    }
    
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
    if (this.aiMode && this.aiIntegration && this.aiIntegration.isAvailable()) {
      console.log(chalk.green(`AI Agent: Enabled`));
    } else if (this.aiMode) {
      console.log(chalk.red(`AI Agent: Failed to initialize`));
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
      
      // Handle AI commands
      if (this.aiMode && this.aiIntegration && this.aiIntegration.isAvailable()) {
        if (command === 'ai' || command === 'ask') {
          const question = args.join(' ');
          if (!question) {
            console.log(chalk.yellow('Please provide a question for the AI agent.'));
            this.rl.prompt();
            return;
          }
          
          try {
            const result = await this.aiIntegration.processQuery(question, {
              session: this.sessionManager.getCurrentSession(),
              protocolData: this.getCurrentProtocolContext()
            });
            
            this.aiIntegration.displayResponse(result);
            this.rl.prompt();
            return;
          } catch (error) {
            console.error(chalk.red('❌ AI query failed:'), error.message);
            this.rl.prompt();
            return;
          }
        }
        
        if (command === 'suggest') {
          try {
            const suggestions = await this.aiIntegration.getCommandSuggestions({
              session: this.sessionManager.getCurrentSession(),
              context: this.getCurrentProtocolContext()
            });
            
            if (suggestions.length > 0) {
              console.log(chalk.cyan('\n💡 AI Command Suggestions:'));
              suggestions.forEach((suggestion, index) => {
                console.log(chalk.cyan(`  ${index + 1}. ${suggestion.command}`));
                console.log(chalk.gray(`     ${suggestion.description}`));
              });
            } else {
              console.log(chalk.gray('No suggestions available at this time.'));
            }
            this.rl.prompt();
            return;
          } catch (error) {
            console.error(chalk.red('❌ Failed to get suggestions:'), error.message);
            this.rl.prompt();
            return;
          }
        }
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

  getCurrentProtocolContext() {
    return {
      isConnected: this.isConnected,
      mode: this.mode,
      recentCommands: this.commandHistory.slice(-5),
      sessionData: this.sessionManager ? this.sessionManager.getSessionData() : null
    };
  }

  showHelp() {
    console.log(chalk.blue.bold('\nHaier Device Chat Interface'));
    console.log(chalk.gray('============================\n'));
    
    if (this.aiMode && this.aiIntegration && this.aiIntegration.isAvailable()) {
      console.log(chalk.green.bold('AI Agent Commands:'));
      console.log('  ai <question>     - Ask AI agent a protocol question');
      console.log('  ask <question>    - Ask AI agent a protocol question');
      console.log('  suggest           - Get AI-powered command suggestions\n');
    }
    
    console.log(chalk.yellow.bold('Authentication Commands:'));
    console.log('  auth              - Authenticate with device (auto-response enabled)');
    console.log('  challenge         - Send authentication challenge\n');
    
    console.log(chalk.yellow.bold('Status & Info Commands:'));
    console.log('  status            - Get current device status');
    console.log('  info              - Get device information');
    console.log('  model             - Get device model');
    console.log('  serial            - Get device serial number\n');
    
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
    
    if (this.aiIntegration) {
      await this.aiIntegration.cleanup();
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    process.exit(0);
  }
}

module.exports = ChatCLI;
