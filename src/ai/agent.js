/**
 * AI Agent Interface for Haier Protocol Decoder CLI
 * 
 * Main AI agent that processes protocol queries and provides intelligent responses
 * using OpenAI API and protocol knowledge base.
 */

const OpenAIClient = require('./openai-client');
const DataSanitizer = require('./data-sanitizer');
const AILogger = require('./ai-logger');
const AIErrorHandler = require('./ai-error-handler');
const ResponseValidator = require('./response-validator');
const { ProtocolQuery, AnalysisResult, CommandSuggestion } = require('./models');

class AIAgent {
  constructor(options = {}) {
    this.options = {
      model: options.model || 'gpt-3.5-turbo',
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      enableSanitization: options.enableSanitization !== false,
      systemPrompt: options.systemPrompt || null,
      systemPromptFile: options.systemPromptFile || null,
      ...options
    };

    this.openaiClient = null;
    this.dataSanitizer = new DataSanitizer({ enabled: this.options.enableSanitization });
    this.logger = new AILogger();
    this.errorHandler = new AIErrorHandler();
    this.responseValidator = new ResponseValidator({
      maxResponseLength: this.options.maxResponseLength || 2000,
      minConfidence: this.options.minConfidence || 0.3,
      enableContentFilter: this.options.enableContentFilter !== false,
      enableProtocolValidation: this.options.enableProtocolValidation !== false
    });
    this.isInitialized = false;
    this.customSystemPrompt = null;
  }

  /**
   * Load system prompt from file or use provided prompt
   */
  async loadSystemPrompt() {
    try {
      if (this.options.systemPromptFile) {
        const fs = require('fs').promises;
        const path = require('path');
        
        // Resolve file path
        const promptPath = path.resolve(this.options.systemPromptFile);
        const promptContent = await fs.readFile(promptPath, 'utf8');
        this.customSystemPrompt = promptContent.trim();
        
        this.logger.logger.info('System prompt loaded', {
          file: promptPath,
          length: this.customSystemPrompt.length
        });
      } else if (this.options.systemPrompt) {
        this.customSystemPrompt = this.options.systemPrompt.trim();
        
        this.logger.logger.info('System prompt set', {
          length: this.customSystemPrompt.length
        });
      }
    } catch (error) {
      this.logger.logError('system_prompt_load', error);
      throw new Error(`Failed to load system prompt: ${error.message}`);
    }
  }

  /**
   * Set custom system prompt
   */
  setSystemPrompt(prompt) {
    this.customSystemPrompt = prompt ? prompt.trim() : null;
    this.logger.logger.info('System prompt updated', {
      length: this.customSystemPrompt ? this.customSystemPrompt.length : 0
    });
  }

