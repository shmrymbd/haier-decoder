/**
 * Configuration constants for Haier Protocol Serial Monitor
 */

module.exports = {
  // Serial port settings
  serial: {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    autoOpen: false
  },

  // Timing parameters from PROTOCOL_SPECIFICATION.md
  timing: {
    sessionInit: 100,      // ms after session init
    handshake: 50,          // ms after handshake
    authentication: 200,    // ms after authentication
    heartbeat: 3000,        // ms between heartbeats
    programCommand: 500,    // ms after program command
    resetCommand: 1000,     // ms after reset command
    queryRetry: 3000,       // ms for query retry
    sessionTimeout: 15000   // ms for session timeout
  },

  // Logging configuration
  logging: {
    console: {
      level: 'info',
      format: 'colored'
    },
    file: {
      level: 'debug',
      filename: 'logs/haier-protocol.log',
      maxSize: '10MB',
      maxFiles: 5
    }
  },

  // CRC algorithms to test
  crcAlgorithms: [
    { name: 'CRC-16-CCITT', poly: 0x1021, init: 0xFFFF, xorOut: 0x0000 },
    { name: 'CRC-16-Modbus', poly: 0x8005, init: 0xFFFF, xorOut: 0x0000 },
    { name: 'CRC-16-IBM', poly: 0x8005, init: 0x0000, xorOut: 0x0000 },
    { name: 'CRC-16-ANSI', poly: 0x8005, init: 0xFFFF, xorOut: 0x0000 },
    { name: 'CRC-16-USB', poly: 0x8005, init: 0xFFFF, xorOut: 0xFFFF }
  ],

  // Known packet CRC lookup table
  knownPackets: [
    {
      name: 'Standard ACK',
      data: 'ff ff 08 40 00 00 00 00 00 05 4d 61',
      crc: '80',
      description: 'Standard acknowledgment packet'
    },
    {
      name: 'Program 1',
      data: 'ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00',
      crc: 'b0 34 ad',
      description: 'Start program 1 command'
    },
    {
      name: 'Program 2',
      data: 'ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00',
      crc: 'b1 70 ad',
      description: 'Start program 2 command'
    },
    {
      name: 'Program 3',
      data: 'ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00',
      crc: 'b2 8c ac',
      description: 'Start program 3 command'
    },
    {
      name: 'Program 4',
      data: 'ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00',
      crc: 'b3 f8 ad',
      description: 'Start program 4 command'
    },
    {
      name: 'Reset Command',
      data: 'ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01',
      crc: 'ca bb 9b',
      description: 'Reset to standby command'
    },
    {
      name: 'Control Signal',
      data: 'ff ff 08 40 00 00 00 00 00 09 51 64',
      crc: '80',
      description: 'Control signal heartbeat'
    }
  ],

  // Packet types and their identifiers
  packetTypes: {
    ACK: '4d 61',
    STATUS: '6d 01',
    DATA: '6d 02',
    AUTH: '10 02',
    FIRMWARE: '62',
    MODEL: 'ec',
    SERIAL: 'ea',
    RESET: '0f 5a',
    DEVICE_ID: '11 00 f0',
    TIMESTAMP: '11 10 00',
    COMPLEX: 'f7',
    QUERY: 'f3',
    QUERY_RESPONSE: 'f5',
    CONTROL: '51 64'
  },

  // Status codes
  statusCodes: {
    READY: '01 30 30',
    READY_PARAM: '01 30 10',
    BUSY: '02 b0 31',
    RESET_PROGRESS: '04 30 30',
    PROGRAM_RUNNING: (prog) => `${prog.toString(16).padStart(2, '0')} b0 31`
  }
};
