/**
 * Unit tests for AI Agent Interface
 */

const { AIAgentSession, ProtocolQuery, AnalysisResult, CommandSuggestion } = require('../../src/ai/models');

// Mock OpenAI client
jest.mock('../../src/ai/openai-client', () => {
  return jest.fn().mockImplementation(() => ({
    chatCompletion: jest.fn().mockResolvedValue({
      content: 'Mock AI response',
      role: 'assistant',
      finishReason: 'stop'
    }),
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      response: 'Test response'
    })
  }));
});

// Mock protocol knowledge
jest.mock('../../src/ai/protocol-knowledge', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(true),
    getCommandByHex: jest.fn().mockReturnValue({
      commandId: 'test-command',
      commandHex: '60 01',
      commandName: 'Test Command',
      description: 'Test command description'
    }),
    searchCommands: jest.fn().mockReturnValue([]),
    isKnowledgeLoaded: jest.fn().mockReturnValue(true)
  }));
});

// Mock conversation manager
jest.mock('../../src/ai/conversation-manager', () => {
  return jest.fn().mockImplementation(() => ({
    getCurrentSession: jest.fn().mockReturnValue({
      sessionId: 'test-session',
      history: [],
      context: {}
    }),
    addMessage: jest.fn().mockResolvedValue({}),
    updateContext: jest.fn().mockResolvedValue({})
  }));
});

describe('AI Agent Interface', () => {
  let mockOpenAIClient;
  let mockProtocolKnowledge;
  let mockConversationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockOpenAIClient = {
      chatCompletion: jest.fn().mockResolvedValue({
        content: 'Mock AI response',
        role: 'assistant',
        finishReason: 'stop'
      }),
      testConnection: jest.fn().mockResolvedValue({
        success: true,
        response: 'Test response'
      })
    };

    mockProtocolKnowledge = {
      load: jest.fn().mockResolvedValue(true),
      getCommandByHex: jest.fn().mockReturnValue({
        commandId: 'test-command',
        commandHex: '60 01',
        commandName: 'Test Command',
        description: 'Test command description'
      }),
      searchCommands: jest.fn().mockReturnValue([]),
      isKnowledgeLoaded: jest.fn().mockReturnValue(true)
    };

    mockConversationManager = {
      getCurrentSession: jest.fn().mockReturnValue({
        sessionId: 'test-session',
        history: [],
        context: {}
      }),
      addMessage: jest.fn().mockResolvedValue({}),
      updateContext: jest.fn().mockResolvedValue({})
    };
  });

  describe('AIAgentSession', () => {
    test('should create session with default values', () => {
      const session = new AIAgentSession();
      
      expect(session.sessionId).toBeDefined();
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.isActive).toBe(true);
      expect(session.mode).toBe('interactive');
    });

    test('should create session with custom options', () => {
      const options = {
        sessionId: 'custom-id',
        mode: 'batch',
        context: { test: 'value' }
      };
      
      const session = new AIAgentSession(options);
      
      expect(session.sessionId).toBe('custom-id');
      expect(session.mode).toBe('batch');
      expect(session.context).toEqual({ test: 'value' });
    });

    test('should add message to history', () => {
      const session = new AIAgentSession();
      const message = {
        role: 'user',
        content: 'Test message'
      };
      
      const addedMessage = session.addMessage(message);
      
      expect(addedMessage.id).toBeDefined();
      expect(addedMessage.role).toBe('user');
      expect(addedMessage.content).toBe('Test message');
      expect(session.history).toHaveLength(1);
    });

    test('should update context', () => {
      const session = new AIAgentSession();
      const newContext = { key: 'value' };
      
      session.updateContext(newContext);
      
      expect(session.context).toEqual({ key: 'value' });
    });

    test('should close session', () => {
      const session = new AIAgentSession();
      
      session.close();
      
      expect(session.isActive).toBe(false);
      expect(session.endTime).toBeInstanceOf(Date);
    });
  });

  describe('ProtocolQuery', () => {
    test('should create query with default values', () => {
      const query = new ProtocolQuery();
      
      expect(query.queryId).toBeDefined();
      expect(query.queryType).toBe('question');
      expect(query.status).toBe('pending');
      expect(query.timestamp).toBeInstanceOf(Date);
    });

    test('should validate query successfully', () => {
      const query = new ProtocolQuery({
        queryText: 'What does command 0x60 do?',
        sessionId: 'test-session',
        queryType: 'question'
      });
      
      const validation = query.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate query with errors', () => {
      const query = new ProtocolQuery({
        queryText: '',
        sessionId: '',
        queryType: 'invalid'
      });
      
      const validation = query.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should update status', () => {
      const query = new ProtocolQuery();
      
      query.updateStatus('processing');
      
      expect(query.status).toBe('processing');
    });
  });

  describe('AnalysisResult', () => {
    test('should create result with default values', () => {
      const result = new AnalysisResult();
      
      expect(result.resultId).toBeDefined();
      expect(result.responseType).toBe('explanation');
      expect(result.confidence).toBe(0.5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should validate result successfully', () => {
      const result = new AnalysisResult({
        responseText: 'Test response',
        queryId: 'test-query',
        confidence: 0.8
      });
      
      const validation = result.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should add suggestion', () => {
      const result = new AnalysisResult();
      const suggestion = {
        command: 'monitor /dev/ttyUSB0',
        description: 'Start monitoring'
      };
      
      result.addSuggestion(suggestion);
      
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toEqual(suggestion);
    });

    test('should set confidence level', () => {
      const result = new AnalysisResult();
      
      result.setConfidence(0.9);
      
      expect(result.confidence).toBe(0.9);
    });

    test('should throw error for invalid confidence', () => {
      const result = new AnalysisResult();
      
      expect(() => result.setConfidence(1.5)).toThrow('Confidence must be between 0 and 1');
    });
  });

  describe('CommandSuggestion', () => {
    test('should create suggestion with default values', () => {
      const suggestion = new CommandSuggestion();
      
      expect(suggestion.suggestionId).toBeDefined();
      expect(suggestion.confidence).toBe(0.5);
      expect(suggestion.category).toBe('general');
      expect(suggestion.timestamp).toBeInstanceOf(Date);
    });

    test('should validate suggestion successfully', () => {
      const suggestion = new CommandSuggestion({
        command: 'monitor /dev/ttyUSB0',
        description: 'Start monitoring',
        resultId: 'test-result',
        confidence: 0.8
      });
      
      const validation = suggestion.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate suggestion with errors', () => {
      const suggestion = new CommandSuggestion({
        command: '',
        description: '',
        confidence: 1.5
      });
      
      const validation = suggestion.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});