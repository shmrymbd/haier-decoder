/**
 * AI Integration Layer for Haier Protocol Decoder CLI
 * 
 * This module provides the integration between the AI agent and the existing CLI,
 * handling AI-specific commands and responses while maintaining backward compatibility.
 */

const { EventEmitter } = require('events');
const chalk = require('chalk');

class AIIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enabled: options.enabled || false,
      mode: options.mode || 'interactive',
      verbose: options.verbose || false,
      ...options
    };
    this.isInitialized = false;
  }

  /**
   * Initialize the AI integration
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load AI modules dynamically to avoid errors if not available
      const AIAgent = require('../ai/agent');
      const ConversationManager = require('../ai/conversation-manager');
      const ProtocolKnowledge = require('../ai/protocol-knowledge');

      this.agent = new AIAgent({
        model: this.options.model,
        temperature: this.options.temperature,
        systemPrompt: this.options.systemPrompt,
        systemPromptFile: this.options.systemPromptFile
      });
      this.conversationManager = new ConversationManager();
      this.protocolKnowledge = new ProtocolKnowledge();

      await this.agent.initialize();
      await this.protocolKnowledge.load();

      this.isInitialized = true;
      this.emit('initialized');
      
      if (this.options.verbose) {
        console.log(chalk.green('✓ AI integration initialized successfully'));
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize AI integration: ${error.message}`));
      throw error;
    }
  }

  /**
   * Check if AI integration is available and enabled
   */
  isAvailable() {
    return this.options.enabled && this.isInitialized;
  }

  /**
   * Process a user query through the AI agent
   */
  async processQuery(query, context = {}) {
    if (!this.isAvailable()) {
      throw new Error('AI integration is not available or not enabled');
    }

    try {
      // Use the session from context if available, otherwise create a basic session
      const session = context.session || { sessionId: 'unknown', sessionStart: new Date().toISOString(), deviceInfo: null };
      const result = await this.agent.processQuery(query, {
        session,
        context,
        protocolKnowledge: this.protocolKnowledge
      });

      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get AI-powered command suggestions
   */
  async getCommandSuggestions(context = {}) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const { CommandSuggester } = await import('../ai/command-suggester.js');
      const suggester = new CommandSuggester(this.protocolKnowledge);
      
      return await suggester.getSuggestions(context);
    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Analyze protocol data using AI
   */
  async analyzeProtocolData(data, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('AI integration is not available or not enabled');
    }

    try {
      const { AnalysisEngine } = await import('../ai/analysis-engine.js');
      const engine = new AnalysisEngine(this.protocolKnowledge);
      
      return await engine.analyze(data, options);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Display AI response with proper formatting
   */
  displayResponse(response) {
    if (!response) {
      return;
    }

    const { responseText, responseType, confidence, suggestions } = response;

    // Display main response
    console.log(chalk.blue('\n🤖 AI Response:'));
    console.log(chalk.white(responseText));

    // Display confidence if available
    if (confidence !== undefined) {
      const confidenceColor = confidence > 0.8 ? chalk.green : confidence > 0.6 ? chalk.yellow : chalk.red;
      console.log(chalk.gray(`\nConfidence: ${confidenceColor(confidence.toFixed(2))}`));
    }

    // Display suggestions if available
    if (suggestions && suggestions.length > 0) {
      console.log(chalk.cyan('\n💡 Suggestions:'));
      suggestions.forEach((suggestion, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${suggestion.command}`));
        console.log(chalk.gray(`     ${suggestion.description}`));
      });
    }

    console.log(''); // Add spacing
  }

  /**
   * Handle AI errors gracefully
   */
  handleError(error) {
    const errorMessage = `AI Error: ${error.message}`;
    console.error(chalk.red(errorMessage));
    
    if (this.options.verbose) {
      console.error(chalk.gray(error.stack));
    }

    this.emit('error', error);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.conversationManager) {
      await this.conversationManager.cleanup();
    }
    
    this.isInitialized = false;
    this.emit('cleanup');
  }
}

module.exports = AIIntegration;