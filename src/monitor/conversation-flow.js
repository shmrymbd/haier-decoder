/**
 * Conversation Flow Analyzer
 * 
 * Tracks and analyzes the complete communication state machine
 * for Haier device communication sessions.
 */

class ConversationFlow {
  constructor() {
    this.state = 'IDLE';
    this.sessionStart = null;
    this.authenticationAttempts = [];
    this.commandSequence = [];
    this.stateTransitions = [];
    this.currentProgram = null;
    this.deviceStatus = 'Unknown';
    this.errorCount = 0;
    this.retryCount = 0;
    
    // State machine definition
    this.stateMachine = {
      'IDLE': {
        transitions: ['CONNECTING', 'ERROR'],
        triggers: {
          'TX': { 0x01: 'CONNECTING' }, // Reset/Init command
          'RX': { 0x0f: 'CONNECTING' }  // Reset confirm
        }
      },
      'CONNECTING': {
        transitions: ['AUTHENTICATING', 'ERROR', 'IDLE'],
        triggers: {
          'TX': { 0x12: 'AUTHENTICATING' }, // Auth challenge
          'RX': { 0x11: 'AUTHENTICATED' }   // Auth response
        }
      },
      'AUTHENTICATING': {
        transitions: ['AUTHENTICATED', 'ERROR', 'CONNECTING'],
        triggers: {
          'RX': { 0x11: 'AUTHENTICATED' }   // Auth response
        }
      },
      'AUTHENTICATED': {
        transitions: ['ACTIVE', 'IDLE', 'ERROR'],
        triggers: {
          'TX': { 0x60: 'ACTIVE' },         // Program start
          'TX': { 0x01: 'IDLE' }            // Reset
        }
      },
      'ACTIVE': {
        transitions: ['AUTHENTICATED', 'IDLE', 'ERROR'],
        triggers: {
          'TX': { 0x01: 'IDLE' },           // Reset
          'RX': { 0x6d: 'AUTHENTICATED' }   // Status response
        }
      },
      'ERROR': {
        transitions: ['IDLE', 'CONNECTING'],
        triggers: {
          'TX': { 0x01: 'CONNECTING' }      // Reset/retry
        }
      }
    };
  }

  /**
   * Process a packet and update conversation flow
   * @param {object} packet - Parsed packet object
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Synchronized timestamp
   */
  processPacket(packet, direction, timestamp) {
    if (!this.sessionStart) {
      this.sessionStart = timestamp;
    }
    
    // Record command in sequence
    this.commandSequence.push({
      timestamp,
      direction,
      command: packet.command,
      commandName: packet.commandInfo?.name || 'Unknown',
      packet: packet
    });
    
    // Update state machine
    this.updateStateMachine(packet, direction, timestamp);
    
    // Track authentication attempts
    if (packet.command === 0x12 && direction === 'TX') {
      this.trackAuthenticationAttempt(packet, timestamp);
    }
    
    // Track program status
    if (packet.command === 0x6d && direction === 'RX') {
      this.updateDeviceStatus(packet);
    }
    
    // Track program changes
    if (packet.command === 0x60 && direction === 'TX') {
      this.updateCurrentProgram(packet);
    }
    
    // Track errors
    if (this.isErrorPacket(packet)) {
      this.trackError(packet, timestamp);
    }
  }

  /**
   * Update state machine based on packet
   * @param {object} packet - Packet object
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Timestamp
   */
  updateStateMachine(packet, direction, timestamp) {
    const currentState = this.state;
    const stateDef = this.stateMachine[currentState];
    
    if (!stateDef) {
      return;
    }
    
    const triggers = stateDef.triggers[direction];
    if (!triggers) {
      return;
    }
    
    const newState = triggers[packet.command];
    if (newState && stateDef.transitions.includes(newState)) {
      this.transitionToState(newState, packet, direction, timestamp);
    }
  }

