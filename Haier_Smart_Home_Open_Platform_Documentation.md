# Haier Smart Home Open Platform Documentation

## Overview

This document provides comprehensive technical documentation for the **Haier Smart Home Open Platform** (海尔智家开放平台), which is a communication protocol and platform for smart home devices. The platform enables communication between smart home devices and cloud services through WiFi modules.

## Table of Contents

1. [Communication Frame Format](#communication-frame-format)
2. [Common Communication Frames](#common-communication-frames)
3. [Device Communication Protocols](#device-communication-protocols)
4. [Module Configuration](#module-configuration)

## Communication Frame Format

### Frame Structure

The communication protocol uses a structured frame format with the following components:

#### Frame Header (帧头)
- **Purpose**: Indicates the start of a frame
- **Content**: `FF FF`
- **Length**: 2 bytes

#### Frame Length (帧长)
- **Purpose**: Indicates the number of bytes including payload and checksum
- **Length**: 1 byte
- **Range**: 8-254 bytes (excluding CRC checksum)

#### Address Identifier (地址标识)
- **Structure**: Contains source and destination addresses
- **Rules**:
  - Module address is always `0x00`
  - Device sub-addresses are allocated by the device
  - Other device addresses are allocated by the communication module

#### Frame Type (帧类型)
- **Purpose**: Indicates the type of frame
- **Length**: 1 byte
- **Usage**: Refer to frame type table for specific values

#### Data Information (数据信息)
- **Purpose**: Contains the actual functional data for communication

#### Checksum (累加校验和)
- **Purpose**: Low byte of the sum of frame length and payload bytes

#### CRC Checksum (CRC校验和)
- **Purpose**: CRC16 checksum of frame length and payload
- **Optional**: Only included when CRC flag is set to 1
- **Calculation**: Excludes the checksum byte

### Data Transmission Processing

#### Without CRC Data Transmission
- If data contains values identical to frame header `0xFF`, insert `0x55` after that value
- The `0x55` value is not counted in frame length but included in checksum
- If checksum is `0xFF`, insert `0x55` after checksum (not counted in length or checksum)

#### With CRC Data Transmission
- CRC16 checksum is calculated for frame length and payload only
- If CRC checksum contains `0xFF`, insert `0x55` after that value
- The `0x55` value is not counted in frame length or checksum

## Common Communication Frames

### Power-On Process (上电流程)
- **Purpose**: Initialization work required after device powers on the module
- **Process**: Device and module interaction flow for initialization
- **Timing**: Must be completed before normal operation

### Normal Control Process (正常控制流程)
- **Purpose**: Control commands sent from module to device during normal operation
- **Types**:
  - **Single Command Control**: Individual command execution
  - **Group Command Control**: Multiple commands executed together

### Active Reporting Process (主动汇报流程)
- **Purpose**: Device property status reporting to cloud platform through module
- **Trigger**: Only when device property status changes
- **Types**:
  - **Normal Reporting**: Standard reporting flow
  - **Retry Reporting**: Reporting flow when exceptions occur

### Configuration Reporting Process (汇报配置流程)
- **Purpose**: User information or big data information configuration reporting
- **Usage**: When configuring user information or reporting big data

### Alarm Process (报警流程)
- **Purpose**: Alarm status reporting when network home appliance alarm information changes
- **Timing**: 
  - Confirmation frame sent within 50ms
  - Retry interval: 300ms if no confirmation received
  - Continue reporting every 300ms for 5s if alarm not cleared
- **Types**:
  - **Normal Alarm Process**: Standard alarm reporting flow
  - **Alarm Retry Process**: Alarm reporting when exceptions occur

## Module Configuration

### Network Status Query
- **Purpose**: Query module network status when device needs to know network state
- **Alternative**: Can use F7 frame instead if no special circumstances

### Enter Configuration Mode
- **Process**: Device sends module enter configuration mode frame
- **Response**: Module replies with configuration mode response frame
- **Retry**: If no response, device retries 2 times with 300ms interval
- **Display**: Devices with display capability can show configuration prompts
- **Multiple Triggers**: Network home appliances can trigger configuration multiple times

### Exit Configuration Mode
- **Process**: Device sends module enter work mode frame to force exit configuration mode
- **Conditions**: 
  - When configuration time exceeds preset limit
  - Manual forced operation within preset time
- **Result**: Module exits configuration mode and returns to work mode

## Technical Specifications

### Communication Protocol
- **Protocol Type**: Custom communication protocol for smart home devices
- **Transport**: WiFi-based communication
- **Checksum**: CRC16 for error detection
- **Addressing**: Source and destination address system

### Device Integration
- **Module Address**: Always `0x00`
- **Device Addresses**: Allocated by device or module
- **Communication**: Bidirectional between module and devices

### Error Handling
- **Retry Mechanism**: Automatic retry for failed communications
- **Timeout Handling**: Configurable timeout values
- **Checksum Validation**: CRC16 checksum for data integrity

## Implementation Notes

### Frame Format Example
```
Frame Header: FF FF
Frame Length: [1 byte]
Address Identifier: [Source][Destination]
Frame Type: [1 byte]
Data Information: [Variable length]
Checksum: [1 byte]
CRC Checksum: [2 bytes, optional]
```

### Communication Flow
1. **Initialization**: Power-on process establishes communication
2. **Control**: Normal control processes for device operation
3. **Reporting**: Active reporting of device status changes
4. **Configuration**: Module configuration and setup
5. **Alarm Handling**: Alarm status reporting and management

## Platform Features

- **Smart Home Integration**: Seamless integration with Haier smart home ecosystem
- **Cloud Connectivity**: Direct communication with cloud services
- **Device Management**: Comprehensive device control and monitoring
- **Protocol Standardization**: Standardized communication protocol for all devices
- **Error Recovery**: Robust error handling and recovery mechanisms

## Conclusion

The Haier Smart Home Open Platform provides a comprehensive communication framework for smart home devices. The platform ensures reliable communication between devices and cloud services through standardized protocols, robust error handling, and flexible configuration options.

This documentation serves as a technical reference for developers and integrators working with Haier smart home devices and the communication protocols that enable their functionality.
