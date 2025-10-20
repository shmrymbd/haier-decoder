# Haier Smart Home Communication Sequence Analysis

## Overview
This document provides a detailed line-by-line analysis of the Haier Smart Home communication sequence, including rolling code challenges and authentication patterns.

## Frame Structure Reference
According to the Haier Smart Home Open Platform documentation:
- **Frame Header**: `FF FF` (2 bytes)
- **Frame Length**: 1 byte (8-254 bytes excluding CRC)
- **Address Identifier**: Source and destination addresses
- **Frame Type**: 1 byte
- **Data Information**: Variable length
- **Checksum**: 1 byte (low byte of sum)
- **CRC Checksum**: 2 bytes (optional)

---

## Communication Sequence Analysis

### **PHASE 1: INITIALIZATION (Lines 1-19)**

**Line 1: `modem 1760932567 - 00`**
- **Type**: Initialization/Reset State
- **Description**: Modem in idle state
- **Purpose**: System startup initialization

**Line 2: `machine 1760932567 - 00`**
- **Type**: Initialization/Reset State
- **Description**: Machine in idle state
- **Purpose**: Device startup initialization

**Line 3: `machine 1760932568 - ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 00 00 00 00 bf 0a 33`**
- **Frame Header**: `FF FF`
- **Frame Length**: `12` (18 bytes total)
- **Address**: `40 00 00 00 00` (machine to modem)
- **Frame Type**: `04`
- **Data**: `0f 5a 00 00 00 00 00 00 00 00`
- **Checksum**: `bf`
- **CRC**: `0a 33`
- **Description**: **Power-On Process** - Machine initialization frame
- **Purpose**: Device startup sequence initiation

**Line 4: `modem 1760932569 - ff ff 0a 00 00 00 00 00 00 61 00 07 72`**
- **Frame Length**: `0a` (10 bytes)
- **Address**: `00 00 00 00 00` (modem to machine)
- **Frame Type**: `61`
- **Data**: `00`
- **Checksum**: `07`
- **CRC**: `72`
- **Description**: Modem response to power-on sequence
- **Purpose**: Acknowledgment of initialization

**Line 5: `machine 1760932569 - ff ff 2e 40 00 00 00 00 00 62 45 2b 2b 32 2e 31 37 00 32 30 32 34 31 32 32 34 f1 00 00 30 30 30 30 30 30 30 31 00 55 2d 57 4d 54 00 00 00 00 0c bc 74 91`**
- **Frame Length**: `2e` (46 bytes)
- **Frame Type**: `62`
- **Data Analysis**:
  - `45 2b 2b 32 2e 31 37 00` = "++2.17" (firmware version)
  - `32 30 32 34 31 32 32 34` = "20241224" (date: 2024-12-24)
  - `55 2d 57 4d 54` = "U-WMT" (device model)
- **Description**: **Configuration Reporting Process** - Device information
- **Purpose**: Device identification and version reporting

**Line 6: `modem 1760932569 - ff ff 08 40 00 00 00 00 00 70 b8 86 41`**
- **Frame Type**: `70`
- **Description**: Modem acknowledgment of device information
- **Purpose**: Confirmation of device registration

**Line 7: `machine 1760932569 - ff ff 28 40 00 00 00 00 00 71 20 1c 51 89 0c 31 c3 08 05 03 00 21 80 00 78 45 00 00 00 03 00 00 00 00 00 00 00 00 00 00 00 40 a0 ff 55 87`**
- **Frame Type**: `71`
- **Data**: Device status information
- **Special Note**: Contains `ff 55` pattern - follows documentation rule for handling `0xFF` values by inserting `0x55`
- **Description**: Device status reporting
- **Purpose**: Current device state communication

**Line 8: `modem 1760932569 - ff ff 0a 40 00 00 00 00 00 01 4d 01 99 b3 b4`**
- **Frame Type**: `01`
- **Description**: Standard acknowledgment response
- **Purpose**: Confirmation of status report

