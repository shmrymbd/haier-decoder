/**
 * Data Models for AI Agent CLI Integration
 * 
 * Defines the core data models for AI agent sessions, queries, results, and suggestions.
 */

const crypto = require('crypto');

// Simple UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

/**
 * AI Agent Session Model
 */
class AIAgentSession {
  constructor(options = {}) {
    this.sessionId = options.sessionId || uuidv4();
    this.startTime = options.startTime || new Date();
    this.lastActivity = options.lastActivity || new Date();
    this.context = options.context || {};
    this.history = options.history || [];
    this.mode = options.mode || 'interactive';
    this.isActive = options.isActive !== false;
    this.endTime = options.endTime || null;
    this.metadata = options.metadata || {};
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = new Date();
  }

  /**
   * Add message to history
   */
  addMessage(message) {
    const messageEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      role: message.role || 'user',
      content: message.content,
      metadata: message.metadata || {}
    };

    this.history.push(messageEntry);
    this.updateActivity();
    return messageEntry;
  }

  /**
   * Update context
   */
  updateContext(newContext) {
    this.context = { ...this.context, ...newContext };
    this.updateActivity();
  }

  /**
   * Close session
   */
  close() {
    this.isActive = false;
    this.endTime = new Date();
  }

  /**
   * Get session duration
   */
  getDuration() {
    const endTime = this.endTime || new Date();
    return endTime - this.startTime;
  }

  /**
   * Serialize session for storage
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      lastActivity: this.lastActivity.toISOString(),
      context: this.context,
      history: this.history,
      mode: this.mode,
      isActive: this.isActive,
      endTime: this.endTime ? this.endTime.toISOString() : null,
      metadata: this.metadata
    };
  }

  /**
   * Create session from JSON
   */
  static fromJSON(data) {
    return new AIAgentSession({
      sessionId: data.sessionId,
      startTime: new Date(data.startTime),
      lastActivity: new Date(data.lastActivity),
      context: data.context,
      history: data.history,
      mode: data.mode,
      isActive: data.isActive,
      endTime: data.endTime ? new Date(data.endTime) : null,
      metadata: data.metadata
    });
  }
}

/**
 * Protocol Query Model
 */
class ProtocolQuery {
  constructor(options = {}) {
    this.queryId = options.queryId || uuidv4();
    this.sessionId = options.sessionId;
    this.queryText = options.queryText || '';
    this.queryType = options.queryType || 'question';
    this.context = options.context || {};
    this.timestamp = options.timestamp || new Date();
    this.status = options.status || 'pending';
    this.metadata = options.metadata || {};
  }

  /**
   * Update query status
   */
  updateStatus(status) {
    this.status = status;
  }

