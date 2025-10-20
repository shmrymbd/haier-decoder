# Haier Protocol Algorithm Reverse Engineering

## Document Information
- **Analysis Date**: December 2024
- **Objective**: Reverse engineer the authentication algorithm
- **Methodology**: Pattern analysis, cryptographic testing, and algorithm identification
- **Status**: In Progress

---

## Executive Summary

This document outlines a systematic approach to reverse engineer the Haier protocol's authentication algorithm. Based on the captured data, we can identify the algorithm structure, key derivation method, and encryption mechanism through pattern analysis and cryptographic testing.

### Reverse Engineering Strategy
1. **Pattern Analysis** - Identify algorithm structure and components
2. **Key Derivation** - Determine how keys are derived from device identifiers
3. **Encryption Algorithm** - Identify the encryption method used
4. **Challenge-Response Logic** - Understand the transformation logic
5. **Implementation** - Create working algorithm implementation

---

## Algorithm Structure Analysis

### 1. Authentication Packet Structure

#### **Challenge Packet (Machine → Modem)**
```
Header:     ff ff 25 40 00 00 00 00 00 12
Command:    10 02 00 01
Challenge:  [8 bytes] - Random challenge data
Payload:    [16 bytes] - Encrypted/obfuscated data
CRC:        [3 bytes] - Packet checksum
```

#### **Response Packet (Modem → Machine)**
```
Header:     ff ff 25 40 00 00 00 00 00 11
Command:    10 02 00 01
Response:   [8 bytes] - Response to challenge
Payload:    [16 bytes] - Encrypted response data
CRC:        [3 bytes] - Packet checksum
```

### 2. Data Structure Breakdown

#### **Challenge Structure**
```
Bytes 1-8:   Random challenge (8 bytes)
Byte 9:      Session counter (1 byte)
Bytes 10-17: Encrypted data block 1 (8 bytes)
Bytes 18-19: Validation bytes (2 bytes)
Bytes 20-21: Checksum/signature (2 bytes)
Bytes 22-24: Sequence/timestamp (3 bytes)
Bytes 25-27: Additional validation (3 bytes)
Bytes 28-29: CRC/padding (2 bytes)
```

#### **Response Structure**
```
Bytes 1-8:   Response to challenge (8 bytes)
Byte 9:      Session counter (1 byte)
Bytes 10-17: Encrypted response data (8 bytes)
Bytes 18-19: Response validation (2 bytes)
Bytes 20-21: Response checksum (2 bytes)
Bytes 22-24: Response sequence (3 bytes)
Bytes 25-27: Response validation (3 bytes)
Bytes 28-29: Response CRC (2 bytes)
```

---

## Key Derivation Analysis

### 1. Device Identifier Sources

#### **Primary Identifiers**
```
IMEI:        862817068367949 (15 digits)
Serial:      0021800078EHD5108DUZ00000002 (29 characters)
Model:       CEAB9UQ00 (9 characters)
Firmware:    E++2.17 (6 characters)
Device Type: U-WMT (5 characters)
```

#### **Secondary Identifiers**
```
Timestamp:   Session-based time values
Sequence:    Session sequence counter
Internal ID: 00000001 (8 characters)
```

### 2. Key Derivation Hypothesis

#### **Multi-Source Key Derivation**
```
Key = Hash(IMEI + Serial + Model + Firmware + Timestamp + Sequence)
```

**Entropy Analysis:**
- **IMEI**: 15 digits = 60 bits
- **Serial**: 29 characters = 232 bits
- **Model**: 9 characters = 72 bits
- **Firmware**: 6 characters = 48 bits
- **Device Type**: 5 characters = 40 bits
- **Timestamp**: 32 bits
- **Sequence**: 8 bits
- **Total**: ~492 bits of entropy

#### **Key Derivation Algorithm Candidates**
1. **PBKDF2**: `PBKDF2(Password, Salt, Iterations, KeyLength)`
2. **HKDF**: `HKDF(InputKeyMaterial, Salt, Info, KeyLength)`
3. **Argon2**: `Argon2(Password, Salt, Memory, Time, Parallelism, KeyLength)`
4. **Custom**: Proprietary key derivation algorithm

### 3. Key Derivation Testing

#### **Test Vector 1: Session 1**
```
Input: IMEI + Serial + Model + Firmware + Timestamp + Sequence
IMEI: 862817068367949
Serial: 0021800078EHD5108DUZ00000002
Model: CEAB9UQ00
Firmware: E++2.17
Timestamp: [Session 1 timestamp]
Sequence: 01
```

