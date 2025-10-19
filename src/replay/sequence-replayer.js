/**
 * Sequence replayer for Haier protocol testing
 */

const fs = require('fs');
const path = require('path');
const PacketParser = require('../protocol/parser');
const config = require('../config');

class SequenceReplayer {
  constructor(options = {}) {
    this.options = {
      timingFactor: options.timingFactor || 1.0,
      verbose: options.verbose || false,
      validateResponses: options.validateResponses !== false,
      ...options
    };

    this.parser = new PacketParser();
    this.sequences = [];
    this.currentSequence = null;
    this.isReplaying = false;
    this.replayIndex = 0;
    this.expectedResponses = new Map();
    this.results = [];
  }

  /**
   * Load sequence from file
   * @param {string} filePath - Path to sequence file
   * @returns {Promise<Array>} Loaded packets
   */
  async loadSequence(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const packets = this.parser.parseCapturedFile(content);
      
      console.log(`📁 Loaded ${packets.length} packets from ${filePath}`);
      
      // Analyze sequence for timing and responses
      this.analyzeSequence(packets);
      
      return packets;
    } catch (error) {
      throw new Error(`Failed to load sequence: ${error.message}`);
    }
  }

  /**
   * Load multiple sequences
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Array>} All loaded packets
   */
  async loadSequences(filePaths) {
    const allPackets = [];
    
    for (const filePath of filePaths) {
      const packets = await this.loadSequence(filePath);
      allPackets.push(...packets);
    }
    
    return allPackets;
  }

  /**
   * Analyze sequence for timing and response patterns
   * @param {Array} packets - Parsed packets
   */
  analyzeSequence(packets) {
    console.log('🔍 Analyzing sequence patterns...');
    
    const patterns = {
      initSequences: [],
      handshakes: [],
      authentications: [],
      programCommands: [],
      statusResponses: [],
      heartbeats: []
    };

    for (let i = 0; i < packets.length; i++) {
      const packet = packets[i];
      const commandInfo = packet.commandInfo;

      if (!commandInfo) continue;

      // Categorize packets
      switch (commandInfo.type) {
        case 'ACK':
          patterns.heartbeats.push({ index: i, packet });
          break;
        case 'STATUS':
          patterns.statusResponses.push({ index: i, packet });
          break;
        case 'AUTH':
          patterns.authentications.push({ index: i, packet });
          break;
        case 'PROGRAM':
          patterns.programCommands.push({ index: i, packet });
          break;
        case 'FIRMWARE':
        case 'MODEL':
        case 'SERIAL':
          patterns.initSequences.push({ index: i, packet });
          break;
      }
    }

    console.log(`📊 Found patterns:`);
    console.log(`  Init sequences: ${patterns.initSequences.length}`);
    console.log(`  Handshakes: ${patterns.handshakes.length}`);
    console.log(`  Authentications: ${patterns.authentications.length}`);
    console.log(`  Program commands: ${patterns.programCommands.length}`);
    console.log(`  Status responses: ${patterns.statusResponses.length}`);
    console.log(`  Heartbeats: ${patterns.heartbeats.length}`);

    this.sequences = packets;
    this.patterns = patterns;
  }

  /**
   * Replay sequence with timing
   * @param {Function} sendFunction - Function to send packets
   * @param {Function} receiveFunction - Function to receive responses
   * @returns {Promise<Object>} Replay results
   */
  async replaySequence(sendFunction, receiveFunction = null) {
    if (!this.sequences.length) {
      throw new Error('No sequences loaded');
    }

    this.isReplaying = true;
    this.replayIndex = 0;
    this.results = [];

    console.log(`🎬 Starting sequence replay (${this.sequences.length} packets)`);
    console.log(`⏱️  Timing factor: ${this.options.timingFactor}x`);

    const startTime = Date.now();

    try {
      for (let i = 0; i < this.sequences.length; i++) {
        if (!this.isReplaying) {
          break;
        }

        this.replayIndex = i;
        const packet = this.sequences[i];
        
        await this.replayPacket(packet, sendFunction, receiveFunction);
        
        // Calculate timing delay
        const delay = this.calculateTimingDelay(packet, i);
        if (delay > 0) {
          await this.delay(delay);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Replay completed in ${duration}ms`);
      
      return {
        success: true,
        duration: duration,
        packetsSent: this.replayIndex + 1,
        results: this.results
      };

    } catch (error) {
      console.error(`❌ Replay failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        packetsSent: this.replayIndex,
        results: this.results
      };
    } finally {
      this.isReplaying = false;
    }
  }

  /**
   * Replay single packet
   * @param {Object} packet - Packet to replay
   * @param {Function} sendFunction - Send function
   * @param {Function} receiveFunction - Receive function
   */
  async replayPacket(packet, sendFunction, receiveFunction) {
    const packetBuffer = Buffer.from(packet.raw, 'hex');
    
    if (this.options.verbose) {
      console.log(`\n📤 Sending packet ${this.replayIndex + 1}:`);
      console.log(`   Type: ${packet.commandInfo?.type || 'Unknown'}`);
      console.log(`   Name: ${packet.commandInfo?.name || 'Unknown'}`);
      console.log(`   Raw: ${packet.raw}`);
    }

    const startTime = Date.now();
    
    try {
      // Send packet
      await sendFunction(packetBuffer);
      
      const sendTime = Date.now();
      const sendDuration = sendTime - startTime;
      
      // Wait for response if receive function provided
      let response = null;
      if (receiveFunction) {
        response = await this.waitForResponse(receiveFunction, packet);
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Record result
      const result = {
        index: this.replayIndex,
        packet: packet,
        sendDuration: sendDuration,
        totalDuration: totalDuration,
        response: response,
        success: true
      };
      
      this.results.push(result);
      
      if (this.options.verbose) {
        console.log(`   ✅ Sent in ${sendDuration}ms`);
        if (response) {
          console.log(`   📥 Response received in ${totalDuration}ms`);
        }
      }
      
    } catch (error) {
      const result = {
        index: this.replayIndex,
        packet: packet,
        error: error.message,
        success: false
      };
      
      this.results.push(result);
      
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }

  /**
   * Wait for expected response
   * @param {Function} receiveFunction - Receive function
   * @param {Object} sentPacket - Sent packet
   * @returns {Promise<Object>} Response packet
   */
  async waitForResponse(receiveFunction, sentPacket) {
    const timeout = 5000; // 5 second timeout
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await receiveFunction();
      if (response) {
        // Validate response matches expected pattern
        if (this.validateResponse(sentPacket, response)) {
          return response;
        }
      }
      
      await this.delay(10); // Small delay between checks
    }
    
    return null; // Timeout
  }

  /**
   * Validate response matches expected pattern
   * @param {Object} sentPacket - Sent packet
   * @param {Object} response - Received response
   * @returns {boolean} True if valid
   */
  validateResponse(sentPacket, response) {
    if (!this.options.validateResponses) {
      return true;
    }

    const sentCommand = sentPacket.commandInfo;
    const responseCommand = response.commandInfo;

    if (!sentCommand || !responseCommand) {
      return false;
    }

    // Basic response validation
    switch (sentCommand.type) {
      case 'PROGRAM':
        return responseCommand.type === 'ACK' || responseCommand.type === 'STATUS';
      case 'QUERY':
        return responseCommand.type === 'STATUS' || responseCommand.type === 'DATA';
      case 'AUTH':
        return responseCommand.type === 'AUTH';
      default:
        return responseCommand.type === 'ACK';
    }
  }

  /**
   * Calculate timing delay for packet
   * @param {Object} packet - Packet object
   * @param {number} index - Packet index
   * @returns {number} Delay in milliseconds
   */
  calculateTimingDelay(packet, index) {
    const commandInfo = packet.commandInfo;
    if (!commandInfo) return 0;

    let baseDelay = 0;

    // Base timing from protocol specification
    switch (commandInfo.type) {
      case 'ACK':
        baseDelay = 50;
        break;
      case 'STATUS':
        baseDelay = 100;
        break;
      case 'AUTH':
        baseDelay = 200;
        break;
      case 'PROGRAM':
        baseDelay = 500;
        break;
      case 'RESET':
        baseDelay = 1000;
        break;
      default:
        baseDelay = 100;
    }

    // Apply timing factor
    return Math.floor(baseDelay * this.options.timingFactor);
  }

  /**
   * Pause replay
   */
  pause() {
    this.isReplaying = false;
    console.log('⏸️  Replay paused');
  }

  /**
   * Resume replay
   */
  resume() {
    this.isReplaying = true;
    console.log('▶️  Replay resumed');
  }

  /**
   * Stop replay
   */
  stop() {
    this.isReplaying = false;
    console.log('⏹️  Replay stopped');
  }

  /**
   * Get replay status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isReplaying: this.isReplaying,
      currentIndex: this.replayIndex,
      totalPackets: this.sequences.length,
      progress: this.sequences.length > 0 ? (this.replayIndex / this.sequences.length) * 100 : 0
    };
  }

  /**
   * Get replay results
   * @returns {Array} Results array
   */
  getResults() {
    return this.results;
  }

  /**
   * Get replay statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + (r.totalDuration || 0), 0);
    
    return {
      totalPackets: this.results.length,
      successful: successful,
      failed: failed,
      successRate: this.results.length > 0 ? (successful / this.results.length) * 100 : 0,
      averageDuration: this.results.length > 0 ? totalDuration / this.results.length : 0,
      totalDuration: totalDuration
    };
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SequenceReplayer;
