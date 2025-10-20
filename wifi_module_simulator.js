/**
 * Haier Smart Home WiFi Module Communication Simulator
 * Simulates communication between WiFi module and smart home machine
 * Based on Haier Smart Home Open Platform Protocol
 */

class WiFiModuleSimulator {
    constructor() {
        this.frameId = 0x01; // Starting frame ID
        this.deviceAddress = 0x40; // Default device address
        this.moduleAddress = 0x00; // Module address
        this.communicationLog = [];
        this.isConnected = false;
        this.deviceStatus = {
            power: false,
            temperature: 25,
            mode: 'auto',
            alarm: false
        };
    }

    /**
     * Generate frame header (FF FF)
     */
    generateFrameHeader() {
        return [0xFF, 0xFF];
    }

    /**
     * Calculate frame length (excluding header and CRC)
     */
    calculateFrameLength(data) {
        return data.length + 1; // +1 for checksum
    }

    /**
     * Generate address identifier
     */
    generateAddressIdentifier(source, destination) {
        return [source, destination, 0x00, 0x00, 0x00, 0x00, 0x00];
    }

    /**
     * Calculate accumulative checksum
     */
    calculateChecksum(frameLength, data) {
        let sum = frameLength;
        for (let byte of data) {
            sum += byte;
        }
        return sum & 0xFF; // Return low byte
    }