  /**
   * Transition to a new state
   * @param {string} newState - New state name
   * @param {object} packet - Triggering packet
   * @param {string} direction - 'TX' or 'RX'
   * @param {number} timestamp - Timestamp
   */
  transitionToState(newState, packet, direction, timestamp) {
    const oldState = this.state;
    this.state = newState;
    
    // Record transition
    this.stateTransitions.push({
      timestamp,
      from: oldState,
      to: newState,
      trigger: {
        direction,
        command: packet.command,
        commandName: packet.commandInfo?.name || 'Unknown'
      }
    });
  }

  /**
   * Track authentication attempt
   * @param {object} packet - Challenge packet
   * @param {number} timestamp - Timestamp
   */
  trackAuthenticationAttempt(packet, timestamp) {
    const attempt = {
      timestamp,
      challenge: packet,
      success: false,
      responseTime: null
    };
    
    this.authenticationAttempts.push(attempt);
  }

  /**
   * Update device status from status response
   * @param {object} packet - Status response packet
   */
  updateDeviceStatus(packet) {
    if (packet.payload && packet.payload.length >= 2) {
      const statusCode = packet.payload[0];
      const programCode = packet.payload[1];
      
      this.deviceStatus = this.getStatusName(statusCode);
      this.currentProgram = programCode;
      
      // Mark latest auth attempt as successful if we're authenticated
      if (this.state === 'AUTHENTICATED' || this.state === 'ACTIVE') {
        const latestAttempt = this.authenticationAttempts[this.authenticationAttempts.length - 1];
        if (latestAttempt && !latestAttempt.success) {
          latestAttempt.success = true;
          latestAttempt.responseTime = Date.now() - latestAttempt.timestamp;
        }
      }
    }
  }

  /**
   * Update current program from program start command
   * @param {object} packet - Program start packet
   */
  updateCurrentProgram(packet) {
    if (packet.payload && packet.payload.length >= 3) {
      this.currentProgram = packet.payload[2];
    }
  }

  /**
   * Track error occurrence
   * @param {object} packet - Error packet
   * @param {number} timestamp - Timestamp
   */
  trackError(packet, timestamp) {
    this.errorCount++;
    
    // Check if this is a retry
    if (this.commandSequence.length > 1) {
      const lastCommand = this.commandSequence[this.commandSequence.length - 2];
      if (lastCommand.command === packet.command && 
          lastCommand.direction === packet.direction) {
        this.retryCount++;
      }
    }
  }