#### **Test Vector 2: Session 2**
```
Input: IMEI + Serial + Model + Firmware + Timestamp + Sequence
IMEI: 862817068367949
Serial: 0021800078EHD5108DUZ00000002
Model: CEAB9UQ00
Firmware: E++2.17
Timestamp: [Session 2 timestamp]
Sequence: 01
```

#### **Test Vector 3: Session 3**
```
Input: IMEI + Serial + Model + Firmware + Timestamp + Sequence
IMEI: 862817068367949
Serial: 0021800078EHD5108DUZ00000002
Model: CEAB9UQ00
Firmware: E++2.17
Timestamp: 1760889661
Sequence: 01
```

---

## Encryption Algorithm Analysis

### 1. Algorithm Candidates

#### **Symmetric Encryption**
- **AES-128**: 128-bit key, 16-byte blocks
- **AES-256**: 256-bit key, 16-byte blocks
- **DES/3DES**: Legacy encryption (less likely)
- **ChaCha20**: Modern stream cipher

#### **Block Cipher Modes**
- **CBC**: Cipher Block Chaining
- **GCM**: Galois/Counter Mode
- **CTR**: Counter Mode
- **ECB**: Electronic Codebook (less likely)

### 2. Encryption Pattern Analysis

#### **Session 1 Encryption**
```
Challenge: 79 6d 40 1a 35 74 79 8c
Response:  d2 87 c9 4b 77 9b 59 d7
```

#### **Session 2 Encryption**
```
Challenge: 3f 8e 46 d1 bb 19 63 34
Response:  6a a6 0b 61 b4 3a be 0f
```

#### **Session 3 Encryption**
```
Challenge: 58 29 f7 e3 63 e7 64 00
Response:  17 70 f0 a8 83 ab e0 59
```

**Pattern Observations:**
- **Block Size**: 8-byte blocks (64 bits)
- **Algorithm**: Likely AES-128 or custom 64-bit block cipher
- **Mode**: Likely CBC or GCM mode
- **Key**: Derived from device identifiers

### 3. Encryption Testing

#### **AES-128 Testing**
```
Key: [Derived from device identifiers]
Plaintext: [Challenge data]
Ciphertext: [Encrypted data]
```

#### **AES-256 Testing**
```
Key: [Derived from device identifiers]
Plaintext: [Challenge data]
Ciphertext: [Encrypted data]
```

#### **Custom Algorithm Testing**
```
Key: [Derived from device identifiers]
Plaintext: [Challenge data]
Ciphertext: [Encrypted data]
```

---

## Challenge-Response Logic Analysis

### 1. Challenge Generation

#### **Random Challenge Generation**
```
Session 1: db 61 6e 43 47 1e 37 4f
Session 2: 75 5a af 88 e5 c8 52 70
Session 3: 78 8c 6f f2 d9 2d c8 55
```

**Pattern Analysis:**
- **Length**: 8 bytes per challenge
- **Uniqueness**: No apparent pattern or repetition
- **Entropy**: High entropy, appears truly random
- **Distribution**: Even distribution across byte values

#### **Challenge Generation Algorithm**
```
Challenge = Random(8) + Encrypt(Data, Key)
```

**Where:**
- `Random(8)`: 8-byte random number
- `Data`: Session data (timestamp, sequence, etc.)
- `Key`: Derived from device identifiers
- `Encrypt`: Encryption algorithm (AES-128/256)

### 2. Response Generation

#### **Response to Challenge**
```
Session 1: 56 57 65 56 49 43 37 55
Session 2: 45 4a 6c 61 32 56 41 54
Session 3: 64 38 63 4f 4e 79 47 30
```

**Pattern Analysis:**
- **Length**: 8 bytes per response
- **Uniqueness**: Each session uses different response
- **Relationship**: Response appears to be transformation of challenge
- **Algorithm**: Likely uses same encryption as challenge

#### **Response Generation Algorithm**
```
Response = Transform(Challenge, Key) + Encrypt(ResponseData, Key)
```

**Where:**
- `Challenge`: 8-byte challenge from machine
- `Key`: Derived from device identifiers
- `Transform`: Transformation function (XOR, addition, etc.)
- `ResponseData`: Response data (timestamp, sequence, etc.)
- `Encrypt`: Encryption algorithm (AES-128/256)

---

## Algorithm Implementation

### 1. Key Derivation Implementation

#### **PBKDF2 Implementation**
```python
import hashlib
import hmac

def derive_key_pbkdf2(imei, serial, model, firmware, timestamp, sequence):
    password = f"{imei}{serial}{model}{firmware}{timestamp}{sequence}"
    salt = b"haier_salt"  # Hypothetical salt
    iterations = 10000
    key_length = 32  # 256 bits
    
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations, key_length)
    return key
```

