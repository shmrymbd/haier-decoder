// Jest setup file for AI Agent CLI Integration tests

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.HAIER_AI_MODE = 'enabled';