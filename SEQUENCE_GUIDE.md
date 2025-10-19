# Haier Protocol Communication Sequence Guide

## Table of Contents
1. [Complete Startup Sequence](#complete-startup-sequence)
2. [Session Initialization](#session-initialization)
3. [Authentication Flow](#authentication-flow)
4. [Status Query Cycle](#status-query-cycle)
5. [Program Start Sequence](#program-start-sequence)
6. [Heartbeat Pattern](#heartbeat-pattern)
7. [Reset Sequence](#reset-sequence)
8. [Complete Command Flow](#complete-command-flow)

---

## Complete Startup Sequence

Based on the captured data, here's the exact sequence that occurs during machine startup:

```
┌─────────┐                                           ┌─────────┐
│ Modem/  │                                           │ Machine │
│Controller│                                          │         │
└────┬────┘                                           └────┬────┘
     │                                                      │
     │ [1] Session Start                                   │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 0a 00 00 00 00 00 00 61 00 07 72            │
     │                                                      │
     │ [2] Controller Ready                                │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 08 40 00 00 00 00 00 70 b8 86 41            │
     │                                                      │
     │ [3] Handshake Init                                  │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4      │
     │                                                      │
     │                                 [4] Handshake ACK   │
     │  ◄──────────────────────────────────────────────────┤
     │              ff ff 08 40 00 00 00 00 00 73 bb 87 01│
     │                                                      │
     │                                      [5] ACK Ready  │
     │  ◄──────────────────────────────────────────────────┤
     │              ff ff 08 40 00 00 00 00 00 05 4d 61 80│
     │                                                      │
     │ [6] Standard ACK                                    │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 08 40 00 00 00 00 00 05 4d 61 80            │
     │                                                      │
     │ [7] Device ID (IMEI)                                │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 19 40 00 00 00 00 00 11 00 f0               │
     │ 38 36 32 38 31 37 30 36 38 33 36 37 39 34 39      │
     │ ("862817068367949")                                 │
     │                                                      │
     │ [8] Device ID (repeated for confirmation)           │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 19 40 00 00 00 00 00 11 00 f0 ...           │
     │                                                      │
     │                                      [9] ACK        │
     │  ◄──────────────────────────────────────────────────┤
     │              ff ff 08 40 00 00 00 00 00 05 4d 61 80│
     │                                                      │
     │ [10] Status Query                                   │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1      │
     │                                                      │
     │                            [11] Reset Confirmation  │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 │
     │   00 00 00 00 bf 0a 33                              │
     │                                                      │
     │                            [12] Firmware Version    │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 2e 40 00 00 00 00 00 62                    │
     │   "E++2.17" "20241224" "U-WMT" "00000001"          │
     │                                                      │
     │                            [13] Binary Config Data  │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 28 40 00 00 00 00 00 71 20 1c 51 89 ...   │
     │                                                      │
     │                            [14] Status Response     │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 43 40 00 00 00 00 00 02 6d 01 01 30 10 ... │
     │   (Machine Ready, Status 1, Params)                 │
     │                                                      │
     │                            [15] Extended Data       │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 46 40 00 00 00 00 00 06 6d 02 00 00 00 01 │
     │   (Program config, timings, parameters)             │
     │                                                      │
     │                            [16] Status Query Reply  │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 12 40 00 00 00 00 00 74 0f 5a 00 00 00 00 │
     │                                                      │
     │ [17] Complex Command (Mode 2)                       │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01   │
     │ 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04   │
     │ 00 02 17 00 96 22 e4                               │
     │                                                      │
     │                            [18] Status Update       │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 43 40 00 00 00 00 00 06 6d 01 01 30 10 ... │
     │                                                      │
     │ [19] Query Response Request                         │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01      │
     │ (Repeated 3 times)                                  │
     │                                                      │
     │                                      [20] ACK       │
     │  ◄──────────────────────────────────────────────────┤
     │              ff ff 08 40 00 00 00 00 00 05 4d 61 80│
     │                                                      │
     │ [21] Device ID (periodic refresh)                   │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 19 40 00 00 00 00 00 11 00 f0 ...           │
     │                                                      │
     │ [22] Authentication Challenge                       │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 25 40 00 00 00 00 00 11 10 02 00 01         │
     │ 56 57 65 56 49 43 37 55 ("VWeVIC7U")              │
     │ 01 d2 87 c9 4b 77 9b 59 d7 e2 68 e2 a8 80 ...     │
     │                                                      │
     │                         [23] Authentication Response│
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 25 40 00 00 00 00 00 12 10 02 00 01        │
     │   db 61 6e 43 47 1e 37 4f 01 79 6d 40 1a 35 ...   │
     │                                                      │
     │                                      [24] ACK       │
     │  ◄──────────────────────────────────────────────────┤
     │              ff ff 08 40 00 00 00 00 00 05 4d 61 80│
     │                                                      │
     │ [25] Timestamp Sync                                 │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 20 40 00 00 00 00 00 11 10 00               │
     │ 68 f4 fb e9 07 e9 0a 13 16 37 25 01 00 08 ...     │
     │                                                      │
     │ [26] Device ID (continued periodic updates)         │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 19 40 00 00 00 00 00 11 00 f0 ...           │
     │                                                      │
     │ [27] Control Signal                                 │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 08 40 00 00 00 00 00 09 51 64 80            │
     │                                                      │
     │                            [28] Status (Standby)    │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 43 40 00 00 00 00 00 06 6d 01 01 30 30 ... │
     │   (Machine in Standby, ready for commands)          │
     │                                                      │
     │ [29] Heartbeat ACK                                  │
     ├──────────────────────────────────────────────────►  │
     │ ff ff 08 40 00 00 00 00 00 05 4d 61 80            │
     │                                                      │
     │ [30] Model Number                                   │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 2e 40 00 00 00 00 00 ec                    │
     │   "CEAB9UQ00" "00000002" "20241224"                │
     │                                                      │
     │ [31] Serial Number                                  │
     │  ◄──────────────────────────────────────────────────┤
     │   ff ff 2c 40 00 00 00 00 00 ea                    │
     │   "0021800078EHD5108DUZ00000002" "20241224"        │
     │                                                      │
     │                       [STEADY STATE REACHED]        │
     │             Machine ready for program commands      │
     │                                                      │
```

---

## Session Initialization

### Phase 1: Connection Establishment (Steps 1-4)

**Step 1 - Session Start Marker:**
```
Modem → Machine
ff ff 0a 00 00 00 00 00 00 61 00 07 72
```
- Frame type: `00` (special init frame)
- Command: `61` (session start)
- Purpose: Signals new communication session

**Step 2 - Controller Ready:**
```
Modem → Machine
ff ff 08 40 00 00 00 00 00 70 b8 86 41
```
- Command: `70`
- Purpose: Controller announces it's ready

**Step 3 - Handshake Initiation:**
```
Modem → Machine
ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4
```
- Sequence: `00 00 00 00 00 01`
- Command: `4d 01`
- Purpose: Establish protocol handshake

**Step 4 - Handshake Acknowledgment:**
```
Machine → Modem
ff ff 08 40 00 00 00 00 00 73 bb 87 01
```
- Command: `73`
- Purpose: Confirm handshake received

### Phase 2: Identification Exchange (Steps 5-9)

**Step 5-6 - Standard ACKs:**
```
Bidirectional
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```
- Command: `4d 61`
- Purpose: Mutual acknowledgment

**Step 7-8 - Device IMEI Broadcast:**
```
Modem → Machine (sent twice)
ff ff 19 40 00 00 00 00 00 11 00 f0
38 36 32 38 31 37 30 36 38 33 36 37 39 34 39
```
- Command: `11 00 f0`
- IMEI: "862817068367949"
- Purpose: Identify modem device
- Sent twice for reliability

---

## Authentication Flow

### Rolling Code Authentication Sequence

**Step 1 - Query Status:**
```
Modem → Machine
ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
```
- Command: `f3`
- Purpose: Request status before auth

**Step 2 - Authentication Challenge (Modem → Machine):**
```
ff ff 25 40 00 00 00 00 00 11 10 02 00 01
[Challenge Code: 8 bytes] 01 [Encrypted: 16-24 bytes]
```

**Example Challenges Observed:**
```
Challenge 1: 56 57 65 56 49 43 37 55 ("VWeVIC7U")
Challenge 2: 45 4a 6c 61 32 56 41 54 ("EJla2VAT")
Challenge 3: 33 33 75 68 42 57 64 57 ("33uhBWdW")
Challenge 4: 66 42 35 7a 41 6b 47 6f ("fB5zAkGo")
Challenge 5: 61 39 58 4d 50 57 69 4d ("a9XMPWiM")
Challenge 6: 63 36 61 77 46 7a 65 42 ("c6awFzeB")
Challenge 7: 51 58 49 32 37 51 50 50 ("QXI27QPP")
```

**Step 3 - Authentication Response (Machine → Modem):**
```
ff ff 25 40 00 00 00 00 00 12 10 02 00 01
[Response Code: 8 bytes] 01 [Encrypted: 16-24 bytes]
```

**Example Responses Observed:**
```
Response 1: db 61 6e 43 47 1e 37 4f 01 79 6d 40 1a 35 74 79 8c 91...
Response 2: 75 5a af 88 e5 c8 52 70 01 3f 8e 46 d1 bb 19 63 34 9e...
Response 3: bf 11 eb 49 2c c5 3f a5 01 9c d8 61 b1 68 08 f5 80 f5...
Response 4: 75 02 01 76 e6 bd 91 84 01 d6 8f c6 56 aa 32 37 5b 4e...
Response 5: 1b 0c b9 e5 ee 88 54 1f 01 b6 48 e0 39 23 22 81 a0 39...
```

**Step 4 - ACK:**
```
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```

**Authentication Pattern:**
- Command Type: `10 02 00 01`
- Challenge/Response Structure:
  - Byte 0-7: Base64-like challenge code (appears as ASCII)
  - Byte 8: Separator `01`
  - Byte 9-31: Encrypted payload (changes each session)
- New challenge generated for each session
- Prevents replay attacks

**Retry Mechanism:**
- Some challenges sent twice (lines 58+61, 102+105)
- Indicates timeout/retry logic
- 3-5 second timeout likely

---

## Status Query Cycle

### Standard Query Pattern

**Query Request:**
```
Modem → Machine
ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
```
- Command: `f3`

**Query Response (3x repeated):**
```
Modem → Machine
ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01
```
- Response: `f5`
- Sent 3 times consecutively
- Purpose: Confirm query received

**Status Response:**
```
Machine → Modem
ff ff 43 40 00 00 00 00 00 [seq] 6d 01 [status] [params]
```

**Status Byte Values:**
- `01 30 10` = Ready, Parameter mode 1
- `01 30 30` = Standby, Ready for commands
- `02 b0 31` = Busy/Error
- `04 30 30` = Reset in progress
- `[prog] b0 31` = Program running (prog = 01-04)

**Extended Data Response:**
```
Machine → Modem
ff ff 46 40 00 00 00 00 00 [seq] 6d 02 [program_data]
```
- Response Type: `6d 02`
- Contains: Program configurations, timings, parameters

---

## Program Start Sequence

### To Start Wash Program

**Step 1 - Ensure Machine Ready:**
```
Query machine status, wait for:
ff ff 43 40 ... 6d 01 01 30 30 ...
(Status = Standby)
```

**Step 2 - Send Program Command:**

**Program 1:**
```
ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 b0 34 ad
```

**Program 2:**
```
ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad
```

**Program 3:**
```
ff ff 0e 40 00 00 00 00 00 60 00 01 03 00 00 00 b2 8c ac
```

**Program 4:**
```
ff ff 0e 40 00 00 00 00 00 60 00 01 04 00 00 00 b3 f8 ad
```

**Command Structure:**
- Fixed sequence: `00 60` (wash command identifier)
- Program selection: `00 01 [program] 00 00 00`
- CRC varies per program

**Step 3 - Wait for ACK:**
```
Machine → Modem
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```

**Step 4 - Monitor Status:**
```
Machine → Modem (periodic)
ff ff 43 40 ... 6d 01 [program] b0 31 ...
(Status shows program running)
```

### Alternative Complex Command Method

Used when machine is busy or special conditions:

```
ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00
03 00 02 06 01 00 01 00 02 00 03 04 00 02 17 00 96 22 e4
```

**Structure:**
- Command: `f7`
- Program mode: `01 03 01 08`
- Program select: `00 01` (Program 1)
- Parameter blocks:
  - Block 1: `03 00 02 06`
  - Block 2: `01 00 01 00 02 00`
  - Block 3: `03 04 00 02`
- Sequence counter: `17 00` (increments)

---

## Heartbeat Pattern

### Continuous Heartbeat

**Sent every 3-5 seconds during active session:**

```
Bidirectional (both send)
ff ff 08 40 00 00 00 00 00 05 4d 61 80
```

**Purpose:**
- Keep connection alive
- Confirm both parties responsive
- Detect disconnection

**Timeout:**
- If no heartbeat received for 10-15 seconds
- Session considered dead
- Re-initialization required

### Control Signal Variant

**Alternate heartbeat/control:**
```
ff ff 08 40 00 00 00 00 00 09 51 64 80
```
- Command: `51 64`
- Used during active operations
- Signals controller is actively managing

**Query/Response Heartbeat:**
```
Controller → Machine
ff ff 08 40 00 00 00 00 00 eb 33 2d 00

Machine → Controller
ff ff 09 40 00 00 00 00 00 e9 00 32 f0 21
```
- Command: `eb 33`
- Response: `e9` with parameter `32`

---

## Reset Sequence

### To Reset Machine to Standby

**Step 1 - Send Reset Command:**
```
Modem → Machine
ff ff 0c 40 00 00 00 00 00 01 5d 1f 00 01 ca bb 9b
```
- Sequence: `00 00 00 00 00 01`
- Command: `5d 1f 00 01`
- Purpose: Return to standby

**Step 2 - Reset Confirmation:**
```
Machine → Modem
ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 00 00 00 00 bf 0a 33
```
- Command: `0f 5a`
- Sequence: `04`

**Step 3 - Status Update (Reset Progress):**
```
Machine → Modem
ff ff 43 40 ... 6d 01 04 30 30 ...
```
- Status: `04 30 30` = Reset in progress

**Step 4 - Final Status (Standby):**
```
Machine → Modem
ff ff 43 40 ... 6d 01 01 30 30 ...
```
- Status: `01 30 30` = Standby (ready)

**Step 5 - Data Refresh:**
Machine sends updated firmware, model, serial number info

---

## Complete Command Flow

### Full Communication State Machine

```
[POWER ON / SESSION START]
        ↓
[1] Session Init (00 frame)
        ↓
[2] Controller Ready (70)
        ↓
[3] Handshake (4d 01)
        ↓
[4] Handshake ACK (73)
        ↓
[5] Mutual ACKs (4d 61) ←──────┐
        ↓                       │
[6] Device ID Broadcast         │
        ↓                       │
[7] Status Query (f3)           │
        ↓                       │
[8] Machine Info Dump:          │
    - Reset confirm (0f 5a)     │
    - Firmware (62)             │
    - Config (71)               │
    - Status (6d 01)            │
    - Data (6d 02)              │
        ↓                       │
[9] Complex Command (f7)        │
        ↓                       │
[10] Query Responses (f5 x3)    │
        ↓                       │
[11] Authentication:            │
     - Challenge (modem)        │
     - Response (machine)       │
        ↓                       │
[12] Timestamp Sync (11 10 00)  │
        ↓                       │
[13] Control Signal (51 64)     │
        ↓                       │
[14] Status Update (6d 01)      │
        ↓                       │
[15] Model/Serial Info:         │
     - Model (ec)               │
     - Serial (ea)              │
        ↓                       │
┌───────────────────────────────┘
│   [STEADY STATE]
│       ↓
│   Heartbeat Loop:
│   - ACKs (4d 61) every 3-5s
│   - Status queries periodic
│   - Device ID periodic
│   - Auth refresh periodic
│   - Timestamp updates
│       ↓
│   [WAIT FOR COMMAND]
│       ↓
│   ┌───────┬────────┬────────┐
│   ↓       ↓        ↓        ↓
│ [RESET] [PROG1] [PROG2] [PROGN]
│   ↓       ↓        ↓        ↓
│ (5d 1f) (00 60 01)(00 60 02)...
│   ↓       ↓        ↓        ↓
│   └───────┴────────┴────────┘
│           ↓
│   [STATUS MONITORING]
│   - Running status
│   - Progress updates
│   - Completion
│           ↓
└───[RETURN TO STEADY STATE]
```

---

## Timing Recommendations

### Suggested Delays Between Commands

1. **After Session Init:** Wait 100ms
2. **After Handshake:** Wait 50ms
3. **After Authentication:** Wait 200ms
4. **Between Heartbeats:** 3-5 seconds
5. **After Program Command:** Wait 500ms for status
6. **After Reset Command:** Wait 1 second
7. **Query Retry Timeout:** 3 seconds
8. **Session Timeout:** 15 seconds (no heartbeat)

### Command Priorities

**High Priority (immediate):**
- Heartbeat ACK
- Authentication response
- Reset confirmation

**Medium Priority (100ms delay):**
- Status queries
- Program commands
- Control signals

**Low Priority (periodic):**
- Device ID broadcast (every 30s)
- Timestamp sync (every minute)
- Status dumps (every 10s)

---

## Example: Complete Program Start Flow

```
Step 1: Check Status
→ ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1
← ff ff 43 40 ... 6d 01 01 30 30 ... (Standby)

Step 2: Send Program 2 Command
→ ff ff 0e 40 00 00 00 00 00 60 00 01 02 00 00 00 b1 70 ad

Step 3: Wait for ACK
← ff ff 08 40 00 00 00 00 00 05 4d 61 80

Step 4: Monitor Status
← ff ff 43 40 ... 6d 01 02 b0 31 ... (Program 2 running)

Step 5: Continue Heartbeat
→ ff ff 08 40 00 00 00 00 00 05 4d 61 80
← ff ff 08 40 00 00 00 00 00 05 4d 61 80

Step 6: Program Complete
← ff ff 43 40 ... 6d 01 01 30 30 ... (Back to standby)
```

---

## Session Boundary Markers

**Single `00` byte indicates:**
- End of current session
- Prepare for re-initialization
- Clear authentication state
- Reset sequence counters

**Example:**
```
... ff ff 08 40 00 00 00 00 00 05 4d 61 80
00
ff ff 0a 00 00 00 00 00 00 61 00 07 72
...
```

---

## Error Handling

### Machine Busy Response

**When machine cannot accept command:**
```
← ff ff 43 40 ... 6d 01 02 b0 31 ...
```
- Status: `02 b0 31`
- Meaning: Device busy (API error "60015")
- Action: Wait and retry after 2-3 seconds

### Authentication Failure

**If authentication fails:**
- Machine may not respond to commands
- Re-send authentication challenge
- If 3 failures, reset session

### Timeout Handling

**If no response within timeout:**
1. Re-send command once
2. If still no response, send heartbeat
3. If no heartbeat ACK, reinitialize session

---

## Checksum/CRC Calculation

**Last 3 bytes of each packet = CRC**

**Example:**
```
ff ff 0e 40 00 00 00 00 00 60 00 01 01 00 00 00 [b0 34 ad]
                                                  └─CRC──┘
```

**CRC appears to be:**
- Calculated over entire packet
- Possibly CRC-16 or proprietary algorithm
- Changes with sequence numbers and payload

**Recommendation:**
- Capture CRC for known commands
- Use lookup table for standard commands
- Calculate for custom sequences if algorithm known

---

*End of Sequence Guide*
