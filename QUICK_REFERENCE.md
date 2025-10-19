# Haier Protocol Quick Reference Card

## Essential Commands (Copy-Paste Ready)

### Session Initialization (Send in Order)
```
1. ff ff 0a 00 00 00 00 00 00 61 00 07 72                     # Session start
2. ff ff 08 40 00 00 00 00 00 70 b8 86 41                     # Controller ready
3. ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4               # Handshake init
4. [Wait for] ff ff 08 40 00 00 00 00 00 73 bb 87 01          # Handshake ACK (from machine)
5. ff ff 08 40 00 00 00 00 00 05 4d 61 80                     # Standard ACK
```

### Device Identification
```
ff ff 19 40 00 00 00 00 00 11 00 f0 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39 7e cc 81
# IMEI: 862817068367949
```

### Heartbeat (Send Every 3-5 Seconds)
```
ff ff 08 40 00 00 00 00 00 05 4d 61 80                       # Standard heartbeat
```

### Status Query
```
ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1                 # Request status
# Expect 3x: ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01    # Query response
# Then:      ff ff 43 40 ... 6d 01 [status] ...              # Status packet
```

### Start Wash Programs
```
# Program 1
ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad

# Program 2
ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad

# Program 3
ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac

# Program 4
ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad
```

### Reset to Standby
```
ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b          # Reset command
# Expect:    ff ff 12 40 00 00 00 00 00 04 0f 5a ...         # Reset confirm
```

### Control Signal
```
ff ff 08 40 00 00 00 00 00 09 51 64 80                       # Control signal
```

### Complex Command (Alternative Program Start)
```
ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04 00 02 17 00 96 22 e4
# For Mode 2 with extended parameters
```

### Session Boundary
```
00                                                             # Session separator
```

---

## Status Code Decoder

### Machine Status (Byte 13-15 in Status Response)
```
6d 01 01 30 30  →  Standby (Ready for commands)
6d 01 01 30 10  →  Ready (Parameter mode 1)
6d 01 02 b0 31  →  Busy/Error (API error 60015)
6d 01 04 30 30  →  Reset in progress
6d 01 01 b0 31  →  Program 1 running
6d 01 02 b0 31  →  Program 2 running (or busy)
6d 01 03 b0 31  →  Program 3 running
6d 01 04 b0 31  →  Program 4 running
```

### Response Type Codes
```
6d 01  →  Status response (67 bytes total)
6d 02  →  Extended data response (70 bytes total)
0f 5a  →  Reset confirmation
4d 61  →  Standard ACK/heartbeat
51 64  →  Control signal
73     →  Handshake ACK
70     →  Controller ready
f3     →  Status query request
f5     →  Query response
```

---

## Packet Format Reference

### Standard Command Packet
```
ff ff [len] 40 [seq:4] [cmd] [payload] [crc:3]
│  │   │    │   │       │     │         └─ 3-byte CRC
│  │   │    │   │       │     └─────────── Variable payload
│  │   │    │   │       └───────────────── Command/control ID
│  │   │    │   └───────────────────────── 4-byte sequence (usually 00 00 00 00)
│  │   │    └───────────────────────────── Frame type (40=command/control)
│  │   └────────────────────────────────── Packet length
│  └────────────────────────────────────── Header (always ff ff)
```

### Packet Length Examples
```
08 = 8 bytes   (Heartbeat/ACK)
0a = 10 bytes  (Handshake, Query)
0c = 12 bytes  (Reset command)
0e = 14 bytes  (Program commands)
12 = 18 bytes  (Reset confirm)
19 = 25 bytes  (Device ID)
20 = 32 bytes  (Timestamp)
22 = 34 bytes  (Complex command)
25 = 37 bytes  (Authentication)
28 = 40 bytes  (Binary config)
2c = 44 bytes  (Serial number)
2e = 46 bytes  (Firmware/Model)
43 = 67 bytes  (Status response)
46 = 70 bytes  (Data response)
```

---

## Authentication Challenge/Response

### Challenge Structure (37 bytes)
```
ff ff 25 40 00 00 00 00 00 11 10 02 00 01 [8-byte code] 01 [16-24 byte encrypted]
```

### Example Challenge Codes (8 bytes, appears as ASCII)
```
56 57 65 56 49 43 37 55  →  "VWeVIC7U"
45 4a 6c 61 32 56 41 54  →  "EJla2VAT"
33 33 75 68 42 57 64 57  →  "33uhBWdW"
66 42 35 7a 41 6b 47 6f  →  "fB5zAkGo"
61 39 58 4d 50 57 69 4d  →  "a9XMPWiM"
63 36 61 77 46 7a 65 42  →  "c6awFzeB"
51 58 49 32 37 51 50 50  →  "QXI27QPP"
```

**Note:** Challenge codes are unique per session (rolling code system)

---

## Timing Guidelines

```
Action                          Delay
─────────────────────────────────────────────
After session init              100ms
After handshake                 50ms
After authentication            200ms
Between heartbeats              3-5 seconds
After program command           500ms (wait for status)
After reset                     1 second
Query retry timeout             3 seconds
Session timeout (no heartbeat)  15 seconds
```

---

## Device Information Responses

### Firmware Version Response (46 bytes)
```
ff ff 2e 40 00 00 00 00 00 62
45 2b 2b 32 2e 31 37 00          →  "E++2.17"
32 30 32 34 31 32 32 34          →  "20241224" (date)
f1 00 00
30 30 30 30 30 30 30 31 00       →  "00000001" (build)
55 2d 57 4d 54 00 00 00 00       →  "U-WMT" (type)
[crc]
```

