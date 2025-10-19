# Haier Protocol Decoded Analysis

## Executive Summary

This document contains a comprehensive analysis of the Haier washing machine communication protocol captured during startup sequences. The data reveals device identification, firmware versions, serial numbers, status information, and encrypted authentication exchanges.

---

## Part 1: Machine Responses (startupMachine.txt)

### Device Identification & Version Information

**Line 2, 25, 50, 75, 94** - Firmware/Software Version:
```
ff ff 2e 40 00 00 00 00 00 62 45 2b 2b 32 2e 31 37 ...
```
**Decoded ASCII:**
- **Firmware Version:** `E++2.17`
- **Date:** `20241224` (December 24, 2024)
- **Model/Type:** `U-WMT` (likely "Universal Washing Machine Type")
- **Internal Code:** `00000001`

**Line 19, 45, 69** - Device Model Number:
```
ff ff 2e 40 00 00 00 00 00 ec 43 45 41 42 39 55 51 30 30 ...
```
**Decoded ASCII:**
- **Model Number:** `CEAB9UQ00`
- **Manufacture Date:** `00000002` `20241224`

**Line 20, 46, 70** - Serial Number:
```
ff ff 2c 40 00 00 00 00 00 ea 00 30 30 32 31 38 ...
```
**Decoded ASCII:**
- **Serial Number:** `0021800078EHD5108DUZ00000002`
- **Date:** `20241224`

### Status Response Packets

**Lines 4, 7, 14, 27, 31, etc.** - Status Response (67 bytes):
```
ff ff 43 40 00 00 00 00 00 [seq] 6d 01 [status] [params]
```

**Decoded Status Information:**

#### Status Byte Analysis:
- `6d 01 01 30 10` - Machine Ready, Status 1, Parameter 0x30 0x10
- `6d 01 01 30 30` - Machine Ready (Standby), Status 1, Parameter 0x30 0x30

**Configuration Parameters** (bytes 15-67):
```
03 00 00 00 20 04 03 05 01 00 01 02 30 00 00 00 00
0a 0f 08 14 05 05 06 05 04 1a 04 1a 04 1a
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
01 00 00 00 00 00 01 00
```

**Interpretation:**
- Program slots: `03` (3 programs available initially)
- Program parameters: `20 04 03 05 01`
- Time settings: `0a 0f 08 14` (10, 15, 8, 20 - possibly time units)
- Spin speeds: `05 05 06 05 04` (various spin speed options)
- Temperature options: `1a 04 1a 04 1a` (26°C, 4°C, 26°C, 4°C, 26°C)
- Available programs flag: `01` at end

### Data Response Packets

**Line 5, 28, 53, 78, 97** - Extended Data (70 bytes):
```
ff ff 46 40 00 00 00 00 00 06 6d 02 00 00 00 01 ...
```

**Decoded Parameters:**
```
6d 02 00 00 00 01 00 00 00 00 00 00 00 00
04 01 02 01 00 00 00 00
0a 0f 08 07 05 05 05 00 01 69
```

**Interpretation:**
- Response type: `6d 02` (extended data)
- Program index: `01`
- Program count: `04`
- Configuration: `01 02 01`
- Time parameters: `0a 0f 08 07` (10, 15, 8, 7 minutes)
- Speed settings: `05 05 05`
- Special flag: `69` (105 decimal - possibly max temperature)
- Memory slots: `24 01 4c 24 02 01`

### Control Commands

**Lines 8, 9, 11-18, 21-22, 30, 32, etc.** - ACK Packets:
```
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```
- Standard acknowledgment/heartbeat
- Command ID: `4d 61`

**Lines 1, 6, 24, 29, 49, 54, 74, etc.** - Reset Confirmation:
```
ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 00 00 00 00
```
- Reset/initialization confirmation
- Command: `0f 5a`
- Sequence varies: `04` or `74`

### Encrypted Authentication Packets