  /**
   * Check if packet indicates an error
   * @param {object} packet - Packet object
   * @returns {boolean} True if error packet
   */
  isErrorPacket(packet) {
    // Check for error status codes
    if (packet.command === 0x6d && packet.payload) {
      const status = packet.payload[0];
      return status === 0x04; // Error status
    }
    
    // Check for CRC errors
    if (packet.crcValid === false) {
      return true;
    }
    
    return false;
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getCurrentState() {
    return this.state;
  }

  /**
   * Get conversation summary
   * @returns {object} Conversation summary
   */
  getConversationSummary() {
    const duration = this.sessionStart ? Date.now() - this.sessionStart : 0;
    const authAttempts = this.authenticationAttempts.length;
    const authSuccesses = this.authenticationAttempts.filter(a => a.success).length;
    const authSuccessRate = authAttempts > 0 ? (authSuccesses / authAttempts * 100).toFixed(1) : 0;
    
    return {
      sessionStart: this.sessionStart,
      duration: duration,
      currentState: this.state,
      deviceStatus: this.deviceStatus,
      currentProgram: this.currentProgram,
      authAttempts: authAttempts,
      authSuccesses: authSuccesses,
      authSuccessRate: parseFloat(authSuccessRate),
      errorCount: this.errorCount,
      retryCount: this.retryCount,
      commandCount: this.commandSequence.length,
      stateTransitions: this.stateTransitions.length,
      stateTimeline: this.getStateTimeline()
    };
  }

  /**
   * Get state timeline
   * @returns {array} State timeline
   */
  getStateTimeline() {
    return this.stateTransitions.map(transition => ({
      timestamp: transition.timestamp,
      time: new Date(transition.timestamp).toLocaleTimeString(),
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger
    }));
  }

  /**
   * Get status name from status code
   * @param {number} status - Status code
   * @returns {string} Status name
   */
  getStatusName(status) {
    const statusMap = {
      0x01: 'Standby',
      0x02: 'Running',
      0x03: 'Paused',
      0x04: 'Error',
      0x05: 'Completed',
      0x06: 'Cancelled'
    };
    return statusMap[status] || `Unknown(0x${status.toString(16)})`;
  }

  /**
   * Get program name from program code
   * @param {number} program - Program code
   * @returns {string} Program name
   */
  getProgramName(program) {
    const programMap = {
      1: 'Program 1',
      2: 'Program 2',
      3: 'Program 3',
      4: 'Program 4'
    };
    return programMap[program] || `Program ${program}`;
  }

  /**
   * Get conversation flow diagram
   * @returns {string} ASCII flow diagram
   */
  getFlowDiagram() {
    const timeline = this.getStateTimeline();
    if (timeline.length === 0) {
      return 'No state transitions recorded';
    }
    
    let diagram = 'Session Timeline:\n';
    diagram += '━'.repeat(40) + '\n';
    
    timeline.forEach(transition => {
      diagram += `${transition.time} ┃ ${transition.from} → ${transition.to}\n`;
      diagram += `   ┃ ${transition.trigger.direction} ${transition.trigger.commandName}\n`;
    });
    
    diagram += '━'.repeat(40);
    
    return diagram;
  }

  /**
   * Get authentication analysis
   * @returns {object} Authentication analysis
   */
  getAuthenticationAnalysis() {
    const attempts = this.authenticationAttempts;
    const successful = attempts.filter(a => a.success);
    const failed = attempts.filter(a => !a.success);
    
    const responseTimes = successful.map(a => a.responseTime).filter(rt => rt !== null);
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    return {
      totalAttempts: attempts.length,
      successful: successful.length,
      failed: failed.length,
      successRate: attempts.length > 0 ? (successful.length / attempts.length * 100).toFixed(1) : 0,
      averageResponseTime: Math.round(avgResponseTime),
      responseTimes: responseTimes,
      lastAttempt: attempts.length > 0 ? attempts[attempts.length - 1] : null
    };
  }

  /**
   * Get error analysis
   * @returns {object} Error analysis
   */
  getErrorAnalysis() {
    return {
      totalErrors: this.errorCount,
      retryCount: this.retryCount,
      errorRate: this.commandSequence.length > 0 ? 
        (this.errorCount / this.commandSequence.length * 100).toFixed(2) : 0,
      hasErrors: this.errorCount > 0,
      hasRetries: this.retryCount > 0
    };
  }

  /**
   * Export conversation flow to JSON
   * @param {string} filename - Output filename
   * @returns {string} Export file path
   */
  exportFlow(filename = null) {
    if (!filename) {
      const timestamp = Date.now();
      filename = `logs/conversation-flow-${timestamp}.json`;
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      sessionStart: this.sessionStart,
      duration: this.sessionStart ? Date.now() - this.sessionStart : 0,
      summary: this.getConversationSummary(),
      authenticationAnalysis: this.getAuthenticationAnalysis(),
      errorAnalysis: this.getErrorAnalysis(),
      stateTimeline: this.getStateTimeline(),
      commandSequence: this.commandSequence.map(cmd => ({
        timestamp: cmd.timestamp,
        time: new Date(cmd.timestamp).toLocaleTimeString(),
        direction: cmd.direction,
        command: cmd.command,
        commandName: cmd.commandName
      }))
    };
    
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    return filename;
  }

  /**
   * Reset conversation flow for new session
   */
  reset() {
    this.state = 'IDLE';
    this.sessionStart = null;
    this.authenticationAttempts = [];
    this.commandSequence = [];
    this.stateTransitions = [];
    this.currentProgram = null;
    this.deviceStatus = 'Unknown';
    this.errorCount = 0;
    this.retryCount = 0;
  }
}

module.exports = ConversationFlow;
