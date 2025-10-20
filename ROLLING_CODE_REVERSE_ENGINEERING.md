# Rolling Code Challenge Reverse Engineering Strategy

## Executive Summary

This document outlines a comprehensive approach to reverse engineer the Haier washing machine rolling code authentication system. Based on analysis of captured communication sequences, the system uses a sophisticated challenge-response mechanism with encrypted payloads.

---

## 1. Current Understanding

### Authentication Structure
```
Challenge Packet:
FF FF 25 40 00 00 00 00 00 11 10 02 00 01 [8-byte challenge] 01 [16-24 byte encrypted]

Response Packet:
FF FF 25 40 00 00 00 00 00 12 10 02 00 01 [8-byte response] 01 [16-24 byte encrypted]
```

### Captured Challenge-Response Pairs
| Session | Challenge (ASCII) | Response (Hex) | Encrypted Payload |
|---------|------------------|----------------|-------------------|
| 1 | `VWeVIC7U` | `db 61 6e 43 47 1e 37 4f` | `01 79 6d 40 1a 35 74 79 8c 91 0b 91 39 00 02 e9 a8 4a 19 5f` |
| 2 | `EJla2VAT` | `75 5a af 88 e5 c8 52 70` | `01 3f 8e 46 d1 bb 19 63 34 9e dd c7 06 91 ed 68 4c c9 74 92` |
| 3 | `33uhBWdW` | `bf 11 eb 49 2c c5 3f a5` | `01 9c d8 61 b1 68 08 f5 80 f5 21 cf 37 2f 3c 3a 74 04 51 cc` |
| 4 | `fB5zAkGo` | `75 02 01 76 e6 bd 91 84` | `01 d6 8f c6 56 aa 32 37 5b 4e d2 0e 68 d6 f5 2c 9b 48 05 55` |
| 5 | `a9XMPWiM` | `1b 0c b9 e5 ee 88 54 1f` | `01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b` |
| 6 | `c6awFzeB` | `1b 0c b9 e5 ee 88 54 1f` | `01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b` |
| 7 | `QXI27QPP` | `1b 0c b9 e5 ee 88 54 1f` | `01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b` |

---

## 2. Reverse Engineering Strategy

### Phase 1: Pattern Analysis

#### 2.1 Challenge Generation Analysis
**Objective**: Understand how challenges are generated

**Methodology**:
1. **Entropy Analysis**
   ```python
   # Analyze challenge randomness
   challenges = [
       "VWeVIC7U", "EJla2VAT", "33uhBWdW", 
       "fB5zAkGo", "a9XMPWiM", "c6awFzeB", "QXI27QPP"
   ]
   
   # Check for patterns in:
   # - Character frequency
   # - Position-based patterns
   # - Time-based correlation
   # - Session-based correlation
   ```

2. **Base64/Base32 Analysis**
   ```python
   import base64
   
   for challenge in challenges:
       # Try different encodings
       try:
           decoded = base64.b64decode(challenge + '==')
           print(f"{challenge} -> {decoded.hex()}")
       except:
           pass
   ```

3. **Timestamp Correlation**
   ```python
   # Check if challenges correlate with:
   # - Session timestamps
   # - Device timestamps
   # - Sequence numbers
   # - Device identifiers
   ```

#### 2.2 Response Generation Analysis
**Objective**: Understand how responses are calculated from challenges

**Key Observations**:
- Responses 5, 6, 7 are identical: `1b 0c b9 e5 ee 88 54 1f`
- This suggests either:
  - Same challenge was reused
  - Response is deterministic based on challenge
  - Response includes session state

**Methodology**:
1. **Response Uniqueness Analysis**
   ```python
   responses = [
       "db 61 6e 43 47 1e 37 4f",
       "75 5a af 88 e5 c8 52 70", 
       "bf 11 eb 49 2c c5 3f a5",
       "75 02 01 76 e6 bd 91 84",
       "1b 0c b9 e5 ee 88 54 1f",  # Repeated 3 times
       "1b 0c b9 e5 ee 88 54 1f",
       "1b 0c b9 e5 ee 88 54 1f"
   ]
   ```

2. **Challenge-Response Mapping**
   ```python
   # Look for mathematical relationships
   # - XOR operations
   # - Hash functions
   # - Cryptographic transformations
   # - Session-dependent calculations
   ```

