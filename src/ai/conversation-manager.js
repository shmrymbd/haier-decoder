/**
 * Conversation Manager for AI Agent Sessions
 * 
 * Handles session management, conversation history, and context persistence
 * for AI agent interactions.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Simple UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

class ConversationManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxHistory: options.maxHistory || 1000,
      sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      persistSessions: options.persistSessions !== false,
      sessionPath: options.sessionPath || path.join(process.cwd(), '.sessions'),
      ...options
    };

    this.sessions = new Map();
    this.currentSessionId = null;
    this.cleanupInterval = null;

    this.startCleanupInterval();
  }

  /**
   * Create a new conversation session
   */
  async createSession(options = {}) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      context: options.context || {},
      history: [],
      mode: options.mode || 'interactive',
      isActive: true,
      metadata: {
        userAgent: options.userAgent || 'haier-cli',
        version: options.version || '1.0.0',
        ...options.metadata
      }
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    if (this.options.persistSessions) {
      await this.persistSession(session);
    }

    this.emit('sessionCreated', session);
    return session;
  }

  /**
   * Get current active session
   */
  getCurrentSession() {
    if (!this.currentSessionId || !this.sessions.has(this.currentSessionId)) {
      return null;
    }

    const session = this.sessions.get(this.currentSessionId);
    
    // Check if session has timed out
    if (this.isSessionExpired(session)) {
      this.closeSession(this.currentSessionId);
      return null;
    }

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (session && this.isSessionExpired(session)) {
      this.closeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Add message to conversation history
   */
  async addMessage(sessionId, message) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messageEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      role: message.role || 'user',
      content: message.content,
      metadata: message.metadata || {}
    };

    session.history.push(messageEntry);
    session.lastActivity = new Date();

    // Trim history if it exceeds max length
    if (session.history.length > this.options.maxHistory) {
      session.history = session.history.slice(-this.options.maxHistory);
    }

    if (this.options.persistSessions) {
      await this.persistSession(session);
    }

    this.emit('messageAdded', { sessionId, message: messageEntry });
    return messageEntry;
  }

  /**
   * Update session context
   */
  async updateContext(sessionId, context) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context = { ...session.context, ...context };
    session.lastActivity = new Date();

    if (this.options.persistSessions) {
      await this.persistSession(session);
    }

    this.emit('contextUpdated', { sessionId, context });
  }

  /**
   * Close a session
   */
  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    session.endTime = new Date();

    if (this.options.persistSessions) {
      await this.persistSession(session);
    }

    this.sessions.delete(sessionId);

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }

    this.emit('sessionClosed', session);
    return true;
  }

  /**
   * List all sessions
   */
  listSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      mode: session.mode,
      isActive: session.isActive,
      messageCount: session.history.length
    }));
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(session) {
    const now = new Date();
    const timeSinceLastActivity = now - session.lastActivity;
    return timeSinceLastActivity > this.options.sessionTimeout;
  }

  /**
   * Persist session to disk
   */
  async persistSession(session) {
    try {
      await fs.mkdir(this.options.sessionPath, { recursive: true });
      
      const sessionFile = path.join(this.options.sessionPath, `${session.sessionId}.json`);
      const sessionData = {
        ...session,
        startTime: session.startTime.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : null
      };

      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      this.emit('error', new Error(`Failed to persist session: ${error.message}`));
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId) {
    try {
      const sessionFile = path.join(this.options.sessionPath, `${sessionId}.json`);
      const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf8'));
      
      // Convert ISO strings back to Date objects
      sessionData.startTime = new Date(sessionData.startTime);
      sessionData.lastActivity = new Date(sessionData.lastActivity);
      sessionData.endTime = sessionData.endTime ? new Date(sessionData.endTime) : null;

      this.sessions.set(sessionId, sessionData);
      return sessionData;
    } catch (error) {
      this.emit('error', new Error(`Failed to load session: ${error.message}`));
      return null;
    }
  }

  /**
   * Start cleanup interval for expired sessions
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.closeSession(sessionId);
    }

    if (expiredSessions.length > 0) {
      this.emit('sessionsCleanedUp', { count: expiredSessions.length });
    }
  }

  /**
   * Get conversation history for a session
   */
  getHistory(sessionId, limit = null) {
    const session = this.getSession(sessionId);
    if (!session) {
      return [];
    }

    const history = session.history;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear conversation history for a session
   */
  async clearHistory(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.history = [];
    session.lastActivity = new Date();

    if (this.options.persistSessions) {
      await this.persistSession(session);
    }

    this.emit('historyCleared', { sessionId });
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.isActive);
    const totalMessages = sessions.reduce((sum, s) => sum + s.history.length, 0);

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalMessages,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all active sessions
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }

    this.emit('cleanup');
  }
}

module.exports = ConversationManager;