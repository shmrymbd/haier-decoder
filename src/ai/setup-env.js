/**
 * Environment Setup for AI Agent CLI Integration
 * 
 * Sets up environment variables and configuration for AI features.
 */

const AIConfig = require('./config');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AISetup {
  constructor() {
    this.config = new AIConfig();
  }

  /**
   * Setup AI environment
   */
  async setup() {
    try {
      console.log('Setting up AI Agent environment...');

      // Validate configuration
      const validation = this.config.validate();
      if (!validation.valid) {
        console.error('Configuration validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        return false;
      }

      // Create necessary directories
      await this.createDirectories();

      // Create default config file if it doesn't exist
      await this.createDefaultConfig();

      // Setup environment variables
      this.setupEnvironmentVariables();

      console.log('✓ AI Agent environment setup complete');
      return true;
    } catch (error) {
      console.error(`Environment setup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      this.config.getStorage().sessionPath,
      path.dirname(this.config.getStorage().sessionPath),
      path.join(process.cwd(), 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.promises.mkdir(dir, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Create default config file
   */
  async createDefaultConfig() {
    const configPath = path.join(os.homedir(), '.haier-ai', 'config.json');
    
    if (!fs.existsSync(configPath)) {
      try {
        const createdPath = this.config.createDefaultConfigFile();
        console.log(`✓ Created default config file: ${createdPath}`);
      } catch (error) {
        console.warn(`Could not create config file: ${error.message}`);
      }
    }
  }

  /**
   * Setup environment variables
   */
  setupEnvironmentVariables() {
    const requiredVars = [
      'OPENAI_API_KEY'
    ];

    const optionalVars = [
      'HAIER_AI_MODE',
      'HAIER_AI_MODEL',
      'HAIER_AI_MAX_TOKENS',
      'HAIER_AI_TEMPERATURE',
      'HAIER_AI_TIMEOUT',
      'HAIER_AI_SANITIZE',
      'HAIER_AI_LOG_LEVEL'
    ];

    console.log('\nEnvironment Variables:');
    
    // Check required variables
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        console.log(`✓ ${varName}: [SET]`);
      } else {
        console.log(`✗ ${varName}: [NOT SET] - Required for AI functionality`);
      }
    }

    // Check optional variables
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        console.log(`✓ ${varName}: ${process.env[varName]}`);
      } else {
        console.log(`- ${varName}: [NOT SET] - Using default`);
      }
    }
  }

  /**
   * Check if AI is properly configured
   */
  checkConfiguration() {
    const config = this.config.getAI();
    const security = this.config.getSecurity();
    const storage = this.config.getStorage();

    console.log('\nConfiguration Status:');
    console.log(`  AI Enabled: ${config.enabled ? '✓' : '✗'}`);
    console.log(`  Model: ${config.model}`);
    console.log(`  Max Tokens: ${config.maxTokens}`);
    console.log(`  Temperature: ${config.temperature}`);
    console.log(`  Data Sanitization: ${security.sanitizeData ? '✓' : '✗'}`);
    console.log(`  Session Path: ${storage.sessionPath}`);
    console.log(`  Knowledge Path: ${storage.knowledgePath}`);

    return {
      aiEnabled: config.enabled,
      hasApiKey: !!this.config.getOpenAIKey(),
      configValid: this.config.validate().valid
    };
  }

  /**
   * Generate setup instructions
   */
  generateSetupInstructions() {
    const instructions = `
# AI Agent CLI Integration Setup

## Required Environment Variables

1. Set your OpenAI API key:
   \`\`\`bash
   export OPENAI_API_KEY="your-api-key-here"
   \`\`\`

2. Enable AI mode:
   \`\`\`bash
   export HAIER_AI_MODE="enabled"
   \`\`\`

## Optional Environment Variables

- \`HAIER_AI_MODEL\`: AI model to use (default: gpt-3.5-turbo)
- \`HAIER_AI_MAX_TOKENS\`: Maximum tokens per request (default: 1000)
- \`HAIER_AI_TEMPERATURE\`: Response creativity (default: 0.7)
- \`HAIER_AI_TIMEOUT\`: Request timeout in ms (default: 30000)
- \`HAIER_AI_SANITIZE\`: Enable data sanitization (default: true)
- \`HAIER_AI_LOG_LEVEL\`: Log level (default: info)

## Configuration File

A configuration file will be created at \`~/.haier-ai/config.json\` with default settings.

## Usage

Once configured, you can use AI features with:
\`\`\`bash
node src/index.js chat --ai
\`\`\`
`;

    return instructions;
  }
}

module.exports = AISetup;