### Model Number Response (46 bytes)
```
ff ff 2e 40 00 00 00 00 00 ec
43 45 41 42 39 55 51 30 30 00 00 00 00 00 00 00 00 00 00 00  →  "CEAB9UQ00"
30 30 30 30 30 30 32 30                                       →  "00000002"
32 34 31 32 32 34                                             →  "241224"
[rest]
```

### Serial Number Response (44 bytes)
```
ff ff 2c 40 00 00 00 00 00 ea 00
30 30 32 31 38 30 30 30 37 38      →  "0021800078"
45 48 44 35 31 30 38 44 55 5a      →  "EHD5108DUZ"
30 30 30 30 30 30 32 30            →  "00000002"
32 34 31 32 32 34                  →  "241224"
[crc]
```

---

## Common Message Flows

### Minimal Startup Flow
```
1. Session Start (00 frame)
2. Controller Ready (70)
3. Handshake (4d 01)
4. Wait for Handshake ACK (73)
5. Standard ACK (4d 61)
6. Device ID broadcast
7. Status Query (f3)
8. Wait for machine info dump
9. Start heartbeat loop
→ Ready for commands
```

### Send Program Command Flow
```
1. Query status (f3)
2. Verify standby (6d 01 01 30 30)
3. Send program command (00 60 [prog])
4. Wait for ACK (4d 61)
5. Monitor status (6d 01 [prog] b0 31)
6. Continue heartbeat
7. Wait for completion (6d 01 01 30 30)
```

### Reset Flow
```
1. Send reset (5d 1f 00 01)
2. Wait for reset confirm (0f 5a)
3. Monitor status (6d 01 04 30 30) - resetting
4. Wait for standby (6d 01 01 30 30) - ready
5. Machine sends updated info
```

---

## Error Handling

### Machine Busy
```
Status: 6d 01 02 b0 31
Action: Wait 2-3 seconds, retry command
```

### No Response
```
1. Retry command once (after 3s)
2. Send heartbeat (4d 61)
3. If no heartbeat ACK → reinitialize session
```

### Authentication Failure
```
1. Resend challenge
2. If 3 failures → full session reset
```

---

## Implementation Checklist

### Basic Controller
- [ ] Send session initialization sequence
- [ ] Implement heartbeat every 3-5 seconds
- [ ] Parse status responses (67 bytes)
- [ ] Send program commands
- [ ] Handle ACKs

### Advanced Controller
- [ ] Implement authentication challenge/response
- [ ] Parse extended data (70 bytes)
- [ ] Handle timestamp synchronization
- [ ] Implement retry logic
- [ ] Session timeout detection
- [ ] CRC validation
- [ ] Error state handling

### Full Implementation
- [ ] State machine for all sequences
- [ ] Rolling code authentication
- [ ] Complex command support
- [ ] Real-time status monitoring
- [ ] Program progress tracking
- [ ] Configuration parameter decoding
- [ ] Multi-session management

---

## Testing Commands

### Test Sequence 1: Basic Connection
```
1. ff ff 0a 00 00 00 00 00 00 61 00 07 72
2. ff ff 08 40 00 00 00 00 00 70 b8 86 41
3. ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4
4. [Expect ACK from machine]
```

### Test Sequence 2: Query Status
```
1. ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
2. [Expect 3x f5 responses]
3. [Expect status packet 6d 01]
```

### Test Sequence 3: Heartbeat
```
1. ff ff 08 40 00 00 00 00 00 05 4d 61 80
2. [Expect same ACK back]
3. [Repeat every 3-5 seconds]
```

---

## Troubleshooting

### No Response After Handshake
- Check CRC values (last 3 bytes)
- Verify sequence bytes (usually 00 00 00 00)
- Ensure proper timing delays

### Machine Won't Accept Program Command
- Query status first (must be 01 30 30)
- Check if busy (02 b0 31)
- Verify program command format
- Check heartbeat is active

### Connection Drops
- Heartbeat interval too long (>5s)
- Missing ACK responses
- Session timeout occurred (>15s idle)
- Need to reinitialize with 00 frame

### Authentication Fails
- Challenge code must be unique per session
- Response must be within timeout (3s)
- Check packet format (10 02 00 01)
- Verify 8-byte code + 01 + encrypted payload

---

## Hex to ASCII Converter (Quick Reference)

```
30-39 = 0-9
41-5A = A-Z
61-7A = a-z
20 = space
2B = +
2D = -
2E = .
```

---

## Useful Parsing Snippets

### Extract Status from Status Packet (67 bytes)
```
Bytes 0-1:   ff ff (header)
Byte 2:      43 (length = 67)
Byte 3:      40 (frame type)
Bytes 4-8:   sequence
Bytes 9-10:  usually varies
Bytes 11-12: 6d 01 (status response marker)
Byte 13:     status code (01=ready, 02=busy, 04=reset, 01-04=program)
Bytes 14-15: parameters (30 30=standby, 30 10=ready, b0 31=running)
Bytes 16-63: configuration data
Bytes 64-66: CRC
```

### Extract Device ID (25 bytes)
```
Bytes 0-10:  ff ff 19 40 00 00 00 00 00 11 00
Byte 11:     f0 (device ID marker)
Bytes 12-24: ASCII IMEI digits
Bytes 22-24: CRC
```

### Extract Firmware (46 bytes)
```
Bytes 0-10:  ff ff 2e 40 00 00 00 00 00 62
Bytes 11-18: ASCII firmware version
Bytes 19-26: ASCII date (YYYYMMDD)
Bytes 30-37: ASCII build number
Bytes 38-45: ASCII type string
Bytes 43-45: CRC
```

---

*Quick Reference v1.0 - For Haier Protocol Implementation*