**Line 10** - Authentication Challenge:
```
ff ff 25 40 00 00 00 00 00 12 10 02 00 01
db 61 6e 43 47 1e 37 4f 01 79 6d 40 1a 35 74 79
8c 91 0b 91 39 00 02 e9 a8 4a 19 5f
```

**Line 33** - Authentication Challenge (different):
```
ff ff 25 40 00 00 00 00 00 12 10 02 00 01
75 5a af 88 e5 c8 52 70 01 3f 8e 46 d1 bb 19 63
34 9e dd c7 06 91 ed 68 4c c9 74 92
```

**Analysis:**
- Type: `10 02 00 01` - Challenge/response authentication
- Contains 28 bytes of encrypted data
- Changes with each session
- Appears to be rolling code authentication

**Lines 58, 61** - Duplicate Authentication (possible retry):
```
ff ff 25 40 00 00 00 00 00 12 10 02 00 01
bf 11 eb 49 2c c5 3f a5 01 9c d8 61 b1 68 08 f5
80 f5 21 cf 37 2f 3c 3a 74 04 51 cc
```
- Same packet sent twice (lines 58 and 61)
- Indicates potential communication retry mechanism

### Packet Boundaries

**Lines 23, 48, 92** - Reset Marker:
```
00
```
- Single `00` byte indicates communication session boundary/reset

### Mysterious Data Packet

**Line 3, 26, 51, 76, 95** - Unknown Binary Data:
```
ff ff 28 40 00 00 00 00 00 71 20 1c 51 89 0c 31 c3 08 05 03 00 21 80 00 78 45 ...
```
- 40-byte packet with command `71`
- Contains binary configuration or calibration data
- Repeats exactly in every session (static data)

---

## Part 2: Modem/Controller Commands (startupModem.txt)

### Initialization Sequence

**Lines 1, 27, 57, 87, 110** - Session Start:
```
ff ff 0a 00 00 00 00 00 00 61 00 07 72
```
- Frame type `00` (different from `40`)
- Command: `61`
- Initialization marker

**Lines 2, 28, 58, 88, 111** - Controller Status:
```
ff ff 08 40 00 00 00 00 00 70 b8 86 41
```
- Command: `70`
- Controller ready signal

**Lines 3, 29, 59, 89, 112** - Handshake:
```
ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4
```
- Initialization handshake
- Command: `4d 01` (matches machine ACK)

**Lines 4, 30, 60, 90, 113** - Response:
```
ff ff 08 40 00 00 00 00 00 73 bb 87 01
```
- Command: `73`
- Handshake acknowledgment

### Device Identifier String

**Lines 7-9, 15, 18, 20, 33, 35, etc.** - IMEI/Device ID:
```
ff ff 19 40 00 00 00 00 00 11 00 f0
38 36 32 38 31 37 30 36 38 33 36 37 39 34 39
```

**Decoded ASCII:**
- **IMEI/Device ID:** `8628170683679 49`
- Command: `11 00 f0`
- This appears to be a modem IMEI or unique device identifier
- Sent repeatedly throughout session

### Complex Command Packets

**Line 11, 21, 25, 38, 52, etc.** - Mode 2 Complex Command:
```
ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04 00 02 17 00
```

**Decoded Structure:**
- Command: `f7`
- Program mode: `01 03 01 08`
- Program selection: `00 01` (Program 1)
- Configuration blocks:
  - `03 00 02 06` - Parameter set 1
  - `01 00 01 00 02 00` - Parameter set 2
  - `03 04 00 02` - Parameter set 3
- Sequence counter: `17 00` (varies: `17`, `1b`, `18`, `1c`)

**Variations observed:**
- Line 38: Sequence `1b 00 9a` (instead of `17 00 96`)
- Line 67: Sequence `18 00 96`
- Line 97: Sequence `1c 00 9a`

**Interpretation:**
- Multi-parameter program command
- Contains nested configuration data
- Sequence number increments over time
- Likely configures multiple wash parameters simultaneously

### Query Commands