**Line 9: `machine 1760932569 - ff ff 43 40 00 00 00 00 00 02 6d 01 01 30 10 03 00 00 00 20 04 03 05 01 00 01 02 30 00 00 00 00 0a 0f 08 14 05 05 06 05 04 1a 04 1a 04 1a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00 00 01 00 3d 8d f4`**
- **Frame Type**: `02`
- **Data**: Device capability information
- **Description**: Device configuration and capability data
- **Purpose**: Capability reporting for device management

**Line 10: `modem 1760932569 - ff ff 08 40 00 00 00 00 00 73 bb 87 01`**
- **Frame Type**: `73`
- **Description**: Acknowledgment for capability data
- **Purpose**: Confirmation of capability report

**Line 11: `machine 1760932569 - ff ff 46 40 00 00 00 00 00 06 6d 02 00 00 00 01 00 00 00 00 00 00 00 00 04 01 02 01 00 00 00 00 0a 0f 08 07 05 05 05 00 01 69 00 00 00 24 01 4c 24 02 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3d 67 40`**
- **Frame Type**: `06`
- **Data**: Additional device configuration
- **Description**: Extended device configuration data
- **Purpose**: Complete device setup information

**Line 12: `modem 1760932569 - ff ff 08 40 00 00 00 00 00 05 4d 61 80`**
- **Frame Type**: `05`
- **Description**: Standard acknowledgment
- **Purpose**: Confirmation of configuration data

**Line 13: `machine 1760932569 - ff ff 12 40 00 00 00 00 00 74 0f 5a 00 00 00 00 00 00 00 00 2f cb 99`**
- **Frame Type**: `74`
- **Description**: Status update or heartbeat
- **Purpose**: Regular status communication

**Lines 14-19**: Continue with standard acknowledgments and network status queries

---

### **PHASE 2: ROLLING CODE CHALLENGE INITIATION (Lines 20-50)**

**Line 20: `machine 1760932578 - ff ff 25 40 00 00 00 00 00 12 10 02 00 01 d9 93 e4 c8 d3 74 95 1c 01 a3 ef 0f 08 cd b4 54 fe 10 fc cf 0a 5e 52 a0 d0 1c f4 35`**
- **Frame Type**: `12`
- **Data**: `10 02 00 01 d9 93 e4 c8 d3 74 95 1c 01 a3 ef 0f 08 cd b4 54 fe 10 fc cf 0a 5e 52 a0 d0 1c f4 35`
- **Description**: **🎯 FIRST ROLLING CODE CHALLENGE**
- **Purpose**: Machine initiates authentication challenge with 32-byte encrypted payload
- **Rolling Code**: `d9 93 e4 c8 d3 74 95 1c 01 a3 ef 0f 08 cd b4 54 fe 10 fc cf 0a 5e 52 a0 d0 1c f4 35`

**Line 21: `modem 1760932578 - ff ff 08 40 00 00 00 00 00 05 4d 61 80`**
- **Frame Type**: `05`
- **Description**: Standard acknowledgment of challenge
- **Purpose**: Confirmation of challenge receipt

**Line 22: `modem 1760932579 - ff ff 0a 40 00 00 00 00 00 f3 00 00 3d d0 e1`**
- **Frame Type**: `f3`
- **Description**: **Authentication Response Frame**
- **Purpose**: Modem's initial response to rolling code challenge

**Line 23: `modem 1760932579 - ff ff 22 40 00 00 00 00 00 f7 01 03 01 08 00 01 00 00 00 00 03 00 02 06 01 00 01 00 02 00 03 04 00 01 1a 00 98 b2 10`**
- **Frame Type**: `f7`
- **Data**: Authentication configuration data
- **Description**: **Authentication Configuration Frame**
- **Purpose**: Detailed authentication parameters and settings

**Line 24: `machine 1760932579 - ff ff 08 40 00 00 00 00 00 05 4d 61 80`**
- **Frame Type**: `05`
- **Description**: Standard acknowledgment
- **Purpose**: Confirmation of authentication configuration

