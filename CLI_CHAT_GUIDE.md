# CLI Chat Tool Usage Guide

## Overview

The CLI Chat Tool provides an interactive command-line interface for communicating with Haier washing machines via serial port. It supports both interactive and automated modes, high-level commands, automatic authentication, and comprehensive logging.

## Quick Start

### Basic Usage

```bash
# Start interactive chat with device
node src/index.js chat /dev/ttyUSB0

# Start in automated mode
node src/index.js chat /dev/ttyUSB0 --auto

# Start with custom log file
node src/index.js chat /dev/ttyUSB0 --log logs/my-session.log
```

### Using npm scripts

```bash
# Test the chat interface
npm run test-chat

# Start chat (requires port argument)
npm run chat /dev/ttyUSB0
```

## Command Reference

### Authentication Commands

| Command | Description | Example |
|---------|-------------|---------|
| `auth` | Authenticate with device (auto-response enabled) | `auth` |
| `challenge` | Send authentication challenge | `challenge` |

### Status & Info Commands

| Command | Description | Example |
|---------|-------------|---------|
| `status` | Get current device status | `status` |
| `info` | Get device information | `info` |
| `model` | Get device model | `model` |
| `serial` | Get device serial number | `serial` |

### Control Commands

| Command | Description | Example |
|---------|-------------|---------|
| `reset` | Reset device to standby | `reset` |
| `standby` | Set device to standby mode | `standby` |
| `start <program>` | Start wash program (1-4) | `start 1` |
| `stop` | Stop current program | `stop` |
| `program1` | Quick start program 1 | `program1` |
| `program2` | Quick start program 2 | `program2` |
| `program3` | Quick start program 3 | `program3` |
| `program4` | Quick start program 4 | `program4` |

### Raw Commands

| Command | Description | Example |
|---------|-------------|---------|
| `send <hex>` | Send raw hex packet | `send ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad` |
| `hex <hex>` | Send raw hex packet | `hex ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad` |

### Session Commands

| Command | Description | Example |
|---------|-------------|---------|
| `history [n]` | Show last n commands (default: 10) | `history 5` |
| `clear` | Clear command history | `clear` |
| `save <file>` | Save session to file | `save my-session.json` |
| `load <file>` | Load previous session | `load my-session.json` |

### Mode Commands

| Command | Description | Example |
|---------|-------------|---------|
| `mode <mode>` | Switch mode (interactive/automated) | `mode automated` |
| `auto` | Switch to automated mode | `auto` |
| `manual` | Switch to interactive mode | `manual` |

### System Commands

| Command | Description | Example |
|---------|-------------|---------|
| `help` | Show help | `help` |
| `exit` | Exit chat interface | `exit` |
| `quit` | Exit chat interface | `quit` |

## Usage Examples

### Interactive Mode

```bash
$ node src/index.js chat /dev/ttyUSB0

🔧 Haier Device Chat Interface
=====================================
Mode: interactive
Port: /dev/ttyUSB0
Type 'help' for commands, 'exit' to quit

haier> status
📊 Device Status:
   State: Standby
   Program: None
   Time Remaining: --

haier> auth
🔐 Authenticating...
   Challenge received: 78 8c 6f f2 d9 2d c8 55...
   Response sent: 64 38 63 4f 4e 79 47 30...
   ✅ Authentication successful!

haier> program1
🚀 Starting Program 1...
   ✅ Program started successfully

haier> send ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad
📤 Sent: ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad
📥 Response: ff ff 08 40 00 00 00 00 00 05 4d 61 80

haier> history
Last 4 commands:
1. [10:23:45] status → Device Status: Standby
2. [10:23:52] auth → Authentication successful
3. [10:24:01] program1 → Program started
4. [10:24:15] send ff ff... → Response: ff ff 08...

haier> exit
Goodbye! Session saved to logs/chat-session-1760931234.log
```

### Automated Mode

```bash
haier> auto
Switched to automated mode

haier> status
Auto-authenticating if needed... ✅
📊 Device Status: Running Program 1

haier> manual
Switched to interactive mode
```

## Features

### Automatic Authentication

In automated mode, the tool automatically responds to authentication challenges using the rolling code algorithm:

- Detects authentication challenges (command 0x12)
- Generates appropriate responses using device identifiers
- Handles authentication without user intervention

### Session Management

- **Command History**: Track all commands and responses
- **Session Logging**: Automatic logging to files
- **Session Export**: Export sessions in JSON or CSV format
- **Session Statistics**: View command frequency and error rates

### Colorized Output

- **Commands**: Cyan
- **Responses**: Green  
- **Errors**: Red
- **Info**: Yellow
- **Success**: Green with ✅
- **Failure**: Red with ❌

### Error Handling

- **Connection Failures**: Retry with backoff
- **Timeout on Responses**: Display warning, allow retry
- **Invalid Commands**: Show error and suggestion
- **Authentication Failure**: Retry with new challenge
- **Parse Errors**: Display raw data and error

