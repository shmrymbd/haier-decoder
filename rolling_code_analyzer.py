#!/usr/bin/env python3
"""
Haier Rolling Code Challenge Reverse Engineering Tool

This script implements the reverse engineering strategy for the Haier
washing machine rolling code authentication system.
"""

import hashlib
import secrets
import string
import time
import struct
from collections import Counter
from typing import List, Dict, Tuple, Optional
import numpy as np
from scipy.stats import pearsonr
import math

class RollingCodeAnalyzer:
    def __init__(self):
        self.challenges = []
        self.responses = []
        self.device_info = {
            'imei': '862817068367949',
            'serial': '0021800078EHD5108DUZ00000002',
            'model': 'CEAB9UQ00',
            'firmware': 'E++2.17'
        }
        
        # Load captured data
        self.load_captured_data()
    
    def load_captured_data(self):
        """Load captured challenge-response pairs from analysis"""
        self.challenges = [
            "VWeVIC7U",
            "EJla2VAT", 
            "33uhBWdW",
            "fB5zAkGo",
            "a9XMPWiM",
            "c6awFzeB",
            "QXI27QPP"
        ]
        
        self.responses = [
            "db 61 6e 43 47 1e 37 4f",
            "75 5a af 88 e5 c8 52 70",
            "bf 11 eb 49 2c c5 3f a5",
            "75 02 01 76 e6 bd 91 84",
            "1b 0c b9 e5 ee 88 54 1f",
            "1b 0c b9 e5 ee 88 54 1f",
            "1b 0c b9 e5 ee 88 54 1f"
        ]
        
        self.encrypted_payloads = [
            "01 79 6d 40 1a 35 74 79 8c 91 0b 91 39 00 02 e9 a8 4a 19 5f",
            "01 3f 8e 46 d1 bb 19 63 34 9e dd c7 06 91 ed 68 4c c9 74 92",
            "01 9c d8 61 b1 68 08 f5 80 f5 21 cf 37 2f 3c 3a 74 04 51 cc",
            "01 d6 8f c6 56 aa 32 37 5b 4e d2 0e 68 d6 f5 2c 9b 48 05 55",
            "01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b",
            "01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b",
            "01 b6 48 e0 39 23 22 81 a0 39 80 13 9f be 98 c4 ed 28 01 8b"
        ]
    
    def analyze_challenge_patterns(self) -> Dict:
        """Analyze patterns in challenge generation"""
        print("=== Challenge Pattern Analysis ===")
        
        results = {}
        
        # 1. Entropy Analysis
        results['entropy'] = self.calculate_entropy_analysis()
        
        # 2. Character Frequency Analysis
        results['frequency'] = self.analyze_character_frequency()
        
        # 3. Base64/Base32 Analysis
        results['encoding'] = self.test_encoding_formats()
        
        # 4. Time-based Analysis
        results['time_based'] = self.test_time_based_generation()
        
        return results
    
    def calculate_entropy_analysis(self) -> Dict:
        """Calculate Shannon entropy for challenges"""
        print("Analyzing challenge entropy...")
        
        entropy_results = {}
        
        for i, challenge in enumerate(self.challenges):
            entropy = self.calculate_entropy(challenge)
            entropy_results[f'challenge_{i+1}'] = {
                'challenge': challenge,
                'entropy': entropy,
                'max_entropy': math.log2(len(set(challenge)))
            }
            print(f"Challenge {i+1}: {challenge} -> Entropy: {entropy:.2f}")
        
        return entropy_results
    
    def calculate_entropy(self, data: str) -> float:
        """Calculate Shannon entropy of a string"""
        counter = Counter(data)
        entropy = 0
        for count in counter.values():
            p = count / len(data)
            entropy -= p * math.log2(p)
        return entropy
    
    def analyze_character_frequency(self) -> Dict:
        """Analyze character frequency patterns"""
        print("Analyzing character frequency...")
        
        all_chars = ''.join(self.challenges)
        char_freq = Counter(all_chars)
        
        # Check for patterns
        patterns = {
            'total_chars': len(all_chars),
            'unique_chars': len(char_freq),
            'most_common': char_freq.most_common(5),
            'least_common': char_freq.most_common()[-5:],
            'distribution': dict(char_freq)
        }
        
        print(f"Total characters: {patterns['total_chars']}")
        print(f"Unique characters: {patterns['unique_chars']}")
        print(f"Most common: {patterns['most_common']}")
        
        return patterns
    
    def test_encoding_formats(self) -> Dict:
        """Test if challenges are encoded in common formats"""
        print("Testing encoding formats...")
        
        results = {}
        
        for i, challenge in enumerate(self.challenges):
            challenge_results = {}
            
            # Test Base64
            try:
                import base64
                # Try with different padding
                for padding in ['', '=', '==', '===']:
                    try:
                        decoded = base64.b64decode(challenge + padding)
                        challenge_results['base64'] = decoded.hex()
                        break
                    except:
                        continue
            except:
                challenge_results['base64'] = 'Failed'
            
            # Test Base32
            try:
                import base64
                decoded = base64.b32decode(challenge.upper())
                challenge_results['base32'] = decoded.hex()
            except:
                challenge_results['base32'] = 'Failed'
            
            # Test Hex
            try:
                if len(challenge) % 2 == 0:
                    decoded = bytes.fromhex(challenge)
                    challenge_results['hex'] = decoded.hex()
                else:
                    challenge_results['hex'] = 'Invalid length'
            except:
                challenge_results['hex'] = 'Failed'
            
            results[f'challenge_{i+1}'] = challenge_results
            print(f"Challenge {i+1} ({challenge}): {challenge_results}")
        
        return results
    
    def test_time_based_generation(self) -> Dict:
        """Test if challenges are time-based"""
        print("Testing time-based generation...")
        
        # Simulate timestamps for each session
        timestamps = [time.time() - i * 3600 for i in range(len(self.challenges))]
        
        results = {}
        
        for i, (challenge, timestamp) in enumerate(zip(self.challenges, timestamps)):
            # Test different time-based generation methods
            methods = {
                'timestamp_hash': hashlib.sha256(str(timestamp).encode()).hexdigest()[:8],
                'imei_timestamp': hashlib.sha256(f"{self.device_info['imei']}{timestamp}".encode()).hexdigest()[:8],
                'serial_timestamp': hashlib.sha256(f"{self.device_info['serial']}{timestamp}".encode()).hexdigest()[:8],
                'combined_timestamp': hashlib.sha256(f"{self.device_info['imei']}{self.device_info['serial']}{timestamp}".encode()).hexdigest()[:8]
            }
            
            results[f'challenge_{i+1}'] = {
                'original': challenge,
                'timestamp': timestamp,
                'methods': methods
            }
            
            print(f"Challenge {i+1}: {challenge}")
            for method, generated in methods.items():
                match = "✓" if generated == challenge else "✗"
                print(f"  {method}: {generated} {match}")
        
        return results
    
    def analyze_response_patterns(self) -> Dict:
        """Analyze patterns in response generation"""
        print("\n=== Response Pattern Analysis ===")
        
        results = {}
        
        # 1. Response Uniqueness Analysis
        results['uniqueness'] = self.analyze_response_uniqueness()
        
        # 2. Challenge-Response Mapping
        results['mapping'] = self.test_challenge_response_mapping()
        
        # 3. Cryptographic Analysis
        results['crypto'] = self.test_cryptographic_methods()
        
        return results
    
    def analyze_response_uniqueness(self) -> Dict:
        """Analyze response uniqueness patterns"""
        print("Analyzing response uniqueness...")
        
        unique_responses = set(self.responses)
        response_counts = Counter(self.responses)
        
        results = {
            'total_responses': len(self.responses),
            'unique_responses': len(unique_responses),
            'duplicate_responses': len(self.responses) - len(unique_responses),
            'response_counts': dict(response_counts),
            'duplicates': [resp for resp, count in response_counts.items() if count > 1]
        }
        
        print(f"Total responses: {results['total_responses']}")
        print(f"Unique responses: {results['unique_responses']}")
        print(f"Duplicate responses: {results['duplicate_responses']}")
        print(f"Duplicates: {results['duplicates']}")
        
        return results
    
    def test_challenge_response_mapping(self) -> Dict:
        """Test direct mapping between challenges and responses"""
        print("Testing challenge-response mapping...")
        
        results = {}
        
        for i, (challenge, response) in enumerate(zip(self.challenges, self.responses)):
            mapping_results = {}
            
            # Convert to bytes for analysis
            challenge_bytes = challenge.encode()
            response_bytes = bytes.fromhex(response.replace(' ', ''))
            
            # Test XOR operations
            if len(challenge_bytes) == len(response_bytes):
                xor_result = bytes(a ^ b for a, b in zip(challenge_bytes, response_bytes))
                mapping_results['xor'] = xor_result.hex()
            
            # Test addition/subtraction
            if len(challenge_bytes) == len(response_bytes):
                add_result = bytes((a + b) % 256 for a, b in zip(challenge_bytes, response_bytes))
                sub_result = bytes((a - b) % 256 for a, b in zip(challenge_bytes, response_bytes))
                mapping_results['addition'] = add_result.hex()
                mapping_results['subtraction'] = sub_result.hex()
            
            # Test hash-based mapping
            hash_md5 = hashlib.md5(challenge_bytes).hexdigest()[:16]
            hash_sha1 = hashlib.sha1(challenge_bytes).hexdigest()[:16]
            hash_sha256 = hashlib.sha256(challenge_bytes).hexdigest()[:16]
            
            mapping_results['hash_md5'] = hash_md5
            mapping_results['hash_sha1'] = hash_sha1
            mapping_results['hash_sha256'] = hash_sha256
            
            results[f'pair_{i+1}'] = {
                'challenge': challenge,
                'response': response,
                'mappings': mapping_results
            }
            
            print(f"Pair {i+1}: {challenge} -> {response}")
            print(f"  XOR: {mapping_results.get('xor', 'N/A')}")
            print(f"  MD5: {mapping_results['hash_md5']}")
            print(f"  SHA1: {mapping_results['hash_sha1']}")
            print(f"  SHA256: {mapping_results['hash_sha256']}")
        
        return results
    
    def test_cryptographic_methods(self) -> Dict:
        """Test common cryptographic methods"""
        print("Testing cryptographic methods...")
        
        results = {}
        
        # Test key derivation methods
        key_candidates = self.derive_key_candidates()
        
        for i, (challenge, response) in enumerate(zip(self.challenges, self.responses)):
            crypto_results = {}
            
            for key_name, key in key_candidates.items():
                # Test simple XOR with key
                challenge_bytes = challenge.encode()
                response_bytes = bytes.fromhex(response.replace(' ', ''))
                
                if len(key) >= len(challenge_bytes):
                    key_truncated = key[:len(challenge_bytes)]
                    xor_result = bytes(a ^ b for a, b in zip(challenge_bytes, key_truncated))
                    crypto_results[f'{key_name}_xor'] = xor_result.hex()
                
                # Test hash-based encryption
                combined = challenge + key.decode() if isinstance(key, bytes) else challenge + key
                hash_result = hashlib.sha256(combined.encode()).hexdigest()[:16]
                crypto_results[f'{key_name}_hash'] = hash_result
            
            results[f'pair_{i+1}'] = {
                'challenge': challenge,
                'response': response,
                'crypto_tests': crypto_results
            }
        
        return results
    
    def derive_key_candidates(self) -> Dict:
        """Derive potential keys from device information"""
        print("Deriving key candidates...")
        
        candidates = {}
        
        # Direct concatenation
        candidates['imei_serial'] = (self.device_info['imei'] + self.device_info['serial']).encode()
        candidates['serial_imei'] = (self.device_info['serial'] + self.device_info['imei']).encode()
        
        # Hash-based derivation
        combined = self.device_info['imei'] + self.device_info['serial'] + self.device_info['model']
        candidates['md5'] = hashlib.md5(combined.encode()).digest()
        candidates['sha1'] = hashlib.sha1(combined.encode()).digest()
        candidates['sha256'] = hashlib.sha256(combined.encode()).digest()
        
        # Truncated hashes
        candidates['md5_16'] = candidates['md5'][:16]
        candidates['sha1_16'] = candidates['sha1'][:16]
        candidates['sha256_16'] = candidates['sha256'][:16]
        
        print(f"Generated {len(candidates)} key candidates")
        
        return candidates
    
    def test_machine_learning_approach(self) -> Dict:
        """Test machine learning approach for pattern recognition"""
        print("\n=== Machine Learning Analysis ===")
        
        # Extract features
        features = self.extract_features()
        
        # Analyze correlations
        correlations = self.analyze_correlations()
        
        # Test prediction models
        predictions = self.test_prediction_models(features)
        
        return {
            'features': features,
            'correlations': correlations,
            'predictions': predictions
        }
    
    def extract_features(self) -> Dict:
        """Extract features from challenges and responses"""
        print("Extracting features...")
        
        features = {}
        
        for i, (challenge, response) in enumerate(zip(self.challenges, self.responses)):
            challenge_bytes = challenge.encode()
            response_bytes = bytes.fromhex(response.replace(' ', ''))
            
            features[f'pair_{i+1}'] = {
                'challenge_length': len(challenge),
                'response_length': len(response),
                'challenge_entropy': self.calculate_entropy(challenge),
                'response_entropy': self.calculate_entropy(response),
                'challenge_sum': sum(challenge_bytes),
                'response_sum': sum(response_bytes),
                'challenge_mean': np.mean(challenge_bytes),
                'response_mean': np.mean(response_bytes),
                'challenge_std': np.std(challenge_bytes),
                'response_std': np.std(response_bytes)
            }
        
        return features
    
    def analyze_correlations(self) -> Dict:
        """Analyze correlations between challenges and responses"""
        print("Analyzing correlations...")
        
        # Convert to numerical arrays
        challenge_sums = []
        response_sums = []
        
        for challenge, response in zip(self.challenges, self.responses):
            challenge_bytes = challenge.encode()
            response_bytes = bytes.fromhex(response.replace(' ', ''))
            challenge_sums.append(sum(challenge_bytes))
            response_sums.append(sum(response_bytes))
        
        # Calculate correlation
        correlation, p_value = pearsonr(challenge_sums, response_sums)
        
        return {
            'correlation': correlation,
            'p_value': p_value,
            'challenge_sums': challenge_sums,
            'response_sums': response_sums
        }
    
    def test_prediction_models(self, features: Dict) -> Dict:
        """Test simple prediction models"""
        print("Testing prediction models...")
        
        # Simple linear relationship test
        predictions = {}
        
        for i, (challenge, response) in enumerate(zip(self.challenges, self.responses)):
            # Test if response is a simple transformation of challenge
            challenge_bytes = challenge.encode()
            response_bytes = bytes.fromhex(response.replace(' ', ''))
            
            # Test various transformations
            transformations = {
                'reverse': challenge[::-1],
                'uppercase': challenge.upper(),
                'lowercase': challenge.lower(),
                'shift_1': ''.join(chr((ord(c) + 1) % 256) for c in challenge),
                'shift_neg_1': ''.join(chr((ord(c) - 1) % 256) for c in challenge),
                'xor_0xAA': ''.join(chr(ord(c) ^ 0xAA) for c in challenge),
                'xor_0xFF': ''.join(chr(ord(c) ^ 0xFF) for c in challenge)
            }
            
            predictions[f'pair_{i+1}'] = {
                'challenge': challenge,
                'response': response,
                'transformations': transformations
            }
        
        return predictions
    
    def generate_test_challenges(self, count: int = 10) -> List[str]:
        """Generate test challenges using different methods"""
        print(f"\n=== Generating {count} Test Challenges ===")
        
        test_challenges = []
        
        # Method 1: Random generation
        for i in range(count):
            challenge = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
            test_challenges.append(('random', challenge))
        
        # Method 2: Time-based generation
        current_time = time.time()
        for i in range(count):
            timestamp = current_time + i
            challenge = hashlib.sha256(f"{timestamp}{self.device_info['imei']}".encode()).hexdigest()[:8]
            test_challenges.append(('time_based', challenge))
        
        # Method 3: Session-based generation
        for i in range(count):
            session_id = f"session_{i}"
            challenge = hashlib.sha256(f"{session_id}{self.device_info['serial']}".encode()).hexdigest()[:8]
            test_challenges.append(('session_based', challenge))
        
        return test_challenges
    
    def run_complete_analysis(self) -> Dict:
        """Run complete reverse engineering analysis"""
        print("=== Haier Rolling Code Reverse Engineering Analysis ===")
        print(f"Analyzing {len(self.challenges)} challenge-response pairs")
        print(f"Device IMEI: {self.device_info['imei']}")
        print(f"Device Serial: {self.device_info['serial']}")
        print(f"Device Model: {self.device_info['model']}")
        print(f"Device Firmware: {self.device_info['firmware']}")
        
        results = {}
        
        # Phase 1: Challenge Analysis
        print("\n" + "="*50)
        results['challenge_analysis'] = self.analyze_challenge_patterns()
        
        # Phase 2: Response Analysis
        print("\n" + "="*50)
        results['response_analysis'] = self.analyze_response_patterns()
        
        # Phase 3: Machine Learning Analysis
        print("\n" + "="*50)
        results['ml_analysis'] = self.test_machine_learning_approach()
        
        # Phase 4: Test Challenge Generation
        print("\n" + "="*50)
        results['test_challenges'] = self.generate_test_challenges()
        
        return results
    
    def print_summary(self, results: Dict):
        """Print analysis summary"""
        print("\n" + "="*60)
        print("REVERSE ENGINEERING ANALYSIS SUMMARY")
        print("="*60)
        
        # Challenge analysis summary
        if 'challenge_analysis' in results:
            print("\nChallenge Analysis:")
            print(f"  - Total challenges analyzed: {len(self.challenges)}")
            print(f"  - Character frequency analysis: Complete")
            print(f"  - Encoding format tests: Complete")
            print(f"  - Time-based generation tests: Complete")
        
        # Response analysis summary
        if 'response_analysis' in results:
            print("\nResponse Analysis:")
            unique_responses = len(set(self.responses))
            print(f"  - Total responses analyzed: {len(self.responses)}")
            print(f"  - Unique responses: {unique_responses}")
            print(f"  - Duplicate responses: {len(self.responses) - unique_responses}")
            print(f"  - Challenge-response mapping tests: Complete")
            print(f"  - Cryptographic method tests: Complete")
        
        # Machine learning summary
        if 'ml_analysis' in results:
            print("\nMachine Learning Analysis:")
            print(f"  - Feature extraction: Complete")
            print(f"  - Correlation analysis: Complete")
            print(f"  - Prediction model tests: Complete")
        
        # Test challenge generation summary
        if 'test_challenges' in results:
            print(f"\nTest Challenge Generation:")
            print(f"  - Generated {len(results['test_challenges'])} test challenges")
            print(f"  - Methods tested: Random, Time-based, Session-based")
        
        print("\n" + "="*60)
        print("ANALYSIS COMPLETE")
        print("="*60)

def main():
    """Main function to run the analysis"""
    analyzer = RollingCodeAnalyzer()
    
    # Run complete analysis
    results = analyzer.run_complete_analysis()
    
    # Print summary
    analyzer.print_summary(results)
    
    # Save results to file
    import json
    with open('rolling_code_analysis_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\nResults saved to 'rolling_code_analysis_results.json'")

if __name__ == "__main__":
    main()

