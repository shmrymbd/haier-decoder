/**
 * OpenAI API Client for Haier Protocol Decoder AI Agent
 * 
 * Handles OpenAI API configuration, authentication, and request management
 * with proper error handling and rate limiting.
 */

const OpenAI = require('openai');

class OpenAIClient {
  constructor(options = {}) {
    this.options = {
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      model: options.model || 'gpt-3.5-turbo',
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      timeout: options.timeout || 30000,
      ...options
    };

    if (!this.options.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      timeout: this.options.timeout
    });

    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Send a chat completion request to OpenAI
   */
  async chatCompletion(messages, options = {}) {
    try {
      // Rate limiting
      await this.enforceRateLimit();

      const requestOptions = {
        model: options.model || this.options.model,
        messages: this.prepareMessages(messages),
        max_tokens: options.maxTokens || this.options.maxTokens,
        temperature: options.temperature || this.options.temperature
      };

      const response = await this.client.chat.completions.create(requestOptions);
      
      this.requestCount++;
      this.lastRequestTime = Date.now();

      return this.processResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Prepare messages for OpenAI API
   */
  prepareMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    return messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content || msg
    }));
  }

  /**
   * Process OpenAI API response
   */
  processResponse(response) {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response choices received from OpenAI');
    }

    const choice = response.choices[0];
    
    return {
      content: choice.message.content,
      role: choice.message.role,
      finishReason: choice.finish_reason,
      usage: response.usage,
      model: response.model
    };
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Handle OpenAI API errors
   */
  handleError(error) {
    if (error.code === 'insufficient_quota') {
      return new Error('OpenAI API quota exceeded. Please check your billing.');
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return new Error('OpenAI API rate limit exceeded. Please try again later.');
    }
    
    if (error.code === 'invalid_api_key') {
      return new Error('Invalid OpenAI API key. Please check your configuration.');
    }
    
    if (error.code === 'context_length_exceeded') {
      return new Error('Request too long for OpenAI model. Please shorten your input.');
    }

    return new Error(`OpenAI API error: ${error.message}`);
  }

  /**
   * Test the API connection
   */
  async testConnection() {
    try {
      // Test connection debug removed
      const response = await this.chatCompletion([
        { role: 'user', content: 'Hello, this is a test.' }
      ], { 
        model: this.options.model || 'gpt-3.5-turbo',
        maxTokens: 10 
      });

      return {
        success: true,
        response: response.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      model: this.options.model,
      maxTokens: this.options.maxTokens,
      temperature: this.options.temperature,
      requestCount: this.requestCount
    };
  }
}

module.exports = OpenAIClient;