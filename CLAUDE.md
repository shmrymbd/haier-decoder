# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains captured hex protocol data from Haier appliances, specifically washing machine communication logs. The project is focused on decoding and understanding the proprietary communication protocol used between Haier appliances and their control systems.

## Data Files

- `startupMachine.txt` - Hex packet captures from the washing machine during startup sequence
- `startupModem.txt` - Hex packet captures from the modem/controller during startup sequence

## Protocol Structure

The captured data follows a consistent packet format:
- Packets always start with `ff ff` preamble
- Followed by length byte
- Frame type byte (`40` for command/control frames)
- Sequence number (4 bytes)
- Command/control identifier
- Payload data specific to each command type
- CRC/checksum at the end (typically 3 bytes)

### Packet Format
```
ff ff [length] 40 [seq:4] [command_id] [payload] [crc:3]
```

## TTL Command Reference

### 1. Wash Program Commands
**Format:** `ff ff 0e 40 00 00 00 00 00 60 00 01 [program] 00 00 00 [crc]`

**Commands:**
- **Mode 1:** `ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad`
- **Mode 2:** `ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad`
- **Mode 3:** `ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac`
- **Mode 4:** `ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad`

**Purpose:** Start specific wash programs

### 2. Reset/Standby Command
**Format:** `ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 [crc]`

**Command:**
- **Reset:** `ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b`

**Purpose:** Return device to standby state

### 3. Control/Acknowledgment Commands
**Short Format (8 bytes):** `ff ff 08 40 [sequence] [data] [crc]`

**Common Control Commands:**
- **Standard ACK:** `ff ff 08 40 00 00 00 00 00 05 4d 61 80`
- **Control Signal:** `ff ff 08 40 00 00 00 00 00 09 51 64 80`
- **Initialization ACK:** `ff ff 08 40 00 00 00 00 00 05 4d 61 80`

**Purpose:** Handshake, acknowledgments, control signals

### 4. Complex Command (Mode 2 - Alternate)
**Format:** `ff ff 22 40 [sequence] [complex_data] [crc]`

**Command:**
- **Mode 2 Complex:** `ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04 00 02 17 00 96 22 e4`

**Purpose:** Extended command format (used when device busy or special conditions)

### 5. Initialization/Handshake Command
**Format:** `ff ff 0a 40 [sequence] [data] [crc]`

**Command:**
- **Init:** `ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4`

**Purpose:** Session initialization

## Machine Response Types

### 1. Status Response (67 bytes)
**Format:** `ff ff 43 40 [sequence] 6d 01 [status] [params] [status_data] [crc]`

**Status Types:**
- **Success:** `6d 01 01 30 30` (Standby/Ready)
- **Running:** `6d 01 [program] b0 31` (Program active)
- **Error:** `6d 01 02 b0 31` (Device busy - maps to API "60015")
- **Reset Progress:** `6d 01 04 30 30` (Reset initiated)

### 2. Data Response (70 bytes)
**Format:** `ff ff 46 40 [sequence] 6d 02 [program_data] [crc]`

**Purpose:** Extended program configuration data

### 3. Reset Confirmation (18 bytes)
**Format:** `ff ff 12 40 [sequence] 0f 5a [reset_data] [crc]`

**Command:** `ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 00 00 00 00 bf 0a 33`

**Purpose:** Reset operation completion confirmation

## Command Summary by Function

### Control Commands:
- `5d 1f 00 01` - Reset to standby
- `4d 01` - Start command initialization
- `4d 61` - Standard acknowledgment
- `51 64` - Control signal

### Program Commands:
- `00 01 01 00 00 00` - Start program 1
- `00 01 02 00 00 00` - Start program 2
- `00 01 03 00 00 00` - Start program 3
- `00 01 04 00 00 00` - Start program 4

### Status Indicators:
- `01 30 30` - Ready/Standby
- `[program] b0 31` - Program running
- `02 b0 31` - Error/Busy
- `04 30 30` - Reset in progress

## Protocol Constants

- **Header:** Always `ff ff`
- **Frame Type:** `40` for command/control frames
- **Wash Command Sequence:** Fixed `00 60`
- **Reset Sequence:** Starts from `00 01`
- **Response Prefix:** `6d 01` for status, `6d 02` for data

## Working with the Data

When analyzing or decoding these files:
1. Each line represents a complete packet or packet fragment
2. Hex values are space-separated for readability
3. Some packets contain ASCII-encoded strings (e.g., firmware versions, model numbers)
4. Encrypted/obfuscated data appears in longer packets (types `0x25`, `0x12`)
5. The `00` byte typically indicates packet boundaries/resets

## Development Approach

When building tools for this project:
- Parse hex strings into byte arrays for analysis
- Group packets by command type for pattern recognition
- Extract ASCII strings where present for model/version identification
- Implement checksum validation for packet integrity
- Consider state machine approach for protocol decoding
- Reference the TTL Command Reference for known command patterns
- Use the Machine Response Types to decode device status
