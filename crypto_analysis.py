#!/usr/bin/env python3
"""
Cryptographic analysis of rolling codes
"""

import re
import math
from collections import defaultdict, Counter
import sys

def calculate_entropy(data):
    """Calculate Shannon entropy of data"""
    if not data:
        return 0
    
    # Count byte frequencies
    byte_counts = Counter(data)
    data_len = len(data)
    
    # Calculate entropy
    entropy = 0
    for count in byte_counts.values():
        if count > 0:
            probability = count / data_len
            entropy -= probability * math.log2(probability)
    
    return entropy

def extract_rolling_codes(filename):
    """Extract rolling codes from file"""
    rolling_codes = []
    
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            parts = line.split(' - ', 1)
            if len(parts) != 2:
                continue
                
            prefix = parts[0]
            data = parts[1]
            
            # Extract timestamp and device
            timestamp_match = re.search(r'(\d+)', prefix)
            if not timestamp_match:
                continue
                
            timestamp = int(timestamp_match.group(1))
            device = prefix.split()[0]
            
            # Analyze Type 25 40 (Authentication messages)
            if data.startswith("ff ff 25 40"):
                hex_parts = data.split()
                if len(hex_parts) >= 15:
                    # Extract challenge and response
                    challenge = "".join(hex_parts[8:16])  # 8 bytes challenge
                    response = "".join(hex_parts[16:])     # Encrypted response
                    
                    rolling_codes.append({
                        'timestamp': timestamp,
                        'device': device,
                        'challenge': challenge,
                        'response': response,
                        'full_data': data
                    })
    
    return rolling_codes

def analyze_challenge_patterns(rolling_codes):
    """Analyze challenge generation patterns"""
    print("=== CHALLENGE PATTERN ANALYSIS ===")
    
    challenges = [code for code in rolling_codes if code['device'] == 'machine']
    print(f"Total challenges: {len(challenges)}")
    
    if not challenges:
        print("No challenges found")
        return
    
    # Convert hex to bytes for analysis
    challenge_bytes = []
    for challenge in challenges:
        try:
            bytes_data = bytes.fromhex(challenge['challenge'])
            challenge_bytes.append(bytes_data)
        except ValueError:
            continue
    
    if not challenge_bytes:
        print("No valid challenge data")
        return
    
    print("\nChallenge byte analysis:")
    for i, challenge in enumerate(challenge_bytes[:10]):
        print(f"  Challenge {i+1}: {challenge.hex()} ({len(challenge)} bytes)")
    
    # Analyze patterns
    print("\nPattern analysis:")
    
    # Check for sequential patterns
    print("Sequential analysis:")
    for i in range(1, min(5, len(challenge_bytes))):
        prev = challenge_bytes[i-1]
        curr = challenge_bytes[i]
        if len(prev) == len(curr):
            diff = [curr[j] - prev[j] for j in range(len(prev))]
            print(f"  Challenge {i-1} -> {i}: {[hex(d & 0xFF) for d in diff]}")
    
    # Entropy analysis
    print("\nEntropy analysis:")
    for i, challenge in enumerate(challenge_bytes[:5]):
        entropy = calculate_entropy(challenge)
        print(f"  Challenge {i+1} entropy: {entropy:.3f}")
    
    # Look for PRNG patterns
    print("\nPRNG analysis:")
    for i, challenge in enumerate(challenge_bytes[:5]):
        if is_linear_pattern(challenge):
            print(f"  Challenge {i+1}: Possible linear pattern")
        elif is_xor_pattern(challenge):
            print(f"  Challenge {i+1}: Possible XOR pattern")
        else:
            print(f"  Challenge {i+1}: No obvious pattern")

def is_linear_pattern(data):
    """Check for linear patterns in data"""
    if len(data) < 2:
        return False
    
    # Check for arithmetic progression
    diffs = [data[i+1] - data[i] for i in range(len(data)-1)]
    return len(set(diffs)) == 1

def is_xor_pattern(data):
    """Check for XOR patterns in data"""
    if len(data) < 2:
        return False
    
    # Check for XOR with constant
    xor_results = [data[i] ^ data[i+1] for i in range(len(data)-1)]
    return len(set(xor_results)) == 1

