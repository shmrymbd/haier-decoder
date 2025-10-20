# Haier Protocol Library Analysis

## Overview

Analysis of the [HaierProtocol library by paveldn](https://github.com/paveldn/HaierProtocol) and its implications for our Haier decoder project.

## Key Findings from HaierProtocol Library

### 1. **Frame Structure Confirmation**

The library confirms our frame structure analysis with additional details:

```
| Frame separator | Frame length | Frame flags | Reserved space | Type | Frame data | Checksum | CRC |
| 2 bytes        | 1 byte       | 1 byte      | 5 bytes        | 1 byte| n bytes   | 1 byte   | 2 bytes |
```

**Critical Details:**
- **Frame separator**: Always `0xFF 0xFF` (confirmed)
- **Frame flags**: 
  - `0x40` = frame has CRC bytes
  - `0x00` = frame has no CRC
- **Reserved space**: 5 bytes (confirmed)
- **Checksum**: LSB of sum of all bytes except separator, CRC, and checksum itself
- **CRC**: CRC-16/ARC algorithm (2 bytes)

### 2. **CRC Algorithm Identified**

The library specifies **CRC-16/ARC algorithm** - this is a major breakthrough!

**CRC-16/ARC Details:**
- **Polynomial**: 0x8005 (reversed: 0xA001)
- **Initial value**: 0x0000
- **Final XOR**: None
- **Reflect input**: No
- **Reflect output**: No

### 3. **Protocol Versions**

The library supports two protocol versions:
- **SmartAir2**: Older HVAC units
- **hOn**: Newer appliances (our washing machine likely uses this)

### 4. **Frame Length Calculation**

The frame length includes:
- Frame flags (1 byte)
- Reserved space (5 bytes) 
- Type (1 byte)
- Frame data (n bytes)
- Checksum (1 byte)

**Maximum frame data**: 246 bytes (254 - 8 bytes overhead)

## Implementation Updates

### 1. **CRC Algorithm Implementation**

Updated `src/protocol/crc.js` with CRC-16/ARC algorithm:

```javascript
calculateCRC16ARC(data) {
  let crc = 0x0000; // Initial value
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001; // Polynomial 0x8005 reversed
      } else {
        crc = crc >> 1;
      }
    }
  }
  
  return crc;
}
```

### 2. **Frame Flag Handling**

Updated packet parsing to handle frame flags correctly:

```javascript
// Check frame flags
const hasCRC = (frameFlags & 0x40) === 0x40;
const frameLength = packet[2]; // Length byte
const reservedSpace = packet.slice(3, 8); // 5 bytes
const frameType = packet[8]; // Type byte
const frameData = packet.slice(9, -3); // Data (excluding checksum and CRC)
const checksum = packet[packet.length - 3]; // Checksum byte
const crc = hasCRC ? packet.slice(-2) : null; // CRC bytes (if present)
```

### 3. **Checksum Calculation**

Implemented checksum calculation as specified:

```javascript
calculateChecksum(packet) {
  // Sum all bytes except separator, CRC, and checksum itself
  const data = packet.slice(2, -3); // Skip separator and CRC
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  
  return sum & 0xFF; // LSB of sum
}
```

## Validation Against Our Data

### 1. **Frame Structure Validation**

Our captured packets should now be parsed correctly:

```
ff ff 25 40 00 00 00 00 00 12 10 02 00 01 78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24
```

**Parsed:**
- **Separator**: `ff ff` ✅
- **Length**: `25` (37 bytes total) ✅
- **Flags**: `40` (has CRC) ✅
- **Reserved**: `00 00 00 00 00` ✅
- **Type**: `12` (authentication challenge) ✅
- **Data**: `10 02 00 01 78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24`
- **Checksum**: Last byte before CRC
- **CRC**: Last 2 bytes

### 2. **CRC Validation**

With the CRC-16/ARC algorithm, we should now be able to:
- Validate all captured packets
- Generate correct CRCs for outgoing packets
- Identify packet integrity issues

## Integration with Our Project

### 1. **Enhanced Packet Parser**

Update `src/protocol/parser.js` to use the correct frame structure:

```javascript
parsePacket(rawData) {
  // Validate frame separator
  if (rawData[0] !== 0xFF || rawData[1] !== 0xFF) {
    return null;
  }
  
  const frameLength = rawData[2];
  const frameFlags = rawData[3];
  const hasCRC = (frameFlags & 0x40) === 0x40;
  
  // Parse frame components
  const reservedSpace = rawData.slice(4, 9);
  const frameType = rawData[9];
  const frameData = rawData.slice(10, -3);
  const checksum = rawData[rawData.length - 3];
  const crc = hasCRC ? rawData.slice(-2) : null;
  
  // Validate checksum
  const calculatedChecksum = this.calculateChecksum(rawData);
  const checksumValid = calculatedChecksum === checksum;
  
  // Validate CRC if present
  let crcValid = true;
  if (hasCRC && crc) {
    const calculatedCRC = this.calculateCRC16ARC(rawData.slice(2, -2));
    const receivedCRC = (crc[0] << 8) | crc[1];
    crcValid = calculatedCRC === receivedCRC;
  }
  
  return {
    valid: checksumValid && crcValid,
    frameLength,
    frameFlags,
    hasCRC,
    frameType,
    frameData,
    checksum,
    crc,
    checksumValid,
    crcValid
  };
}
```

### 2. **Command Generation**

Update command generation to use correct frame structure:

```javascript
generateCommand(type, data) {
  const frameFlags = 0x40; // Has CRC
  const reservedSpace = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  const frameData = Buffer.from(data);
  
  // Build frame without separator, checksum, and CRC
  const frame = Buffer.concat([
    Buffer.from([frameFlags]),
    reservedSpace,
    Buffer.from([type]),
    frameData
  ]);
  
  // Calculate checksum
  const checksum = this.calculateChecksum(frame);
  
  // Calculate CRC
  const crc = this.calculateCRC16ARC(frame);
  
  // Build complete packet
  const packet = Buffer.concat([
    Buffer.from([0xFF, 0xFF]), // Separator
    Buffer.from([frame.length + 4]), // Length (frame + checksum + CRC)
    frame,
    Buffer.from([checksum]),
    Buffer.from([(crc >> 8) & 0xFF, crc & 0xFF]) // CRC
  ]);
  
  return packet;
}
```

## Testing Strategy

### 1. **CRC Validation Test**

Test the CRC-16/ARC algorithm against all captured packets:

```bash
# Test CRC validation
node src/crypto/crc-comprehensive-tester.js

# Test with specific packets
node -e "
const CRC = require('./src/protocol/crc');
const crc = new CRC();
const packet = Buffer.from('ff ff 25 40 00 00 00 00 00 12 10 02 00 01 78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24', 'hex');
console.log(crc.validatePacket(packet));
"
```

### 2. **Frame Structure Test**

Test frame parsing with known packets:

```bash
# Test frame parsing
node -e "
const PacketParser = require('./src/protocol/parser');
const parser = new PacketParser();
const packet = Buffer.from('ff ff 25 40 00 00 00 00 00 12 10 02 00 01 78 8c 6f f2 d9 2d c8 55 01 58 29 f7 e3 63 e7 64 00 77 9d f4 b1 b8 83 fd df ec 56 24', 'hex');
console.log(parser.parsePacket(packet));
"
```

## Expected Improvements

### 1. **CRC Validation Accuracy**

With the correct CRC-16/ARC algorithm, we should achieve:
- **100% validation rate** for captured packets
- **Correct CRC generation** for outgoing packets
- **Reliable packet integrity** checking

### 2. **Frame Structure Understanding**

Better understanding of:
- **Frame flags** and their meaning
- **Reserved space** usage
- **Frame length** calculation
- **Checksum vs CRC** distinction

### 3. **Protocol Compatibility**

Enhanced compatibility with:
- **Haier washing machines** (hOn protocol)
- **HVAC units** (SmartAir2 protocol)
- **Future Haier devices**

## Next Steps

### 1. **Immediate Actions**

1. **Test CRC-16/ARC** against all captured packets
2. **Update packet parser** with correct frame structure
3. **Validate checksum calculation** against known packets
4. **Test command generation** with correct frame format

### 2. **Integration Testing**

1. **Test with real device** using correct frame structure
2. **Validate CRC generation** for outgoing commands
3. **Test frame flag handling** (with/without CRC)
4. **Verify checksum accuracy**

### 3. **Documentation Updates**

1. **Update PROTOCOL_SPECIFICATION.md** with correct frame structure
2. **Update CRC documentation** with CRC-16/ARC algorithm
3. **Add frame flag documentation** to protocol guide
4. **Update command examples** with correct frame format

## Conclusion

The HaierProtocol library provides crucial insights that significantly improve our understanding of the Haier protocol:

1. **CRC-16/ARC algorithm** - Major breakthrough for packet validation
2. **Frame flag handling** - Correct interpretation of frame flags
3. **Checksum calculation** - Proper checksum implementation
4. **Frame structure** - Confirmed and enhanced understanding

These findings should dramatically improve our packet validation accuracy and command generation reliability.

## References

- [HaierProtocol Library](https://github.com/paveldn/HaierProtocol) - C++ implementation of Haier protocol
- [CRC-16/ARC Algorithm](https://en.wikipedia.org/wiki/CRC-16) - ANSI CRC-16 specification
- [Haier Protocol Documentation](https://github.com/paveldn/HaierProtocol/blob/main/README.rst) - Official protocol description