### Phase 2: Cryptographic Analysis

#### 2.3 Encryption Algorithm Identification

**Hypothesis 1: Block Cipher (AES/DES)**
```python
# Test common block ciphers
from Crypto.Cipher import AES, DES, DES3
from Crypto.Util.Padding import pad, unpad

def test_block_cipher(encrypted_data, key_candidates):
    for key in key_candidates:
        try:
            # Test AES-128, AES-256
            cipher = AES.new(key, AES.MODE_ECB)
            decrypted = cipher.decrypt(encrypted_data)
            if is_printable(decrypted):
                return key, decrypted
        except:
            pass
```

**Hypothesis 2: Stream Cipher (RC4/ChaCha20)**
```python
def test_stream_cipher(encrypted_data, key_candidates):
    for key in key_candidates:
        try:
            # Test RC4
            cipher = ARC4.new(key)
            decrypted = cipher.decrypt(encrypted_data)
            if is_printable(decrypted):
                return key, decrypted
        except:
            pass
```

**Hypothesis 3: Custom Encryption**
```python
# Test for custom algorithms
def test_custom_encryption(encrypted_data, challenge, device_info):
    # Try XOR with challenge
    # Try XOR with device identifiers
    # Try simple substitution
    # Try Vigenère cipher
    pass
```

#### 2.4 Key Derivation Analysis

**Key Sources Identified**:
- **IMEI**: `862817068367949`
- **Serial**: `0021800078EHD5108DUZ00000002`
- **Model**: `CEAB9UQ00`
- **Firmware**: `E++2.17`
- **Timestamp**: Session timestamps
- **Sequence**: Packet sequence numbers

**Key Derivation Candidates**:
```python
def derive_key_candidates(device_info, timestamp, sequence):
    candidates = []
    
    # Direct concatenation
    candidates.append(device_info.imei + device_info.serial)
    
    # Hash-based derivation
    import hashlib
    candidates.append(hashlib.md5(device_info.imei + device_info.serial).digest())
    candidates.append(hashlib.sha256(device_info.imei + device_info.serial).digest())
    
    # PBKDF2
    from Crypto.Protocol.KDF import PBKDF2
    candidates.append(PBKDF2(device_info.imei, device_info.serial, 16))
    
    # HKDF
    from Crypto.Protocol.KDF import HKDF
    candidates.append(HKDF(device_info.imei, 16, device_info.serial, hashlib.sha256))
    
    return candidates
```

### Phase 3: Implementation Testing

#### 3.1 Challenge Generation Testing

**Test 1: Random Generation**
```python
import secrets
import string

def generate_random_challenge():
    """Test if challenges are truly random"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) 
                   for _ in range(8))
```

**Test 2: Time-based Generation**
```python
import time
import hashlib

def generate_time_based_challenge(timestamp):
    """Test if challenges are time-based"""
    seed = str(timestamp) + device_info.imei
    hash_obj = hashlib.sha256(seed.encode())
    return hash_obj.hexdigest()[:8]
```

**Test 3: Session-based Generation**
```python
def generate_session_challenge(session_id, sequence):
    """Test if challenges are session-based"""
    seed = f"{session_id}_{sequence}_{device_info.imei}"
    hash_obj = hashlib.sha256(seed.encode())
    return hash_obj.hexdigest()[:8]
```

#### 3.2 Response Generation Testing

**Test 1: Direct Challenge Mapping**
```python
def test_direct_mapping(challenge, response):
    """Test if response is direct transformation of challenge"""
    # Try simple transformations
    transformations = [
        lambda x: bytes([b ^ 0xFF for b in x]),
        lambda x: bytes([b + 1 for b in x]),
        lambda x: bytes([b * 2 for b in x]),
        lambda x: bytes([b ^ 0xAA for b in x]),
    ]
    
    for transform in transformations:
        if transform(challenge.encode()) == bytes.fromhex(response):
            return transform
    return None
```

