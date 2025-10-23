/**
 * Configuration management for AI Agent CLI Integration
 * 
 * Handles environment variables, configuration files, and default settings
 * for the AI agent functionality.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class AIConfig {
  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from environment variables and config files
   */
  loadConfiguration() {
    const defaultConfig = {
      ai: {
        enabled: false,
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        timeout: 30000,
        maxHistory: 1000
      },
      security: {
        sanitizeData: true,
        logLevel: 'info',
        encryptHistory: false
      },
      storage: {
        sessionPath: path.join(os.homedir(), '.haier-ai', 'sessions'),
        knowledgePath: path.join(__dirname, 'protocol-knowledge.json'),
        testVectorsPath: path.join(__dirname, '..', '..', 'tests', 'ai', 'protocol-test-vectors.json')
      }
    };

    // Load from environment variables
    const envConfig = this.loadFromEnvironment();
    
    // Load from config file if it exists
    const fileConfig = this.loadFromFile();
    
    // Merge configurations (file > env > default)
    return this.mergeConfigs(defaultConfig, envConfig, fileConfig);
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment() {
    return {
      ai: {
        enabled: process.env.HAIER_AI_MODE === 'enabled',
        model: process.env.HAIER_AI_MODEL || undefined,
        maxTokens: process.env.HAIER_AI_MAX_TOKENS ? parseInt(process.env.HAIER_AI_MAX_TOKENS) : undefined,
        temperature: process.env.HAIER_AI_TEMPERATURE ? parseFloat(process.env.HAIER_AI_TEMPERATURE) : undefined,
        timeout: process.env.HAIER_AI_TIMEOUT ? parseInt(process.env.HAIER_AI_TIMEOUT) : undefined
      },
      security: {
        sanitizeData: process.env.HAIER_AI_SANITIZE !== 'false',
        logLevel: process.env.HAIER_AI_LOG_LEVEL || undefined
      }
    };
  }

  /**
   * Load configuration from file
   */
  loadFromFile() {
    const configPath = path.join(os.homedir(), '.haier-ai', 'config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file at ${configPath}: ${error.message}`);
    }
    
    return {};
  }

  /**
   * Merge configuration objects
   */
  mergeConfigs(defaultConfig, envConfig, fileConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    // Merge env config
    this.deepMerge(merged, envConfig);
    
    // Merge file config
    this.deepMerge(merged, fileConfig);
    
    return merged;
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  }

  /**
   * Get AI configuration
   */
  getAI() {
    return this.config.ai;
  }

  /**
   * Get security configuration
   */
  getSecurity() {
    return this.config.security;
  }

  /**
   * Get storage configuration
   */
  getStorage() {
    return this.config.storage;
  }

  /**
   * Check if AI is enabled
   */
  isEnabled() {
    return this.config.ai.enabled;
  }

  /**
   * Get OpenAI API key
   */
  getOpenAIKey() {
    return process.env.OPENAI_API_KEY;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (this.config.ai.enabled) {
      if (!this.getOpenAIKey()) {
        errors.push('OPENAI_API_KEY environment variable is required when AI is enabled');
      }

      if (this.config.ai.maxTokens < 1 || this.config.ai.maxTokens > 4000) {
        errors.push('maxTokens must be between 1 and 4000');
      }

      if (this.config.ai.temperature < 0 || this.config.ai.temperature > 2) {
        errors.push('temperature must be between 0 and 2');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create default config file
   */
  createDefaultConfigFile() {
    const configDir = path.dirname(this.config.storage.sessionPath);
    
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configPath = path.join(configDir, 'config.json');
      const defaultConfig = {
        ai: {
          enabled: false,
          model: 'gpt-3.5-turbo',
          maxTokens: 1000,
          temperature: 0.7,
          timeout: 30000
        },
        security: {
          sanitizeData: true,
          logLevel: 'info'
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return configPath;
    } catch (error) {
      throw new Error(`Failed to create config file: ${error.message}`);
    }
  }
}

module.exports = AIConfig;