**Lines 10, 12-14, 37, 39-41, etc.** - Status Query:
```
ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
```
- Command: `f3`
- Query type marker

**Response:**
```
ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01
```
- Response: `f5`
- Repeated 3 times (lines 12-14, 39-41, etc.)
- Indicates query acknowledgment

### Authentication Exchanges

**Line 16** - Challenge from Modem:
```
ff ff 25 40 00 00 00 00 00 11 10 02 00 01
56 57 65 56 49 43 37 55 01 d2 87 c9 4b 77 9b 59
d7 e2 68 e2 a8 80 ff 55 24 06 8b cf d8
```

**Partial ASCII in encrypted data:**
- `VWeVIC7U` - Appears in first 8 bytes
- Rest is encrypted

**Line 43, 45** - Challenge (Duplicate):
```
ff ff 25 40 00 00 00 00 00 11 10 02 00 01
45 4a 6c 61 32 56 41 54 01 6a a6 0b 61 b4 3a be
```
- Partial ASCII: `EJla2VAT`
- Line 45 is exact duplicate (split packet or retry)

**Line 74** - Another Challenge:
```
33 33 75 68 42 57 64 57 01 ed 2b 57 22 26 be 89
```
- Partial ASCII: `33uhBWdW`

**Line 79** - Challenge:
```
66 42 35 7a 41 6b 47 6f 01 c7 35 64 d3 6c 88 e7
```
- Partial ASCII: `fB5zAkGo`

**Line 103** - Challenge:
```
61 39 58 4d 50 57 69 4d 01 d7 c7 b7 4e e5 a5 6f
```
- Partial ASCII: `a9XMPWiM`

**Line 127-128** - Challenge (split packet):
```
63 36 61 77 46 7a 65 42 01 c8 8d a2 5b 90 0b
01 75 02 a0 ee f3 a0 e1 ec 4c 01 af 48
```
- Partial ASCII: `c6awFzeB`

**Line 130** - Challenge:
```
51 58 49 32 37 51 50 50 01 2a 54 fc 5d 84 23 91
```
- Partial ASCII: `QXI27QPP`

**Analysis of Authentication:**
- First 8 bytes appear to be base64-like challenge codes
- Followed by separator `01`
- Then 16-24 bytes of encrypted response
- Each challenge is unique per session
- Rolling code authentication system

### Timestamp Packets

**Lines 19, 49, 78, 106, 131** - Timestamp Data:
```
ff ff 20 40 00 00 00 00 00 11 10 00
68 f4 fb e9 07 e9 0a 13 16 37 25 01 00 08 00 00 00 00 00 00 00 00
```

**Decoded Timestamp:**
- Command: `11 10 00`
- Unix-like timestamp bytes: `68 f4 fb e9`
- Date/time components: `07 e9 0a 13 16`
  - Possible interpretation: Year 0x07e9 (2025), Month 0x0a (10), Day 0x13 (19), Hour 0x16 (22)
- Sequence: `37 25` (varies: `37 25`, `38 13`, `39 24`, `3a 1e`, `3a 35`)

**Variations observed:**
- Line 49: `68 f4 fc 13 ... 38 13`
- Line 78: `68 f4 fc 60 ... 39 24`
- Line 106: `68 f4 fc 96 ... 3a 1e`
- Line 131: `68 f4 fc ad ... 3a 35`

**Analysis:**
- Timestamp increments over session
- Sequence counter increases: `37→38→39→3a` (minutes)
- Sub-counter increases: `25→13→24→1e→35` (seconds)

### Control Signals

**Lines 22, 53, 82** - Unknown Control:
```
ff ff 08 40 00 00 00 00 00 eb 33 2d 00
```
- Command: `eb 33`

**Lines 23, 54, 83** - Response:
```
ff ff 09 40 00 00 00 00 00 e9 00 32 f0 21
```
- Command: `e9`
- Single parameter: `32`

**Lines 24, 51, 86, 108** - Control Signal:
```
ff ff 08 40 00 00 00 00 00 09 51 64 80
```
- Command: `51 64`
- Matches documented control signal from protocol reference