**Test 2: Hash-based Response**
```python
def test_hash_response(challenge, response, device_info):
    """Test if response is hash of challenge + device info"""
    import hashlib
    
    # Try different combinations
    combinations = [
        challenge + device_info.imei,
        challenge + device_info.serial,
        challenge + device_info.model,
        challenge + device_info.imei + device_info.serial,
    ]
    
    for combo in combinations:
        hash_obj = hashlib.sha256(combo.encode())
        if hash_obj.hexdigest()[:16] == response:
            return combo
    return None
```

**Test 3: Cryptographic Response**
```python
def test_crypto_response(challenge, response, key_candidates):
    """Test if response is encrypted challenge"""
    for key in key_candidates:
        try:
            # Test different encryption modes
            cipher = AES.new(key, AES.MODE_ECB)
            encrypted = cipher.encrypt(challenge.encode())
            if encrypted.hex() == response:
                return key
        except:
            pass
    return None
```

### Phase 4: Advanced Analysis

#### 4.1 Machine Learning Approach

**Feature Extraction**:
```python
def extract_features(challenge, response, session_data):
    features = {
        'challenge_entropy': calculate_entropy(challenge),
        'response_entropy': calculate_entropy(response),
        'challenge_length': len(challenge),
        'response_length': len(response),
        'session_id': session_data['session_id'],
        'timestamp': session_data['timestamp'],
        'sequence': session_data['sequence'],
        'device_imei': session_data['device_imei'],
        'device_serial': session_data['device_serial'],
    }
    return features
```

**Pattern Recognition**:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier

def train_pattern_classifier(features, labels):
    """Train ML model to predict response from challenge"""
    model = MLPClassifier(hidden_layer_sizes=(100, 50))
    model.fit(features, labels)
    return model
```

#### 4.2 Statistical Analysis

**Entropy Analysis**:
```python
import math
from collections import Counter

def calculate_entropy(data):
    """Calculate Shannon entropy"""
    counter = Counter(data)
    entropy = 0
    for count in counter.values():
        p = count / len(data)
        entropy -= p * math.log2(p)
    return entropy
```

**Correlation Analysis**:
```python
import numpy as np
from scipy.stats import pearsonr

def analyze_correlations(challenges, responses, timestamps):
    """Analyze correlations between challenges, responses, and timestamps"""
    correlations = {}
    
    # Challenge-response correlation
    corr, p_value = pearsonr(challenges, responses)
    correlations['challenge_response'] = (corr, p_value)
    
    # Time-based correlation
    corr, p_value = pearsonr(timestamps, challenges)
    correlations['time_challenge'] = (corr, p_value)
    
    return correlations
```

### Phase 5: Practical Implementation

#### 5.1 Automated Testing Framework

```python
class RollingCodeAnalyzer:
    def __init__(self, captured_data):
        self.challenges = self.extract_challenges(captured_data)
        self.responses = self.extract_responses(captured_data)
        self.device_info = self.extract_device_info(captured_data)
    
    def test_all_hypotheses(self):
        """Test all reverse engineering hypotheses"""
        results = {}
        
        # Test challenge generation
        results['challenge_generation'] = self.test_challenge_generation()
        
        # Test response generation
        results['response_generation'] = self.test_response_generation()
        
        # Test encryption algorithms
        results['encryption'] = self.test_encryption_algorithms()
        
        # Test key derivation
        results['key_derivation'] = self.test_key_derivation()
        
        return results
    
    def test_challenge_generation(self):
        """Test different challenge generation methods"""
        methods = [
            self.test_random_generation,
            self.test_time_based_generation,
            self.test_session_based_generation,
            self.test_device_based_generation,
        ]
        
        results = {}
        for method in methods:
            try:
                result = method()
                results[method.__name__] = result
            except Exception as e:
                results[method.__name__] = f"Error: {e}"
        
        return results
    
    def test_response_generation(self):
        """Test different response generation methods"""
        methods = [
            self.test_direct_mapping,
            self.test_hash_based_response,
            self.test_crypto_response,
            self.test_session_dependent_response,
        ]
        
        results = {}
        for method in methods:
            try:
                result = method()
                results[method.__name__] = result
            except Exception as e:
                results[method.__name__] = f"Error: {e}"
        
        return results