## Logging

### Console Display (Colorized)

Commands and responses are displayed with appropriate colors for easy reading.

### File Logging

#### Text Log Format
```
[2025-01-20T10:23:45.456Z] status → Device Status: Standby
[2025-01-20T10:23:52.123Z] auth → Authentication successful
[2025-01-20T10:24:01.789Z] program1 → Program started
```

#### JSON Log Format
```json
{
  "sessionStart": "2025-01-20T10:23:45.123Z",
  "deviceInfo": { "imei": "...", "serial": "..." },
  "commands": [
    {
      "timestamp": "2025-01-20T10:23:45.456Z",
      "command": "status",
      "request": "ff ff 0a 40...",
      "response": "ff ff 43 40...",
      "parsed": { "state": "Standby" },
      "duration": 234
    }
  ]
}
```

## Configuration

### Serial Port Settings

- **Baud Rate**: 9600 (default)
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1

### Command Timeout

- **Default**: 5 seconds
- **Configurable**: Via options

### Log Files

- **Auto-saved**: `logs/chat-session-{timestamp}.log`
- **JSON format**: `logs/chat-session-{timestamp}.json`
- **Custom location**: Use `--log` option

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure user has access to serial port
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   ```

2. **Port Not Found**: Check available ports
   ```bash
   node src/index.js ports
   ```

3. **Authentication Failed**: Check device connection and rolling code algorithm

4. **Command Timeout**: Increase timeout or check device response

### Debug Mode

Enable verbose output for debugging:

```bash
node src/index.js chat /dev/ttyUSB0 --verbose
```

## Advanced Usage

### Custom Device Info

The tool automatically detects device information, but you can override it by modifying the `DeviceCommunicator` class.

### Custom Commands

Add custom commands by extending the `CommandHandler` class:

```javascript
// Add to commandHandler.js
'custom': this.handleCustomCommand.bind(this),

async handleCustomCommand(args) {
  // Custom command implementation
  return { message: 'Custom command executed' };
}
```

### Integration with Other Tools

The CLI chat tool integrates with:

- **Serial Monitor**: For packet analysis
- **Sequence Replayer**: For testing sequences
- **Rolling Code Analysis**: For authentication
- **Protocol Parser**: For packet parsing

## Security Considerations

- **Authentication**: Uses rolling code algorithm for secure communication
- **Session Logging**: Logs may contain sensitive device information
- **Serial Port Access**: Requires appropriate permissions

## Performance

- **Response Time**: Typically < 1 second for most commands
- **Memory Usage**: Minimal overhead for session management
- **Log File Size**: Grows with session length (typically < 1MB per hour)

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Test with the mock device first
4. Verify serial port connectivity

## Examples

### Complete Session Example

```bash
$ node src/index.js chat /dev/ttyUSB0

🔧 Haier Device Chat Interface
=====================================
Mode: interactive
Port: /dev/ttyUSB0
Type 'help' for commands, 'exit' to quit

haier> help
Haier Device Chat Interface
============================

Authentication Commands:
  auth              - Authenticate with device (auto-response enabled)
  challenge         - Send authentication challenge

Status & Info Commands:
  status            - Get current device status
  info              - Get device information
  model             - Get device model
  serial            - Get device serial number

Control Commands:
  reset             - Reset device to standby
  standby           - Set device to standby mode
  start <program>   - Start wash program (1-4)
  stop              - Stop current program
  program1-4        - Quick start program 1-4

Raw Commands:
  send <hex>        - Send raw hex packet
  hex <hex>         - Send raw hex packet

Session Commands:
  history [n]       - Show last n commands (default: 10)
  clear             - Clear command history
  save <file>       - Save session to file
  load <file>       - Load previous session

Mode Commands:
  mode <mode>       - Switch mode (interactive/automated)
  auto              - Switch to automated mode
  manual            - Switch to interactive mode

System Commands:
  help              - Show this help
  exit, quit        - Exit chat interface

haier> status
📊 Getting device status...
📊 Device Status:
   State: Standby
   Program: None
   Time Remaining: --

haier> auth
🔐 Authenticating...
🔐 Authentication challenge received
🔐 Generating authentication response...
✅ Authentication successful!

haier> program1
🚀 Starting program 1...
🚀 Starting Program 1...
   ✅ Program started successfully

haier> status
📊 Getting device status...
📊 Device Status:
   State: Running
   Program: 1
   Time Remaining: 45:00

haier> history 3
Last 3 commands:
1. [10:23:45] status → Device Status: Standby
2. [10:23:52] auth → Authentication successful
3. [10:24:01] program1 → Program started

haier> exit
👋 Goodbye!
💾 Session saved to logs/chat-session-1760931234.log
```

This completes the CLI chat tool implementation with comprehensive documentation and examples.
