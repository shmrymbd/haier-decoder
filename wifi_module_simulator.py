#!/usr/bin/env python3
"""
Haier Smart Home WiFi Module Communication Simulator
Simulates communication between WiFi module and smart home machine
Based on Haier Smart Home Open Platform Protocol
"""

import time
import threading
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class CommunicationLog:
    timestamp: int
    source: str
    frame: str
    description: str

class WiFiModuleSimulator:
    def __init__(self):
        self.frame_id = 0x01
        self.device_address = 0x40
        self.module_address = 0x00
        self.communication_log: List[CommunicationLog] = []
        self.is_connected = False
        self.device_status = {
            'power': False,
            'temperature': 25,
            'mode': 'auto',
            'alarm': False
        }
        self._lock = threading.Lock()

    def generate_frame_header(self) -> List[int]:
        """Generate frame header (FF FF)"""
        return [0xFF, 0xFF]

    def calculate_frame_length(self, data: List[int]) -> int:
        """Calculate frame length (excluding header and CRC)"""
        return len(data) + 1  # +1 for checksum

    def generate_address_identifier(self, source: int, destination: int) -> List[int]:
        """Generate address identifier"""
        return [source, destination, 0x00, 0x00, 0x00, 0x00, 0x00]

    def calculate_checksum(self, frame_length: int, data: List[int]) -> int:
        """Calculate accumulative checksum"""
        checksum = frame_length
        for byte in data:
            checksum += byte
        return checksum & 0xFF  # Return low byte

    def calculate_crc16(self, data: List[int]) -> int:
        """Calculate CRC16 checksum"""
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc = crc >> 1
        return crc

    def escape_data(self, data: List[int]) -> List[int]:
        """Handle 0xFF escape sequences"""
        escaped = []
        for byte in data:
            escaped.append(byte)
            if byte == 0xFF:
                escaped.append(0x55)
        return escaped

    def build_frame(self, frame_type: int, data: List[int], use_crc: bool = False) -> List[int]:
        """Build complete frame"""
        header = self.generate_frame_header()
        address_id = self.generate_address_identifier(self.module_address, self.device_address)
        frame_data = [frame_type] + data
        frame_length = self.calculate_frame_length(address_id + frame_data)
        
        frame = header + [frame_length] + address_id + frame_data
        
        # Calculate checksum
        checksum_data = frame[2:]  # Exclude header
        checksum = self.calculate_checksum(frame_length, checksum_data)
        frame.append(checksum)
        
        # Add CRC if needed
        if use_crc:
            crc = self.calculate_crc16(checksum_data)
            frame.append(crc & 0xFF)
            frame.append((crc >> 8) & 0xFF)
        
        # Handle 0xFF escape sequences
        frame = self.escape_data(frame)
        
        return frame

    def simulate_power_up(self):
        """Simulate power-up process"""
        print("🔌 Starting power-up process...")
        
        # Step 1: Module sends power-up frame
        power_up_data = [0x0F, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        power_up_frame = self.build_frame(0x04, power_up_data)
        self.log_communication("modem", power_up_frame, "Power-up initialization")
        
        # Step 2: Machine responds with acknowledgment
        time.sleep(0.05)  # 50ms delay
        ack_frame = self.build_frame(0x61, [0x00])
        self.log_communication("machine", ack_frame, "Power-up acknowledgment")
        
        # Step 3: Module sends device information
        time.sleep(0.1)  # 100ms delay
        device_info = self.build_frame(0x62, [
            0x45, 0x2B, 0x2B, 0x32, 0x2E, 0x31, 0x37, 0x00,  # Version info
            0x32, 0x30, 0x32, 0x34, 0x31, 0x32, 0x32, 0x34,  # Date
            0xF1, 0x00, 0x00, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x00,
            0x55, 0x2D, 0x57, 0x4D, 0x54, 0x00, 0x00, 0x00, 0x00
        ])
        self.log_communication("modem", device_info, "Device information")
        
        self.is_connected = True
        print("✅ Power-up process completed")

    def simulate_control_command(self, command: str, value: int):
        """Simulate normal control process"""
        if not self.is_connected:
            print("❌ Device not connected. Please run power-up first.")
            return

        print(f"🎮 Sending control command: {command} = {value}")
        
        # Module sends control command
        control_data = [0x01, 0x4D, 0x01, value]
        control_frame = self.build_frame(0xF3, control_data)
        self.log_communication("modem", control_frame, f"Control: {command}={value}")
        
        # Machine responds with acknowledgment
        time.sleep(0.05)  # 50ms delay
        ack_frame = self.build_frame(0x4D, [0x61, 0x80])
        self.log_communication("machine", ack_frame, "Control acknowledgment")
        
        # Update device status
        self.update_device_status(command, value)

    def simulate_status_reporting(self):
        """Simulate active reporting process"""
        if not self.is_connected:
            print("❌ Device not connected. Please run power-up first.")
            return

        print("📊 Simulating status reporting...")
        
        # Machine sends status report
        status_data = [
            0x01, 0x30, 0x10, 0x03, 0x00, 0x00, 0x00, 0x20, 0x04, 0x03, 0x05, 0x01,
            0x00, 0x01, 0x02, 0x30, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x0F, 0x08, 0x14,
            0x05, 0x05, 0x06, 0x05, 0x04, 0x1A, 0x04, 0x1A, 0x04, 0x1A, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00
        ]
        status_frame = self.build_frame(0x6D, status_data)
        self.log_communication("machine", status_frame, "Status report")
        
        # Module responds with acknowledgment
        time.sleep(0.05)  # 50ms delay
        ack_frame = self.build_frame(0x4D, [0x61, 0x80])
        self.log_communication("modem", ack_frame, "Status acknowledgment")

    def simulate_alarm(self, alarm_type: str = "temperature_high"):
        """Simulate alarm process"""
        if not self.is_connected:
            print("❌ Device not connected. Please run power-up first.")
            return

        print(f"🚨 Simulating alarm: {alarm_type}")
        
        # Machine sends alarm frame
        alarm_data = [0x10, 0x02, 0x00, 0x01, 0xD9, 0x93, 0xE4, 0xC8, 0xD3, 0x74, 0x95, 0x1C, 
                     0x01, 0xA3, 0xEF, 0x0F, 0x08, 0xCD, 0xB4, 0x54, 0xFE, 0x10, 0xFC, 0xCF, 
                     0x0A, 0x5E, 0x52, 0xA0, 0xD0, 0x1C, 0xF4, 0x35]
        alarm_frame = self.build_frame(0x12, alarm_data)
        self.log_communication("machine", alarm_frame, f"Alarm: {alarm_type}")
        
        # Module responds with acknowledgment (within 50ms as per spec)
        time.sleep(0.03)  # 30ms delay
        ack_frame = self.build_frame(0x4D, [0x61, 0x80])
        self.log_communication("modem", ack_frame, "Alarm acknowledgment")

    def simulate_network_status_query(self):
        """Simulate network status query"""
        if not self.is_connected:
            print("❌ Device not connected. Please run power-up first.")
            return

        print("🌐 Querying network status...")
        
        # Module sends network status query
        query_data = [0x01, 0x03, 0x01, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 
                      0x02, 0x06, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x04, 0x00, 0x01]
        query_frame = self.build_frame(0xF7, query_data)
        self.log_communication("modem", query_frame, "Network status query")
        
        # Machine responds with network status
        time.sleep(0.1)  # 100ms delay
        status_data = [0x00, 0x00, 0x3D, 0xD0, 0xE1]
        status_frame = self.build_frame(0xF5, status_data)
        self.log_communication("machine", status_frame, "Network status response")

    def update_device_status(self, command: str, value: int):
        """Update device status"""
        with self._lock:
            if command == 'power':
                self.device_status['power'] = value == 1
            elif command == 'temperature':
                self.device_status['temperature'] = value
            elif command == 'mode':
                self.device_status['mode'] = value
        
        print(f"📱 Device status updated: {self.device_status}")

    def log_communication(self, source: str, frame: List[int], description: str):
        """Log communication"""
        timestamp = int(time.time() * 1000)  # milliseconds
        hex_string = ' '.join([f"{b:02x}" for b in frame])
        
        print(f"📡 {description}")
        print(f"   {source} {timestamp} - {hex_string}")
        
        with self._lock:
            self.communication_log.append(CommunicationLog(
                timestamp=timestamp,
                source=source,
                frame=hex_string,
                description=description
            ))

    def generate_log_file(self) -> str:
        """Generate communication log file"""
        log_lines = []
        for entry in self.communication_log:
            log_lines.append(f"{entry.source} {entry.timestamp} - {entry.frame}")
        return '\n'.join(log_lines)

    def run_complete_simulation(self):
        """Run complete simulation sequence"""
        print("🚀 Starting complete WiFi module simulation...")
        print("=" * 50)
        
        # Power-up sequence
        self.simulate_power_up()
        
        # Wait for power-up to complete, then run other processes
        time.sleep(2)
        
        # Control commands
        self.simulate_control_command('power', 1)
        time.sleep(1)
        
        self.simulate_control_command('temperature', 22)
        time.sleep(1)
        
        self.simulate_control_command('mode', 2)
        time.sleep(1)
        
        # Status reporting
        self.simulate_status_reporting()
        time.sleep(1)
        
        # Network status query
        self.simulate_network_status_query()
        time.sleep(1)
        
        # Simulate alarm
        self.simulate_alarm('temperature_high')
        time.sleep(1)
        
        print("\n✅ Simulation completed!")
        print(f"📊 Total communications: {len(self.communication_log)}")
        print("📄 Log file generated:")
        print(self.generate_log_file())

    def run_interactive_simulation(self):
        """Run interactive simulation with user input"""
        print("🎮 Interactive WiFi Module Simulator")
        print("Commands: power, temp, mode, status, alarm, network, quit")
        
        while True:
            try:
                command = input("\nEnter command: ").strip().lower()
                
                if command == 'quit':
                    break
                elif command == 'power':
                    value = int(input("Enter power value (0/1): "))
                    self.simulate_control_command('power', value)
                elif command == 'temp':
                    value = int(input("Enter temperature: "))
                    self.simulate_control_command('temperature', value)
                elif command == 'mode':
                    value = int(input("Enter mode: "))
                    self.simulate_control_command('mode', value)
                elif command == 'status':
                    self.simulate_status_reporting()
                elif command == 'alarm':
                    alarm_type = input("Enter alarm type: ") or "temperature_high"
                    self.simulate_alarm(alarm_type)
                elif command == 'network':
                    self.simulate_network_status_query()
                else:
                    print("Unknown command. Available: power, temp, mode, status, alarm, network, quit")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

def main():
    """Main function"""
    simulator = WiFiModuleSimulator()
    
    print("Choose simulation mode:")
    print("1. Complete simulation")
    print("2. Interactive simulation")
    
    choice = input("Enter choice (1/2): ").strip()
    
    if choice == '1':
        simulator.run_complete_simulation()
    elif choice == '2':
        simulator.run_interactive_simulation()
    else:
        print("Invalid choice. Running complete simulation...")
        simulator.run_complete_simulation()

if __name__ == "__main__":
    main()
