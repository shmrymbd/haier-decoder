# Haier Protocol Decoder Project

## Project Overview

This repository contains a comprehensive analysis and decoding of the proprietary communication protocol used by Haier washing machines. The project focuses on understanding the hex-based protocol communication between Haier appliances and their control systems, specifically captured during startup sequences.

## 🎯 Project Goals

- **Protocol Analysis**: Decode and understand the proprietary Haier washing machine communication protocol
- **Command Documentation**: Document all known commands and their functions
- **Sequence Mapping**: Map complete communication flows and state machines
- **Security Analysis**: Understand authentication and encryption mechanisms
- **Tool Development**: Create tools for protocol analysis and device interaction

## 📁 Project Structure

```
haier-decoder/
├── README.md                 # This comprehensive project overview
├── CLAUDE.md                 # Claude AI guidance and protocol reference
├── DECODED_ANALYSIS.md       # Detailed analysis of captured data
├── SEQUENCE_GUIDE.md         # Complete communication sequence documentation
├── startupMachine.txt       # Machine responses during startup
└── startupModem.txt         # Modem/controller commands during startup
```

## 🔍 Key Findings

### Device Information
- **Model**: CEAB9UQ00 (Haier Universal Washing Machine Type)
- **Firmware**: E++2.17 (December 24, 2024)
- **Serial Number**: 0021800078EHD5108DUZ00000002
- **Modem IMEI**: 862817068367949

### Protocol Features
1. **Rolling Code Authentication**: 8-byte challenge + encrypted response
2. **Session Management**: Regular resets with boundary markers
3. **Heartbeat System**: Regular acknowledgments every 3-5 seconds
4. **Timestamp Tracking**: Real-time clock synchronization
5. **Complex Commands**: Multi-level parameter structures
6. **Status Reporting**: Detailed 67-byte status packets
7. **Configuration Data**: Program parameters, times, temperatures

## 📊 Protocol Structure

### Basic Packet Format
```
ff ff [length] 40 [seq:4] [command_id] [payload] [crc:3]
```

### Key Components
- **Header**: Always `ff ff`
- **Frame Type**: `40` for command/control frames
- **Sequence**: 4-byte sequence number
- **Command**: Variable length command identifier
- **Payload**: Command-specific data
- **CRC**: 3-byte checksum

## 🚀 Quick Start

### Understanding the Data
1. **startupMachine.txt**: Contains responses from the washing machine
2. **startupModem.txt**: Contains commands from the modem/controller
3. Each line represents a complete packet or packet fragment
4. Hex values are space-separated for readability

### Key Commands

#### Wash Program Commands
```bash
# Program 1
ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad

# Program 2  
ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad

# Program 3
ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac

# Program 4
ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad
```

#### Reset Command
```bash
ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b
```

#### Standard ACK
```bash
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```

## 🔐 Security Analysis

### Authentication System
- **Rolling Code**: Each session generates unique challenge codes
- **Challenge Format**: 8-byte base64-like strings + encrypted response
- **Examples**:
  - `VWeVIC7U` → `db 61 6e 43 47 1e 37 4f...`
  - `EJla2VAT` → `75 5a af 88 e5 c8 52 70...`
  - `33uhBWdW` → `bf 11 eb 49 2c c5 3f a5...`

### Security Features
- Prevents replay attacks through rolling codes
- Encrypted authentication responses
- Session-based authentication
- Timeout mechanisms for failed authentication

## 📈 Communication Flow

### Complete Startup Sequence
1. **Session Init** → Controller announces session start
2. **Handshake** → Mutual authentication establishment
3. **Device ID** → IMEI/device identifier exchange
4. **Status Query** → Request machine status
5. **Machine Info** → Firmware, model, serial number dump
6. **Authentication** → Rolling code challenge/response
7. **Timestamp Sync** → Clock synchronization
8. **Steady State** → Ready for commands