  /**
   * Add context data
   */
  addContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Validate query
   */
  validate() {
    const errors = [];

    if (!this.queryText || this.queryText.trim().length === 0) {
      errors.push('Query text is required');
    }

    if (this.queryText.length > 1000) {
      errors.push('Query text exceeds maximum length of 1000 characters');
    }

    if (!this.sessionId) {
      errors.push('Session ID is required');
    }

    const validTypes = ['question', 'analysis', 'suggestion', 'troubleshooting'];
    if (!validTypes.includes(this.queryType)) {
      errors.push(`Invalid query type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serialize query for storage
   */
  toJSON() {
    return {
      queryId: this.queryId,
      sessionId: this.sessionId,
      queryText: this.queryText,
      queryType: this.queryType,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      status: this.status,
      metadata: this.metadata
    };
  }

  /**
   * Create query from JSON
   */
  static fromJSON(data) {
    return new ProtocolQuery({
      queryId: data.queryId,
      sessionId: data.sessionId,
      queryText: data.queryText,
      queryType: data.queryType,
      context: data.context,
      timestamp: new Date(data.timestamp),
      status: data.status,
      metadata: data.metadata
    });
  }
}

/**
 * Analysis Result Model
 */
class AnalysisResult {
  constructor(options = {}) {
    this.resultId = options.resultId || uuidv4();
    this.queryId = options.queryId;
    this.responseText = options.responseText || '';
    this.responseType = options.responseType || 'explanation';
    this.confidence = options.confidence || 0.5;
    this.metadata = options.metadata || {};
    this.timestamp = options.timestamp || new Date();
    this.suggestions = options.suggestions || [];
    this.isFallback = options.isFallback || false;
  }

  /**
   * Add command suggestion
   */
  addSuggestion(suggestion) {
    this.suggestions.push(suggestion);
  }

  /**
   * Set confidence level
   */
  setConfidence(confidence) {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    this.confidence = confidence;
  }

  /**
   * Validate result
   */
  validate() {
    const errors = [];

    if (!this.responseText || this.responseText.trim().length === 0) {
      errors.push('Response text is required');
    }

    if (this.confidence < 0 || this.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    if (!this.queryId) {
      errors.push('Query ID is required');
    }

    const validTypes = ['explanation', 'suggestion', 'analysis', 'error'];
    if (!validTypes.includes(this.responseType)) {
      errors.push(`Invalid response type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serialize result for storage
   */
  toJSON() {
    return {
      resultId: this.resultId,
      queryId: this.queryId,
      responseText: this.responseText,
      responseType: this.responseType,
      confidence: this.confidence,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      suggestions: this.suggestions,
      isFallback: this.isFallback
    };
  }

  /**
   * Create result from JSON
   */
  static fromJSON(data) {
    return new AnalysisResult({
      resultId: data.resultId,
      queryId: data.queryId,
      responseText: data.responseText,
      responseType: data.responseType,
      confidence: data.confidence,
      metadata: data.metadata,
      timestamp: new Date(data.timestamp),
      suggestions: data.suggestions || [],
      isFallback: data.isFallback || false
    });
  }
}

/**
 * Command Suggestion Model
 */
class CommandSuggestion {
  constructor(options = {}) {
    this.suggestionId = options.suggestionId || uuidv4();
    this.resultId = options.resultId;
    this.command = options.command || '';
    this.description = options.description || '';
    this.confidence = options.confidence || 0.5;
    this.context = options.context || {};
    this.timestamp = options.timestamp || new Date();
    this.category = options.category || 'general';
  }

  /**
   * Set confidence level
   */
  setConfidence(confidence) {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    this.confidence = confidence;
  }

  /**
   * Validate suggestion
   */
  validate() {
    const errors = [];

    if (!this.command || this.command.trim().length === 0) {
      errors.push('Command is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (this.confidence < 0 || this.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    if (!this.resultId) {
      errors.push('Result ID is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serialize suggestion for storage
   */
  toJSON() {
    return {
      suggestionId: this.suggestionId,
      resultId: this.resultId,
      command: this.command,
      description: this.description,
      confidence: this.confidence,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      category: this.category
    };
  }

  /**
   * Create suggestion from JSON
   */
  static fromJSON(data) {
    return new CommandSuggestion({
      suggestionId: data.suggestionId,
      resultId: data.resultId,
      command: data.command,
      description: data.description,
      confidence: data.confidence,
      context: data.context,
      timestamp: new Date(data.timestamp),
      category: data.category
    });
  }
}

/**
 * Protocol Knowledge Base Entry Model
 */
class ProtocolKnowledgeEntry {
  constructor(options = {}) {
    this.commandId = options.commandId || '';
    this.commandHex = options.commandHex || '';
    this.commandName = options.commandName || '';
    this.description = options.description || '';
    this.parameters = options.parameters || [];
    this.examples = options.examples || [];
    this.relatedCommands = options.relatedCommands || [];
    this.category = options.category || 'general';
  }

  /**
   * Validate knowledge entry
   */
  validate() {
    const errors = [];

    if (!this.commandId) {
      errors.push('Command ID is required');
    }

    if (!this.commandHex) {
      errors.push('Command hex is required');
    }

    if (!this.commandName) {
      errors.push('Command name is required');
    }

    if (!Array.isArray(this.parameters)) {
      errors.push('Parameters must be an array');
    }

    if (!Array.isArray(this.examples)) {
      errors.push('Examples must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serialize entry for storage
   */
  toJSON() {
    return {
      commandId: this.commandId,
      commandHex: this.commandHex,
      commandName: this.commandName,
      description: this.description,
      parameters: this.parameters,
      examples: this.examples,
      relatedCommands: this.relatedCommands,
      category: this.category
    };
  }

  /**
   * Create entry from JSON
   */
  static fromJSON(data) {
    return new ProtocolKnowledgeEntry({
      commandId: data.commandId,
      commandHex: data.commandHex,
      commandName: data.commandName,
      description: data.description,
      parameters: data.parameters,
      examples: data.examples,
      relatedCommands: data.relatedCommands,
      category: data.category
    });
  }
}

module.exports = {
  AIAgentSession,
  ProtocolQuery,
  AnalysisResult,
  CommandSuggestion,
  ProtocolKnowledgeEntry
};