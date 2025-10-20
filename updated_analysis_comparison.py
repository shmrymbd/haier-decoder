#!/usr/bin/env python3
"""
Comparison analysis between original and updated rolling.txt data
"""

import re
from collections import defaultdict, Counter
import sys

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

def analyze_updated_data():
    """Analyze the updated rolling.txt data"""
    print("=== UPDATED ROLLING CODE ANALYSIS ===")
    
    rolling_codes = extract_rolling_codes("rolling.txt")
    
    print(f"Total rolling code messages: {len(rolling_codes)}")
    
    # Group by device
    machine_codes = [code for code in rolling_codes if code['device'] == 'machine']
    modem_codes = [code for code in rolling_codes if code['device'] == 'modem']
    
    print(f"Machine challenges: {len(machine_codes)}")
    print(f"Modem responses: {len(modem_codes)}")
    
    # Analyze challenge patterns
    challenges = [code['challenge'] for code in machine_codes]
    responses = [code['response'] for code in modem_codes]
    
    print(f"\nUnique challenges: {len(set(challenges))}")
    print(f"Unique responses: {len(set(responses))}")
    
    # Check for duplicates
    challenge_counts = Counter(challenges)
    duplicates = [(challenge, count) for challenge, count in challenge_counts.items() if count > 1]
    
    print(f"\nDuplicate challenges: {len(duplicates)}")
    for challenge, count in duplicates:
        print(f"  Challenge {challenge}: {count} occurrences")
    
    # Analyze challenge patterns
    print("\nChallenge analysis:")
    for i, challenge in enumerate(challenges[:10]):
        print(f"  Challenge {i+1}: {challenge}")
    
    # Analyze response patterns
    print("\nResponse analysis:")
    for i, response in enumerate(responses[:5]):
        print(f"  Response {i+1}: {response[:32]}...")
    
    # Analyze power cycles
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
    
    print(f"\nPower cycles: {len(power_cycles)}")
    
    # Analyze each power cycle
    for i, cycle in enumerate(power_cycles[:5]):
        print(f"\nPower Cycle {i+1}:")
        print(f"  Duration: {cycle[-1]['timestamp'] - cycle[0]['timestamp']}s")
        print(f"  Messages: {len(cycle)}")
        
        # Extract challenges and responses
        challenges = [c for c in cycle if c['device'] == 'machine']
        responses = [c for c in cycle if c['device'] == 'modem']
        
        print(f"  Challenges: {len(challenges)}")
        print(f"  Responses: {len(responses)}")
        
        if challenges:
            print(f"  First challenge: {challenges[0]['challenge']}")
        if responses:
            print(f"  First response: {responses[0]['response'][:32]}...")
    
    # Analyze timing patterns
    print("\nTiming analysis:")
    if len(rolling_codes) > 1:
        intervals = []
        for i in range(1, len(rolling_codes)):
            interval = rolling_codes[i]['timestamp'] - rolling_codes[i-1]['timestamp']
            intervals.append(interval)
        
        print(f"  Average interval: {sum(intervals)/len(intervals):.2f}s")
        print(f"  Min interval: {min(intervals)}s")
        print(f"  Max interval: {max(intervals)}s")
        
        # Group by time intervals
        fast_intervals = [i for i in intervals if i <= 5]
        medium_intervals = [i for i in intervals if 5 < i <= 30]
        slow_intervals = [i for i in intervals if i > 30]
        
        print(f"  Fast intervals (≤5s): {len(fast_intervals)}")
        print(f"  Medium intervals (5-30s): {len(medium_intervals)}")
        print(f"  Slow intervals (>30s): {len(slow_intervals)}")
    
    # Analyze challenge-response correlation
    print("\nChallenge-Response correlation:")
    if len(machine_codes) == len(modem_codes):
        for i, (challenge, response) in enumerate(zip(machine_codes, modem_codes)):
            print(f"  Pair {i+1}: {challenge['challenge']} -> {response['response'][:16]}...")
    else:
        print("  Mismatched challenge-response pairs")

def compare_with_previous():
    """Compare with previous analysis results"""
    print("\n=== COMPARISON WITH PREVIOUS ANALYSIS ===")
    
    print("Previous analysis results:")
    print("  - Total messages: 402")
    print("  - Power cycles: 16")
    print("  - Authentication sequences: 18")
    print("  - Challenges: 9")
    print("  - Responses: 9")
    print("  - Unique challenges: 8")
    print("  - Duplicate challenges: 1")
    
    print("\nUpdated analysis results:")
    rolling_codes = extract_rolling_codes("rolling.txt")
    machine_codes = [code for code in rolling_codes if code['device'] == 'machine']
    modem_codes = [code for code in rolling_codes if code['device'] == 'modem']
    
    challenges = [code['challenge'] for code in machine_codes]
    unique_challenges = len(set(challenges))
    duplicate_count = len(challenges) - unique_challenges
    
    print(f"  - Total messages: {len(rolling_codes)}")
    print(f"  - Challenges: {len(machine_codes)}")
    print(f"  - Responses: {len(modem_codes)}")
    print(f"  - Unique challenges: {unique_challenges}")
    print(f"  - Duplicate challenges: {duplicate_count}")
    
    print("\nChanges detected:")
    print(f"  - Messages increased by: {len(rolling_codes) - 18}")
    print(f"  - Challenges increased by: {len(machine_codes) - 9}")
    print(f"  - Responses increased by: {len(modem_codes) - 9}")
    print(f"  - Duplicate challenges increased by: {duplicate_count - 1}")
    
    # Analyze new patterns
    print("\nNew patterns identified:")
    if duplicate_count > 1:
        print(f"  - Multiple duplicate challenges detected ({duplicate_count})")
    
    # Check for new challenge patterns
    print("\nChallenge pattern analysis:")
    for i, challenge in enumerate(challenges):
        if i > 0:
            prev_challenge = challenges[i-1]
            if challenge == prev_challenge:
                print(f"  - Duplicate challenge at position {i}: {challenge}")

def main():
    try:
        analyze_updated_data()
        compare_with_previous()
        
    except FileNotFoundError:
        print(f"Error: Could not find rolling.txt")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
