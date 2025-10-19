/**
 * Command definitions and structures for Haier protocol
 */

const config = require('../config');

class Commands {
  constructor() {
    this.packetTypes = config.packetTypes;
    this.statusCodes = config.statusCodes;
  }

  /**
   * Get command information by packet data
   * @param {Buffer} packet - Packet buffer
   * @returns {Object} Command information
   */
  getCommandInfo(packet) {
    if (packet.length < 6) {
      return { type: 'UNKNOWN', name: 'Invalid Packet', description: 'Packet too short' };
    }

    const commandBytes = packet.slice(6, 8);
    const commandHex = commandBytes.toString('hex').toUpperCase();
    
    // Check for known command patterns
    const commandInfo = this.identifyCommand(packet, commandBytes, commandHex);
    
    return commandInfo;
  }

  /**
   * Identify command type and details
   * @param {Buffer} packet - Complete packet
   * @param {Buffer} commandBytes - Command bytes
   * @param {string} commandHex - Command hex string
   * @returns {Object} Command information
   */
  identifyCommand(packet, commandBytes, commandHex) {
    // Standard ACK
    if (commandHex === '4D61') {
      return {
        type: 'ACK',
        name: 'Standard ACK',
        description: 'General acknowledgment',
        direction: this.getDirection(packet),
        sequence: this.getSequence(packet)
      };
    }

    // Control Signal
    if (commandHex === '5164') {
      return {
        type: 'CONTROL',
        name: 'Control Signal',
        description: 'Control heartbeat signal',
        direction: this.getDirection(packet),
        sequence: this.getSequence(packet)
      };
    }

    // Status Response
    if (commandHex === '6D01') {
      return this.parseStatusResponse(packet);
    }

    // Data Response
    if (commandHex === '6D02') {
      return this.parseDataResponse(packet);
    }

    // Authentication
    if (commandHex === '1002') {
      return this.parseAuthentication(packet);
    }

    // Firmware Info
    if (commandHex === '62') {
      return this.parseFirmwareInfo(packet);
    }

    // Model Number
    if (commandHex === 'EC') {
      return this.parseModelInfo(packet);
    }

    // Serial Number
    if (commandHex === 'EA') {
      return this.parseSerialInfo(packet);
    }

    // Device ID
    if (commandHex === '1100F0') {
      return this.parseDeviceID(packet);
    }

    // Timestamp
    if (commandHex === '111000') {
      return this.parseTimestamp(packet);
    }

    // Reset Confirmation
    if (commandHex === '0F5A') {
      return this.parseResetConfirmation(packet);
    }

    // Program Commands
    if (commandHex === '6000') {
      return this.parseProgramCommand(packet);
    }

    // Reset Command
    if (commandHex === '5D1F0001') {
      return this.parseResetCommand(packet);
    }

    // Complex Command
    if (commandHex === 'F7') {
      return this.parseComplexCommand(packet);
    }

    // Query Commands
    if (commandHex === 'F3') {
      return this.parseQueryCommand(packet);
    }

    if (commandHex === 'F5') {
      return this.parseQueryResponse(packet);
    }

    // Unknown command
    return {
      type: 'UNKNOWN',
      name: `Unknown Command (${commandHex})`,
      description: 'Unrecognized command',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      rawCommand: commandHex
    };
  }

  /**
   * Parse status response packet
   * @param {Buffer} packet - Status response packet
   * @returns {Object} Parsed status information
   */
  parseStatusResponse(packet) {
    const statusBytes = packet.slice(8, 11);
    const statusHex = statusBytes.toString('hex').toUpperCase();
    
    let statusInfo = {
      type: 'STATUS',
      name: 'Status Response',
      description: 'Machine status update',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      status: statusHex
    };

    // Parse status codes
    if (statusHex === '013030') {
      statusInfo.statusText = 'Ready/Standby';
      statusInfo.machineState = 'ready';
    } else if (statusHex === '013010') {
      statusInfo.statusText = 'Ready with Parameters';
      statusInfo.machineState = 'ready';
    } else if (statusHex === '02B031') {
      statusInfo.statusText = 'Busy/Error';
      statusInfo.machineState = 'busy';
    } else if (statusHex === '043030') {
      statusInfo.statusText = 'Reset in Progress';
      statusInfo.machineState = 'resetting';
    } else if (statusHex.match(/^0[1-4]B031$/)) {
      const program = parseInt(statusHex[1], 16);
      statusInfo.statusText = `Program ${program} Running`;
      statusInfo.machineState = 'running';
      statusInfo.program = program;
    }

    // Parse configuration parameters if present
    if (packet.length > 11) {
      statusInfo.config = this.parseConfigParameters(packet.slice(11));
    }

    return statusInfo;
  }