    /**
     * Calculate CRC16 checksum
     */
    calculateCRC16(data) {
        let crc = 0xFFFF;
        for (let byte of data) {
            crc ^= byte;
            for (let i = 0; i < 8; i++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc = crc >> 1;
                }
            }
        }
        return crc;
    }

    /**
     * Handle 0xFF escape sequences
     */
    escapeData(data) {
        const escaped = [];
        for (let byte of data) {
            escaped.push(byte);
            if (byte === 0xFF) {
                escaped.push(0x55);
            }
        }
        return escaped;
    }

    /**
     * Build complete frame
     */
    buildFrame(frameType, data, useCRC = false) {
        const header = this.generateFrameHeader();
        const addressId = this.generateAddressIdentifier(this.moduleAddress, this.deviceAddress);
        const frameData = [frameType, ...data];
        const frameLength = this.calculateFrameLength(addressId.concat(frameData));
        
        let frame = header.concat([frameLength], addressId, frameData);
        
        // Calculate checksum
        const checksumData = frame.slice(2); // Exclude header
        const checksum = this.calculateChecksum(frameLength, checksumData);
        frame.push(checksum);
        
        // Add CRC if needed
        if (useCRC) {
            const crc = this.calculateCRC16(checksumData);
            frame.push(crc & 0xFF);
            frame.push((crc >> 8) & 0xFF);
        }
        
        // Handle 0xFF escape sequences
        frame = this.escapeData(frame);
        
        return frame;
    }

    /**
     * Simulate power-up process
     */
    simulatePowerUp() {
        console.log("🔌 Starting power-up process...");
        
        // Step 1: Module sends power-up frame
        const powerUpData = [0x0F, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        const powerUpFrame = this.buildFrame(0x04, powerUpData);
        
        this.logCommunication("modem", powerUpFrame, "Power-up initialization");
        
        // Step 2: Machine responds with acknowledgment
        setTimeout(() => {
            const ackFrame = this.buildFrame(0x61, [0x00]);
            this.logCommunication("machine", ackFrame, "Power-up acknowledgment");
            
            // Step 3: Module sends device information
            setTimeout(() => {
                const deviceInfo = this.buildFrame(0x62, [
                    0x45, 0x2B, 0x2B, 0x32, 0x2E, 0x31, 0x37, 0x00, // Version info
                    0x32, 0x30, 0x32, 0x34, 0x31, 0x32, 0x32, 0x34, // Date
                    0xF1, 0x00, 0x00, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x00,
                    0x55, 0x2D, 0x57, 0x4D, 0x54, 0x00, 0x00, 0x00, 0x00
                ]);
                this.logCommunication("modem", deviceInfo, "Device information");
                
                this.isConnected = true;
                console.log("✅ Power-up process completed");
            }, 100);
        }, 50);
    }

    /**
     * Simulate normal control process
     */
    simulateControlCommand(command, value) {
        if (!this.isConnected) {
            console.log("❌ Device not connected. Please run power-up first.");
            return;
        }

        console.log(`🎮 Sending control command: ${command} = ${value}`);
        
        // Module sends control command
        const controlData = [0x01, 0x4D, 0x01, value];
        const controlFrame = this.buildFrame(0xF3, controlData);
        this.logCommunication("modem", controlFrame, `Control: ${command}=${value}`);
        
        // Machine responds with acknowledgment
        setTimeout(() => {
            const ackFrame = this.buildFrame(0x4D, [0x61, 0x80]);
            this.logCommunication("machine", ackFrame, "Control acknowledgment");
            
            // Update device status
            this.updateDeviceStatus(command, value);
        }, 50);
    }

    /**
     * Simulate active reporting process
     */
    simulateStatusReporting() {
        if (!this.isConnected) {
            console.log("❌ Device not connected. Please run power-up first.");
            return;
        }

        console.log("📊 Simulating status reporting...");
        
        // Machine sends status report
        const statusData = [
            0x01, 0x30, 0x10, 0x03, 0x00, 0x00, 0x00, 0x20, 0x04, 0x03, 0x05, 0x01,
            0x00, 0x01, 0x02, 0x30, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x0F, 0x08, 0x14,
            0x05, 0x05, 0x06, 0x05, 0x04, 0x1A, 0x04, 0x1A, 0x04, 0x1A, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00
        ];
        const statusFrame = this.buildFrame(0x6D, statusData);
        this.logCommunication("machine", statusFrame, "Status report");
        
        // Module responds with acknowledgment
        setTimeout(() => {
            const ackFrame = this.buildFrame(0x4D, [0x61, 0x80]);
            this.logCommunication("modem", ackFrame, "Status acknowledgment");
        }, 50);
    }

    /**
     * Simulate alarm process
     */
    simulateAlarm(alarmType = "temperature_high") {
        if (!this.isConnected) {
            console.log("❌ Device not connected. Please run power-up first.");
            return;
        }

        console.log(`🚨 Simulating alarm: ${alarmType}`);
        
        // Machine sends alarm frame
        const alarmData = [0x10, 0x02, 0x00, 0x01, 0xD9, 0x93, 0xE4, 0xC8, 0xD3, 0x74, 0x95, 0x1C, 0x01, 0xA3, 0xEF, 0x0F, 0x08, 0xCD, 0xB4, 0x54, 0xFE, 0x10, 0xFC, 0xCF, 0x0A, 0x5E, 0x52, 0xA0, 0xD0, 0x1C, 0xF4, 0x35];
        const alarmFrame = this.buildFrame(0x12, alarmData);
        this.logCommunication("machine", alarmFrame, `Alarm: ${alarmType}`);
        
        // Module responds with acknowledgment (within 50ms as per spec)
        setTimeout(() => {
            const ackFrame = this.buildFrame(0x4D, [0x61, 0x80]);
            this.logCommunication("modem", ackFrame, "Alarm acknowledgment");
        }, 30);
    }

    /**
     * Simulate network status query
     */
    simulateNetworkStatusQuery() {
        if (!this.isConnected) {
            console.log("❌ Device not connected. Please run power-up first.");
            return;
        }

        console.log("🌐 Querying network status...");
        
        // Module sends network status query
        const queryData = [0x01, 0x03, 0x01, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x02, 0x06, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x04, 0x00, 0x01];
        const queryFrame = this.buildFrame(0xF7, queryData);
        this.logCommunication("modem", queryFrame, "Network status query");
        
        // Machine responds with network status
        setTimeout(() => {
            const statusData = [0x00, 0x00, 0x3D, 0xD0, 0xE1];
            const statusFrame = this.buildFrame(0xF5, statusData);
            this.logCommunication("machine", statusFrame, "Network status response");
        }, 100);
    }

    /**
     * Update device status
     */
    updateDeviceStatus(command, value) {
        switch (command) {
            case 'power':
                this.deviceStatus.power = value === 1;
                break;
            case 'temperature':
                this.deviceStatus.temperature = value;
                break;
            case 'mode':
                this.deviceStatus.mode = value;
                break;
        }
        console.log(`📱 Device status updated:`, this.deviceStatus);
    }

    /**
     * Log communication
     */
    logCommunication(source, frame, description) {
        const timestamp = Date.now();
        const hexString = frame.map(b => b.toString(16).padStart(2, '0')).join(' ');
        const logEntry = `${source} ${timestamp} - ${hexString}`;
        
        console.log(`📡 ${description}`);
        console.log(`   ${logEntry}`);
        
        this.communicationLog.push({
            timestamp,
            source,
            frame: hexString,
            description
        });
    }

    /**
     * Generate communication log file
     */
    generateLogFile() {
        const logContent = this.communicationLog.map(entry => 
            `${entry.source} ${entry.timestamp} - ${entry.frame}`
        ).join('\n');
        
        return logContent;
    }

    /**
     * Run complete simulation sequence
     */
    runCompleteSimulation() {
        console.log("🚀 Starting complete WiFi module simulation...");
        console.log("=" * 50);
        
        // Power-up sequence
        this.simulatePowerUp();
        
        // Wait for power-up to complete, then run other processes
        setTimeout(() => {
            // Control commands
            this.simulateControlCommand('power', 1);
            
            setTimeout(() => {
                this.simulateControlCommand('temperature', 22);
                
                setTimeout(() => {
                    this.simulateControlCommand('mode', 2);
                    
                    setTimeout(() => {
                        // Status reporting
                        this.simulateStatusReporting();
                        
                        setTimeout(() => {
                            // Network status query
                            this.simulateNetworkStatusQuery();
                            
                            setTimeout(() => {
                                // Simulate alarm
                                this.simulateAlarm('temperature_high');
                                
                                setTimeout(() => {
                                    console.log("\n✅ Simulation completed!");
                                    console.log(`📊 Total communications: ${this.communicationLog.length}`);
                                    console.log("📄 Log file generated:");
                                    console.log(this.generateLogFile());
                                }, 1000);
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 2000);
    }
}

// Usage example
const simulator = new WiFiModuleSimulator();

// Run complete simulation
simulator.runCompleteSimulation();

// Or run individual processes
// simulator.simulatePowerUp();
// simulator.simulateControlCommand('power', 1);
// simulator.simulateStatusReporting();
// simulator.simulateAlarm('temperature_high');
// simulator.simulateNetworkStatusQuery();

module.exports = WiFiModuleSimulator;
