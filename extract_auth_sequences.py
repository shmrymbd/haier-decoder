#!/usr/bin/env python3
"""
Extract authentication challenge and response binary sequences from rolling data.
"""

import re
import sys

def extract_auth_sequences(filename):
    """Extract authentication challenge and response sequences."""
    
    try:
        with open(filename, 'r') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return
    
    print("Extracting Authentication Challenge and Response Sequences")
    print("=" * 80)
    
    # Patterns to identify different types of messages
    challenge_patterns = {
        'challenge_25': r'00100101.*01000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00010010.*00010000.*00000010.*00000000.*00000001',  # 25-byte challenge
        'challenge_37': r'00100101.*01000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00010001.*00010000.*00000010.*00000000.*00000001',  # 37-byte challenge
        'response_short': r'00001010.*01000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*11110011.*00000000.*00000000.*00111101.*11010000.*11100001',  # Short response
        'response_long': r'00001010.*01000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*00000000.*11110101.*00000000.*00000000.*00111111.*11010001.*00000001',  # Long response
    }
    
    challenges = []
    responses = []
    challenge_response_pairs = []
    
    line_count = 0
    current_challenge = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        line_count += 1
        
        # Extract the binary part after the prefix
        parts = line.split(' | ', 2)
        if len(parts) != 3:
            continue
            
        prefix = parts[1]
        binary_data = parts[2]
        
        # Check for challenge patterns (25-byte and 37-byte)
        if '00100101 01000000' in binary_data and '00010010 00010000 00000010 00000000 00000001' in binary_data:
            # 25-byte challenge
            challenge_data = extract_binary_sequence(binary_data, 25)
            if challenge_data:
                challenges.append({
                    'line': line_count,
                    'prefix': prefix,
                    'type': '25-byte challenge',
                    'data': challenge_data,
                    'timestamp': extract_timestamp(prefix)
                })
                current_challenge = challenges[-1]
                
        elif '00100101 01000000' in binary_data and '00010001 00010000 00000010 00000000 00000001' in binary_data:
            # 37-byte challenge
            challenge_data = extract_binary_sequence(binary_data, 37)
            if challenge_data:
                challenges.append({
                    'line': line_count,
                    'prefix': prefix,
                    'type': '37-byte challenge',
                    'data': challenge_data,
                    'timestamp': extract_timestamp(prefix)
                })
                current_challenge = challenges[-1]
        
        # Check for response patterns
        elif '00001010 01000000' in binary_data and '11110011 00000000 00000000 00111101 11010000 11100001' in binary_data:
            # Short response
            response_data = extract_binary_sequence(binary_data, 15)
            if response_data:
                responses.append({
                    'line': line_count,
                    'prefix': prefix,
                    'type': 'short response',
                    'data': response_data,
                    'timestamp': extract_timestamp(prefix)
                })
                if current_challenge:
                    challenge_response_pairs.append({
                        'challenge': current_challenge,
                        'response': responses[-1]
                    })
                    
        elif '00001010 01000000' in binary_data and '11110101 00000000 00000000 00111111 11010001 00000001' in binary_data:
            # Long response
            response_data = extract_binary_sequence(binary_data, 15)
            if response_data:
                responses.append({
                    'line': line_count,
                    'prefix': prefix,
                    'type': 'long response',
                    'data': response_data,
                    'timestamp': extract_timestamp(prefix)
                })
                if current_challenge:
                    challenge_response_pairs.append({
                        'challenge': current_challenge,
                        'response': responses[-1]
                    })
    
    # Output results
    print(f"\nAUTHENTICATION CHALLENGES FOUND: {len(challenges)}")
    print("-" * 50)
    for i, challenge in enumerate(challenges, 1):
        print(f"Challenge {i}:")
        print(f"  Line: {challenge['line']}")
        print(f"  Type: {challenge['type']}")
        print(f"  Timestamp: {challenge['timestamp']}")
        print(f"  Binary Data: {challenge['data']}")
        print()
    
    print(f"\nAUTHENTICATION RESPONSES FOUND: {len(responses)}")
    print("-" * 50)
    for i, response in enumerate(responses, 1):
        print(f"Response {i}:")
        print(f"  Line: {response['line']}")
        print(f"  Type: {response['type']}")
        print(f"  Timestamp: {response['timestamp']}")
        print(f"  Binary Data: {response['data']}")
        print()
    
    print(f"\nCHALLENGE-RESPONSE PAIRS FOUND: {len(challenge_response_pairs)}")
    print("-" * 50)
    for i, pair in enumerate(challenge_response_pairs, 1):
        print(f"Pair {i}:")
        print(f"  Challenge Line: {pair['challenge']['line']} ({pair['challenge']['type']})")
        print(f"  Response Line: {pair['response']['line']} ({pair['response']['type']})")
        print(f"  Challenge Data: {pair['challenge']['data']}")
        print(f"  Response Data: {pair['response']['data']}")
        print()
    
    # Save to file
    with open('auth_sequences_output.txt', 'w') as output_file:
        output_file.write("AUTHENTICATION CHALLENGES AND RESPONSES\n")
        output_file.write("=" * 50 + "\n\n")
        
        output_file.write(f"CHALLENGES FOUND: {len(challenges)}\n")
        output_file.write("-" * 30 + "\n")
        for i, challenge in enumerate(challenges, 1):
            output_file.write(f"Challenge {i}:\n")
            output_file.write(f"  Line: {challenge['line']}\n")
            output_file.write(f"  Type: {challenge['type']}\n")
            output_file.write(f"  Timestamp: {challenge['timestamp']}\n")
            output_file.write(f"  Binary Data: {challenge['data']}\n\n")
        
        output_file.write(f"RESPONSES FOUND: {len(responses)}\n")
        output_file.write("-" * 30 + "\n")
        for i, response in enumerate(responses, 1):
            output_file.write(f"Response {i}:\n")
            output_file.write(f"  Line: {response['line']}\n")
            output_file.write(f"  Type: {response['type']}\n")
            output_file.write(f"  Timestamp: {response['timestamp']}\n")
            output_file.write(f"  Binary Data: {response['data']}\n\n")
        
        output_file.write(f"CHALLENGE-RESPONSE PAIRS: {len(challenge_response_pairs)}\n")
        output_file.write("-" * 30 + "\n")
        for i, pair in enumerate(challenge_response_pairs, 1):
            output_file.write(f"Pair {i}:\n")
            output_file.write(f"  Challenge: {pair['challenge']['data']}\n")
            output_file.write(f"  Response: {pair['response']['data']}\n\n")
    
    print(f"\nResults saved to 'auth_sequences_output.txt'")
    return challenges, responses, challenge_response_pairs

def extract_binary_sequence(binary_data, expected_bytes):
    """Extract binary sequence from the data."""
    # Split by spaces and take the expected number of bytes
    parts = binary_data.split()
    if len(parts) >= expected_bytes:
        return ' '.join(parts[:expected_bytes])
    return None

def extract_timestamp(prefix):
    """Extract timestamp from prefix."""
    # Extract timestamp from prefix like "modem 1760932567" or "machine 1760932567"
    match = re.search(r'(\d{10})', prefix)
    if match:
        return match.group(1)
    return "unknown"

def main():
    filename = "/home/admin/haier-decoder/rolling_binary_output.txt"
    extract_auth_sequences(filename)

if __name__ == "__main__":
    main()


