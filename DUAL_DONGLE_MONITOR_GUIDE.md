# Dual-Dongle Monitor Usage Guide

## Overview

The Dual-Dongle Monitor provides comprehensive bidirectional monitoring of Haier washing machine communication using two USB dongles - one for TX (modem→machine) and one for RX (machine→modem). It merges both streams into a unified timestamped log with automatic challenge-response pairing and conversation flow analysis.

## Quick Start

### Basic Usage

```bash
# Monitor both directions with basic logging
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1

# Enable packet pairing and flow analysis
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --flow

# With verbose output and custom log file
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --flow -v -o logs/my-session.log
```

### Using npm scripts

```bash
# Add to package.json scripts
"monitor-dual": "node src/index.js monitor-dual"
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --baud <rate>` | Baud rate for both ports | 9600 |
| `-o, --output <file>` | Unified log file path | logs/dual-monitor.log |
| `-v, --verbose` | Verbose output with detailed packet info | false |
| `--pair` | Enable automatic packet pairing | false |
| `--flow` | Enable conversation flow analysis | false |

## Features

### 1. Unified Logging

Both TX and RX streams are merged into a single timestamped log with direction indicators:

```
[2025-01-20T10:23:45.123Z] → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
[2025-01-20T10:23:45.234Z] ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
[2025-01-20T10:23:46.456Z] → STATUS_QUERY: ff ff 0a 40 00 00 00 00 00 01 4d 01...
[2025-01-20T10:23:46.567Z] ← STATUS_RESPONSE: ff ff 43 40 00 00 00 00 00 02 6d 01...
```

**Direction Indicators:**
- `→` (TX): Modem → Machine
- `←` (RX): Machine → Modem

### 2. Automatic Packet Pairing

When `--pair` is enabled, the monitor automatically pairs challenge-response sequences:

```
10:23:45.123 → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
   Challenge: 78 8c 6f f2 d9 2d c8 55
   
10:23:45.567 ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
   Response: 64 38 63 4f 4e 79 47 30
   ↔ Paired (111ms) | State: CONNECTING → AUTHENTICATED
```

**Supported Pair Types:**
- Authentication: Challenge (0x12) → Response (0x11)
- Status Query: Query (0x01) → Response (0x6d)
- Program Start: Start (0x60) → ACK (0x4d)
- Reset: Reset (0x01) → Confirm (0x0f)
- Control Signal: Signal (0x09) → ACK (0x4d)

### 3. Conversation Flow Analysis

When `--flow` is enabled, the monitor tracks the complete communication state machine:

```
Session Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10:23:45 ┃ IDLE → CONNECTING
10:23:45 ┃ → Reset
10:23:45 ┃ ← Reset Confirm
10:23:45 ┃ CONNECTING → AUTHENTICATING
10:23:45 ┃ → Auth Challenge
10:23:45 ┃ ← Auth Response
10:23:45 ┃ AUTHENTICATING → AUTHENTICATED
10:23:46 ┃ → Status Query
10:23:46 ┃ ← Status Response (Standby)
10:23:47 ┃ AUTHENTICATED → ACTIVE
10:23:47 ┃ → Program 1 Start
10:23:47 ┃ ← ACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**State Machine:**
- `IDLE` → `CONNECTING` → `AUTHENTICATING` → `AUTHENTICATED` → `ACTIVE` → `IDLE`
- Tracks all transitions with timestamps
- Identifies authentication patterns
- Detects errors and retries

### 4. Real-Time Display

Colorized real-time display with direction indicators:

```
🔍 Starting Dual-Dongle Monitor...
   TX Port: /dev/ttyUSB0 (Modem → Machine)
   RX Port: /dev/ttyUSB1 (Machine → Modem)
   Pairing: Enabled
   Flow Analysis: Enabled

✅ Connected to both ports

━━━━ Session Start: 2025-01-20 10:23:45 ━━━━

10:23:45.123 → RESET: ff ff 12 40 00 00 00 00 00 04 0f 5a...
10:23:45.234 ← RESET_CONFIRM: ff ff 12 40 00 00 00 00 00 04 0f 5a...
   ↔ Paired (111ms) | State: IDLE → CONNECTING

10:23:45.456 → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
   Challenge: 78 8c 6f f2 d9 2d c8 55
   