def analyze_response_patterns(rolling_codes):
    """Analyze encrypted response patterns"""
    print("\n=== RESPONSE PATTERN ANALYSIS ===")
    
    responses = [code for code in rolling_codes if code['device'] == 'modem']
    print(f"Total responses: {len(responses)}")
    
    if not responses:
        print("No responses found")
        return
    
    # Convert hex to bytes
    response_bytes = []
    for response in responses:
        try:
            bytes_data = bytes.fromhex(response['response'])
            response_bytes.append(bytes_data)
        except ValueError:
            continue
    
    if not response_bytes:
        print("No valid response data")
        return
    
    print("\nResponse byte analysis:")
    for i, response in enumerate(response_bytes[:5]):
        print(f"  Response {i+1}: {response.hex()} ({len(response)} bytes)")
    
    # Analyze encryption patterns
    print("\nEncryption analysis:")
    
    # Check for block cipher patterns
    if len(response_bytes) > 1:
        print("Block cipher analysis:")
        for i in range(1, min(3, len(response_bytes))):
            prev = response_bytes[i-1]
            curr = response_bytes[i]
            if len(prev) == len(curr):
                if prev == curr:
                    print(f"  Response {i-1} == {i}: Possible ECB mode")
                else:
                    print(f"  Response {i-1} != {i}: Different encrypted data")
    
    # Entropy analysis
    print("\nResponse entropy analysis:")
    for i, response in enumerate(response_bytes[:5]):
        entropy = calculate_entropy(response)
        print(f"  Response {i+1} entropy: {entropy:.3f}")

def analyze_rolling_code_algorithm(rolling_codes):
    """Analyze the rolling code algorithm"""
    print("\n=== ROLLING CODE ALGORITHM ANALYSIS ===")
    
    if not rolling_codes:
        print("No rolling codes found")
        return
    
    # Group by power cycles
    power_cycles = []
    current_cycle = []
    
    for code in rolling_codes:
        if not current_cycle:
            current_cycle = [code]
        else:
            # Check if this is a new power cycle (large time gap)
            time_diff = code['timestamp'] - current_cycle[-1]['timestamp']
            if time_diff > 30:  # More than 30 seconds
                if len(current_cycle) > 1:
                    power_cycles.append(current_cycle)
                current_cycle = [code]
            else:
                current_cycle.append(code)
    
    if len(current_cycle) > 1:
        power_cycles.append(current_cycle)
    
    print(f"Found {len(power_cycles)} power cycles")
    
    # Analyze each power cycle
    for i, cycle in enumerate(power_cycles):
        print(f"\nPower Cycle {i+1}:")
        print(f"  Duration: {cycle[-1]['timestamp'] - cycle[0]['timestamp']}s")
        print(f"  Messages: {len(cycle)}")
        
        # Extract challenges and responses
        challenges = [c for c in cycle if c['device'] == 'machine']
        responses = [c for c in cycle if c['device'] == 'modem']
        
        print(f"  Challenges: {len(challenges)}")
        print(f"  Responses: {len(responses)}")
        
        # Analyze challenge-response pairs
        if challenges and responses:
            print("  Challenge-Response pairs:")
            for j, (challenge, response) in enumerate(zip(challenges, responses)):
                print(f"    Pair {j+1}:")
                print(f"      Challenge: {challenge['challenge']}")
                print(f"      Response: {response['response'][:32]}...")
                
                # Try to find patterns
                if j > 0:
                    prev_challenge = challenges[j-1]['challenge']
                    curr_challenge = challenge['challenge']
                    
                    if prev_challenge != curr_challenge:
                        print(f"      Challenge changed: {prev_challenge} -> {curr_challenge}")
                    else:
                        print(f"      Challenge repeated: {curr_challenge}")