### State Machine
```
[POWER ON] → [SESSION INIT] → [HANDSHAKE] → [AUTH] → [READY] → [COMMAND] → [STATUS] → [COMPLETE]
```

## 🛠️ Development Tools

### Recommended Analysis Tools
- **Hex Editor**: For raw packet analysis
- **Protocol Analyzer**: For sequence mapping
- **CRC Calculator**: For checksum validation
- **State Machine Designer**: For flow visualization

### Implementation Approach
1. Parse hex strings into byte arrays
2. Group packets by command type
3. Extract ASCII strings for identification
4. Implement checksum validation
5. Build state machine for protocol flow

## 📋 Command Reference

### Control Commands
| Command | Purpose | Format |
|---------|---------|--------|
| `5d 1f 00 01` | Reset to standby | `ff ff 0c 40...` |
| `4d 01` | Start initialization | `ff ff 0a 40...` |
| `4d 61` | Standard ACK | `ff ff 08 40...` |
| `51 64` | Control signal | `ff ff 08 40...` |

### Program Commands
| Program | Command | CRC |
|---------|---------|-----|
| 1 | `00 01 01 00 00 00` | `b0 34 ad` |
| 2 | `00 01 02 00 00 00` | `b1 70 ad` |
| 3 | `00 01 03 00 00 00` | `b2 8c ac` |
| 4 | `00 01 04 00 00 00` | `b3 f8 ad` |

### Status Indicators
| Status | Meaning | Bytes |
|--------|---------|-------|
| `01 30 30` | Ready/Standby | Status response |
| `[prog] b0 31` | Program running | Program active |
| `02 b0 31` | Error/Busy | Device busy |
| `04 30 30` | Reset in progress | Reset initiated |

## 🔧 Configuration Parameters

### Program Settings
- **Temperature Range**: 4°C to 26°C (and higher)
- **Spin Speeds**: 4-6 different speed options
- **Time Parameters**: 5-20 minute ranges
- **Program Slots**: 3-4 available programs
- **Memory Slots**: Custom program storage

### Machine Capabilities
- **Programs**: 4 standard wash programs
- **Temperatures**: Multiple temperature settings
- **Spin Speeds**: Variable spin speed options
- **Timing**: Configurable time parameters
- **Memory**: Custom program storage

## 📚 Documentation Files

### CLAUDE.md
- Protocol structure and packet format
- TTL command reference
- Machine response types
- Development approach and guidelines

### DECODED_ANALYSIS.md
- Detailed analysis of captured data
- Device identification information
- Status response decoding
- Authentication packet analysis
- Configuration parameter interpretation

### SEQUENCE_GUIDE.md
- Complete startup sequence documentation
- Session initialization flow
- Authentication flow details
- Status query cycles
- Program start sequences
- Heartbeat patterns
- Reset sequences
- Error handling procedures

## 🎯 Next Steps

### Immediate Tasks
1. **CRC Algorithm**: Reverse engineer the checksum calculation
2. **Authentication**: Identify the encryption algorithm
3. **Command Testing**: Validate decoded commands with actual device
4. **Error Handling**: Capture and analyze error conditions

### Long-term Goals
1. **Protocol Implementation**: Create working protocol implementation
2. **Device Control**: Build tools for device interaction
3. **Security Research**: Deep dive into authentication mechanisms
4. **Documentation**: Complete protocol specification

## 🤝 Contributing

This project welcomes contributions in the following areas:
- Protocol analysis and decoding
- Command validation and testing
- Documentation improvements
- Tool development
- Security research

## 📄 License

This project is for educational and research purposes. Please respect Haier's intellectual property and use responsibly.

## 🔗 Related Resources

- [Haier Official Website](https://www.haier.com)
- [Protocol Analysis Tools](https://github.com/topics/protocol-analysis)
- [Hex Protocol Documentation](https://en.wikipedia.org/wiki/Hexadecimal)

---

*This project represents a comprehensive analysis of Haier washing machine communication protocols. All information is derived from captured data analysis and should be used responsibly for educational and research purposes.*