```

#### 5.2 Real-time Testing

```python
class LiveRollingCodeTester:
    def __init__(self, device_connection):
        self.device = device_connection
        self.captured_sessions = []
    
    def capture_new_session(self):
        """Capture a new authentication session"""
        session = {
            'timestamp': time.time(),
            'challenges': [],
            'responses': [],
            'device_info': self.get_device_info(),
        }
        
        # Monitor communication
        while not self.session_complete():
            packet = self.device.read_packet()
            if self.is_challenge_packet(packet):
                session['challenges'].append(self.parse_challenge(packet))
            elif self.is_response_packet(packet):
                session['responses'].append(self.parse_response(packet))
        
        self.captured_sessions.append(session)
        return session
    
    def test_prediction_accuracy(self, model):
        """Test how well our model predicts responses"""
        accuracy = 0
        total_tests = 0
        
        for session in self.captured_sessions:
            for challenge, response in zip(session['challenges'], session['responses']):
                predicted = model.predict(challenge)
                if predicted == response:
                    accuracy += 1
                total_tests += 1
        
        return accuracy / total_tests if total_tests > 0 else 0
```

---

## 6. Recommended Tools and Libraries

### 6.1 Cryptographic Analysis
```python
# Required libraries
pip install pycryptodome
pip install cryptography
pip install scipy
pip install scikit-learn
pip install numpy
```

### 6.2 Analysis Tools
```python
# Hex analysis
pip install binascii
pip install struct

# Statistical analysis
pip install pandas
pip install matplotlib
pip install seaborn

# Machine learning
pip install tensorflow
pip install torch
```

### 6.3 Hardware Tools
- **Logic Analyzer**: For timing analysis
- **Oscilloscope**: For signal analysis
- **Protocol Analyzer**: For packet inspection
- **JTAG/SWD**: For firmware analysis

---

## 7. Success Metrics

### 7.1 Challenge Generation Success
- **Accuracy**: >95% correct challenge prediction
- **Timing**: <100ms generation time
- **Uniqueness**: No duplicate challenges in 1000+ sessions

### 7.2 Response Generation Success
- **Accuracy**: >95% correct response prediction
- **Timing**: <200ms response time
- **Security**: No pattern leakage

### 7.3 Overall Success
- **Complete Protocol Understanding**: 100% packet parsing
- **Authentication Bypass**: Successful authentication
- **Session Management**: Complete session control

---

## 8. Risk Assessment

### 8.1 Legal Considerations
- **Reverse Engineering**: Check local laws
- **Device Modification**: Ensure compliance
- **Security Research**: Follow responsible disclosure

### 8.2 Technical Risks
- **Device Bricking**: Risk of permanent damage
- **Security Bypass**: Potential security implications
- **Protocol Changes**: Firmware updates may break analysis

### 8.3 Mitigation Strategies
- **Backup**: Always backup original firmware
- **Testing**: Use isolated test environment
- **Documentation**: Maintain detailed logs
- **Responsible Disclosure**: Report vulnerabilities appropriately

---

## 9. Implementation Timeline

### Phase 1 (Week 1-2): Pattern Analysis
- Extract and analyze all challenge-response pairs
- Identify patterns and correlations
- Test basic transformation hypotheses

### Phase 2 (Week 3-4): Cryptographic Analysis
- Test common encryption algorithms
- Analyze key derivation methods
- Implement automated testing framework

### Phase 3 (Week 5-6): Advanced Analysis
- Apply machine learning techniques
- Perform statistical analysis
- Test real-time prediction

### Phase 4 (Week 7-8): Validation and Testing
- Validate findings with live device
- Test prediction accuracy
- Document complete protocol understanding

---

## 10. Conclusion

The rolling code challenge system appears to be a sophisticated authentication mechanism with the following characteristics:

1. **Challenge Generation**: Likely time/session-based with high entropy
2. **Response Generation**: Cryptographic transformation of challenge
3. **Key Derivation**: Multi-source key derivation from device identifiers
4. **Encryption**: Unknown algorithm, possibly custom implementation
5. **Security**: Designed to prevent replay attacks and unauthorized access

The reverse engineering approach outlined above provides a systematic method to understand and potentially replicate the authentication system. Success depends on comprehensive analysis, automated testing, and validation with real devices.

---

*This document provides a comprehensive framework for reverse engineering the Haier rolling code authentication system. Implementation should be done responsibly and in compliance with applicable laws and regulations.*