#### **HKDF Implementation**
```python
import hkdf

def derive_key_hkdf(imei, serial, model, firmware, timestamp, sequence):
    input_key_material = f"{imei}{serial}{model}{firmware}{timestamp}{sequence}"
    salt = b"haier_salt"  # Hypothetical salt
    info = b"haier_auth"
    key_length = 32  # 256 bits
    
    key = hkdf.hkdf(input_key_material.encode(), key_length, salt, info)
    return key
```

#### **Argon2 Implementation**
```python
import argon2

def derive_key_argon2(imei, serial, model, firmware, timestamp, sequence):
    password = f"{imei}{serial}{model}{firmware}{timestamp}{sequence}"
    salt = b"haier_salt"  # Hypothetical salt
    memory = 65536  # 64 MB
    time_cost = 3
    parallelism = 4
    key_length = 32  # 256 bits
    
    key = argon2.hash_password(password.encode(), salt, memory, time_cost, parallelism, key_length)
    return key
```

### 2. Encryption Implementation

#### **AES-128 Implementation**
```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

def encrypt_aes128(data, key):
    cipher = AES.new(key[:16], AES.MODE_CBC)
    padded_data = pad(data, AES.block_size)
    ciphertext = cipher.encrypt(padded_data)
    return cipher.iv + ciphertext

def decrypt_aes128(ciphertext, key):
    iv = ciphertext[:16]
    cipher = AES.new(key[:16], AES.MODE_CBC, iv)
    padded_data = cipher.decrypt(ciphertext[16:])
    return unpad(padded_data, AES.block_size)
```

#### **AES-256 Implementation**
```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

def encrypt_aes256(data, key):
    cipher = AES.new(key[:32], AES.MODE_CBC)
    padded_data = pad(data, AES.block_size)
    ciphertext = cipher.encrypt(padded_data)
    return cipher.iv + ciphertext

def decrypt_aes256(ciphertext, key):
    iv = ciphertext[:16]
    cipher = AES.new(key[:32], AES.MODE_CBC, iv)
    padded_data = cipher.decrypt(ciphertext[16:])
    return unpad(padded_data, AES.block_size)
```

### 3. Challenge-Response Implementation

#### **Challenge Generation**
```python
import os
import time

def generate_challenge(key, session_data):
    # Generate 8-byte random challenge
    random_challenge = os.urandom(8)
    
    # Prepare data for encryption
    data = session_data.encode()
    
    # Encrypt data with key
    encrypted_data = encrypt_aes128(data, key)
    
    # Combine challenge and encrypted data
    challenge = random_challenge + encrypted_data
    
    return challenge
```

#### **Response Generation**
```python
def generate_response(challenge, key, response_data):
    # Extract random challenge
    random_challenge = challenge[:8]
    
    # Transform challenge (XOR with key)
    transformed_challenge = bytes(a ^ b for a, b in zip(random_challenge, key[:8]))
    
    # Prepare response data
    data = response_data.encode()
    
    # Encrypt response data
    encrypted_response = encrypt_aes128(data, key)
    
    # Combine response and encrypted data
    response = transformed_challenge + encrypted_response
    
    return response
```

---

## Testing Framework

### 1. Algorithm Testing

#### **Key Derivation Testing**
```python
def test_key_derivation():
    # Test with known device identifiers
    imei = "862817068367949"
    serial = "0021800078EHD5108DUZ00000002"
    model = "CEAB9UQ00"
    firmware = "E++2.17"
    timestamp = "1760889661"
    sequence = "01"
    
    # Test different key derivation methods
    key_pbkdf2 = derive_key_pbkdf2(imei, serial, model, firmware, timestamp, sequence)
    key_hkdf = derive_key_hkdf(imei, serial, model, firmware, timestamp, sequence)
    key_argon2 = derive_key_argon2(imei, serial, model, firmware, timestamp, sequence)
    
    # Compare with captured data
    print(f"PBKDF2 Key: {key_pbkdf2.hex()}")
    print(f"HKDF Key: {key_hkdf.hex()}")
    print(f"Argon2 Key: {key_argon2.hex()}")
```

#### **Encryption Testing**
```python
def test_encryption():
    # Test with known challenge/response pairs
    challenge = bytes.fromhex("db 61 6e 43 47 1e 37 4f")
    response = bytes.fromhex("56 57 65 56 49 43 37 55")
    
    # Test different encryption algorithms
    key = derive_key_pbkdf2(imei, serial, model, firmware, timestamp, sequence)
    
    # Test AES-128
    encrypted_aes128 = encrypt_aes128(challenge, key)
    print(f"AES-128: {encrypted_aes128.hex()}")
    
    # Test AES-256
    encrypted_aes256 = encrypt_aes256(challenge, key)
    print(f"AES-256: {encrypted_aes256.hex()}")
```

