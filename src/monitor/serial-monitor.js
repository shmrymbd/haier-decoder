/**
 * Serial port monitor for Haier protocol communication
 */

const { SerialPort } = require('serialport');
const PacketParser = require('../protocol/parser');
const PacketLogger = require('./packet-logger');
const config = require('../config');

class SerialMonitor {
  constructor(options = {}) {
    this.options = {
      port: options.port,
      baudRate: options.baudRate || config.serial.baudRate,
      dataBits: options.dataBits || config.serial.dataBits,
      parity: options.parity || config.serial.parity,
      stopBits: options.stopBits || config.serial.stopBits,
      flowControl: options.flowControl || config.serial.flowControl,
      autoReconnect: options.autoReconnect !== false,
      reconnectDelay: options.reconnectDelay || 5000,
      ...options
    };

    this.parser = new PacketParser();
    this.logger = new PacketLogger({
      verbose: options.verbose || false,
      logFile: options.logFile || 'logs/haier-protocol.log'
    });

    this.port = null;
    this.isConnected = false;
    this.isMonitoring = false;
    this.reconnectTimer = null;
    this.packetHandlers = [];
  }

  /**
   * Start monitoring serial port
   * @returns {Promise} Connection promise
   */
  async start() {
    try {
      await this.connect();
      this.isMonitoring = true;
      this.logger.logSessionStart(this.options.port, this.options);
      
      // Start periodic statistics logging
      this.statsTimer = setInterval(() => {
        const stats = this.parser.getStats();
        this.logger.logStats(stats);
      }, 30000); // Every 30 seconds
      
      return true;
    } catch (error) {
      this.logger.logConnectionError(error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stop() {
    this.isMonitoring = false;
    
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    await this.disconnect();
    this.logger.logSessionEnd('user_requested');
  }

  /**
   * Connect to serial port
   * @returns {Promise} Connection promise
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = new SerialPort({
          path: this.options.port,
          baudRate: this.options.baudRate,
          dataBits: this.options.dataBits,
          parity: this.options.parity,
          stopBits: this.options.stopBits,
          flowControl: this.options.flowControl,
          autoOpen: false
        });

        this.port.on('open', () => {
          console.log(`✅ Connected to ${this.options.port}`);
          this.isConnected = true;
          resolve();
        });

        this.port.on('data', (data) => {
          this.handleData(data);
        });

        this.port.on('error', (error) => {
          console.error(`❌ Serial port error: ${error.message}`);
          this.isConnected = false;
          
          if (this.options.autoReconnect && this.isMonitoring) {
            this.scheduleReconnect();
          }
        });

        this.port.on('close', () => {
          console.log(`🔌 Disconnected from ${this.options.port}`);
          this.isConnected = false;
          
          if (this.options.autoReconnect && this.isMonitoring) {
            this.scheduleReconnect();
          }
        });

        this.port.open((error) => {
          if (error) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from serial port
   * @returns {Promise} Disconnection promise
   */
  async disconnect() {
    return new Promise((resolve) => {
      if (this.port && this.port.isOpen) {
        this.port.close((error) => {
          if (error) {
            console.error(`Error closing port: ${error.message}`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming data
   * @param {Buffer} data - Incoming data
   */
  handleData(data) {
    try {
      const packets = this.parser.parseData(data);
      
      for (const packet of packets) {
        this.logger.logPacket(packet, 'received');
        this.notifyPacketHandlers(packet, 'received');
      }
    } catch (error) {
      console.error(`Error parsing data: ${error.message}`);
    }
  }

  /**
   * Send packet to serial port
   * @param {Buffer|string} packet - Packet to send
   * @returns {Promise} Send promise
   */
  async sendPacket(packet) {
    if (!this.isConnected) {
      throw new Error('Not connected to serial port');
    }

    return new Promise((resolve, reject) => {
      let packetBuffer;
      
      if (typeof packet === 'string') {
        // Convert hex string to buffer
        packetBuffer = Buffer.from(packet.replace(/\s+/g, ''), 'hex');
      } else {
        packetBuffer = packet;
      }

      this.port.write(packetBuffer, (error) => {
        if (error) {
          reject(error);
        } else {
          // Parse and log the sent packet
          const parsedPacket = this.parser.parsePacket(packetBuffer);
          if (parsedPacket) {
            this.logger.logPacket(parsedPacket, 'sent');
            this.notifyPacketHandlers(parsedPacket, 'sent');
          }
          resolve();
        }
      });
    });
  }

  /**
   * Send hex string packet
   * @param {string} hexString - Hex string packet
   * @returns {Promise} Send promise
   */
  async sendHexPacket(hexString) {
    return this.sendPacket(hexString);
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    console.log(`🔄 Scheduling reconnection in ${this.options.reconnectDelay}ms...`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (this.isMonitoring && !this.isConnected) {
        try {
          console.log('🔄 Attempting to reconnect...');
          await this.connect();
        } catch (error) {
          console.error(`Reconnection failed: ${error.message}`);
          this.scheduleReconnect();
        }
      }
    }, this.options.reconnectDelay);
  }

  /**
   * Add packet handler
   * @param {Function} handler - Packet handler function
   */
  addPacketHandler(handler) {
    this.packetHandlers.push(handler);
  }

  /**
   * Remove packet handler
   * @param {Function} handler - Packet handler function
   */
  removePacketHandler(handler) {
    const index = this.packetHandlers.indexOf(handler);
    if (index > -1) {
      this.packetHandlers.splice(index, 1);
    }
  }

  /**
   * Notify packet handlers
   * @param {Object} packet - Parsed packet
   * @param {string} direction - Packet direction
   */
  notifyPacketHandlers(packet, direction) {
    for (const handler of this.packetHandlers) {
      try {
        handler(packet, direction);
      } catch (error) {
        console.error(`Packet handler error: ${error.message}`);
      }
    }
  }

  /**
   * Get connection status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      connected: this.isConnected,
      monitoring: this.isMonitoring,
      port: this.options.port,
      baudRate: this.options.baudRate,
      packetCount: this.parser.getStats().packetsParsed,
      sessionId: this.logger.getSessionId()
    };
  }

  /**
   * Get parser statistics
   * @returns {Object} Parser statistics
   */
  getStats() {
    return this.parser.getStats();
  }

  /**
   * Clear parser buffer
   */
  clearBuffer() {
    this.parser.clearBuffer();
  }

  /**
   * Reset parser state
   */
  reset() {
    this.parser.reset();
  }

  /**
   * List available serial ports
   * @returns {Promise<Array>} Available ports
   */
  static async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        locationId: port.locationId,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      throw new Error(`Failed to list ports: ${error.message}`);
    }
  }
}

module.exports = SerialMonitor;