### Session Boundaries

**Lines 26, 56, 109** - Session Reset:
```
00
```
- Single null byte separates sessions
- Indicates communication restart

### Split Packets

Several packets are split across lines:
- **Line 31-32:** `ff ff 08 40 00 00 00 00 | 00 05 4d 61 80`
- **Line 44-45:** Authentication packet split
- **Line 71-72:** Device ID split
- **Line 75-76:** Device ID split
- **Line 101-102:** Device ID split
- **Line 127-128:** Authentication split

**Analysis:**
- Indicates data capture timing issues
- Packets should be reassembled before processing

---

## Summary of Key Findings

### Device Information
- **Model:** CEAB9UQ00
- **Firmware:** E++2.17 (December 24, 2024)
- **Type:** U-WMT (Universal Washing Machine Type)
- **Serial:** 0021800078EHD5108DUZ00000002
- **Modem IMEI:** 862817068367949

### Protocol Features
1. **Rolling Code Authentication:** 8-byte challenge + encrypted response
2. **Session Management:** Regular resets with `00` byte markers
3. **Heartbeat System:** Regular `4d 61` acknowledgments
4. **Timestamp Tracking:** Real-time clock synchronization
5. **Complex Commands:** Multi-level parameter structures
6. **Status Reporting:** Detailed 67-byte status packets
7. **Configuration Data:** Program parameters, times, temperatures

### Security Observations
- Authentication uses rolling codes that change each session
- Encrypted portions use unknown algorithm
- First 8 bytes of auth challenges appear to be base64-like strings
- Challenge-response mechanism prevents replay attacks

### Communication Pattern
1. **Init:** Session start marker
2. **Handshake:** Controller/machine exchange IDs
3. **Auth:** Rolling code challenge/response
4. **Query:** Status and data requests
5. **Commands:** Program selection and control
6. **Status:** Continuous status reporting
7. **Heartbeat:** Regular ACK packets
8. **Reset:** Session boundary marker

### Program Configuration
- Supports 3-4 wash programs
- Temperature range: 4°C to 26°C (and higher)
- Multiple spin speed options: 4-6 settings
- Time parameters in 5-20 minute ranges
- Memory slots for custom programs

---

## Recommendations for Further Analysis

1. **Timestamp Decoding:** Verify exact timestamp format
2. **Authentication:** Attempt to identify encryption algorithm
3. **CRC Validation:** Verify checksum algorithm
4. **Command Testing:** Validate decoded commands with actual device
5. **Sequence Analysis:** Map complete communication state machine
6. **Error Handling:** Capture error conditions and responses
7. **Program Data:** Decode complete program parameter structures

---

## Packet Type Summary Table

| Type | Length | Command | Purpose | Example |
|------|--------|---------|---------|---------|
| Status | 67 | `6d 01` | Machine status | `ff ff 43 40...` |
| Data | 70 | `6d 02` | Extended data | `ff ff 46 40...` |
| ACK | 8 | `4d 61` | Acknowledgment | `ff ff 08 40...` |
| Auth | 37 | `10 02` | Authentication | `ff ff 25 40...` |
| Version | 46 | `62` | Firmware info | `ff ff 2e 40...` |
| Model | 46 | `ec` | Model number | `ff ff 2e 40...` |
| Serial | 44 | `ea` | Serial number | `ff ff 2c 40...` |
| Reset | 18 | `0f 5a` | Reset confirm | `ff ff 12 40...` |
| DeviceID | 25 | `11 00 f0` | IMEI string | `ff ff 19 40...` |
| Time | 32 | `11 10 00` | Timestamp | `ff ff 20 40...` |
| Complex | 34 | `f7` | Multi-param cmd | `ff ff 22 40...` |
| Query | 10 | `f3` | Status query | `ff ff 0a 40...` |
| Control | 8 | `51 64` | Control signal | `ff ff 08 40...` |

---

*End of Analysis*