  /**
   * Parse data response packet
   * @param {Buffer} packet - Data response packet
   * @returns {Object} Parsed data information
   */
  parseDataResponse(packet) {
    return {
      type: 'DATA',
      name: 'Data Response',
      description: 'Extended program configuration data',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      dataLength: packet.length - 11,
      config: this.parseConfigParameters(packet.slice(8))
    };
  }

  /**
   * Parse authentication packet
   * @param {Buffer} packet - Authentication packet
   * @returns {Object} Parsed authentication information
   */
  parseAuthentication(packet) {
    const challengeBytes = packet.slice(8, 16);
    const challengeASCII = challengeBytes.toString('ascii').replace(/\0/g, '');
    
    return {
      type: 'AUTH',
      name: 'Authentication',
      description: 'Rolling code authentication',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      challenge: challengeASCII,
      challengeHex: challengeBytes.toString('hex').toUpperCase(),
      encryptedData: packet.slice(17).toString('hex').toUpperCase()
    };
  }

  /**
   * Parse firmware information
   * @param {Buffer} packet - Firmware packet
   * @returns {Object} Parsed firmware information
   */
  parseFirmwareInfo(packet) {
    const asciiStrings = this.extractASCIIStrings(packet);
    
    return {
      type: 'FIRMWARE',
      name: 'Firmware Information',
      description: 'Device firmware and version info',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      firmware: asciiStrings.find(s => s.includes('E++')) || 'Unknown',
      date: asciiStrings.find(s => /^\d{8}$/.test(s)) || 'Unknown',
      typeCode: asciiStrings.find(s => s.includes('U-WMT')) || 'Unknown'
    };
  }

  /**
   * Parse model information
   * @param {Buffer} packet - Model packet
   * @returns {Object} Parsed model information
   */
  parseModelInfo(packet) {
    const asciiStrings = this.extractASCIIStrings(packet);
    
    return {
      type: 'MODEL',
      name: 'Model Information',
      description: 'Device model and manufacture info',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      model: asciiStrings.find(s => /^[A-Z0-9]+$/.test(s) && s.length > 5) || 'Unknown',
      date: asciiStrings.find(s => /^\d{8}$/.test(s)) || 'Unknown'
    };
  }

  /**
   * Parse serial number information
   * @param {Buffer} packet - Serial packet
   * @returns {Object} Parsed serial information
   */
  parseSerialInfo(packet) {
    const asciiStrings = this.extractASCIIStrings(packet);
    
    return {
      type: 'SERIAL',
      name: 'Serial Number',
      description: 'Device serial number and date',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      serial: asciiStrings.find(s => s.length > 10) || 'Unknown',
      date: asciiStrings.find(s => /^\d{8}$/.test(s)) || 'Unknown'
    };
  }

  /**
   * Parse device ID
   * @param {Buffer} packet - Device ID packet
   * @returns {Object} Parsed device ID information
   */
  parseDeviceID(packet) {
    const imeiBytes = packet.slice(11, -3);
    const imei = imeiBytes.toString('ascii').replace(/\0/g, '');
    
    return {
      type: 'DEVICE_ID',
      name: 'Device ID',
      description: 'Modem IMEI identifier',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      imei: imei
    };
  }

  /**
   * Parse timestamp packet
   * @param {Buffer} packet - Timestamp packet
   * @returns {Object} Parsed timestamp information
   */
  parseTimestamp(packet) {
    const timestampBytes = packet.slice(11, 19);
    const timestamp = this.parseTimestampBytes(timestampBytes);
    
    return {
      type: 'TIMESTAMP',
      name: 'Timestamp Sync',
      description: 'Clock synchronization',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      timestamp: timestamp,
      raw: timestampBytes.toString('hex').toUpperCase()
    };
  }

