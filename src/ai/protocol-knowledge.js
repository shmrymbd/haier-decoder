/**
 * Protocol Knowledge Base for AI Agent
 * 
 * Loads and manages Haier protocol knowledge for AI agent responses.
 * Provides structured access to protocol commands, status responses, and test vectors.
 */

const fs = require('fs').promises;
const path = require('path');

class ProtocolKnowledge {
  constructor(options = {}) {
    this.options = {
      knowledgePath: options.knowledgePath || path.join(__dirname, 'protocol-knowledge.json'),
      testVectorsPath: options.testVectorsPath || path.join(__dirname, '..', '..', 'tests', 'ai', 'protocol-test-vectors.json'),
      ...options
    };

    this.knowledge = null;
    this.testVectors = null;
    this.isLoaded = false;
  }

  /**
   * Load protocol knowledge from files
   */
  async load() {
    try {
      // Load main knowledge base
      const knowledgeData = await fs.readFile(this.options.knowledgePath, 'utf8');
      this.knowledge = JSON.parse(knowledgeData);

      // Load test vectors
      try {
        const testVectorsData = await fs.readFile(this.options.testVectorsPath, 'utf8');
        this.testVectors = JSON.parse(testVectorsData);
      } catch (error) {
        console.warn(`Test vectors not found at ${this.options.testVectorsPath}: ${error.message}`);
        this.testVectors = { testVectors: [], statusTestVectors: [], aiTestScenarios: [] };
      }

      // Validate loaded data
      this.validateKnowledge();
      
      this.isLoaded = true;
      return true;
    } catch (error) {
      throw new Error(`Failed to load protocol knowledge: ${error.message}`);
    }
  }

  /**
   * Validate loaded knowledge base
   */
  validateKnowledge() {
    if (!this.knowledge) {
      throw new Error('Knowledge base not loaded');
    }

    const requiredSections = ['commands', 'statusResponses', 'packetStructure'];
    for (const section of requiredSections) {
      if (!this.knowledge[section]) {
        throw new Error(`Missing required section: ${section}`);
      }
    }

    // Validate commands
    if (!Array.isArray(this.knowledge.commands)) {
      throw new Error('Commands must be an array');
    }

    for (const command of this.knowledge.commands) {
      this.validateCommand(command);
    }

    // Validate status responses
    if (!Array.isArray(this.knowledge.statusResponses)) {
      throw new Error('Status responses must be an array');
    }

    for (const status of this.knowledge.statusResponses) {
      this.validateStatusResponse(status);
    }
  }

  /**
   * Validate command object
   */
  validateCommand(command) {
    const requiredFields = ['commandId', 'commandHex', 'commandName', 'description'];
    for (const field of requiredFields) {
      if (!command[field]) {
        throw new Error(`Command missing required field: ${field}`);
      }
    }

    if (!Array.isArray(command.parameters)) {
      throw new Error('Command parameters must be an array');
    }

    if (!Array.isArray(command.examples)) {
      throw new Error('Command examples must be an array');
    }
  }

  /**
   * Validate status response object
   */
  validateStatusResponse(status) {
    const requiredFields = ['statusId', 'statusHex', 'statusName', 'description'];
    for (const field of requiredFields) {
      if (!status[field]) {
        throw new Error(`Status response missing required field: ${field}`);
      }
    }
  }

  /**
   * Get command by hex code
   */
  getCommandByHex(hexCode) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const normalizedHex = hexCode.replace(/\s+/g, ' ').trim().toUpperCase();
    
    return this.knowledge.commands.find(command => 
      command.commandHex.toUpperCase() === normalizedHex
    );
  }

  /**
   * Get command by ID
   */
  getCommandById(commandId) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.knowledge.commands.find(command => command.commandId === commandId);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.knowledge.commands.filter(command => command.category === category);
  }

  /**
   * Get status response by hex code
   */
  getStatusByHex(hexCode) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const normalizedHex = hexCode.replace(/\s+/g, ' ').trim().toUpperCase();
    
    return this.knowledge.statusResponses.find(status => 
      status.statusHex.toUpperCase() === normalizedHex
    );
  }

  /**
   * Search commands by query
   */
  searchCommands(query) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const normalizedQuery = query.toLowerCase();
    
    return this.knowledge.commands.filter(command => 
      command.commandName.toLowerCase().includes(normalizedQuery) ||
      command.description.toLowerCase().includes(normalizedQuery) ||
      command.commandHex.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get packet structure information
   */
  getPacketStructure() {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.knowledge.packetStructure;
  }

  /**
   * Get CRC algorithms
   */
  getCRCAlgorithms() {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.knowledge.crcAlgorithms || [];
  }

  /**
   * Get test vectors
   */
  getTestVectors() {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.testVectors;
  }

  /**
   * Get AI test scenarios
   */
  getAITestScenarios() {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    return this.testVectors?.aiTestScenarios || [];
  }

  /**
   * Generate context for AI agent
   */
  generateContext(query, context = {}) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const aiContext = {
      protocolKnowledge: {
        commands: this.knowledge.commands,
        statusResponses: this.knowledge.statusResponses,
        packetStructure: this.knowledge.packetStructure
      },
      query: query,
      timestamp: new Date().toISOString(),
      ...context
    };

    return aiContext;
  }

  /**
   * Get related commands
   */
  getRelatedCommands(commandId) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const command = this.getCommandById(commandId);
    if (!command || !command.relatedCommands) {
      return [];
    }

    return command.relatedCommands
      .map(relatedId => this.getCommandById(relatedId))
      .filter(cmd => cmd !== undefined);
  }

  /**
   * Get command examples
   */
  getCommandExamples(commandId) {
    if (!this.isLoaded) {
      throw new Error('Knowledge base not loaded');
    }

    const command = this.getCommandById(commandId);
    return command ? command.examples : [];
  }

  /**
   * Check if knowledge base is loaded
   */
  isKnowledgeLoaded() {
    return this.isLoaded;
  }

  /**
   * Get knowledge base statistics
   */
  getStats() {
    if (!this.isLoaded) {
      return null;
    }

    return {
      commands: this.knowledge.commands.length,
      statusResponses: this.knowledge.statusResponses.length,
      testVectors: this.testVectors?.testVectors?.length || 0,
      aiTestScenarios: this.testVectors?.aiTestScenarios?.length || 0,
      categories: [...new Set(this.knowledge.commands.map(cmd => cmd.category))].length
    };
  }
}

module.exports = ProtocolKnowledge;