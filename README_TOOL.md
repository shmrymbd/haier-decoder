# Haier Protocol Serial Monitor & Testing Tool

A comprehensive Node.js tool for monitoring, analyzing, and testing Haier washing machine protocol communication over serial ports, including advanced rolling code authentication analysis.

## Features

### Serial Monitoring & Protocol Analysis
- 🔍 **Real-time Serial Monitoring** - Monitor live communication with Haier devices
- 📊 **Packet Analysis** - Decode and analyze protocol packets with detailed information
- 🔐 **CRC Validation** - Automatic CRC validation with reverse engineering
- 🎬 **Sequence Replay** - Replay captured sequences with configurable timing
- 🎮 **Interactive Mode** - Manual command sending and testing
- 📝 **Comprehensive Logging** - Console and file logging with colored output
- 📈 **Analysis Tools** - Analyze captured log files and extract insights

### Rolling Code Authentication Analysis
- 🔐 **Rolling Code Algorithm** - Complete framework for authentication reverse engineering
- 📊 **Pattern Analysis** - Advanced byte-by-byte transformation analysis
- 🔍 **Data Extraction** - Extract authentication sessions from captured data
- 📈 **Statistical Analysis** - Multi-session statistical analysis and pattern recognition
- 🧪 **Algorithm Testing** - Comprehensive testing framework for transformation methods
- 📋 **Test Vectors** - Structured test data for algorithm validation

## Installation

```bash
# Install dependencies
npm install

# Make executable
chmod +x src/index.js
```

## Usage

### 1. List Available Serial Ports

```bash
node src/index.js ports
```

### 2. Monitor Serial Port

```bash
# Basic monitoring
node src/index.js monitor /dev/ttyUSB0

# With options
node src/index.js monitor /dev/ttyUSB0 --baud 9600 --verbose --output logs/session.log
```

### 3. Replay Captured Sequences

```bash
# Replay startup sequence
node src/index.js replay /dev/ttyUSB0 startupMachine.txt

# With timing control
node src/index.js replay /dev/ttyUSB0 startupModem.txt --timing 0.5 --verbose
```

### 4. Interactive Mode

```bash
# Start interactive session
node src/index.js interactive /dev/ttyUSB0

# Available commands:
# send <hex>     - Send hex packet
# programs       - Show program commands
# status         - Show connection status
# stats          - Show statistics
# clear          - Clear buffer
# quit           - Exit
```

### 5. Analyze Log Files

```bash
# Analyze captured data
node src/index.js analyze logs/haier-protocol.log --verbose
```

## Rolling Code Analysis Commands

### 1. Combined Analysis

```bash
# Run combined analysis on all authentication sessions
npm run crypto
# or
node src/crypto/combined-analysis.js
```

### 2. Extract Authentication Sessions

```bash
# Extract authentication sessions from binding data
npm run extract
# or
node src/crypto/binding-auth-extractor.js
```

### 3. Pattern Analysis

```bash
# Run comprehensive pattern analysis
npm run pattern
# or
node src/crypto/final-analysis.js
```

### 4. Test Rolling Code Algorithm

```bash
# Test rolling code algorithm
npm run test-rolling
# or
node src/crypto/test-rolling-code.js
```

### 5. Algorithm Testing

```bash
# Test cryptographic algorithms
node src/crypto/algorithm-tester.js
```

## Command Reference

### Program Commands

```bash
# Program 1
send ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad

# Program 2
send ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad

# Program 3
send ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac

# Program 4
send ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad

# Reset to standby
send ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b
```

### Control Commands

```bash
# Standard ACK
send ff ff 08 40 00 00 00 00 00 05 4d 61 80

# Control signal
send ff ff 08 40 00 00 00 00 00 09 51 64 80

# Status query
send ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
```

## Configuration

### Serial Port Settings

Default settings (can be overridden with command line options):
- **Baud Rate**: 9600
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1
- **Flow Control**: None

### Timing Parameters

Based on PROTOCOL_SPECIFICATION.md:
- **Session Init**: 100ms
- **Handshake**: 50ms
- **Authentication**: 200ms
- **Heartbeat**: 3 seconds
- **Program Command**: 500ms
- **Reset Command**: 1 second

### CRC Algorithms

The tool tests multiple CRC algorithms:
- CRC-16-CCITT
- CRC-16-Modbus
- CRC-16-IBM
- CRC-16-ANSI
- CRC-16-USB

## Output Examples

### Console Output

```
✅ Connected to /dev/ttyUSB0
🔍 Reverse engineering CRC algorithm...

📊 Testing CRC-16-CCITT:
   Matches: 5/7
   ✅ Standard ACK: 0080 vs 0080
   ✅ Program 1: b034 vs b034
   ❌ Program 2: b170 vs b170

🎯 Best match: CRC-16-CCITT (5/7 packets)

================================================================================
← Packet #1 - 2024-12-24T10:30:15.123Z
================================================================================
Packet Info:
  Length: 8 bytes
  Frame Type: 0x40
  Sequence: 5
  Command: 4D61

Command:
  Type: ACK
  Name: Standard ACK
  Description: General acknowledgment

CRC Validation:
  Status: ✓ Valid
  Algorithm: CRC-16-CCITT
  Received: 80

Raw Data: FF FF 08 40 00 00 00 00 00 05 4D 61 80
```

### Log File Output

```json
{
  "level": "info",
  "message": "packet",
  "sessionId": "session_1703421015123_abc123def",
  "packetId": 1,
  "timestamp": "2024-12-24T10:30:15.123Z",
  "direction": "received",
  "length": 8,
  "frameType": 64,
  "sequence": 5,
  "command": "4D61",
  "payload": "",
  "receivedCRC": "80",
  "crcValid": true,
  "crcAlgorithm": "CRC-16-CCITT",
  "commandInfo": {
    "type": "ACK",
    "name": "Standard ACK",
    "description": "General acknowledgment"
  },
  "raw": "FF FF 08 40 00 00 00 00 00 05 4D 61 80"
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   # or add user to dialout group
   sudo usermod -a -G dialout $USER
   ```

2. **Port Not Found**
   ```bash
   # List available ports
   node src/index.js ports
   ```

3. **CRC Validation Fails**
   - The tool will automatically test multiple CRC algorithms
   - Use `--no-crc` flag to skip validation during testing

4. **Connection Timeout**
   - Check baud rate settings
   - Verify device is connected and powered
   - Try different USB port

### Debug Mode

Enable verbose output for detailed debugging:

```bash
node src/index.js monitor /dev/ttyUSB0 --verbose
```

## Development

### Project Structure

```
src/
├── index.js              # CLI entry point
├── config.js             # Configuration constants
├── protocol/
│   ├── parser.js         # Packet parsing logic
│   ├── crc.js           # CRC calculation/validation
│   └── commands.js      # Command definitions
├── monitor/
│   ├── serial-monitor.js # Serial port monitoring
│   └── packet-logger.js  # Logging implementation
├── replay/
│   └── sequence-replayer.js # Sequence replay
└── utils/
    └── hex-utils.js      # Hex conversion utilities
```

### Adding New Commands

1. Add command definition to `src/protocol/commands.js`
2. Update CRC lookup table in `src/config.js`
3. Test with captured data

### Extending CRC Support

1. Add new algorithm to `src/config.js`
2. Implement calculation in `src/protocol/crc.js`
3. Test with known packets

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review the protocol specification
- Open an issue on GitHub