  /**
   * Parse reset confirmation
   * @param {Buffer} packet - Reset confirmation packet
   * @returns {Object} Parsed reset information
   */
  parseResetConfirmation(packet) {
    return {
      type: 'RESET',
      name: 'Reset Confirmation',
      description: 'Reset operation completion',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet)
    };
  }

  /**
   * Parse program command
   * @param {Buffer} packet - Program command packet
   * @returns {Object} Parsed program information
   */
  parseProgramCommand(packet) {
    const programByte = packet[10];
    const program = programByte;
    
    return {
      type: 'PROGRAM',
      name: `Program ${program} Command`,
      description: `Start wash program ${program}`,
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      program: program
    };
  }

  /**
   * Parse reset command
   * @param {Buffer} packet - Reset command packet
   * @returns {Object} Parsed reset command information
   */
  parseResetCommand(packet) {
    return {
      type: 'RESET_CMD',
      name: 'Reset Command',
      description: 'Return device to standby',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet)
    };
  }

  /**
   * Parse complex command
   * @param {Buffer} packet - Complex command packet
   * @returns {Object} Parsed complex command information
   */
  parseComplexCommand(packet) {
    return {
      type: 'COMPLEX',
      name: 'Complex Command',
      description: 'Multi-parameter program command',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet),
      dataLength: packet.length - 11
    };
  }

  /**
   * Parse query command
   * @param {Buffer} packet - Query command packet
   * @returns {Object} Parsed query information
   */
  parseQueryCommand(packet) {
    return {
      type: 'QUERY',
      name: 'Status Query',
      description: 'Request machine status',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet)
    };
  }

  /**
   * Parse query response
   * @param {Buffer} packet - Query response packet
   * @returns {Object} Parsed query response information
   */
  parseQueryResponse(packet) {
    return {
      type: 'QUERY_RESPONSE',
      name: 'Query Response',
      description: 'Query acknowledgment',
      direction: this.getDirection(packet),
      sequence: this.getSequence(packet)
    };
  }

  /**
   * Get packet direction (sent/received)
   * @param {Buffer} packet - Packet buffer
   * @returns {string} Direction
   */
  getDirection(packet) {
    // This would need to be determined by context
    // For now, return unknown
    return 'unknown';
  }

  /**
   * Get sequence number from packet
   * @param {Buffer} packet - Packet buffer
   * @returns {number} Sequence number
   */
  getSequence(packet) {
    if (packet.length < 6) return 0;
    return packet.readUInt32BE(2);
  }

  /**
   * Extract ASCII strings from buffer
   * @param {Buffer} buffer - Buffer to search
   * @returns {Array} Array of ASCII strings
   */
  extractASCIIStrings(buffer) {
    const strings = [];
    let current = '';
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      if (byte >= 32 && byte <= 126) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= 3) {
          strings.push(current);
        }
        current = '';
      }
    }
    
    if (current.length >= 3) {
      strings.push(current);
    }
    
    return strings;
  }

  /**
   * Parse configuration parameters
   * @param {Buffer} configData - Configuration data
   * @returns {Object} Parsed configuration
   */
  parseConfigParameters(configData) {
    if (configData.length < 10) {
      return { raw: configData.toString('hex').toUpperCase() };
    }

    return {
      programSlots: configData[0],
      programParams: configData.slice(1, 6).toString('hex').toUpperCase(),
      timeSettings: configData.slice(6, 10).toString('hex').toUpperCase(),
      raw: configData.toString('hex').toUpperCase()
    };
  }

  /**
   * Parse timestamp bytes
   * @param {Buffer} timestampBytes - Timestamp bytes
   * @returns {Object} Parsed timestamp
   */
  parseTimestampBytes(timestampBytes) {
    // This is a simplified parser - real implementation would need
    // to understand the actual timestamp format
    return {
      raw: timestampBytes.toString('hex').toUpperCase(),
      unix: timestampBytes.readUInt32BE(0),
      components: {
        year: timestampBytes[4],
        month: timestampBytes[5],
        day: timestampBytes[6],
        hour: timestampBytes[7]
      }
    };
  }
}

module.exports = Commands;