  /**
   * Get current system prompt
   */
  getSystemPrompt() {
    return this.customSystemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * Save system prompt to file
   */
  async saveSystemPromptToFile(filePath) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write prompt to file
      await fs.writeFile(filePath, this.getSystemPrompt(), 'utf8');
      
      this.logger.logger.info('System prompt saved', {
        file: filePath,
        length: this.getSystemPrompt().length
      });
      
      return filePath;
    } catch (error) {
      this.logger.logError('system_prompt_save', error);
      throw new Error(`Failed to save system prompt: ${error.message}`);
    }
  }

  /**
   * Get default system prompt
   */
  getDefaultSystemPrompt() {
    return `You are an AI assistant specialized in Haier washing machine protocol analysis. 
You help users understand protocol commands, troubleshoot issues, and analyze communication patterns.

PROTOCOL KNOWLEDGE:
- Commands start with preamble "ff ff" followed by length byte
- Frame type "40" indicates command/control frames
- Commands have 4-byte sequence numbers and 3-byte CRC
- Common commands include wash programs (0x60), reset (0x01 0x5d), and status responses (0x6d)

RESPONSE GUIDELINES:
- Provide accurate, technical explanations
- Include relevant hex codes and packet structures
- Suggest troubleshooting steps when appropriate
- Be concise but comprehensive
- Use proper technical terminology`;
  }

  /**
   * Initialize the AI agent
   */
  async initialize() {
    try {
      // Load system prompt first
      await this.loadSystemPrompt();
      
      this.openaiClient = new OpenAIClient({
        apiKey: process.env.OPENAI_API_KEY,
        model: this.options.model,
        maxTokens: this.options.maxTokens,
        temperature: this.options.temperature
      });

      // Test connection
      const connectionTest = await this.openaiClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(`OpenAI connection failed: ${connectionTest.error}`);
      }

      this.isInitialized = true;
      this.logger.logInitialization(this.options);
      
      return true;
    } catch (error) {
      this.logger.logError('initialization', error);
      throw error;
    }
  }

  /**
   * Process a protocol query
   */
  async processQuery(queryText, context = {}) {
    if (!this.isInitialized) {
      throw new Error('AI agent not initialized');
    }

    const sessionId = context.session?.sessionId || 'unknown';
    
    try {
      this.logger.logQuery(sessionId, queryText, context);

      // Create protocol query
      const query = new ProtocolQuery({
        queryText,
        sessionId,
        queryType: this.determineQueryType(queryText),
        context: this.sanitizeContext(context)
      });

      // Validate query
      const validation = query.validate();
      if (!validation.valid) {
        throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
      }

      // Process with OpenAI
      const response = await this.generateResponse(query, context);
      
      // Create analysis result
      const result = new AnalysisResult({
        queryId: query.queryId,
        responseText: response.content,
        responseType: this.determineResponseType(response),
        confidence: this.calculateConfidence(response),
        metadata: {
          model: response.model,
          usage: response.usage,
          finishReason: response.finishReason
        }
      });

      // Validate response
      const validationResult = await this.responseValidator.validateResponse(result, {
        protocolKnowledge: context.protocolKnowledge,
        sessionContext: context.sessionContext,
        queryType: query.queryType
      });

      if (!validationResult.isValid) {
        this.logger.logger.warn('Response validation failed', {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      // Use sanitized response if validation modified it
      if (validationResult.sanitizedResponse !== result.responseText) {
        result.responseText = validationResult.sanitizedResponse;
      }

      // Generate command suggestions if appropriate
      if (this.shouldGenerateSuggestions(query, result)) {
        const suggestions = await this.generateCommandSuggestions(query, result, context);
        suggestions.forEach(suggestion => result.addSuggestion(suggestion));
      }

      this.logger.logResponse(sessionId, result);
      this.logger.logValidation(validationResult, { sessionId, queryId: query.queryId });

      return result;
    } catch (error) {
      this.logger.logError(sessionId, error, { queryText });
      
      // Handle error with fallback response
      const fallbackResult = await this.errorHandler.handleError('processQuery', error, { queryText });
      return fallbackResult;
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  async generateResponse(query, context) {
    const messages = this.buildPromptMessages(query, context);
    
    const response = await this.openaiClient.chatCompletion(messages, {
      model: this.options.model,
      maxTokens: this.options.maxTokens,
      temperature: this.options.temperature
    });

    return response;
  }

  /**
   * Build prompt messages for OpenAI
   */
  buildPromptMessages(query, context) {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(query, context);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }

  /**
   * Build system prompt with protocol knowledge
   */
  buildSystemPrompt(context) {
    const protocolKnowledge = context.protocolKnowledge;
    
    // Start with base system prompt (custom or default)
    let prompt = this.getSystemPrompt();

    // Add protocol knowledge if available
    if (protocolKnowledge && protocolKnowledge.commands) {
      prompt += `\n\nKNOWN COMMANDS:\n`;
      protocolKnowledge.commands.forEach(cmd => {
        prompt += `- ${cmd.commandName} (${cmd.commandHex}): ${cmd.description}\n`;
      });
    }

    return prompt;
  }

  /**
   * Build user prompt from query
   */
  buildUserPrompt(query, context) {
    let prompt = `Query: ${query.queryText}`;
    
    if (query.context && Object.keys(query.context).length > 0) {
      prompt += `\n\nContext: ${JSON.stringify(query.context, null, 2)}`;
    }

    if (context.protocolData) {
      prompt += `\n\nProtocol Data: ${JSON.stringify(context.protocolData, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Determine query type from text
   */
  determineQueryType(queryText) {
    const text = queryText.toLowerCase();
    
    if (text.includes('analyze') || text.includes('analysis')) {
      return 'analysis';
    } else if (text.includes('suggest') || text.includes('recommend')) {
      return 'suggestion';
    } else if (text.includes('error') || text.includes('problem') || text.includes('troubleshoot')) {
      return 'troubleshooting';
    } else {
      return 'question';
    }
  }

  /**
   * Determine response type from OpenAI response
   */
  determineResponseType(response) {
    const content = response.content.toLowerCase();
    
    if (content.includes('error') || content.includes('problem')) {
      return 'error';
    } else if (content.includes('suggest') || content.includes('recommend')) {
      return 'suggestion';
    } else if (content.includes('analyze') || content.includes('analysis')) {
      return 'analysis';
    } else {
      return 'explanation';
    }
  }

  /**
   * Calculate confidence based on response characteristics
   */
  calculateConfidence(response) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence for specific indicators
    if (response.finishReason === 'stop') {
      confidence += 0.1;
    }
    
    if (response.content.includes('0x') || response.content.includes('ff ff')) {
      confidence += 0.1; // Protocol-specific content
    }
    
    if (response.content.length > 100) {
      confidence += 0.1; // Detailed response
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Check if command suggestions should be generated
   */
  shouldGenerateSuggestions(query, result) {
    return result.responseType === 'suggestion' || 
           result.responseType === 'troubleshooting' ||
           query.queryType === 'suggestion';
  }

  /**
   * Generate command suggestions based on query and result
   */
  async generateCommandSuggestions(query, result, context) {
    const suggestions = [];
    
    // Basic command suggestions based on query content
    const queryText = query.queryText.toLowerCase();
    
    if (queryText.includes('monitor') || queryText.includes('watch')) {
      suggestions.push(new CommandSuggestion({
        resultId: result.resultId,
        command: 'monitor /dev/ttyUSB0',
        description: 'Start monitoring serial port for protocol data',
        confidence: 0.8,
        category: 'monitoring'
      }));
    }
    
    if (queryText.includes('analyze') || queryText.includes('analyze')) {
      suggestions.push(new CommandSuggestion({
        resultId: result.resultId,
        command: 'analyze data.txt',
        description: 'Analyze captured protocol data from file',
        confidence: 0.8,
        category: 'analysis'
      }));
    }
    
    if (queryText.includes('replay') || queryText.includes('test')) {
      suggestions.push(new CommandSuggestion({
        resultId: result.resultId,
        command: 'replay /dev/ttyUSB0 sequence.txt',
        description: 'Replay captured sequence to test device',
        confidence: 0.8,
        category: 'testing'
      }));
    }
    
    if (queryText.includes('crc') || queryText.includes('validation')) {
      suggestions.push(new CommandSuggestion({
        resultId: result.resultId,
        command: 'analyze --crc data.txt',
        description: 'Analyze CRC validation in protocol data',
        confidence: 0.9,
        category: 'validation'
      }));
    }

    return suggestions;
  }

  /**
   * Sanitize context data before processing
   */
  sanitizeContext(context) {
    if (!this.options.enableSanitization) {
      return context;
    }

    return this.dataSanitizer.sanitize(context);
  }

  /**
   * Check if agent is available
   */
  isAvailable() {
    return this.isInitialized && this.openaiClient !== null;
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      available: this.isAvailable(),
      model: this.options.model,
      sanitizationEnabled: this.options.enableSanitization
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isInitialized = false;
    this.openaiClient = null;
    this.logger.logCleanup('agent_cleanup', 1);
  }
}

module.exports = AIAgent;