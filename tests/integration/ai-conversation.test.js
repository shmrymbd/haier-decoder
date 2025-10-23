const AIAgent = require('../../src/ai/agent');
const ConversationManager = require('../../src/ai/conversation-manager');
const ProtocolKnowledge = require('../../src/ai/protocol-knowledge');

describe('AI Conversation Flow Integration', () => {
  let aiAgent;
  let conversationManager;
  let protocolKnowledge;

  beforeAll(async () => {
    // Mock OpenAI client for testing
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Command 0x60 is a wash program command that starts different wash cycles. It is followed by a program identifier (01-04) to specify the wash mode.'
              }
            }]
          })
        }
      }
    };

    // Mock the OpenAI client module
    jest.doMock('../../src/ai/openai-client', () => ({
      OpenAIClient: jest.fn().mockImplementation(() => ({
        generateResponse: jest.fn().mockResolvedValue({
          success: true,
          response: 'Command 0x60 is a wash program command that starts different wash cycles.',
          confidence: 0.95
        }),
        testConnection: jest.fn().mockResolvedValue({ success: true })
      }))
    }));

    protocolKnowledge = new ProtocolKnowledge();
    await protocolKnowledge.load();
    
    conversationManager = new ConversationManager();
    
    aiAgent = new AIAgent({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      enableSanitization: true
    });
    
    await aiAgent.initialize();
  });

  afterAll(async () => {
    if (conversationManager) {
      await conversationManager.cleanup();
    }
  });

  describe('Complete Conversation Flow', () => {
    test('should handle full conversation from query to response', async () => {
      // Create a new session
      const session = await conversationManager.createSession({
        mode: 'interactive',
        context: { deviceType: 'washing-machine' }
      });

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.mode).toBe('interactive');

      // Submit a protocol query
      const query = {
        queryText: 'What does command 0x60 do?',
        queryType: 'question',
        context: { recentCommands: ['0x40', '0x60'] }
      };

      const queryResult = await conversationManager.addQuery(session.sessionId, query);
      expect(queryResult).toBeDefined();
      expect(queryResult.queryId).toBeDefined();

      // Process the query through AI agent
      const analysisResult = await aiAgent.processQuery(queryResult, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context
      });

      expect(analysisResult).toBeDefined();
      expect(analysisResult.responseText).toContain('wash program command');
      expect(analysisResult.confidence).toBeGreaterThan(0.8);

      // Verify conversation history is maintained
      const sessionHistory = await conversationManager.getSessionHistory(session.sessionId);
      expect(sessionHistory.queries).toHaveLength(1);
      expect(sessionHistory.results).toHaveLength(1);
    });

    test('should maintain context across multiple queries', async () => {
      const session = await conversationManager.createSession({
        mode: 'interactive',
        context: { deviceType: 'washing-machine' }
      });

      // First query
      const query1 = {
        queryText: 'What does command 0x60 do?',
        queryType: 'question',
        context: {}
      };

      const queryResult1 = await conversationManager.addQuery(session.sessionId, query1);
      const analysisResult1 = await aiAgent.processQuery(queryResult1, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context
      });

      // Second query with context reference
      const query2 = {
        queryText: 'What parameters does it take?',
        queryType: 'question',
        context: { previousCommand: '0x60' }
      };

      const queryResult2 = await conversationManager.addQuery(session.sessionId, query2);
      const analysisResult2 = await aiAgent.processQuery(queryResult2, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context,
        conversationHistory: sessionHistory
      });

      expect(analysisResult2).toBeDefined();
      expect(analysisResult2.responseText).toContain('parameter');

      // Verify both queries are in history
      const sessionHistory = await conversationManager.getSessionHistory(session.sessionId);
      expect(sessionHistory.queries).toHaveLength(2);
      expect(sessionHistory.results).toHaveLength(2);
    });

    test('should handle conversation errors gracefully', async () => {
      const session = await conversationManager.createSession({
        mode: 'interactive',
        context: { deviceType: 'washing-machine' }
      });

      // Mock OpenAI failure
      const mockOpenAI = require('../../src/ai/openai-client');
      mockOpenAI.OpenAIClient.mockImplementationOnce(() => ({
        generateResponse: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        testConnection: jest.fn().mockResolvedValue({ success: true })
      }));

      const query = {
        queryText: 'What does command 0x60 do?',
        queryType: 'question',
        context: {}
      };

      const queryResult = await conversationManager.addQuery(session.sessionId, query);
      
      // Should handle error gracefully
      await expect(aiAgent.processQuery(queryResult, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context
      })).rejects.toThrow('API rate limit exceeded');

      // Verify error is logged in session
      const sessionHistory = await conversationManager.getSessionHistory(session.sessionId);
      expect(sessionHistory.queries).toHaveLength(1);
      expect(sessionHistory.errors).toHaveLength(1);
    });
  });

  describe('Context Management', () => {
    test('should update session context based on conversation', async () => {
      const session = await conversationManager.createSession({
        mode: 'interactive',
        context: { deviceType: 'washing-machine' }
      });

      const query = {
        queryText: 'I am analyzing authentication sequences',
        queryType: 'question',
        context: {}
      };

      const queryResult = await conversationManager.addQuery(session.sessionId, query);
      await aiAgent.processQuery(queryResult, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context
      });

      // Verify context was updated
      const updatedSession = await conversationManager.getSession(session.sessionId);
      expect(updatedSession.context).toHaveProperty('analysisType', 'authentication');
    });
  });

  describe('Performance Requirements', () => {
    test('should respond within 3 seconds', async () => {
      const session = await conversationManager.createSession({
        mode: 'interactive',
        context: { deviceType: 'washing-machine' }
      });

      const query = {
        queryText: 'What does command 0x60 do?',
        queryType: 'question',
        context: {}
      };

      const queryResult = await conversationManager.addQuery(session.sessionId, query);
      
      const startTime = Date.now();
      const analysisResult = await aiAgent.processQuery(queryResult, {
        protocolKnowledge: protocolKnowledge.getKnowledge(),
        sessionContext: session.context
      });
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // 3 seconds
      expect(analysisResult).toBeDefined();
    });
  });
});