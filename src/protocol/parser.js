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
    // We need at least 4 bytes to read flags to determine CRC presence
    if (this.buffer.length < 4) {
      return null;
    }
    const flags = this.buffer[3];
    const hasCRC = (flags & 0x40) === 0x40;
    // Total packet length = 2 (sep) + 1 (len) + length + (CRC? 2 : 0)
    const totalLength = 3 + length + (hasCRC ? 2 : 0);
    
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
      if (packet.length < 8) {
        return this.createErrorPacket(packet, 'Packet too short');
      }
      if (packet[0] !== 0xFF || packet[1] !== 0xFF) {
        return this.createErrorPacket(packet, 'Invalid header');
      }

      const frameLength = packet[2];
      const flags = packet[3];
      const hasCRC = (flags & 0x40) === 0x40;
      const reserved = packet.slice(4, 9);
      const frameType = packet[9];

      // Determine indexes for checksum and CRC
      const checksumIndex = packet.length - (hasCRC ? 3 : 1);
      // Allow zero-length data (checksumIndex can equal dataStart)
      if (checksumIndex < 10) {
        return this.createErrorPacket(packet, 'Invalid frame length');
      }
      const checksum = packet[checksumIndex];
      const crcBytes = hasCRC ? packet.slice(-2) : Buffer.alloc(0);

      // Frame data is between type and checksum
      const dataStart = 10;
      const dataEnd = checksumIndex;
      const frameData = packet.slice(dataStart, dataEnd);

      // Command heuristic: first 1-2 bytes of data if present
      const command = frameData.slice(0, Math.min(2, frameData.length));
      const payload = frameData.slice(command.length);

      // Validate checksum (LSB of sum of flags+reserved+type+data)
      const sumData = Buffer.concat([Buffer.from([flags]), reserved, Buffer.from([frameType]), frameData]);
      let sum = 0;
      for (let i = 0; i < sumData.length; i++) sum = (sum + sumData[i]) & 0xFF;
      const checksumValid = sum === checksum;

      // Validate CRC if present
      let crcValidation = { valid: !hasCRC, algorithm: hasCRC ? 'unknown' : 'none' };
      if (hasCRC) {
        crcValidation = this.crc.validatePacket(packet);
      }

      // Get command information
      const commandInfo = this.commands.getCommandInfo(packet);

      // Create parsed packet object
      const parsedPacket = {
        id: this.packetCount,
        timestamp: new Date(),
        length: packet.length,
        frameLength,
        flags,
        hasCRC,
        reserved: reserved.toString('hex').toUpperCase(),
        frameType,
        command: command.toString('hex').toUpperCase(),
        payload: payload.toString('hex').toUpperCase(),
        checksum: checksum.toString(16).padStart(2, '0').toUpperCase(),
        checksumValid,
        receivedCRC: crcBytes.toString('hex').toUpperCase(),
        crcValid: crcValidation.valid,
        crcAlgorithm: crcValidation.algorithm || 'unknown',
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