**Lines 25-27: Authentication Retry Sequence**
```
modem 1760932579 - ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01
modem 1760932580 - ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01
modem 1760932580 - ff ff 0a 40 00 00 00 00 00 f5 00 00 3f d1 01
```
- **Frame Type**: `f5` (repeated 3 times)
- **Description**: **Authentication Retry Frames**
- **Purpose**: Multiple authentication attempts (retry mechanism)
- **Note**: The repetition indicates authentication challenges or retries

**Line 30: `modem 1760932581 - ff ff 25 40 00 00 00 00 00 11 10 02 00 01 59 71 45 56 53 54 52 4f 01 9c 21 c4 44 08 37 03 70 bb e4 ef 50 8a 86 c1 b0 0d d1 85`**
- **Frame Type**: `11`
- **Data**: `10 02 00 01 59 71 45 56 53 54 52 4f 01 9c 21 c4 44 08 37 03 70 bb e4 ef 50 8a 86 c1 b0 0d d1 85`
- **Description**: **🎯 MODEM ROLLING CODE RESPONSE**
- **Purpose**: Modem's response to the rolling code challenge
- **Rolling Code**: `59 71 45 56 53 54 52 4f 01 9c 21 c4 44 08 37 03 70 bb e4 ef 50 8a 86 c1 b0 0d d1 85`

---

### **PHASE 3: DEVICE REGISTRATION (Lines 45-50)**

**Line 45: `modem 1760932598 - ff ff 08 40 00 00 00 00 00 eb 33 2d 00`**
- **Frame Type**: `eb`
- **Description**: **Device Registration Request**
- **Purpose**: Initiate device registration process

**Line 46: `machine 1760932598 - ff ff 2e 40 00 00 00 00 00 ec 43 45 41 42 39 55 51 30 30 00 00 00 00 00 00 00 00 00 00 00 30 30 30 30 30 30 32 30 32 34 31 32 32 34 02 22 01 00 7a 63 1b`**
- **Frame Type**: `ec`
- **Data Analysis**:
  - `43 45 41 42 39 55 51 30 30` = "CEAB9UQ00" (Device ID)
  - `30 30 30 30 30 30 32 30 32 34 31 32 32 34` = "00000020241224" (timestamp)
- **Description**: **Device ID Registration**
- **Purpose**: Device identification and registration

**Line 47: `modem 1760932598 - ff ff 09 40 00 00 00 00 00 e9 00 32 f0 21`**
- **Frame Type**: `e9`
- **Description**: **Registration Confirmation**
- **Purpose**: Acknowledgment of device registration

**Line 48: `machine 1760932598 - ff ff 2c 40 00 00 00 00 00 ea 00 30 30 32 31 38 30 30 30 37 38 45 48 44 35 31 30 38 44 55 5a 30 30 30 30 30 30 32 30 32 34 31 32 32 34 01 94 88 58`**
- **Frame Type**: `ea`
- **Data Analysis**:
  - `30 30 32 31 38 30 30 30 37 38 45 48 44 35 31 30 38 44 55 5a` = "0021800078EHD5108DUZ" (Serial Number)
  - `30 30 30 30 30 30 32 30 32 34 31 32 32 34` = "00000020241224" (timestamp)
- **Description**: **Serial Number Registration**
- **Purpose**: Complete device identification with serial number

---

### **PHASE 4: CONTINUED ROLLING CODE CHALLENGES (Lines 51-100)**

**Line 51-52: System Reset**
```
modem 1760932627 - 00
machine 1760932627 - 00
```
- **Description**: System reset/restart
- **Purpose**: Communication cycle restart

**Line 53: `machine 1760932628 - ff ff 12 40 00 00 00 00 00 04 0f 5a 00 00 00 00 00 00 00 00 bf 0a 33`**
- **Description**: **Power-On Process** (repeated)
- **Purpose**: Restart initialization sequence