def analyze_cryptographic_strength(rolling_codes):
    """Analyze cryptographic strength of rolling codes"""
    print("\n=== CRYPTOGRAPHIC STRENGTH ANALYSIS ===")
    
    if not rolling_codes:
        print("No rolling codes found")
        return
    
    # Extract all challenges and responses
    challenges = [code['challenge'] for code in rolling_codes if code['device'] == 'machine']
    responses = [code['response'] for code in rolling_codes if code['device'] == 'modem']
    
    print(f"Total challenges: {len(challenges)}")
    print(f"Total responses: {len(responses)}")
    
    # Analyze challenge uniqueness
    unique_challenges = set(challenges)
    print(f"Unique challenges: {len(unique_challenges)}")
    
    if len(unique_challenges) < len(challenges):
        print("WARNING: Duplicate challenges detected!")
        duplicates = len(challenges) - len(unique_challenges)
        print(f"Duplicate count: {duplicates}")
    
    # Analyze response uniqueness
    unique_responses = set(responses)
    print(f"Unique responses: {len(unique_responses)}")
    
    if len(unique_responses) < len(responses):
        print("WARNING: Duplicate responses detected!")
        duplicates = len(responses) - len(unique_responses)
        print(f"Duplicate count: {duplicates}")
    
    # Analyze challenge-response correlation
    print("\nChallenge-Response correlation:")
    if len(challenges) == len(responses):
        for i, (challenge, response) in enumerate(zip(challenges, responses)):
            print(f"  Pair {i+1}: {challenge} -> {response[:16]}...")
    else:
        print("  Mismatched challenge-response pairs")
    
    # Analyze cryptographic properties
    print("\nCryptographic properties:")
    
    # Check for weak patterns
    weak_patterns = []
    
    # Check for sequential challenges
    for i in range(1, len(challenges)):
        try:
            prev = int(challenges[i-1], 16)
            curr = int(challenges[i], 16)
            if curr == prev + 1:
                weak_patterns.append(f"Sequential challenges: {i-1} -> {i}")
        except ValueError:
            continue
    
    # Check for repeated patterns
    for i in range(len(challenges)):
        for j in range(i+1, len(challenges)):
            if challenges[i] == challenges[j]:
                weak_patterns.append(f"Repeated challenge: {i} == {j}")
    
    if weak_patterns:
        print("WEAK PATTERNS DETECTED:")
        for pattern in weak_patterns:
            print(f"  - {pattern}")
    else:
        print("  No obvious weak patterns detected")
    
    # Analyze entropy
    print("\nEntropy analysis:")
    for i, challenge in enumerate(challenges[:5]):
        try:
            challenge_bytes = bytes.fromhex(challenge)
            entropy = calculate_entropy(challenge_bytes)
            print(f"  Challenge {i+1}: {entropy:.3f}")
        except ValueError:
            print(f"  Challenge {i+1}: Invalid hex")

def analyze_timing_patterns(rolling_codes):
    """Analyze timing patterns in rolling codes"""
    print("\n=== TIMING PATTERN ANALYSIS ===")
    
    if not rolling_codes:
        print("No rolling codes found")
        return
    
    # Group by device
    machine_codes = [code for code in rolling_codes if code['device'] == 'machine']
    modem_codes = [code for code in rolling_codes if code['device'] == 'modem']
    
    print(f"Machine codes: {len(machine_codes)}")
    print(f"Modem codes: {len(modem_codes)}")
    
    # Analyze timing intervals
    if len(machine_codes) > 1:
        print("\nMachine timing intervals:")
        for i in range(1, len(machine_codes)):
            interval = machine_codes[i]['timestamp'] - machine_codes[i-1]['timestamp']
            print(f"  Interval {i}: {interval}s")
    
    if len(modem_codes) > 1:
        print("\nModem timing intervals:")
        for i in range(1, len(modem_codes)):
            interval = modem_codes[i]['timestamp'] - modem_codes[i-1]['timestamp']
            print(f"  Interval {i}: {interval}s")
    
    # Analyze challenge-response timing
    print("\nChallenge-Response timing:")
    for i, machine_code in enumerate(machine_codes):
        # Find corresponding modem response
        for modem_code in modem_codes:
            if modem_code['timestamp'] > machine_code['timestamp']:
                response_time = modem_code['timestamp'] - machine_code['timestamp']
                print(f"  Challenge {i+1} -> Response: {response_time}s")
                break

def main():
    filename = "rolling.txt"
    
    try:
        rolling_codes = extract_rolling_codes(filename)
        
        analyze_challenge_patterns(rolling_codes)
        analyze_response_patterns(rolling_codes)
        analyze_rolling_code_algorithm(rolling_codes)
        analyze_cryptographic_strength(rolling_codes)
        analyze_timing_patterns(rolling_codes)
        
    except FileNotFoundError:
        print(f"Error: Could not find {filename}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