10:23:45.567 ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
   Response: 64 38 63 4f 4e 79 47 30
   ↔ Paired (111ms) | State: CONNECTING → AUTHENTICATED
```

### 5. Statistics Dashboard

Real-time statistics showing session metrics:

```
📊 Session Statistics:
   Duration: 5m 23s
   TX Packets: 145
   RX Packets: 143
   Paired: 140 (97.9%)
   Unpaired TX: 5
   Unpaired RX: 3
   Avg Response Time: 112ms
   Authentication Attempts: 1 (100% success)
```

## Log Files

### Text Log Format

```
# Dual-Dongle Monitor Log
# Session ID: 1760931234567
# Start Time: 2025-01-20T10:23:45.123Z
# TX Port: Modem → Machine
# RX Port: Machine → Modem
# Format: [timestamp] DIRECTION: command_name: hex_data
# Direction indicators: → (TX), ← (RX)

[2025-01-20T10:23:45.123Z] → AUTH_CHALLENGE (0x12): ff ff 25 40 00 00 00 00 00 12 10 02 00 01 78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24 | Challenge: 78 8c 6f f2 d9 2d c8 55 | CRC: ✓ | Seq: 0
[2025-01-20T10:23:45.234Z] ← AUTH_RESPONSE (0x11): ff ff 25 40 00 00 00 00 00 11 10 02 00 01 64 38 63 4f 4e 79 47 30 01 17 70 f0 a8 83 ab e0 59 1d cb 20 35 44 8e 4c 79 70 56 b9 | Response: 64 38 63 4f 4e 79 47 30 | CRC: ✓ | Seq: 0
```

### JSON Log Format

```json
{
  "sessionId": 1760931234567,
  "sessionStart": "2025-01-20T10:23:45.123Z",
  "sessionEnd": "2025-01-20T10:28:45.123Z",
  "duration": 300000,
  "totalPackets": 288,
  "txPackets": 145,
  "rxPackets": 143,
  "packets": [
    {
      "timestamp": 1760931234567,
      "direction": "TX",
      "packetNumber": 1,
      "command": 18,
      "commandName": "AUTH_CHALLENGE",
      "hex": "ff ff 25 40 00 00 00 00 00 12 10 02...",
      "payload": "78 8c 6f f2 d9 2d c8 55 01 58 29 f7...",
      "crcValid": true,
      "sequence": 0
    }
  ]
}
```

## Advanced Features

### Timestamp Synchronization

The monitor automatically synchronizes timestamps between the two dongles:

- Records first packet from each port
- Calculates offset between timestamps
- Applies correction to all subsequent packets
- Validates synchronization quality

### Packet Pairing Strategies

1. **Command-based matching**: Challenge → Response by command type
2. **Sequence number correlation**: Match by sequence numbers
3. **Timestamp-based windowing**: Must be within timeout window
4. **Payload analysis**: Validate authentication headers and structure

### Conversation Flow States

- **IDLE**: No communication
- **CONNECTING**: Initial connection/reset
- **AUTHENTICATING**: Authentication in progress
- **AUTHENTICATED**: Successfully authenticated
- **ACTIVE**: Active communication (programs running)
- **ERROR**: Error state (retry required)

## Usage Examples

### Example 1: Basic Monitoring

```bash
$ node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1

🔍 Starting Dual-Dongle Monitor...
   TX Port: /dev/ttyUSB0 (Modem → Machine)
   RX Port: /dev/ttyUSB1 (Machine → Modem)
   Pairing: Disabled
   Flow Analysis: Disabled

✅ Connected to both ports

━━━━ Session Start: 2025-01-20 10:23:45 ━━━━

10:23:45.123 → RESET: ff ff 12 40 00 00 00 00 00 04 0f 5a...
10:23:45.234 ← RESET_CONFIRM: ff ff 12 40 00 00 00 00 00 04 0f 5a...
10:23:45.456 → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
10:23:45.567 ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
```

### Example 2: With Pairing and Flow Analysis

```bash
$ node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --flow

🔍 Starting Dual-Dongle Monitor...
   TX Port: /dev/ttyUSB0 (Modem → Machine)
   RX Port: /dev/ttyUSB1 (Machine → Modem)
   Pairing: Enabled
   Flow Analysis: Enabled