**Line 70: `machine 1760932638 - ff ff 25 40 00 00 00 00 00 12 10 02 00 01 df af 2e d9 93 37 96 f3 01 35 c2 95 73 de 1a 50 b9 20 0d 52 17 74 b2 7a 5c 05 0e f5`**
- **Frame Type**: `12`
- **Data**: `10 02 00 01 df af 2e d9 93 37 96 f3 01 35 c2 95 73 de 1a 50 b9 20 0d 52 17 74 b2 7a 5c 05 0e f5`
- **Description**: **🎯 SECOND ROLLING CODE CHALLENGE**
- **Purpose**: New authentication challenge with different rolling code
- **Rolling Code**: `df af 2e d9 93 37 96 f3 01 35 c2 95 73 de 1a 50 b9 20 0d 52 17 74 b2 7a 5c 05 0e f5`
- **Note**: Different from first challenge, confirming rolling code mechanism

**Lines 72-77: Authentication Sequence (Repeated)**
- **Frame Types**: `f3`, `f7`, `f5` (repeated)
- **Description**: Same authentication pattern as before
- **Purpose**: Continued authentication process

**Line 80: `modem 1760932642 - ff ff 25 40 00 00 00 00 00 11 10 02 00 01 51 30 78 62 71 56 51 75 01 4e e7 ac a9 04 33 67 75 66 94 fb 76 2c 05 ad 2b 83 38 02`**
- **Frame Type**: `11`
- **Data**: `10 02 00 01 51 30 78 62 71 56 51 75 01 4e e7 ac a9 04 33 67 75 66 94 fb 76 2c 05 ad 2b 83 38 02`
- **Description**: **🎯 MODEM ROLLING CODE RESPONSE (Second)**
- **Purpose**: Modem's response to second challenge
- **Rolling Code**: `51 30 78 62 71 56 51 75 01 4e e7 ac a9 04 33 67 75 66 94 fb 76 2c 05 ad 2b 83 38 02`

---

## Rolling Code Analysis Summary

### **Rolling Code Pattern Recognition:**

1. **Challenge Frames (Type `12`)**:
   - Line 20: `d9 93 e4 c8 d3 74 95 1c 01 a3 ef 0f 08 cd b4 54 fe 10 fc cf 0a 5e 52 a0 d0 1c f4 35`
   - Line 70: `df af 2e d9 93 37 96 f3 01 35 c2 95 73 de 1a 50 b9 20 0d 52 17 74 b2 7a 5c 05 0e f5`

2. **Response Frames (Type `11`)**:
   - Line 30: `59 71 45 56 53 54 52 4f 01 9c 21 c4 44 08 37 03 70 bb e4 ef 50 8a 86 c1 b0 0d d1 85`
   - Line 80: `51 30 78 62 71 56 51 75 01 4e e7 ac a9 04 33 67 75 66 94 fb 76 2c 05 ad 2b 83 38 02`

3. **Authentication Frames**:
   - Type `f3`: Initial authentication response
   - Type `f7`: Authentication configuration
   - Type `f5`: Authentication retry (repeated)

4. **Registration Frames**:
   - Type `eb`: Registration request
   - Type `ec`: Device ID registration
   - Type `e9`: Registration confirmation
   - Type `ea`: Serial number registration

### **Key Observations:**

1. **Rolling Code Mechanism**: Each challenge contains unique 32-byte encrypted data
2. **Authentication Flow**: Challenge → Response → Configuration → Retry → Registration
3. **Retry Pattern**: Multiple `f5` frames indicate authentication retry mechanism
4. **Device Identity**: Consistent device ID (CEAB9UQ00) and serial number (0021800078EHD5108DUZ)
5. **Timestamp Integration**: All frames include timestamp data (20241224)
6. **Error Handling**: CRC checksums and retry mechanisms for reliability

This sequence demonstrates a robust rolling code authentication system with comprehensive device registration and error handling mechanisms.
