# Node-RED Haier Reset Command Setup

This guide shows how to set up Node-RED flows to simulate the Haier washing machine reset command without a UI.

## Files Created

1. **`simple-reset-flow.json`** - Basic reset flow
2. **`complete-reset-flow.json`** - Complete flow with timing and response handling
3. **`nodered-reset-function.js`** - Standalone function code

## Setup Instructions

### 1. Import the Flow

1. Open Node-RED in your browser (usually `http://localhost:1880`)
2. Click the menu (☰) → Import
3. Copy and paste the contents of `simple-reset-flow.json` or `complete-reset-flow.json`
4. Click "Import"

### 2. Configure Serial Port

1. Double-click the "Serial Output" node
2. Click the pencil icon next to "Serial port"
3. Set:
   - **Serial port**: `/dev/ttyUSB0` (or your device port)
   - **Baud rate**: `9600`
   - **Data bits**: `8`
   - **Parity**: `none`
   - **Stop bits**: `1`
   - **Output**: `time`
   - **Binary**: `true`

### 3. Deploy and Test

1. Click the "Deploy" button
2. Click the "Start Reset" inject node to send the reset command
3. Monitor the debug output for responses

## Simple Flow Usage

The simple flow contains:
- **Inject node**: Triggers the reset command
- **Function node**: Generates the reset command
- **Serial Output**: Sends to device
- **Serial Input**: Receives responses
- **Debug**: Shows received data

## Complete Flow Usage

The complete flow includes:
- **Step 1**: Send reset command
- **Step 2**: Wait 1 second, then query status
- **Step 3**: Wait 2 seconds, then send heartbeat
- **Response parsing**: Identifies different response types
- **Auto-reset**: Optional 10-second interval reset

## Manual Function Node

If you prefer to create your own flow, use this function code:

```javascript
// Haier reset command: FF FF 0C 40 00 00 00 00 00 01 5D 1F 00 01 CA BB 9B
const hexCommand = "FF FF 0C 40 00 00 00 00 00 01 5D 1F 00 01 CA BB 9B";
const buffer = Buffer.from(hexCommand.replace(/\s/g, ''), 'hex');

msg.payload = buffer;
msg.topic = "haier-reset";
return msg;
```

## Expected Responses

After sending the reset command, you should see:

1. **Status Update**: `FF FF 43 40 ... 6D 01 01 30 30 ...` (Device in standby)
2. **Reset Confirmation**: `FF FF 12 40 ... 0F 5A ...` (Reset acknowledged)
3. **ACK**: `FF FF 08 40 ... 4D 61 80` (Command acknowledged)

## Troubleshooting

1. **Permission denied**: Run `sudo chmod 666 /dev/ttyUSB0`
2. **Port not found**: Check with `ls /dev/ttyUSB*`
3. **No response**: Verify device is connected and powered
4. **Wrong baud rate**: Try 9600, 115200, or 38400

## Command Reference

- **Reset Command**: `FF FF 0C 40 00 00 00 00 00 01 5D 1F 00 01 CA BB 9B`
- **Status Query**: `FF FF 0A 40 00 00 00 00 00 F3 00 00 3D D0 E1`
- **Heartbeat**: `FF FF 08 40 00 00 00 00 00 09 51 64 80`

## Auto-Reset Feature

The complete flow includes an auto-reset feature that sends the reset command every 10 seconds. To enable:

1. Deploy the complete flow
2. The "Auto Reset (10s)" inject node will automatically trigger
3. Monitor the debug output for responses

This is useful for testing or maintaining device state.
