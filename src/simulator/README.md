# Haier Modem Simulator

A complete simulator for the Haier washing machine modem/controller with **rolling code authentication bypass**.

## 🎯 Features

- ✅ **Authentication Bypass** - Uses captured challenge-response pairs
- ✅ **Complete Protocol Support** - All documented commands implemented
- ✅ **Interactive Mode** - Manual command sending
- ✅ **Real-time Monitoring** - Live communication with washing machine
- ✅ **Session Management** - Proper initialization and heartbeat
- ✅ **Error Handling** - Robust error handling and reconnection

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /home/admin/haier-decoder
npm install
```

### 2. List Available Ports
```bash
node src/simulator/simulator-cli.js ports
```

### 3. Start Simulator
```bash
# Basic mode
node src/simulator/simulator-cli.js start /dev/ttyUSB0

# Verbose mode
node src/simulator/simulator-cli.js start /dev/ttyUSB0 --verbose

# Interactive mode
node src/simulator/simulator-cli.js interactive /dev/ttyUSB0 --verbose
```

## 🔐 Authentication Bypass

The simulator includes **8 captured authentication pairs** from real device communication:

| Challenge | Response | Direction |
|-----------|----------|-----------|
| `64 29 1b 0f 17 76 3c c6` | `60 90 9c fd 8b 87 f0 41 14 7e dc 8b 70 cf cb 8f 2f 1d 88` | Machine → Modem |
| `49 4c 4c 7a 77 53 6e 6a` | `08 2d 03 b4 eb f6 c5 55 6e f0 ca 18 74 66 db 1d 80 17 c4` | Modem → Machine |
| `a7 b7 50 cd 2d 97 dd fa` | `0d cb 41 e0 d2 ef 96 9a c7 cc 02 aa 47 e3 da 43 11 16 a2` | Machine → Modem |
| `30 4f 6a 38 34 58 53 4b` | `fb a6 62 9b 7b 9f 1b 7e 28 d4 ce c8 13 41 cf 4c 27 7d 5b` | Modem → Machine |
| `e6 2e cd 0f 1a 7a 35 74` | `38 93 79 42 3b 3a d2 d1 bc 44 41 11 59 ea 5a ab f0 28 00` | Machine → Modem |
| `79 42 61 53 6f 53 56 39` | `83 ca 66 a0 e7 9a 67 48 70 9f d2 f6 ec 4f ac 72 fd 3c e3` | Modem → Machine |
| `af a5 09 96 54 74 68 0b` | `86 89 93 b5 8c 2d 2f ad 07 5d e6 cf 04 41 51 f1 45 0c 7c` | Machine → Modem |
| `4c 4a 79 34 58 69 68 79` | `60 68 89 45 d5 38 12 b5 d8 11 8b 51 7e f3 4c 42 9d 22 1f` | Modem → Machine |

### How It Works

1. **Challenge Detection** - Simulator detects authentication challenges
2. **Lookup Response** - Searches for matching challenge in captured pairs
3. **Response Sending** - Sends the corresponding encrypted response
4. **Fallback** - Generates generic response for unknown challenges

## 🎮 Interactive Commands

When using interactive mode, you can send these commands:

```bash
modem> help          # Show available commands
modem> status         # Send status query
modem> program1       # Send program 1 command
modem> program2       # Send program 2 command
modem> program3       # Send program 3 command
modem> program4       # Send program 4 command
modem> reset          # Send reset command
modem> deviceid       # Send device ID
modem> heartbeat      # Send heartbeat
modem> quit           # Exit simulator
```

## 📊 Protocol Commands

### Session Management
- **Session Start**: `ff ff 0a 00 00 00 00 00 00 61 00 07 72`
- **Controller Ready**: `ff ff 08 40 00 00 00 00 00 70 b8 86 41`
- **Handshake**: `ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4`

### Program Commands
- **Program 1**: `ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad`
- **Program 2**: `ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad`
- **Program 3**: `ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac`
- **Program 4**: `ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad`

### Control Commands
- **Reset**: `ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b`
- **Status Query**: `ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1`
- **Device ID**: `ff ff 19 40 00 00 00 00 00 11 00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39 7e cc 81`
- **Heartbeat**: `ff ff 08 40 00 00 00 00 00 05 4d 61 80`

## 🔧 Configuration

### Serial Port Settings
- **Baud Rate**: 9600 (default)
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1
- **Flow Control**: None

### Timing Parameters
- **Session Init**: 100ms
- **Handshake**: 50ms
- **Authentication**: 200ms
- **Heartbeat**: 3 seconds
- **Command Delay**: 100ms

## 🛠️ Development

### Adding New Authentication Pairs

1. **Capture new challenges** from real device communication
2. **Add to auth-pairs.json**:
```json
{
  "id": 9,
  "challenge": "new challenge hex",
  "response": "new response hex",
  "direction": "machine_to_modem",
  "description": "New authentication pair"
}
```

3. **Update simulator** to load new pairs

### Extending Commands

Add new commands to `HaierModemSimulator` class:

```javascript
async sendNewCommand() {
  const packet = 'ff ff [length] 40 [sequence] [command] [payload] [crc]';
  console.log(chalk.blue('📤 Sending new command'));
  this.sendPacket(packet);
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   ```

2. **Port Not Found**
   ```bash
   node src/simulator/simulator-cli.js ports
   ```

3. **Authentication Fails**
   - Check if challenge is in captured pairs
   - Verify packet format
   - Enable verbose mode for debugging

4. **Connection Timeout**
   - Check baud rate settings
   - Verify device is connected
   - Try different USB port

### Debug Mode

Enable verbose output for detailed debugging:

```bash
node src/simulator/simulator-cli.js start /dev/ttyUSB0 --verbose
```

## 📈 Success Metrics

- ✅ **8 Authentication Pairs** loaded from captured data
- ✅ **100% Protocol Coverage** for documented commands
- ✅ **Real-time Communication** with actual devices
- ✅ **Session Management** with proper initialization
- ✅ **Error Handling** with graceful recovery

## 🎯 Usage Examples

### Basic Simulation
```bash
# Start simulator
node src/simulator/simulator-cli.js start /dev/ttyUSB0 --verbose

# Output:
# 🚀 Haier Modem Simulator
# 🔐 Authentication bypass enabled
# ✅ Loaded 8 authentication pairs
# 📡 Port: /dev/ttyUSB0
# ⚡ Baud Rate: 9600
# ✅ Serial port opened
# 🚀 Initializing session...
# 📤 Sending session start
# 📤 Sending controller ready
# 📤 Sending handshake
# ✅ Session initialized
# ✅ Simulator running. Press Ctrl+C to stop.
```

### Interactive Mode
```bash
# Start interactive mode
node src/simulator/simulator-cli.js interactive /dev/ttyUSB0 --verbose

# Available commands:
modem> help
modem> status
modem> program1
modem> reset
modem> quit
```

## 🏆 Conclusion

The Haier Modem Simulator provides a **complete solution** for simulating the modem/controller side of Haier washing machine communication with **authentication bypass** using captured challenge-response pairs. This enables testing, development, and research without needing the actual modem hardware.

---

*This simulator is based on comprehensive analysis of real Haier washing machine communication protocols and includes authentication bypass using captured challenge-response pairs.*

