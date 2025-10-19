/**
 * Packet parser for Haier protocol communication
 */

const HexUtils = require('../utils/hex-utils');
const Commands = require('./commands');
const CRC = require('./crc');

class PacketParser {
  constructor() {
    this.commands = new Commands();
    this.crc = new CRC();
    this.buffer = Buffer.alloc(0);
    this.packetCount = 0;
    
    // Initialize CRC reverse engineering
    this.crc.reverseEngineerCRC();
  }

  /**
   * Parse incoming data stream
   * @param {Buffer} data - Incoming data
   * @returns {Array} Array of parsed packets
   */
  parseData(data) {
    // Add new data to buffer
    this.buffer = Buffer.concat([this.buffer, data]);
    
    const packets = [];
    
    // Find and parse complete packets
    while (this.buffer.length > 0) {
      const packet = this.findNextPacket();
      if (!packet) {
        break; // No complete packet found
      }
      
      const parsedPacket = this.parsePacket(packet);
      if (parsedPacket) {
        packets.push(parsedPacket);
        this.packetCount++;
      }
    }
    
    return packets;
  }

  /**
   * Find next complete packet in buffer
   * @returns {Buffer|null} Complete packet or null
   */
  findNextPacket() {
    // Look for FF FF header
    let headerIndex = -1;
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i] === 0xFF && this.buffer[i + 1] === 0xFF) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex === -1) {
      // No header found, clear buffer
      this.buffer = Buffer.alloc(0);
      return null;
    }
    
    // Remove data before header
    if (headerIndex > 0) {
      this.buffer = this.buffer.slice(headerIndex);
    }
    
    // Check if we have enough data for length byte
    if (this.buffer.length < 3) {
      return null;
    }
    
    const length = this.buffer[2];
    const totalLength = 3 + length; // header + length + payload + CRC
    
    // Check if we have complete packet
    if (this.buffer.length < totalLength) {
      return null;
    }
    
    // Extract complete packet
    const packet = this.buffer.slice(0, totalLength);
    this.buffer = this.buffer.slice(totalLength);
    
    return packet;
  }

  /**
   * Parse complete packet
   * @param {Buffer} packet - Complete packet buffer
   * @returns {Object|null} Parsed packet object
   */
  parsePacket(packet) {
    try {
      // Basic packet structure validation
      if (packet.length < 6) {
        return this.createErrorPacket(packet, 'Packet too short');
      }
      
      if (packet[0] !== 0xFF || packet[1] !== 0xFF) {
        return this.createErrorPacket(packet, 'Invalid header');
      }
      
      const length = packet[2];
      const frameType = packet[3];
      const sequence = packet.readUInt32BE(4);
      
      // For captured data, we need to be more flexible with length validation
      // Some packets might have different structures
      let commandStart, commandEnd, payload, receivedCRC;
      
      if (packet.length >= 3 + length) {
        // Standard packet structure
        commandStart = 8;
        commandEnd = Math.min(commandStart + 2, packet.length - 3);
        command = packet.slice(commandStart, commandEnd);
        payload = packet.slice(commandEnd, packet.length - 3);
        receivedCRC = packet.slice(-3);
      } else {
        // Handle packets that don't follow standard structure
        commandStart = 8;
        commandEnd = Math.min(commandStart + 2, packet.length);
        command = packet.slice(commandStart, commandEnd);
        payload = packet.slice(commandEnd);
        receivedCRC = Buffer.alloc(0);
      }
      
      // Validate CRC only if we have enough data
      let crcValidation = { valid: false, algorithm: 'unknown', reason: 'insufficient data' };
      if (packet.length >= 6) {
        crcValidation = this.crc.validatePacket(packet);
      }
      
      // Get command information
      const commandInfo = this.commands.getCommandInfo(packet);
      
      // Create parsed packet object
      const parsedPacket = {
        id: this.packetCount,
        timestamp: new Date(),
        length: packet.length,
        frameType: frameType,
        sequence: sequence,
        command: command.toString('hex').toUpperCase(),
        payload: payload.toString('hex').toUpperCase(),
        receivedCRC: receivedCRC.toString('hex').toUpperCase(),
        crcValid: crcValidation.valid,
        crcAlgorithm: crcValidation.algorithm || 'unknown',
        crcReason: crcValidation.reason || null,
        commandInfo: commandInfo,
        raw: packet.toString('hex').toUpperCase(),
        hexDump: HexUtils.hexDump(packet)
      };
      
      // Add ASCII strings if present
      const asciiStrings = HexUtils.findASCIIStrings(packet);
      if (asciiStrings.length > 0) {
        parsedPacket.asciiStrings = asciiStrings;
      }
      
      return parsedPacket;
      
    } catch (error) {
      return this.createErrorPacket(packet, `Parse error: ${error.message}`);
    }
  }

  /**
   * Create error packet object
   * @param {Buffer} packet - Raw packet
   * @param {string} error - Error message
   * @returns {Object} Error packet object
   */
  createErrorPacket(packet, error) {
    return {
      id: this.packetCount,
      timestamp: new Date(),
      length: packet.length,
      error: error,
      raw: packet.toString('hex').toUpperCase(),
      hexDump: HexUtils.hexDump(packet),
      commandInfo: {
        type: 'ERROR',
        name: 'Parse Error',
        description: error
      }
    };
  }

  /**
   * Parse packet from hex string
   * @param {string} hexString - Hex string
   * @returns {Object|null} Parsed packet
   */
  parseHexString(hexString) {
    try {
      const packet = HexUtils.hexToBuffer(hexString);
      return this.parsePacket(packet);
    } catch (error) {
      return this.createErrorPacket(Buffer.alloc(0), `Hex parse error: ${error.message}`);
    }
  }

  /**
   * Parse captured data file
   * @param {string} fileContent - File content
   * @returns {Array} Array of parsed packets
   */
  parseCapturedFile(fileContent) {
    const lines = fileContent.split('\n');
    const packets = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '00') {
        continue;
      }
      
      const packet = this.parseHexString(line);
      if (packet) {
        packet.lineNumber = i + 1;
        packets.push(packet);
      }
    }
    
    return packets;
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      packetsParsed: this.packetCount,
      bufferSize: this.buffer.length,
      crcStats: this.crc.getStats()
    };
  }

  /**
   * Clear parser buffer
   */
  clearBuffer() {
    this.buffer = Buffer.alloc(0);
  }

  /**
   * Reset parser state
   */
  reset() {
    this.buffer = Buffer.alloc(0);
    this.packetCount = 0;
  }
}

module.exports = PacketParser;
