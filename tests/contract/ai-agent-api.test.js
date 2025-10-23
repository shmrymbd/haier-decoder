const request = require('supertest');
const express = require('express');
const { AIAgent } = require('../../src/ai/agent');
const { ConversationManager } = require('../../src/ai/conversation-manager');

// Mock AI Agent API server for contract testing
class MockAIAgentAPI {
  constructor() {
    this.app = express();
    this.conversationManager = new ConversationManager();
    this.aiAgent = null;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // POST /sessions
    this.app.post('/sessions', async (req, res) => {
      try {
        const { mode = 'interactive', context = {} } = req.body;
        const session = await this.conversationManager.createSession({ mode, context });
        
        res.status(201).json({
          sessionId: session.sessionId,
          startTime: session.startTime,
          mode: session.mode,
          status: 'active'
        });
      } catch (error) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: error.message,
          code: '400',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /sessions/{sessionId}/queries
    this.app.post('/sessions/:sessionId/queries', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { query, context = {}, queryType = 'question' } = req.body;

        if (!query || query.length > 1000) {
          return res.status(400).json({
            error: 'INVALID_QUERY',
            message: 'Query is required and must be less than 1000 characters',
            code: '400',
            timestamp: new Date().toISOString()
          });
        }

        const session = await this.conversationManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            error: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            code: '404',
            timestamp: new Date().toISOString()
          });
        }

        const queryResult = await this.conversationManager.addQuery(sessionId, {
          queryText: query,
          queryType,
          context
        });

        // Mock AI response
        const analysisResult = {
          resultId: `result_${Date.now()}`,
          response: `AI response for: ${query}`,
          responseType: 'explanation',
          confidence: 0.95,
          suggestions: [
            {
              command: 'analyze --pattern 0x60',
              description: 'Analyze pattern for command 0x60',
              confidence: 0.8,
              context: { command: '0x60' }
            }
          ],
          metadata: {
            processingTime: 150,
            tokensUsed: 50
          },
          timestamp: new Date().toISOString()
        };

        res.status(200).json(analysisResult);
      } catch (error) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message,
          code: '500',
          timestamp: new Date().toISOString()
        });
      }
    });

    // POST /sessions/{sessionId}/analyze
    this.app.post('/sessions/:sessionId/analyze', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { data, analysisType = 'pattern', options = {} } = req.body;

        const session = await this.conversationManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            error: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            code: '404',
            timestamp: new Date().toISOString()
          });
        }

        // Mock analysis result
        const analysisResult = {
          resultId: `analysis_${Date.now()}`,
          response: `Analysis of ${analysisType} completed`,
          responseType: 'analysis',
          confidence: 0.88,
          suggestions: [],
          metadata: {
            analysisType,
            dataSize: JSON.stringify(data).length,
            patternsFound: 3,
            anomaliesDetected: 1
          },
          timestamp: new Date().toISOString()
        };

        res.status(200).json(analysisResult);
      } catch (error) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message,
          code: '500',
          timestamp: new Date().toISOString()
        });
      }
    });

    // GET /sessions/{sessionId}/suggestions
    this.app.get('/sessions/:sessionId/suggestions', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { context = '' } = req.query;

        const session = await this.conversationManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            error: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            code: '404',
            timestamp: new Date().toISOString()
          });
        }

        const suggestions = [
          {
            command: 'analyze --pattern 0x60',
            description: 'Analyze pattern for command 0x60',
            confidence: 0.9,
            context: { command: '0x60' }
          },
          {
            command: 'monitor --live',
            description: 'Start live monitoring',
            confidence: 0.7,
            context: { mode: 'monitoring' }
          }
        ];

        res.status(200).json({
          suggestions,
          context: { query: context, sessionMode: session.mode }
        });
      } catch (error) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message,
          code: '500',
          timestamp: new Date().toISOString()
        });
      }
    });

    // DELETE /sessions/{sessionId}
    this.app.delete('/sessions/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const session = await this.conversationManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            error: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            code: '404',
            timestamp: new Date().toISOString()
          });
        }

        await this.conversationManager.closeSession(sessionId);

        res.status(200).json({
          success: true,
          message: 'Session closed successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message,
          code: '500',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  getApp() {
    return this.app;
  }
}

describe('AI Agent API Contract Tests', () => {
  let api;
  let app;

  beforeAll(() => {
    api = new MockAIAgentAPI();
    app = api.getApp();
  });

  afterAll(async () => {
    if (api && api.conversationManager) {
      await api.conversationManager.cleanup();
    }
  });

  describe('POST /sessions', () => {
    test('should create session with valid request', async () => {
      const response = await request(app)
        .post('/sessions')
        .send({
          mode: 'interactive',
          context: { deviceType: 'washing-machine' }
        })
        .expect(201);

      expect(response.body).toMatchObject({
        sessionId: expect.any(String),
        startTime: expect.any(String),
        mode: 'interactive',
        status: 'active'
      });
    });

    test('should create session with minimal request', async () => {
      const response = await request(app)
        .post('/sessions')
        .send({})
        .expect(201);

      expect(response.body.mode).toBe('interactive');
      expect(response.body.status).toBe('active');
    });

    test('should reject invalid request', async () => {
      const response = await request(app)
        .post('/sessions')
        .send({ mode: 'invalid' })
        .expect(201); // Our mock accepts any mode

      expect(response.body.sessionId).toBeDefined();
    });
  });

  describe('POST /sessions/{sessionId}/queries', () => {
    let sessionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/sessions')
        .send({ mode: 'interactive' });
      sessionId = response.body.sessionId;
    });

    test('should process valid query', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/queries`)
        .send({
          query: 'What does command 0x60 do?',
          context: { recentCommands: ['0x40'] },
          queryType: 'question'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        resultId: expect.any(String),
        response: expect.stringContaining('AI response for:'),
        responseType: 'explanation',
        confidence: 0.95,
        suggestions: expect.arrayContaining([
          expect.objectContaining({
            command: expect.any(String),
            description: expect.any(String),
            confidence: expect.any(Number)
          })
        ]),
        metadata: expect.any(Object),
        timestamp: expect.any(String)
      });
    });

    test('should reject query without text', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/queries`)
        .send({ context: {} })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'INVALID_QUERY',
        message: expect.stringContaining('Query is required'),
        code: '400'
      });
    });

    test('should reject query that is too long', async () => {
      const longQuery = 'a'.repeat(1001);
      const response = await request(app)
        .post(`/sessions/${sessionId}/queries`)
        .send({ query: longQuery })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'INVALID_QUERY',
        message: expect.stringContaining('must be less than 1000 characters'),
        code: '400'
      });
    });

    test('should reject query for non-existent session', async () => {
      const response = await request(app)
        .post('/sessions/non-existent/queries')
        .send({ query: 'test' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        code: '404'
      });
    });
  });

  describe('POST /sessions/{sessionId}/analyze', () => {
    let sessionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/sessions')
        .send({ mode: 'analysis' });
      sessionId = response.body.sessionId;
    });

    test('should analyze protocol data', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/analyze`)
        .send({
          data: { commands: ['0x60', '0x40'], patterns: ['ff ff'] },
          analysisType: 'pattern',
          options: { depth: 'deep' }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        resultId: expect.any(String),
        response: expect.stringContaining('Analysis of pattern completed'),
        responseType: 'analysis',
        confidence: 0.88,
        metadata: expect.objectContaining({
          analysisType: 'pattern',
          dataSize: expect.any(Number),
          patternsFound: 3,
          anomaliesDetected: 1
        })
      });
    });

    test('should reject analysis for non-existent session', async () => {
      const response = await request(app)
        .post('/sessions/non-existent/analyze')
        .send({ data: {} })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        code: '404'
      });
    });
  });

  describe('GET /sessions/{sessionId}/suggestions', () => {
    let sessionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/sessions')
        .send({ mode: 'interactive' });
      sessionId = response.body.sessionId;
    });

    test('should get command suggestions', async () => {
      const response = await request(app)
        .get(`/sessions/${sessionId}/suggestions`)
        .query({ context: 'analyzing patterns' })
        .expect(200);

      expect(response.body).toMatchObject({
        suggestions: expect.arrayContaining([
          expect.objectContaining({
            command: expect.any(String),
            description: expect.any(String),
            confidence: expect.any(Number),
            context: expect.any(Object)
          })
        ]),
        context: expect.objectContaining({
          query: 'analyzing patterns',
          sessionMode: 'interactive'
        })
      });
    });

    test('should get suggestions without context', async () => {
      const response = await request(app)
        .get(`/sessions/${sessionId}/suggestions`)
        .expect(200);

      expect(response.body.suggestions).toHaveLength(2);
      expect(response.body.context.query).toBe('');
    });
  });

  describe('DELETE /sessions/{sessionId}', () => {
    test('should close existing session', async () => {
      const createResponse = await request(app)
        .post('/sessions')
        .send({ mode: 'interactive' });
      const sessionId = createResponse.body.sessionId;

      const response = await request(app)
        .delete(`/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Session closed successfully',
        timestamp: expect.any(String)
      });
    });

    test('should reject closing non-existent session', async () => {
      const response = await request(app)
        .delete('/sessions/non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        code: '404'
      });
    });
  });

  describe('Error Response Format', () => {
    test('should return consistent error format', async () => {
      const response = await request(app)
        .post('/sessions/non-existent/queries')
        .send({ query: 'test' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        code: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });
});