✅ Connected to both ports

━━━━ Session Start: 2025-01-20 10:23:45 ━━━━

10:23:45.123 → RESET: ff ff 12 40 00 00 00 00 00 04 0f 5a...
10:23:45.234 ← RESET_CONFIRM: ff ff 12 40 00 00 00 00 00 04 0f 5a...
   ↔ Paired (111ms) | State: IDLE → CONNECTING

10:23:45.456 → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
   Challenge: 78 8c 6f f2 d9 2d c8 55
   
10:23:45.567 ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
   Response: 64 38 63 4f 4e 79 47 30
   ↔ Paired (111ms) | State: CONNECTING → AUTHENTICATED

10:23:46.789 → STATUS_QUERY: ff ff 0a 40 00 00 00 00 00 01 4d 01...
10:23:46.890 ← STATUS_RESPONSE: ff ff 43 40 00 00 00 00 00 02 6d 01...
   Status: Standby
   ↔ Paired (101ms) | State: AUTHENTICATED
```

### Example 3: Verbose Output

```bash
$ node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --flow -v

🔍 Starting Dual-Dongle Monitor...
   TX Port: /dev/ttyUSB0 (Modem → Machine)
   RX Port: /dev/ttyUSB1 (Machine → Modem)
   Pairing: Enabled
   Flow Analysis: Enabled

📡 TX base time: 2025-01-20T10:23:45.123Z
📡 RX base time: 2025-01-20T10:23:45.125Z
🔄 Timestamp offset calculated: 2ms
✅ Connected to both ports

━━━━ Session Start: 2025-01-20 10:23:45 ━━━━

10:23:45.123 → AUTH_CHALLENGE: ff ff 25 40 00 00 00 00 00 12 10 02...
   Challenge: 78 8c 6f f2 d9 2d c8 55
   CRC: ✓ | Seq: 0
   
10:23:45.567 ← AUTH_RESPONSE: ff ff 25 40 00 00 00 00 00 11 10 02...
   Response: 64 38 63 4f 4e 79 47 30
   CRC: ✓ | Seq: 0
   ↔ Paired (111ms) | State: CONNECTING → AUTHENTICATED
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure user has access to both serial ports
   ```bash
   sudo chmod 666 /dev/ttyUSB0 /dev/ttyUSB1
   ```

2. **Port Not Found**: Check available ports
   ```bash
   node src/index.js ports
   ```

3. **Timestamp Sync Issues**: Check system clock synchronization
   ```bash
   # On Linux
   sudo ntpdate -s time.nist.gov
   ```

4. **Pairing Failures**: Verify packet timing and sequence numbers

### Debug Mode

Enable verbose output for debugging:

```bash
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --flow -v
```

## Performance

- **Response Time**: Typically < 1 second for most commands
- **Memory Usage**: Minimal overhead for session management
- **Log File Size**: Grows with session length (typically < 1MB per hour)
- **CPU Usage**: Low overhead for real-time processing

## Security Considerations

- **Authentication**: Uses rolling code algorithm for secure communication
- **Session Logging**: Logs may contain sensitive device information
- **Serial Port Access**: Requires appropriate permissions for both ports

## Integration

The dual-dongle monitor integrates with:

- **Serial Monitor**: For packet analysis
- **Sequence Replayer**: For testing sequences
- **Rolling Code Analysis**: For authentication
- **Protocol Parser**: For packet parsing
- **CLI Chat Tool**: For interactive communication

## Export Options

### Export Paired Sequences

```bash
# Export to JSON
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --export-pairs

# Export to CSV
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --pair --export-csv
```

### Export Conversation Flow

```bash
# Export flow analysis
node src/index.js monitor-dual /dev/ttyUSB0 /dev/ttyUSB1 --flow --export-flow
```

## Success Criteria

- Both serial ports connect successfully
- Timestamps are synchronized accurately
- Packets are logged with correct direction indicators
- Challenge-response pairs are automatically identified
- Conversation flow state machine tracks correctly
- Unified log is readable and well-formatted
- Pairing analysis shows response times
- Flow analysis shows state transitions

This completes the dual-dongle monitoring implementation with comprehensive bidirectional communication analysis!