### 2. Validation Testing

#### **Challenge-Response Validation**
```python
def validate_challenge_response(challenge, response, key):
    # Extract components
    random_challenge = challenge[:8]
    encrypted_data = challenge[8:]
    
    random_response = response[:8]
    encrypted_response = response[8:]
    
    # Test transformation
    transformed_challenge = bytes(a ^ b for a, b in zip(random_challenge, key[:8]))
    
    # Validate response
    if transformed_challenge == random_response:
        print("Challenge-Response validation successful")
        return True
    else:
        print("Challenge-Response validation failed")
        return False
```

---

## Reverse Engineering Tools

### 1. Pattern Analysis Tools

#### **Hex Pattern Analyzer**
```python
def analyze_hex_patterns(data):
    # Analyze byte patterns
    patterns = {}
    for i in range(len(data)):
        byte = data[i]
        if byte not in patterns:
            patterns[byte] = []
        patterns[byte].append(i)
    
    return patterns
```

#### **Entropy Analyzer**
```python
import math

def calculate_entropy(data):
    # Calculate Shannon entropy
    byte_counts = {}
    for byte in data:
        byte_counts[byte] = byte_counts.get(byte, 0) + 1
    
    entropy = 0
    for count in byte_counts.values():
        probability = count / len(data)
        entropy -= probability * math.log2(probability)
    
    return entropy
```

### 2. Cryptographic Testing Tools

#### **Algorithm Tester**
```python
def test_encryption_algorithms(data, key):
    algorithms = [
        ("AES-128-CBC", encrypt_aes128),
        ("AES-256-CBC", encrypt_aes256),
        ("AES-128-GCM", encrypt_aes128_gcm),
        ("AES-256-GCM", encrypt_aes256_gcm),
    ]
    
    results = {}
    for name, encrypt_func in algorithms:
        try:
            encrypted = encrypt_func(data, key)
            results[name] = encrypted.hex()
        except Exception as e:
            results[name] = f"Error: {e}"
    
    return results
```

#### **Key Derivation Tester**
```python
def test_key_derivation_methods(imei, serial, model, firmware, timestamp, sequence):
    methods = [
        ("PBKDF2", derive_key_pbkdf2),
        ("HKDF", derive_key_hkdf),
        ("Argon2", derive_key_argon2),
        ("Custom", derive_key_custom),
    ]
    
    results = {}
    for name, derive_func in methods:
        try:
            key = derive_func(imei, serial, model, firmware, timestamp, sequence)
            results[name] = key.hex()
        except Exception as e:
            results[name] = f"Error: {e}"
    
    return results
```

---

## Implementation Roadmap

### Phase 1: Pattern Analysis (Week 1)
- [ ] Analyze hex patterns in captured data
- [ ] Identify algorithm structure and components
- [ ] Document data flow and transformations
- [ ] Create pattern analysis tools

### Phase 2: Key Derivation (Week 2)
- [ ] Test different key derivation methods
- [ ] Analyze entropy sources and key strength
- [ ] Implement key derivation algorithms
- [ ] Validate key derivation with captured data

### Phase 3: Encryption Analysis (Week 3)
- [ ] Test different encryption algorithms
- [ ] Analyze encryption patterns and modes
- [ ] Implement encryption algorithms
- [ ] Validate encryption with captured data

### Phase 4: Challenge-Response Logic (Week 4)
- [ ] Analyze challenge generation patterns
- [ ] Analyze response generation patterns
- [ ] Implement challenge-response algorithms
- [ ] Validate challenge-response with captured data

### Phase 5: Integration and Testing (Week 5)
- [ ] Integrate all components
- [ ] Test with captured data
- [ ] Validate algorithm correctness
- [ ] Document final implementation

---

## Conclusion

The Haier protocol's authentication algorithm can be reverse engineered through systematic analysis of the captured data. The key steps are:

1. **Pattern Analysis** - Identify algorithm structure
2. **Key Derivation** - Determine key derivation method
3. **Encryption Analysis** - Identify encryption algorithm
4. **Challenge-Response Logic** - Understand transformation logic
5. **Implementation** - Create working algorithm

The reverse engineering process is feasible and can be completed within 5 weeks using the systematic approach outlined in this document.

---

*This document provides a comprehensive roadmap for reverse engineering the Haier protocol's authentication algorithm.*
